import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator to restrict an endpoint to specific roles.
 *
 * Usage:
 *   @Roles('Admin')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Get('admin-only')
 *   adminOnly() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
