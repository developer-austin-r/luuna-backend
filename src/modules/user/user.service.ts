import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

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
  ) { }

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
    const password = await hash(
      createUserDto.password,
      10,
    );

    const role = await this.prisma.role.findUnique({
      where: {
        id: createUserDto.roleId,
      },
    });

    if (!role) {
      throw new BadRequestException(
        'Invalid role ID',
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password,
        roleId: createUserDto.roleId,
        isVerified: false,
      },

      select: this.userSelect,
    });

    const verifyExpiry =
      this.configService.get<number>(
        'auth.verificationExpiresInMinutes',
        1440,
      );

    const rawToken =
      await this.tokenService.generateToken(
        user.id,
        TokenType.EMAIL_VERIFICATION,
        verifyExpiry,
      );

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name || 'User',
      rawToken,
    );

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
  // GET USERS
  // PAGINATION + SEARCH + ROLE + SORT
  // ========================================

  async findAll(query: GetUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 5;

    const skip = (page - 1) * limit;

    const search = query.search?.trim() ?? '';
    const role = query.role?.trim() ?? '';

    const sortBy = query.sortBy ?? 'name';
    const sortDir = query.sortDir ?? 'asc';

    // ========================================
    // WHERE CONDITION
    // ========================================

    const where: any = {};

    // Search
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          status: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          role: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Role filter
    if (role) {
      where.role = {
        name: {
          equals: role,
          mode: 'insensitive',
        },
      };
    }

    // ========================================
    // SORT
    // ========================================

    const allowedSortFields = [
      'name',
      'email',
      'status',
      'createdAt',
      'updatedAt',
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : 'name';

    const safeSortDir =
      sortDir === 'desc'
        ? 'desc'
        : 'asc';

    // ========================================
    // GET DATA + COUNT
    // ========================================

    const [users, total] =
      await this.prisma.$transaction([
        this.prisma.user.findMany({
          where,

          skip,

          take: limit,

          orderBy: {
            [safeSortBy]: safeSortDir,
          },

          select: this.userSelect,
        }),

        this.prisma.user.count({
          where,
        }),
      ]);

    // ========================================
    // FORMAT USERS
    // ========================================

    const data = users.map((user) => ({
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

    // ========================================
    // PAGINATION DETAILS
    // ========================================

    const totalPages =
      Math.ceil(total / limit);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,
      },
    };
  }

  // ========================================
  // GET USER BY ID
  // ========================================

  async findOne(id: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        select: this.userSelect,
      });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found`,
      );
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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ) {
    await this.findOne(id);

    const user =
      await this.prisma.user.update({
        where: {
          id,
        },

        data: {
          email: updateUserDto.email,
          name: updateUserDto.name,

          password:
            updateUserDto.password
              ? await hash(
                updateUserDto.password,
                10,
              )
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
    await this.findOne(id);

    const user =
      await this.prisma.user.delete({
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

  // ========================================
  // RESEND VERIFICATION
  // ========================================

  async resendVerificationEmail(id: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${id} not found`,
      );
    }

    if (user.isVerified) {
      throw new BadRequestException(
        'Email is already verified',
      );
    }

    const verifyExpiry =
      this.configService.get<number>(
        'auth.verificationExpiresInMinutes',
        1440,
      );

    const rawToken =
      await this.tokenService.generateToken(
        user.id,
        TokenType.EMAIL_VERIFICATION,
        verifyExpiry,
      );

    await this.emailService.sendVerificationEmail(
      user.email,
      user.name || 'User',
      rawToken,
    );

    return {
      message:
        'Verification email sent successfully',
    };
  }
}
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
