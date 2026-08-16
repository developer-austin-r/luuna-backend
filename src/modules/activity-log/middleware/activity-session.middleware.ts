import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

@Injectable()
export class ActivitySessionMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const cookies = req.cookies as Record<string, string> | undefined;
    // 1. Resolve Session ID
    let sessionId = cookies?.session_id;

    if (!sessionId) {
      sessionId = `sess_${randomUUID()}`;
      // Set secure cookie valid for 1 year
      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        secure:
          isProduction ||
          req.secure ||
          req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      });
    }

    req.sessionId = sessionId;

    // 2. Decode/verify JWT payload to identify authenticated user (if not already set)
    if (!req.user) {
      const token = cookies?.access_token;
      if (token) {
        try {
          const secret = this.configService.get<string>('auth.jwtSecret');
          const payload = this.jwtService.verify(token, { secret }) as Record<string, unknown>;
          req.user = payload;
        } catch {
          // Token invalid or expired, ignore and proceed as guest (user_id = null)
        }
      }
    }

    next();
  }
}
