// top import fix
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { ShipmentStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const {
      userId,
      orderStatus,
      paymentStatus,
      paymentMethod,
      notes,
      items,
      shipment,
    } = createOrderDto;

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const orderItemsData = items.map((item) => {
      const itemSubtotal = item.price * item.quantity;
      const itemDiscount = item.discount || 0;
      const itemTax = item.tax || 0;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      totalTax += itemTax;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: itemDiscount,
        tax: itemTax,
        total: itemTotal,
      };
    });

    const shippingCharge = 14.99; // Default flat rate shipping for simulation
    const totalAmount = subtotal - totalDiscount + totalTax + shippingCharge;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          orderStatus,
          paymentStatus,
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

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          orderItems: {
            include: { product: true },
          },
          shipment: true,
          user: true,
        },
      });
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        orderItems: {
          include: { product: true },
        },
        shipment: true,
        user: true,
      },
      orderBy: { orderedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { product: true },
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

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const {
      orderStatus,
      paymentStatus,
      trackingNumber,
      courierName,
      shipmentStatus,
    } = updateOrderDto;

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
          ...(paymentStatus && { paymentStatus }),
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
            include: { product: true },
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
