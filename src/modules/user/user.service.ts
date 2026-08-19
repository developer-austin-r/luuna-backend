import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { hash } from 'bcryptjs';

import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { TokenService } from '../token/token.service';
import { TokenType } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  // ========================================
  // COMMON USER SELECT
  // ========================================

  private readonly userSelect = {
    id: true,
    email: true,
    name: true,
    roleId: true,
    status: true,
    isVerified: true,
    createdAt: true,
    updatedAt: true,

    role: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  // ========================================
  // CREATE USER
  // ========================================

  async create(createUserDto: CreateUserDto) {
    // 1. Hash password
    const password = await hash(createUserDto.password, 10);

    // 2. Check whether role exists
    const role = await this.prisma.role.findUnique({
      where: {
        id: createUserDto.roleId,
      },
    });

    if (!role) {
      throw new BadRequestException('Invalid role ID');
    }

    // 3. Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password,
        roleId: createUserDto.roleId,

        // User must verify email
        isVerified: false,
      },

      select: this.userSelect,
    });

    // 4. Get verification token expiry
    const verifyExpiry = this.configService.get<number>(
      'auth.verificationExpiresInMinutes',
      1440,
    );

    // 5. Generate verification token
    const rawToken = await this.tokenService.generateToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      verifyExpiry,
    );

    // 6. Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.name || 'User',
      rawToken,
    );

    // 7. Return created user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      status: user.status,
      emailVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ========================================
  // GET ALL USERS
  // ========================================

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: this.userSelect,
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      status: user.status,
      emailVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  // ========================================
  // GET USER BY ID
  // ========================================

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },

      select: this.userSelect,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      status: user.status,
      emailVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ========================================
  // UPDATE USER
  // ========================================

  async update(id: string, updateUserDto: UpdateUserDto) {
    // Check user exists
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: {
        id,
      },

      data: {
        email: updateUserDto.email,
        name: updateUserDto.name,

        password: updateUserDto.password
          ? await hash(updateUserDto.password, 10)
          : undefined,
      },

      select: this.userSelect,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      status: user.status,
      emailVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ========================================
  // DELETE USER
  // ========================================

  async remove(id: string) {
    // Check user exists
    await this.findOne(id);

    const user = await this.prisma.user.delete({
      where: {
        id,
      },

      select: this.userSelect,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      status: user.status,
      emailVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async resendVerificationEmail(id: string) {
    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 2. Don't resend if already verified
    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // 3. Get token expiry
    const verifyExpiry = this.configService.get<number>(
      'auth.verificationExpiresInMinutes',
      1440,
    );

    // 4. Generate new verification token
    const rawToken = await this.tokenService.generateToken(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      verifyExpiry,
    );

    // 5. Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.name || 'User',
      rawToken,
    );

    // 6. Return response
    return {
      message: 'Verification email sent successfully',
    };
  }
}
