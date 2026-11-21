import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { Prisma, ShipmentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  CreateCheckoutOrderDto,
  checkoutShipping,
} from './dto/create-checkout-order.dto';

const checkoutOrderSelect = {
  id: true,
  orderNumber: true,
  userId: true,
  orderStatus: true,
  paymentStatus: true,
  totalAmount: true,
  orderItems: { select: { productId: true, quantity: true } },
  shipment: {
    take: 1,
    select: {
      courierName: true,
      shippingAddress: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
    },
  },
  payments: {
    where: { status: { in: ['AUTHORIZED', 'CAPTURED'] } },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { id: true },
  },
} satisfies Prisma.OrderSelect;

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.prisma.$transaction((tx) =>
      this.createOrder(tx, createOrderDto),
    );
  }

  async createCheckout(userId: string, dto: CreateCheckoutOrderDto) {
    if (!this.config.get<boolean>('payments.enabled')) {
      throw new BadRequestException(
        'Online payments are currently unavailable.',
      );
    }
    const shipping = checkoutShipping[dto.shippingMethod];
    const orderNumber = `WEB-${dto.checkoutId}`;
    const order = await this.prisma.$transaction(async (tx) => {
      // Serialize checkout creation across retries and tabs for the same account.
      await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;
      const previous = await tx.order.findUnique({
        where: { id: dto.checkoutId },
        select: checkoutOrderSelect,
      });
      if (previous) {
        if (
          previous.userId !== userId ||
          previous.orderNumber !== orderNumber
        ) {
          throw new ForbiddenException('Checkout is unavailable.');
        }
        if (
          previous.orderStatus !== 'PENDING' ||
          previous.paymentStatus !== 'PENDING' ||
          previous.payments.length
        ) {
          return previous;
        }
      }
      const cart = await tx.cart.findUnique({
        where: { userId },
        select: { items: { select: { productId: true, quantity: true } } },
      });
      if (!cart?.items.length)
        throw new BadRequestException('Your cart is empty.');
      if (previous) {
        const shipment = previous.shipment[0];
        const quantities = new Map(
          cart.items.map(({ productId, quantity }) => [productId, quantity]),
        );
        if (
          Math.round(Number(previous.totalAmount) * 100) !==
            dto.expectedAmount ||
          previous.orderItems.length !== quantities.size ||
          previous.orderItems.some(
            (item) => quantities.get(item.productId) !== item.quantity,
          ) ||
          shipment?.courierName !== shipping.courierName ||
          shipment.shippingAddress !== dto.address ||
          shipment.city !== dto.city ||
          shipment.state !== dto.state ||
          shipment.postalCode !== dto.postalCode ||
          shipment.phone !== dto.phone
        ) {
          throw new ConflictException(
            'Checkout details changed. Review the details and submit again to create a new order.',
          );
        }
        return previous;
      }
      await this.createOrder(
        tx,
        {
          userId,
          paymentMethod: 'RAZORPAY',
          items: cart.items,
          shipment: {
            courierName: shipping.courierName,
            shippingAddress: dto.address,
            city: dto.city,
            state: dto.state,
            postalCode: dto.postalCode,
            country: 'India',
            phone: dto.phone,
          },
        },
        {
          id: dto.checkoutId,
          orderNumber,
          shippingCharge: shipping.price,
          expectedAmount: dto.expectedAmount,
        },
      );
      return tx.order.findUniqueOrThrow({
        where: { id: dto.checkoutId },
        select: checkoutOrderSelect,
      });
    });
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
      paymentId: order.payments[0]?.id ?? null,
    };
  }

  private async createOrder(
    tx: Prisma.TransactionClient,
    createOrderDto: Pick<
      CreateOrderDto,
      'userId' | 'paymentMethod' | 'notes' | 'shipment'
    > & {
      items: Pick<CreateOrderDto['items'][number], 'productId' | 'quantity'>[];
    },
    checkout?: {
      id: string;
      orderNumber: string;
      shippingCharge: number;
      expectedAmount: number;
    },
  ) {
    const { userId, paymentMethod, notes, items, shipment } = createOrderDto;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        deletedAt: null,
        ...(checkout ? { status: { slug: 'active' } } : {}),
      },
    });
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const orderItemsData = items.map((item) => {
      const product = productById.get(item.productId);
      if (!product)
        throw new BadRequestException(
          `Product ${item.productId} is unavailable`,
        );
      if (product.availableStock < item.quantity)
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      const unitPrice = Number(product.basePrice);
      const discountedSubtotal = Number(product.finalPrice) * item.quantity;
      const itemSubtotal = unitPrice * item.quantity;
      const itemDiscount = Math.max(0, itemSubtotal - discountedSubtotal);
      const itemTax = checkout
        ? product.finalPrice
            .mul(item.quantity)
            .mul(product.taxPercentage)
            .div(100)
            .toDecimalPlaces(2)
            .toNumber()
        : (discountedSubtotal * Number(product.taxPercentage)) / 100;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: unitPrice,
        discount: itemDiscount,
        tax: itemTax,
        total: itemTotal,
      };
    });

    const shippingCharge = checkout?.shippingCharge ?? 14.99;
    const totalAmount = subtotal - totalDiscount + totalTax + shippingCharge;
    if (checkout && Math.round(totalAmount * 100) !== checkout.expectedAmount) {
      throw new ConflictException(
        'Your cart total changed. Refresh the cart and review the new total.',
      );
    }
    const orderNumber =
      checkout?.orderNumber ?? `ORD-${Date.now().toString().slice(-6)}`;

    // 1. Create order
    const order = await tx.order.create({
      data: {
        ...(checkout ? { id: checkout.id } : {}),
        orderNumber,
        userId,
        orderStatus: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod,
        subtotal,
        discount: totalDiscount,
        tax: totalTax,
        shippingCharge,
        totalAmount,
        notes,
        orderItems: {
          create: orderItemsData,
        },
      },
    });

    // 2. Create shipment
    const trackingNumber = `TRK-${shipment.courierName.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    await tx.shipment.create({
      data: {
        orderId: order.id,
        trackingNumber,
        courierName: shipment.courierName,
        shipmentStatus: ShipmentStatus.PENDING,
        shippingAddress: shipment.shippingAddress,
        city: shipment.city,
        state: shipment.state,
        postalCode: shipment.postalCode,
        country: shipment.country,
        phone: shipment.phone,
      },
    });

    if (checkout) return null;
    return tx.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shipment: true,
        user: true,
      },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shipment: true,
        user: true,
      },
      orderBy: { orderedAt: 'desc' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shipment: true,
      },
      orderBy: { orderedAt: 'desc' },
    });
  }

  async getConfirmation(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id, userId },
      select: {
        id: true,
        orderNumber: true,
        orderedAt: true,
        orderStatus: true,
        paymentStatus: true,
        paymentMethod: true,
        subtotal: true,
        discount: true,
        tax: true,
        shippingCharge: true,
        totalAmount: true,
        orderItems: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            productId: true,
            quantity: true,
            total: true,
            product: {
              select: {
                name: true,
                images: {
                  take: 1,
                  orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
                  select: {
                    displayUrl: true,
                    imageUrl: true,
                    originalUrl: true,
                  },
                },
              },
            },
          },
        },
        shipment: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            courierName: true,
            trackingNumber: true,
            shipmentStatus: true,
            shippingAddress: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            phone: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shipment: true,
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async cancelUserOrder(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { shipment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

    if (order.orderStatus === 'CANCELLED') {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.orderStatus !== 'PENDING' && order.orderStatus !== 'PROCESSING') {
      throw new BadRequestException(
        `Order cannot be cancelled in status "${order.orderStatus}"`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { orderStatus: 'CANCELLED' },
      include: {
        orderItems: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
        shipment: true,
      },
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const { orderStatus, trackingNumber, courierName, shipmentStatus } =
      updateOrderDto;

    const orderExists = await this.prisma.order.findUnique({
      where: { id },
      include: { shipment: true },
    });

    if (!orderExists) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update order status if provided
      await tx.order.update({
        where: { id },
        data: {
          ...(orderStatus && { orderStatus }),
        },
      });

      // Update shipment if shipment or tracking details are provided
      if (orderExists.shipment.length > 0) {
        const shipmentId = orderExists.shipment[0].id;
        let deliveredDate: Date | null = null;
        let shippedDate: Date | null = null;

        if (shipmentStatus === ShipmentStatus.DELIVERED) {
          deliveredDate = new Date();
        }
        if (
          shipmentStatus === ShipmentStatus.SHIPPED ||
          shipmentStatus === ShipmentStatus.IN_TRANSIT
        ) {
          shippedDate = new Date();
        }

        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            ...(trackingNumber && { trackingNumber }),
            ...(courierName && { courierName }),
            ...(shipmentStatus && { shipmentStatus }),
            ...(deliveredDate && { deliveredDate }),
            ...(shippedDate && { shippedDate }),
          },
        });
      }

      return tx.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              product: {
                include: { images: true },
              },
            },
          },
          shipment: true,
          user: true,
        },
      });
    });
  }

  async remove(id: string) {
    const orderExists = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!orderExists) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return { success: true, message: 'Order deleted successfully' };
  }
}
