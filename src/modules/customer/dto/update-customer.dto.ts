import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'ACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateCustomerStatusDto {
  @ApiPropertyOptional({ enum: ['active', 'suspended', 'ACTIVE', 'SUSPENDED'] })
  @IsString()
  status: string;
}
