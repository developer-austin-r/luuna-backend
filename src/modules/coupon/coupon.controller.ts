import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateCouponDto, UpdateCouponDto } from './dto';
import { CouponService } from './coupon.service';

@ApiTags('coupons')
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Coupon created successfully.' })
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.create(createCouponDto);
  }

  @Get()
  @ApiOkResponse({ description: 'Returns all coupons.' })
  findAll() {
    return this.couponService.findAll();
  }

  @Get('validate/:code')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Validate coupon activation and expiration',
    description:
      'Checks if a coupon is active, within valid date range, and ready for use. Rate limited to 10 requests per minute.',
  })
  @ApiOkResponse({ description: 'Sanitized coupon validation summary.' })
  validate(
    @Param('code') code: string,
    @Query('orderAmount') orderAmount?: string,
    @Query('mode') mode?: 'checkout' | 'lookup',
  ) {
    const parsedAmount =
      orderAmount !== undefined ? parseFloat(orderAmount) : undefined;
    return this.couponService.validate({
      code,
      orderAmount: parsedAmount,
      mode,
    });
  }

  @Post('redeem/:code')
  @ApiOperation({
    summary: 'Atomically redeem a coupon',
    description:
      'Atomically claims a coupon redemption during checkout ensuring limits cannot be exceeded.',
  })
  @ApiOkResponse({ description: 'Coupon redeemed successfully.' })
  redeem(
    @Param('code') code: string,
    @Body('orderAmount') orderAmount: number,
  ) {
    return this.couponService.redeemCoupon(code, orderAmount);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Returns a coupon by ID.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Coupon updated successfully.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Coupon deleted successfully.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponService.remove(id);
  }
}
