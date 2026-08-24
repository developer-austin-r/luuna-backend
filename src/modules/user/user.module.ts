import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

import { ActivityLogModule } from '../activity-log/activity-log.module';

import { EmailModule } from '../email/email.module';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [PrismaModule, ActivityLogModule, EmailModule, TokenModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
