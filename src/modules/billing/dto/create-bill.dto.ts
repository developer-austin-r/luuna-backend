import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillPaymentMethod, BillStatus } from '@prisma/client';

export class CreateBillItemDto {
  @ApiPropertyOptional({ description: 'Product ID (if linked to catalogue)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: 'Product display name' })
  @IsString()
  productName: string;

  @ApiPropertyOptional({ description: 'SKU of the product' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Barcode of the product' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Item-level discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Item-level tax amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class CreateBillDto {
  @ApiPropertyOptional({ description: 'Name of the billing user/cashier' })
  @IsOptional()
  @IsString()
  billedBy?: string;

  @ApiPropertyOptional({ description: 'Customer full name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer mobile number' })
  @IsOptional()
  @IsString()
  customerMobile?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'Bill-level discount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ description: 'Bill-level tax' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ enum: BillPaymentMethod })
  @IsOptional()
  @IsEnum(BillPaymentMethod)
  paymentMethod?: BillPaymentMethod;

  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateBillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillItemDto)
  items: CreateBillItemDto[];
}
