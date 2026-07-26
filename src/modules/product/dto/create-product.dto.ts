import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductImageItemDto {
  @ApiProperty({ example: 'https://example.com/images/product-1.jpg' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class CreateProductVideoItemDto {
  @ApiProperty({ example: 'https://example.com/videos/product-1.mp4' })
  @IsString()
  videoUrl: string;

  @ApiPropertyOptional({ example: 10485760 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'PROD-SKU-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Wireless Noise Canceling Headphones' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'wireless-noise-canceling-headphones' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({
    example: 'High quality wireless headphones with active noise cancellation.',
  })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ example: 'Detailed product description...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiProperty({ example: 199.99 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ example: 149.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPrice?: number;

  @ApiPropertyOptional({ example: 18.0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxPercentage?: number;

  @ApiProperty({ example: 176.99 })
  @IsNumber()
  @Min(0)
  finalPrice: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservedStock?: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableStock?: number;

  @ApiPropertyOptional({ example: 4.5, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  archive?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [CreateProductImageItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageItemDto)
  images?: CreateProductImageItemDto[];

  @ApiPropertyOptional({ type: [CreateProductVideoItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVideoItemDto)
  videos?: CreateProductVideoItemDto[];

  @ApiPropertyOptional({ example: ['audio', 'wireless', 'headphones'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ example: 'Main Warehouse' })
  @IsOptional()
  @IsString()
  warehouse?: string;
}
