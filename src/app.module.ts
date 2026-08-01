import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorageModule } from './common/storage/storage.module';
import configuration from './configuration';
import { validationSchema } from './common/constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
      validationSchema,
      expandVariables: true,
    }),
    StorageModule,
    PrismaModule,
    AuthModule,
    UserModule,
    ProductModule,
    CouponModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
