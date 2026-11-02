import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

import { compare, hash } from 'bcryptjs';

import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { TokenService } from '../token/token.service';

import { Prisma, TokenType } from '@prisma/client';

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
    const password = await hash(createUserDto.password, 10);

    const role = await this.prisma.role.findUnique({
      where: {
        id: createUserDto.roleId,
      },
    });

    if (!role) {
      throw new BadRequestException('Invalid role ID');
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

    const verifyExpiry = this.configService.get<number>(
      'auth.verificationExpiresInMinutes',
      1440,
    );

    const rawToken = await this.tokenService.generateToken(
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

    const where: Prisma.UserWhereInput = {};

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

    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'name';

    const safeSortDir = sortDir === 'desc' ? 'desc' : 'asc';

    // ========================================
    // GET DATA + COUNT
    // ========================================

    const [users, total] = await this.prisma.$transaction([
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

    const totalPages = Math.ceil(total / limit);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage: page < totalPages,

        hasPreviousPage: page > 1,
      },
    };
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
  // GET PROFILE (WITH USERPROFILE RELATION)
  // ========================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
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
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
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
      profile: user.profile
        ? {
            id: user.profile.id,
            mobileNumber: user.profile.mobileNumber,
            dateOfBirth: user.profile.dateOfBirth
              ? user.profile.dateOfBirth.toISOString().split('T')[0]
              : null,
            gender: user.profile.gender,
            address: user.profile.address,
            district: user.profile.district,
            state: user.profile.state,
            pincode: user.profile.pincode,
            profileImageUrl: user.profile.profileImageUrl,
            createdAt: user.profile.createdAt,
            updatedAt: user.profile.updatedAt,
          }
        : null,
    };
  }

  // ========================================
  // UPDATE PROFILE (TRANSACTIONAL)
  // ========================================

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const {
      firstName,
      lastName,
      mobileNumber,
      dateOfBirth,
      gender,
      address,
      district,
      state,
      pincode,
      profileImageUrl,
    } = updateProfileDto;

    let dobDate: Date | null | undefined = undefined;
    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const parsed = new Date(dateOfBirth);
        dobDate = isNaN(parsed.getTime()) ? null : parsed;
      } else {
        dobDate = null;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update user.name if firstName or lastName was supplied
      if (firstName !== undefined || lastName !== undefined) {
        const fullName = [firstName?.trim(), lastName?.trim()]
          .filter(Boolean)
          .join(' ');

        await tx.user.update({
          where: { id: userId },
          data: {
            name: fullName || null,
          },
        });
      }

      // 2. Upsert userProfile record
      const profile = await tx.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          mobileNumber: mobileNumber ?? null,
          dateOfBirth: dobDate ?? null,
          gender: gender ?? null,
          address: address ?? null,
          district: district ?? null,
          state: state ?? null,
          pincode: pincode ?? null,
          profileImageUrl: profileImageUrl ?? null,
        },
        update: {
          ...(mobileNumber !== undefined && {
            mobileNumber: mobileNumber || null,
          }),
          ...(dobDate !== undefined && {
            dateOfBirth: dobDate,
          }),
          ...(gender !== undefined && {
            gender: gender || null,
          }),
          ...(address !== undefined && {
            address: address || null,
          }),
          ...(district !== undefined && {
            district: district || null,
          }),
          ...(state !== undefined && {
            state: state || null,
          }),
          ...(pincode !== undefined && {
            pincode: pincode || null,
          }),
          ...(profileImageUrl !== undefined && {
            profileImageUrl: profileImageUrl || null,
          }),
        },
      });

      // 3. Fetch latest user details
      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
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
        },
      });

      return {
        id: updatedUser?.id,
        email: updatedUser?.email,
        name: updatedUser?.name,
        roleId: updatedUser?.roleId,
        roleName: updatedUser?.role?.name ?? '',
        status: updatedUser?.status,
        emailVerified: updatedUser?.isVerified,
        createdAt: updatedUser?.createdAt,
        updatedAt: updatedUser?.updatedAt,
        profile: {
          id: profile.id,
          mobileNumber: profile.mobileNumber,
          dateOfBirth: profile.dateOfBirth
            ? profile.dateOfBirth.toISOString().split('T')[0]
            : null,
          gender: profile.gender,
          address: profile.address,
          district: profile.district,
          state: profile.state,
          pincode: profile.pincode,
          profileImageUrl: profile.profileImageUrl,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    });
  }

  // ========================================
  // UPDATE USER
  // ========================================

  async update(id: string, updateUserDto: UpdateUserDto) {
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

  // ========================================
  // RESEND VERIFICATION
  // ========================================

  async resendVerificationEmail(id: string) {
    const user = await this.prisma.user.findUnique({
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
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (user.isVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verifyExpiry = this.configService.get<number>(
      'auth.verificationExpiresInMinutes',
      1440,
    );

    const rawToken = await this.tokenService.generateToken(
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
      message: 'Verification email sent successfully',
    };
  }

  // ========================================
  // CHANGE PASSWORD (PROFILE)
  // ========================================

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check if new password is identical to current password
    const isSamePassword = await compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be the same as your current password',
      );
    }

    // Hash the new password with configured bcrypt rounds
    const bcryptRounds = this.configService.get<number>(
      'auth.bcryptRounds',
      10,
    );
    const hashedPassword = await hash(
      changePasswordDto.newPassword,
      bcryptRounds,
    );

    // Update user password in DB table
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    // Revoke all active refresh tokens for this user
    await this.tokenService.revokeAllUserRefreshTokens(userId);

    // Send confirmation email
    await this.emailService.sendPasswordChangedEmail(
      user.email,
      user.name || 'User',
    );

    return {
      message: 'Password changed successfully',
    };
  }
}
