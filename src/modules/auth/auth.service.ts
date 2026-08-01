import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { Response } from 'express';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

/** Generic error message — never reveal which field is wrong. */
const INVALID_CREDENTIALS = 'Invalid email or password.';

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
  ) {
    this.jwtSecret = this.configService.get<string>('auth.jwtSecret')!;
    this.jwtRefreshSecret = this.configService.get<string>(
      'auth.jwtRefreshSecret',
    )!;
    this.accessExpiresIn = this.configService.get<string>(
      'auth.jwtAccessExpiresIn',
    )!;
    this.refreshExpiresIn = this.configService.get<string>(
      'auth.jwtRefreshExpiresIn',
    )!;
    this.maxLoginAttempts = this.configService.get<number>(
      'auth.maxLoginAttempts',
    )!;
    this.lockDurationMinutes = this.configService.get<number>(
      'auth.lockDurationMinutes',
    )!;
    this.cookieSecure = this.configService.get<boolean>('auth.cookieSecure')!;
    this.cookieSameSite = (
      this.configService.get<string>('auth.cookieSameSite') ?? 'Lax'
    ).toLowerCase() as 'lax' | 'strict' | 'none';
    this.cookieDomain = this.configService.get<string>('auth.cookieDomain');
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto, res: Response): Promise<{ user: SafeUser }> {
    const user = await this.authRepository.findUserByEmail(dto.email);

    // User not found — return generic error (no timing difference exposed
    // because bcrypt compare is still called with a dummy hash).
    if (!user) {
      // Perform a dummy compare to prevent timing attacks.
      await compare(dto.password, '$2a$10$dummyhashforinvalidemailabcdefghij');
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // Account locked — silently treat as invalid credentials.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
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

    // Successful login — reset counters.
    await this.authRepository.resetFailedAttempts(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? null,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    this.setAuthCookies(
      res,
      accessToken,
      refreshToken,
      dto.rememberMe ?? false,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role?.name ?? null,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  async refresh(
    payload: JwtPayload,
    res: Response,
  ): Promise<{ user: SafeUser }> {
    // Fetch fresh user data to ensure account still valid.
    const user = await this.authRepository.findUserByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? null,
    };

    const accessToken = this.generateAccessToken(newPayload);
    const refreshToken = this.generateRefreshToken(newPayload);

    // Rotate both tokens on refresh.
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

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  logout(res: Response): void {
    this.clearAuthCookies(res);
  }

  // ---------------------------------------------------------------------------
  // Token helpers
  // ---------------------------------------------------------------------------

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.jwtSecret,
        expiresIn: this.accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: this.refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Cookie helpers
  // ---------------------------------------------------------------------------

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    persistRefresh: boolean,
  ): void {
    const baseOptions = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: this.cookieSameSite,
      domain: this.cookieDomain || undefined,
      path: '/',
    };

    // Access token — always short-lived; use expiresIn from config.
    res.cookie('access_token', accessToken, {
      ...baseOptions,
      maxAge: this.parseDurationToMs(this.accessExpiresIn),
    });

    // Refresh token — persistent only when rememberMe is true.
    res.cookie('refresh_token', refreshToken, {
      ...baseOptions,
      ...(persistRefresh
        ? { maxAge: this.parseDurationToMs(this.refreshExpiresIn) }
        : {}),
    });
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

  /**
   * Convert JWT duration strings like '15m', '7d', '1h' to milliseconds.
   */
  private parseDurationToMs(duration: string): number {
    const unit = duration.slice(-1);
    const value = parseInt(duration.slice(0, -1), 10);
    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 1000;
    }
  }
}

// ---------------------------------------------------------------------------
// Shared type
// ---------------------------------------------------------------------------
export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
};
