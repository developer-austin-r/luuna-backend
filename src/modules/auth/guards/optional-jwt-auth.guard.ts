import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class OptionalJwtAuthGuard extends JwtAuthGuard {
  handleRequest<T>(error: unknown, user: T | false | null): T {
    if (error instanceof Error) throw error;
    if (error) throw new InternalServerErrorException();
    return (user || null) as T;
  }
}
