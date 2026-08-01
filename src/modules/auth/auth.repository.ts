import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by email, including their role and auth-related fields.
   * Always returns these fields so the service can make timing-safe decisions.
   */
  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
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
  }

  /** Increment failed login attempts and optionally set lockedUntil. */
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

  /** Reset failed attempts and clear the lock after a successful login. */
  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}
