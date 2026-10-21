/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class Auth0Guard extends AuthGuard('auth0') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Bypass passport-auth0's strict session requirement
    if (!request.session) {
      request.session = {};
    }

    const connection = request.query.connection;
    return {
      connection: connection || undefined,
      scope: 'openid profile email',
      state: 'dummy_state',
    };
  }
}
