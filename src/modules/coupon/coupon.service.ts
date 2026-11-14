import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';

interface CouponLockedRow {
  id: string;
  code: string;
  status: string;
  active_date: Date | null;
  expiry_date: Date;
  minimum_order_amount: string | number;
  redemption_limit: number | null;
  redeemed_count: number;
  discount_type: string;
  discount_value: string | number;
}

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
   *
   * In 'checkout' mode, requires a valid positive orderAmount and validates minimumOrderAmount.
   * In 'lookup' mode, performs code-only verification without claiming checkout eligibility.
   */
  async validate(options: {
    code: string;
    orderAmount?: number;
    mode?: 'checkout' | 'lookup';
  }) {
    const {
      code,
      orderAmount,
      mode = orderAmount !== undefined ? 'checkout' : 'lookup',
    } = options;

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

    if (mode === 'checkout') {
      if (orderAmount === undefined || isNaN(orderAmount) || orderAmount <= 0) {
        throw new BadRequestException(
          'A valid positive order amount is required to validate coupon eligibility for checkout',
        );
      }

      if (minAmount > 0 && orderAmount < minAmount) {
        throw new BadRequestException(
          `Minimum order amount of ₹${minAmount} is required to apply coupon "${coupon.code}". Current order amount is ₹${orderAmount}.`,
        );
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = Number(
          ((orderAmount * Number(coupon.discountValue)) / 100).toFixed(2),
        );
      } else {
        discountAmount = Math.min(orderAmount, Number(coupon.discountValue));
      }
      const finalAmount = Math.max(
        0,
        Number((orderAmount - discountAmount).toFixed(2)),
      );

      return {
        valid: true,
        eligibleForCheckout: true,
        mode: 'checkout',
        message: `Coupon "${coupon.code}" is valid and applied`,
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue),
          minimumOrderAmount: minAmount,
          description: coupon.description,
          expiryDate: coupon.expiryDate,
        },
        orderSummary: {
          originalAmount: orderAmount,
          discountAmount,
          finalAmount,
        },
      };
    }

    // Lookup mode: verify code existence & status without claiming checkout eligibility
    return {
      valid: true,
      eligibleForCheckout: false,
      mode: 'lookup',
      message:
        minAmount > 0
          ? `Coupon code "${coupon.code}" is active. Requires a minimum order of ₹${minAmount} at checkout.`
          : `Coupon code "${coupon.code}" is active and ready for use.`,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minimumOrderAmount: minAmount,
        description: coupon.description,
        expiryDate: coupon.expiryDate,
      },
    };
  }

  /**
   * Atomically redeems a coupon during checkout using row-level locking
   * so concurrent requests cannot exceed the configured redemption limit.
   */
  async redeemCoupon(code: string, orderAmount: number) {
    if (orderAmount === undefined || isNaN(orderAmount) || orderAmount <= 0) {
      throw new BadRequestException(
        'A valid positive order amount is required to redeem a coupon',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Row-level lock (FOR UPDATE) guarantees serializable concurrency
      const rawCoupons = await tx.$queryRaw<CouponLockedRow[]>`
        SELECT id, code, status, active_date, expiry_date, minimum_order_amount, redemption_limit, redeemed_count, discount_type, discount_value
        FROM coupons
        WHERE UPPER(code) = UPPER(${code}) AND deleted_at IS NULL
        FOR UPDATE
      `;

      const coupons: CouponLockedRow[] = rawCoupons;
      const coupon: CouponLockedRow | undefined = coupons[0];
      if (!coupon) {
        throw new NotFoundException(`Coupon with code "${code}" not found`);
      }

      const now = new Date();

      if (coupon.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Coupon "${code}" is currently ${coupon.status.toLowerCase()}`,
        );
      }

      if (coupon.active_date) {
        const activeDate = new Date(coupon.active_date);
        if (now < activeDate) {
          throw new BadRequestException(`Coupon "${code}" is not active yet`);
        }
      }

      const expiryDate = new Date(coupon.expiry_date);
      if (now > expiryDate) {
        throw new BadRequestException(`Coupon "${code}" has expired`);
      }

      if (
        coupon.redemption_limit !== null &&
        coupon.redemption_limit !== undefined &&
        Number(coupon.redeemed_count) >= Number(coupon.redemption_limit)
      ) {
        throw new BadRequestException(
          `Coupon "${code}" redemption limit has been reached`,
        );
      }

      const minAmount = Number(coupon.minimum_order_amount);
      if (minAmount > 0 && orderAmount < minAmount) {
        throw new BadRequestException(
          `Order amount of ₹${orderAmount} does not meet the minimum requirement of ₹${minAmount} for coupon "${code}"`,
        );
      }

      // Atomically increment redeemed count
      const updated = await tx.coupon.update({
        where: { id: coupon.id },
        data: { redeemedCount: { increment: 1 } },
        select: {
          code: true,
          discountType: true,
          discountValue: true,
          minimumOrderAmount: true,
          redeemedCount: true,
          redemptionLimit: true,
        },
      });

      return {
        success: true,
        message: `Coupon "${code}" redeemed successfully`,
        coupon: updated,
      };
    });
  }
}
