import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';

// ── DTOs ────────────────────────────────────────────────────────

class InvoiceItemDto {
  @ApiProperty() @IsString() productName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() sku?: string;
  @ApiProperty() @IsNumber() @Min(1) quantity: number;
  @ApiProperty() @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tax?: number;
  @ApiProperty() @IsNumber() @Min(0) total: number;
}

class CreateInvoiceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() whatsappNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethodId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethodLabel?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) tax?: number;
  @ApiProperty() @IsNumber() @Min(0) total: number;
  @ApiProperty() @IsNumber() @Min(0) subtotal: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() billNumber?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}

// ── Controller ──────────────────────────────────────────────────

@ApiTags('Billing Invoices')
@Controller('billing/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a PDF invoice and persist to S3' })
  @ApiCreatedResponse({ description: 'Invoice created and uploaded to S3.' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all invoices (paginated)' })
  @ApiOkResponse({ description: 'Invoices listed.' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.invoiceService.findAll(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'List all available payment method options' })
  @ApiOkResponse({ description: 'Payment methods listed.' })
  listPaymentMethods() {
    return this.invoiceService.listPaymentMethods();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID (includes S3 URL)' })
  @ApiOkResponse({ description: 'Invoice fetched.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.findOne(id);
  }
}
