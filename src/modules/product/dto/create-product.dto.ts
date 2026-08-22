import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductImageItemDto {
  @ApiPropertyOptional({ example: 'https://example.com/images/product-1.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'https://example.com/images/product-1.jpg' })
  @IsString()
  originalUrl: string;

  @ApiProperty({ example: 'https://example.com/images/product-1.jpg' })
  @IsString()
  displayUrl: string;

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
  @Max(10485760, { message: 'Video file size must be 10MB or less' })
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

  @ApiProperty({ example: '11111111-1111-4111-a111-111111111111' })
  @IsUUID()
  statusId: string;

  @ApiPropertyOptional({ example: 'XL' })
  @IsOptional()
  @IsString()
  productSize?: string;

  @ApiPropertyOptional({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsOptional()
  @IsArray()
  // Existing seed data contains UUID-shaped legacy IDs that are not v4.
  // ProductService also verifies that each supplied ID exists and is active.
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    each: true,
  })
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
}
