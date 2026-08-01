import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TokenType, TokenStatus, Token } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async generateToken(
    userId: string,
    tokenType: TokenType,
    expiresInMinutes: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

    await this.prisma.token.create({
      data: {
        userId,
        tokenHash,
        tokenType,
        expiresAt,
        ipAddress,
        userAgent,
        status: TokenStatus.ACTIVE,
      },
    });

    return rawToken;
  }

  async validateToken(rawToken: string, tokenType: TokenType): Promise<Token> {
    const tokenHash = this.hashToken(rawToken);

    const matchedToken = await this.prisma.token.findFirst({
      where: {
        tokenHash,
        tokenType,
      },
    });

    if (!matchedToken) {
      throw new BadRequestException('INVALID');
    }

    if (matchedToken.status === TokenStatus.USED) {
      throw new BadRequestException('USED');
    }

    if (matchedToken.status === TokenStatus.REVOKED) {
      throw new BadRequestException('INVALID');
    }

    if (matchedToken.expiresAt < new Date()) {
      await this.markAsExpired(matchedToken.id);
      throw new BadRequestException('EXPIRED');
    }

    return matchedToken;
  }

  async getValidationStatus(rawToken: string, tokenType: TokenType): Promise<string> {
    const tokenHash = this.hashToken(rawToken);

    const matchedToken = await this.prisma.token.findFirst({
      where: {
        tokenHash,
        tokenType,
      },
    });

    if (!matchedToken || matchedToken.status === TokenStatus.REVOKED) {
      return 'INVALID';
    }

    if (matchedToken.status === TokenStatus.USED) {
      return 'USED';
    }

    if (matchedToken.expiresAt < new Date()) {
      return 'EXPIRED';
    }

    return 'VALID';
  }

  async markAsUsed(tokenId: string): Promise<void> {
    await this.prisma.token.update({
      where: { id: tokenId },
      data: { status: TokenStatus.USED, usedAt: new Date() },
    });
  }

  async markAsExpired(tokenId: string): Promise<void> {
    await this.prisma.token.update({
      where: { id: tokenId },
      data: { status: TokenStatus.EXPIRED },
    });
  }

  async revokeAllUserTokensOfType(userId: string, tokenType: TokenType): Promise<void> {
    await this.prisma.token.updateMany({
      where: {
        userId,
        tokenType,
        status: TokenStatus.ACTIVE,
      },
      data: {
        status: TokenStatus.REVOKED,
      },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.revokeAllUserTokensOfType(userId, TokenType.REFRESH_TOKEN);
  }
}
