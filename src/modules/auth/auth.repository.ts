import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findUserByEmail(email: string) {
    console.log(`[DEBUG] Checking if email exists (incoming): ${email}`);
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isVerified: true,
        failedAttempts: true,
        lockedUntil: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    console.log(`[DEBUG] Query result for ${email}:`, user ? `Found (ID: ${user.id})` : 'Not found');
    return user;
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async incrementFailedAttempts(
    userId: string,
    lockedUntil: Date | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: { increment: 1 },
        lockedUntil,
      },
    });
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async verifyUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
  }

  async updateUserPassword(
    userId: string,
    newPasswordHash: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash },
    });
  }
}
