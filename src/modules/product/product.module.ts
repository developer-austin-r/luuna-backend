import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { BarcodeService } from './barcode.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [PrismaModule, ActivityLogModule],
  controllers: [ProductController],
  providers: [ProductService, BarcodeService],
  exports: [ProductService, BarcodeService],
})
export class ProductModule {}
