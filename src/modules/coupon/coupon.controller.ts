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
  @ApiOperation({
    summary: 'Validate coupon activation and expiration',
    description:
      'Checks if a coupon is active, within valid date range, and ready for use.',
  })
  @ApiOkResponse({ description: 'Coupon validation status returned.' })
  validate(
    @Param('code') code: string,
    @Query('orderAmount') orderAmount?: string,
  ) {
    const amount = orderAmount ? parseFloat(orderAmount) : 0;
    return this.couponService.validate(code, isNaN(amount) ? 0 : amount);
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
