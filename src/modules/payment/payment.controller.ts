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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InitiatePaymentDto, VerifyPaymentDto } from './dto/payment.dto';
import { PaymentService } from './payment.service';
import { HttpsOnlyGuard } from './https-only.guard';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, HttpsOnlyGuard)
@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post('initiate')
  initiate(
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: JwtPayload,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.payments.initiate(dto.orderId, user.sub, key);
  }

  @Post('verify')
  verify(@Body() dto: VerifyPaymentDto, @CurrentUser() user: JwtPayload) {
    return this.payments.verify(user.sub, dto);
  }

  @Get('history')
  history(@CurrentUser() user: JwtPayload) {
    return this.payments.history(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.payments.findOwned(id, user.sub);
  }

  @Get(':id/invoice')
  invoice(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.payments.invoiceDownload(id, user.sub);
  }
}
