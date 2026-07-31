import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
