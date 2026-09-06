import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillStatus } from '@prisma/client';

export class BillQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search by bill number or customer name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO string)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
