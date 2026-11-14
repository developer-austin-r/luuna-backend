import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Coupon with code "${dto.code}" already exists`,
      );
    }

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minimumOrderAmount: dto.minimumOrderAmount ?? 0,
        redemptionLimit: dto.redemptionLimit,
        activeDate: dto.activeDate ? new Date(dto.activeDate) : undefined,
        expiryDate: new Date(dto.expiryDate),
        status: dto.status,
        description: dto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
    });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found`);
    }
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id); // Throws NotFoundException if it doesn't exist

    if (dto.code) {
      const existing = await this.prisma.coupon.findFirst({
        where: {
          code: dto.code.toUpperCase(),
          deletedAt: null,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(
          `Coupon with code "${dto.code}" already exists`,
        );
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code ? dto.code.toUpperCase() : undefined,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minimumOrderAmount: dto.minimumOrderAmount,
        redemptionLimit: dto.redemptionLimit,
        activeDate: dto.activeDate ? new Date(dto.activeDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        status: dto.status,
        description: dto.description,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Validates whether a coupon code is active, within valid date range,
   * has not exceeded redemption limits, and meets minimum order amount.
   */
  async validate(code: string, orderAmount: number = 0) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with code "${code}" not found`);
    }

    const now = new Date();

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Coupon "${code}" is currently ${coupon.status.toLowerCase()}`,
      );
    }

    if (coupon.activeDate && now < coupon.activeDate) {
      throw new BadRequestException(
        `Coupon "${code}" is not active yet. It will become active on ${coupon.activeDate.toISOString().split('T')[0]}`,
      );
    }

    if (now > coupon.expiryDate) {
      throw new BadRequestException(
        `Coupon "${code}" has expired on ${coupon.expiryDate.toISOString().split('T')[0]}`,
      );
    }

    if (
      coupon.redemptionLimit !== null &&
      coupon.redemptionLimit !== undefined
    ) {
      if (coupon.redeemedCount >= coupon.redemptionLimit) {
        throw new BadRequestException(
          `Coupon "${code}" redemption limit has been reached`,
        );
      }
    }

    const minAmount = Number(coupon.minimumOrderAmount);
    if (minAmount > 0 && orderAmount > 0 && orderAmount < minAmount) {
      throw new BadRequestException(
        `Minimum order amount of ₹${minAmount} is required to apply coupon "${code}"`,
      );
    }

    return {
      valid: true,
      message: 'Coupon is valid and active',
      coupon,
    };
  }
}
