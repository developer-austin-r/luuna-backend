/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ActivitySessionMiddleware } from './activity-session.middleware';

describe('ActivitySessionMiddleware', () => {
  let middleware: ActivitySessionMiddleware;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-jwt-secret'),
  };

  beforeEach(() => {
    jwtService = mockJwtService as unknown as JwtService;
    configService = mockConfigService as unknown as ConfigService;
    middleware = new ActivitySessionMiddleware(jwtService, configService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate session_id cookie if not present', () => {
    const req = {
      cookies: {},
      headers: {},
    } as any;

    const res = {
      cookie: jest.fn(),
    } as any;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.sessionId).toBeDefined();
    expect(req.sessionId).toMatch(/^sess_/);
    expect(res.cookie).toHaveBeenCalledWith(
      'session_id',
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
      }),
    );
    expect(next).toHaveBeenCalled();
  });

  it('should reuse existing session_id cookie if present', () => {
    const req = {
      cookies: {
        session_id: 'existing-session-uuid',
      },
      headers: {},
    } as any;

    const res = {
      cookie: jest.fn(),
    } as any;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.sessionId).toBe('existing-session-uuid');
    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should verify and decode user from access_token cookie if present', () => {
    const mockUser = {
      sub: 'user-uuid',
      email: 'test@example.com',
      role: 'Client',
    };
    mockJwtService.verify.mockReturnValue(mockUser);

    const req = {
      cookies: {
        session_id: 'existing-session-uuid',
        access_token: 'valid.jwt.token',
      },
      headers: {},
    } as any;

    const res = {
      cookie: jest.fn(),
    } as any;

    const next = jest.fn();

    middleware.use(req, res, next);

    expect(jwtService.verify).toHaveBeenCalledWith('valid.jwt.token', {
      secret: 'mock-jwt-secret',
    });
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });
});
