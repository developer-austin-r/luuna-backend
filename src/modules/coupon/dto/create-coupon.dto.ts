import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsInt,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, CouponStatus } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({ example: 'FLASH20' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 20.0 })
  @IsNumber()
  @Min(0)
  discountValue: number;

  @ApiPropertyOptional({ example: 50.0, default: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  redemptionLimit?: number;

  @ApiPropertyOptional({ example: '2026-07-28T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  activeDate?: string;

  @ApiProperty({ example: '2026-08-28T00:00:00.000Z' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional({
    enum: CouponStatus,
    example: CouponStatus.ACTIVE,
    default: CouponStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiPropertyOptional({ example: '20% off flash sale' })
  @IsOptional()
  @IsString()
  description?: string;
}
