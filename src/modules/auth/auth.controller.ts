import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Authenticates a user and sets HttpOnly cookie tokens.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Successfully authenticated.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(loginDto, res);
  }

  /**
   * POST /auth/refresh
   * Uses the HttpOnly refresh token cookie to issue new tokens.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ description: 'Tokens refreshed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token.' })
  refresh(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(user, res);
  }

  /**
   * POST /auth/logout
   * Clears all auth cookies.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Logged out successfully.' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.authService.logout(res);
    return { message: 'Logged out successfully.' };
  }
}
