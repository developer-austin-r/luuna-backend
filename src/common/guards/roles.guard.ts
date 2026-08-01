import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * RolesGuard enforces role-based access control.
 * Must be used **after** JwtAuthGuard so that request.user is populated.
 *
 * If no @Roles() decorator is present on the handler or class, access is
 * granted (the endpoint is role-agnostic, only auth-agnostic if no JwtAuthGuard).
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles('Admin')
 *   @Get('admin-only')
 *   adminOnly() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() specified — allow access.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('Access denied.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied.');
    }

    return true;
  }
}
