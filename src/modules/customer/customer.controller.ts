import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CustomerService } from './customer.service';
import { GetCustomersQueryDto } from './dto/get-customers-query.dto';
import {
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
} from './dto/update-customer.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string };
  sessionId?: string;
}

@ApiTags('Admin Customers')
@Controller('admin/customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get paginated list of customers (normal users) with orders count & total spent',
  })
  @ApiOkResponse({ description: 'Customers list returned successfully.' })
  async findAll(@Query() query: GetCustomersQueryDto) {
    return this.customerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single customer profile and order history' })
  @ApiOkResponse({ description: 'Customer details returned successfully.' })
  async findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer personal info or status' })
  @ApiOkResponse({ description: 'Customer updated successfully.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const updated = await this.customerService.update(id, dto);

    try {
      await this.activityLogService.log({
        userId: req.user?.sub || undefined,
        sessionId: req.sessionId,
        moduleName: 'customers',
        actionName: 'customer_updated',
        entityId: id,
        description: `Updated customer "${updated.name}" (${updated.email})`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch {
      // Activity logging error ignored
    }

    return updated;
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Toggle customer account status (active / suspended)',
  })
  @ApiOkResponse({ description: 'Status updated successfully.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.customerService.updateStatus(id, dto.status);

    try {
      await this.activityLogService.log({
        userId: req.user?.sub || undefined,
        sessionId: req.sessionId,
        moduleName: 'customers',
        actionName: 'customer_status_changed',
        entityId: id,
        description: `Customer account status updated to ${result.status}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch {
      // Activity logging error ignored
    }

    return result;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer account' })
  @ApiOkResponse({ description: 'Customer deleted successfully.' })
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const result = await this.customerService.remove(id);

    try {
      await this.activityLogService.log({
        userId: req.user?.sub || undefined,
        sessionId: req.sessionId,
        moduleName: 'customers',
        actionName: 'customer_deleted',
        entityId: id,
        description: `Customer with ID ${id} was deleted`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch {
      // Activity logging error ignored
    }

    return result;
  }
}
