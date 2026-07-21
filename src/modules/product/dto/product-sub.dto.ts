import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://example.com/images/product-1.jpg' })
  @IsString()
  imageUrl: string;

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

  @ApiProperty({ example: 'Main Warehouse' })
  @IsString()
  warehouse: string;
}

export class AssignCategoriesDto {
  @ApiProperty({ example: ['123e4567-e89b-12d3-a456-426614174001'] })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds: string[];
}

export class AssignBrandDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000', nullable: true })
  @IsOptional()
  @IsUUID()
  brandId?: string | null;
}
