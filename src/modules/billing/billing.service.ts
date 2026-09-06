import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBillDto, BillQueryDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBillDto) {
    const {
      billedBy,
      customerName,
      customerMobile,
      customerEmail,
      customerAddress,
      discount: billDiscount = 0,
      tax: billTax = 0,
      paymentMethod = 'CASH',
      status = 'PAID',
      notes,
      items,
    } = dto;

    // Calculate totals from items
    let subtotal = 0;
    const billItemsData = items.map((item) => {
      const itemDiscount = item.discount ?? 0;
      const itemTax = item.tax ?? 0;
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemTotal = itemSubtotal - itemDiscount + itemTax;
      subtotal += itemSubtotal;

      return {
        productId: item.productId ?? null,
        productName: item.productName,
        sku: item.sku ?? null,
        barcode: item.barcode ?? null,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        discount: new Prisma.Decimal(itemDiscount),
        tax: new Prisma.Decimal(itemTax),
        total: new Prisma.Decimal(itemTotal),
      };
    });

    const totalAmount = subtotal - billDiscount + billTax;
    const billNumber = `BILL-${Date.now().toString().slice(-8)}`;

    return this.prisma.bill.create({
      data: {
        billNumber,
        billedBy: billedBy ?? null,
        customerName: customerName ?? null,
        customerMobile: customerMobile ?? null,
        customerEmail: customerEmail ?? null,
        customerAddress: customerAddress ?? null,
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(billDiscount),
        tax: new Prisma.Decimal(billTax),
        totalAmount: new Prisma.Decimal(totalAmount),
        paymentMethod,
        status,
        notes: notes ?? null,
        billItems: {
          create: billItemsData,
        },
      },
      include: {
        billItems: true,
      },
    });
  }

  async findAll(query: BillQueryDto) {
    const { page = 1, limit = 20, search, status, dateFrom, dateTo } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: Prisma.BillWhereInput = {
      ...(status ? { status } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { billNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { customerMobile: { contains: search, mode: 'insensitive' } },
              { customerEmail: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { billItems: true },
      }),
    ]);

    const totalPages = Math.ceil(total / Number(limit));
    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNextPage: Number(page) < totalPages,
        hasPreviousPage: Number(page) > 1,
      },
    };
  }

  async findOne(id: string) {
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      include: { billItems: true },
    });
    if (!bill) {
      throw new NotFoundException(`Bill with ID "${id}" not found`);
    }
    return bill;
  }

  async cancel(id: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    if (!bill) {
      throw new NotFoundException(`Bill with ID "${id}" not found`);
    }
    return this.prisma.bill.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { billItems: true },
    });
  }
}
