import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsInt,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'product-uuid-here' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 159.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 0.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class CreateShipmentDto {
  @ApiProperty({ example: 'FedEx Express' })
  @IsString()
  @IsNotEmpty()
  courierName: string;

  @ApiProperty({ example: '4582 Oakwood Ave, Los Angeles, CA 90004' })
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @ApiProperty({ example: 'Los Angeles' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'CA' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '90004' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'user-uuid-here' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'Please leave at the door' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: CreateShipmentDto })
  @ValidateNested()
  @Type(() => CreateShipmentDto)
  shipment: CreateShipmentDto;
}
