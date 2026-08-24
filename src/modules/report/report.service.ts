import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SalesReportRow {
  orderNumber: string;
  email: string;
  billingName: string;
  orderStatus: string;
  created: string;
  productName: string;
  productSku: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
  shipping: number;
  taxes: number;
  total: number;
  discountAmount: number;
  streetAddress1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentMethod: string;
  paymentStatus: string;
  notes: string;
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSalesReport(
    startDate: string,
    endDate: string,
  ): Promise<SalesReportRow[]> {
    if (!startDate || !endDate) {
      throw new BadRequestException(
        'startDate and endDate query parameters are required.',
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException(
        'Invalid date format. Please use YYYY-MM-DD.',
      );
    }

    if (end < start) {
      throw new BadRequestException(
        'End date must be greater than or equal to start date.',
      );
    }

    // Maximum selectable report period must be 2 months.
    // Calculate the difference. Adding 2 months to start should be >= end.
    const maxEndDate = new Date(start);
    maxEndDate.setMonth(maxEndDate.getMonth() + 2);
    if (end > maxEndDate) {
      throw new BadRequestException(
        'The selected date range cannot exceed 2 months.',
      );
    }

    // Retrieve order data using relation select to avoid N+1 and load only necessary fields.
    const orders = await this.prisma.order.findMany({
      where: {
        orderedAt: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`),
        },
      },
      select: {
        orderNumber: true,
        orderStatus: true,
        orderedAt: true,
        subtotal: true,
        shippingCharge: true,
        tax: true,
        totalAmount: true,
        discount: true,
        paymentMethod: true,
        paymentStatus: true,
        notes: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        orderItems: {
          select: {
            price: true,
            quantity: true,
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
        shipment: {
          select: {
            shippingAddress: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
          },
        },
      },
      orderBy: {
        orderedAt: 'desc',
      },
    });

    // Flatten to output one row per OrderItem while repeating order-level info.
    const reportRows: SalesReportRow[] = [];

    for (const order of orders) {
      const firstShipment =
        order.shipment && order.shipment.length > 0 ? order.shipment[0] : null;

      if (!order.orderItems || order.orderItems.length === 0) {
        // If an order somehow has no items, still push a row with null item fields so the order isn't lost
        reportRows.push({
          orderNumber: order.orderNumber,
          email: order.user?.email ?? '',
          billingName: order.user?.name ?? '',
          orderStatus: order.orderStatus,
          created: order.orderedAt.toISOString(),
          productName: '',
          productSku: '',
          productPrice: 0,
          quantity: 0,
          subtotal: Number(order.subtotal),
          shipping: Number(order.shippingCharge),
          taxes: Number(order.tax),
          total: Number(order.totalAmount),
          discountAmount: Number(order.discount),
          streetAddress1: firstShipment?.shippingAddress ?? '',
          city: firstShipment?.city ?? '',
          state: firstShipment?.state ?? '',
          postalCode: firstShipment?.postalCode ?? '',
          country: firstShipment?.country ?? '',
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          notes: order.notes ?? '',
        });
      } else {
        for (const item of order.orderItems) {
          reportRows.push({
            orderNumber: order.orderNumber,
            email: order.user?.email ?? '',
            billingName: order.user?.name ?? '',
            orderStatus: order.orderStatus,
            created: order.orderedAt.toISOString(),
            productName: item.product?.name ?? '',
            productSku: item.product?.sku ?? '',
            productPrice: Number(item.price),
            quantity: item.quantity,
            subtotal: Number(order.subtotal),
            shipping: Number(order.shippingCharge),
            taxes: Number(order.tax),
            total: Number(order.totalAmount),
            discountAmount: Number(order.discount),
            streetAddress1: firstShipment?.shippingAddress ?? '',
            city: firstShipment?.city ?? '',
            state: firstShipment?.state ?? '',
            postalCode: firstShipment?.postalCode ?? '',
            country: firstShipment?.country ?? '',
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            notes: order.notes ?? '',
          });
        }
      }
    }

    return reportRows;
  }
}
