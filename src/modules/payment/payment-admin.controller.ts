import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaymentRecordStatus } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRefundDto } from './dto/payment.dto';
import { PaymentService } from './payment.service';
import { HttpsOnlyGuard } from './https-only.guard';

@ApiTags('admin payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HttpsOnlyGuard, RolesGuard)
@Roles('Admin')
@Controller('admin/payments')
export class PaymentAdminController {
  constructor(private readonly payments: PaymentService) {}

  @Get('failed')
  failed() {
    return this.payments.adminPayments(PaymentRecordStatus.FAILED);
  }

  @Get('reconciliation')
  reconciliation() {
    return this.payments.reconcile();
  }

  @Get('failed-webhooks')
  failedWebhooks() {
    return this.payments.failedWebhooks();
  }

  @Post('failed-webhooks/:id/reprocess')
  reprocessWebhook(@Param('id') id: string) {
    return this.payments.reprocessWebhook(id);
  }

  @Get('failed-outbox-events')
  failedOutboxEvents() {
    return this.payments.failedOutboxEvents();
  }

  @Post('failed-outbox-events/:id/reprocess')
  reprocessOutboxEvent(@Param('id') id: string) {
    return this.payments.reprocessOutboxEvent(id);
  }

  @Get()
  list() {
    return this.payments.adminPayments();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payments.adminPayment(id);
  }
}

@ApiTags('admin refunds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HttpsOnlyGuard, RolesGuard)
@Roles('Admin')
@Controller('admin/refunds')
export class RefundController {
  constructor(private readonly payments: PaymentService) {}

  @Post()
  create(
    @Body() dto: CreateRefundDto,
    @CurrentUser() user: JwtPayload,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.payments.createRefund(
      dto.paymentId,
      dto.amount,
      user.sub,
      key,
      dto.reason,
    );
  }

  @Get()
  list() {
    return this.payments.adminRefunds();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payments.adminRefund(id);
  }
}
