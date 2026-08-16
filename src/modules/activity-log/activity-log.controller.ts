import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActivityLogService } from './activity-log.service';

@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async getLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('moduleId') moduleId?: string,
    @Query('actionId') actionId?: string,
    @Query('deviceType') deviceType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.activityLogService.getLogs({
      page,
      limit,
      search,
      moduleId,
      actionId,
      deviceType,
      startDate,
      endDate,
    });
  }

  @Get('filters')
  async getFilters() {
    return this.activityLogService.getFilters();
  }
}
