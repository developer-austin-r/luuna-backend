import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BillingService } from './billing.service';
import { CreateBillDto, BillQueryDto } from './dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new bill (POS sale)' })
  @ApiCreatedResponse({ description: 'Bill created successfully.' })
  async create(@Body() dto: CreateBillDto, @CurrentUser() user?: JwtPayload) {
    if (user?.sub && !dto.billedBy) {
      dto.billedBy = user.sub;
    }
    return this.billingService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of bills with filters' })
  @ApiOkResponse({ description: 'Bills fetched successfully.' })
  async findAll(@Query() query: BillQueryDto) {
    return this.billingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bill details by ID' })
  @ApiOkResponse({ description: 'Bill fetched successfully.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.findOne(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a bill' })
  @ApiOkResponse({ description: 'Bill cancelled.' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.billingService.cancel(id);
  }
}
