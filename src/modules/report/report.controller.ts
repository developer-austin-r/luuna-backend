import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportService } from './report.service';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('sales')
  async getSalesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getSalesReport(startDate, endDate);
  }
}
