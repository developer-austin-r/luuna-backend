import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import type { Response } from 'express';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { TokenService } from '../token/token.service';
import { EmailService } from '../email/email.service';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenType, TokenStatus } from '@prisma/client';
import * as crypto from 'crypto';

const INVALID_CREDENTIALS = 'Invalid email or password.';
const EMAIL_NOT_VERIFIED = 'Email is not verified. Please check your inbox.';

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly maxLoginAttempts: number;
  private readonly lockDurationMinutes: number;
  private readonly cookieSecure: boolean;
  private readonly cookieSameSite: 'lax' | 'strict' | 'none';
  private readonly cookieDomain: string | undefined;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {
    this.jwtSecret = this.configService.get<string>('auth.jwtSecret')!;
    this.jwtRefreshSecret = this.configService.get<string>('auth.jwtRefreshSecret')!;
    this.accessExpiresIn = this.configService.get<string>('auth.jwtAccessExpiresIn')!;
    this.refreshExpiresIn = this.configService.get<string>('auth.jwtRefreshExpiresIn')!;
    this.maxLoginAttempts = this.configService.get<number>('auth.maxLoginAttempts')!;
    this.lockDurationMinutes = this.configService.get<number>('auth.lockDurationMinutes')!;
    this.cookieSecure = this.configService.get<boolean>('auth.cookieSecure')!;
    this.cookieSameSite = (this.configService.get<string>('auth.cookieSameSite') ?? 'Lax').toLowerCase() as 'lax' | 'strict' | 'none';
    this.cookieDomain = this.configService.get<string>('auth.cookieDomain');
  }

  async signup(dto: SignupDto, ipAddress?: string, userAgent?: string): Promise<string> {
    const existingUser = await this.authRepository.findUserByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const bcryptRounds = this.configService.get<number>('auth.bcryptRounds', 10);
    const passwordHash = await hash(dto.password, bcryptRounds);

    const user = await this.authRepository.createUser({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      isVerified: false,
    });

    const verifyExpiry = this.configService.get<number>('auth.verificationExpiresInMinutes', 1440);
    const rawToken = await this.tokenService.generateToken(user.id, TokenType.EMAIL_VERIFICATION, verifyExpiry, ipAddress, userAgent);

    await this.emailService.sendWelcomeEmail(user.email, user.name || 'User');
    await this.emailService.sendVerificationEmail(user.email, user.name || 'User', rawToken);

    return 'Registration successful. Please check your email to verify your account.';
  }

  async validateVerifyEmailToken(token: string): Promise<string> {
    return this.tokenService.getValidationStatus(token, TokenType.EMAIL_VERIFICATION);
  }

  async verifyEmail(token: string): Promise<string> {
    const matchedToken = await this.tokenService.validateToken(token, TokenType.EMAIL_VERIFICATION);
    await this.authRepository.verifyUser(matchedToken.userId);
    await this.tokenService.markAsUsed(matchedToken.id);
    return 'Your email has been verified successfully.';
  }

  async login(dto: LoginDto, res: Response, ipAddress?: string, userAgent?: string): Promise<{ user: SafeUser }> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user) {
      await compare(dto.password, '$2a$10$dummyhashforinvalidemailabcdefghij');
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(EMAIL_NOT_VERIFIED);
    }

    const isPasswordValid = await compare(dto.password, user.password);

    if (!isPasswordValid) {
      const newAttempts = user.failedAttempts + 1;
      const lockedUntil =
        newAttempts >= this.maxLoginAttempts
          ? new Date(Date.now() + this.lockDurationMinutes * 60 * 1000)
          : null;

      await this.authRepository.incrementFailedAttempts(user.id, lockedUntil);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    await this.authRepository.resetFailedAttempts(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? null,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshTokenPayload = { ...payload, type: 'refresh' };
    const refreshToken = this.generateRefreshToken(refreshTokenPayload);
    
    // Store refresh token in db
    await this.tokenService.generateToken(user.id, TokenType.REFRESH_TOKEN, this.parseDurationToMinutes(this.refreshExpiresIn), ipAddress, userAgent);

    this.setAuthCookies(res, accessToken, refreshToken, dto.rememberMe ?? false);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.name ?? null,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string, userAgent?: string): Promise<string> {
    const user = await this.authRepository.findUserByEmail(dto.email);
    // Never reveal whether the email exists
    if (user) {
      const resetExpiry = this.configService.get<number>('auth.resetExpiresInMinutes', 60);
      const rawToken = await this.tokenService.generateToken(user.id, TokenType.PASSWORD_RESET, resetExpiry, ipAddress, userAgent);
      await this.emailService.sendForgotPasswordEmail(user.email, user.name || 'User', rawToken);
    }

    return 'If the account exists, a reset link has been sent.';
  }

  async validateResetToken(token: string): Promise<string> {
    return this.tokenService.getValidationStatus(token, TokenType.PASSWORD_RESET);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<string> {
    const matchedToken = await this.tokenService.validateToken(dto.token, TokenType.PASSWORD_RESET);
    
    const bcryptRounds = this.configService.get<number>('auth.bcryptRounds', 10);
    const newPasswordHash = await hash(dto.password, bcryptRounds);

    await this.authRepository.updateUserPassword(matchedToken.userId, newPasswordHash);
    await this.tokenService.markAsUsed(matchedToken.id);
    
    // Invalidate all refresh tokens for this user
    await this.tokenService.revokeAllUserRefreshTokens(matchedToken.userId);

    const user = await this.authRepository.findUserById(matchedToken.userId);
    if (user) {
      await this.emailService.sendPasswordChangedEmail(user.email, user.name || 'User');
    }

    return 'Password reset successful.';
  }

  async refresh(payload: JwtPayload, res: Response, ipAddress?: string, userAgent?: string): Promise<{ user: SafeUser }> {
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user || !user.isVerified || (user.lockedUntil && user.lockedUntil > new Date())) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? null,
    };

    const accessToken = this.generateAccessToken(newPayload);
    const refreshTokenPayload = { ...newPayload, type: 'refresh' };
    const refreshToken = this.generateRefreshToken(refreshTokenPayload);

    await this.tokenService.generateToken(user.id, TokenType.REFRESH_TOKEN, this.parseDurationToMinutes(this.refreshExpiresIn), ipAddress, userAgent);

    this.setAuthCookies(res, accessToken, refreshToken, true);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.name ?? null,
      },
    };
  }

  async logout(userId: string, res: Response): Promise<void> {
    // Optionally we can find the specific refresh token by hash if we had passed it,
    // but without the refresh token we can't easily revoke a single session.
    this.clearAuthCookies(res);
  }

  async logoutAll(userId: string, res: Response): Promise<void> {
    await this.tokenService.revokeAllUserRefreshTokens(userId);
    this.clearAuthCookies(res);
  }

  // Helpers
  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  private generateRefreshToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string, persistRefresh: boolean): void {
    const baseOptions = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      domain: this.cookieDomain || undefined,
      path: '/',
    };

    res.cookie('access_token', accessToken, { ...baseOptions, maxAge: this.parseDurationToMs(this.accessExpiresIn) });
    res.cookie('refresh_token', refreshToken, { ...baseOptions, ...(persistRefresh ? { maxAge: this.parseDurationToMs(this.refreshExpiresIn) } : {}) });
  }

  private clearAuthCookies(res: Response): void {
    const baseOptions = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      domain: this.cookieDomain || undefined,
      path: '/',
    };

    res.cookie('access_token', '', { ...baseOptions, maxAge: 0 });
    res.cookie('refresh_token', '', { ...baseOptions, maxAge: 0 });
  }

  private parseDurationToMs(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return value * 1000;
    }
  }

  private parseDurationToMinutes(duration: string): number {
    const ms = this.parseDurationToMs(duration);
    return Math.floor(ms / (60 * 1000));
  }
}
