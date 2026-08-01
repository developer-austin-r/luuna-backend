import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    super({
      // Extract access token from the HttpOnly cookie.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const token = (req?.cookies as Record<string, string>)?.access_token;
          return token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret')!,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    // passport-jwt passes the decoded payload — cast explicitly to avoid
    // @typescript-eslint/no-unsafe-return on the `any` bleed-through.
    return payload;
  }
}
