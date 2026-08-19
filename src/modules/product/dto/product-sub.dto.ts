import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

export class CreateProductImageDto {
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

export class CreateProductVideoDto {
  @ApiProperty({ example: 'https://example.com/videos/product-1.mp4' })
  @IsString()
  videoUrl: string;

  @ApiPropertyOptional({ example: 10485760 })
  @IsOptional()
  @IsNumber()
  @Max(10485760, { message: 'Video file size must be 10MB or less' })
  fileSize?: number;
}

export class CreateProductKeywordDto {
  @ApiProperty({ example: 'wireless-audio' })
  @IsString()
  keyword: string;
}

export class UpdateInventoryDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  totalStock: number;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reservedStock?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableStock?: number;
}

export class AssignCategoriesDto {
  @ApiProperty({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsArray()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    each: true,
  })
  categoryIds: string[];
}

export class AssignBrandDto {
  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'electronics' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Category for electronic devices' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/images/electronics.jpg',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  status?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'electronics' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Category for electronic devices' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/images/electronics.jpg',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  status?: boolean;
}
