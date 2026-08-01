import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Registration successful. Please check your email to verify your account.' })
  @ApiConflictResponse({ description: 'Email already in use' })
  signup(@Body() signupDto: SignupDto, @Req() req: Request) {
    return this.authService.signup(signupDto, req.ip, req.headers['user-agent']);
  }

  @Get('verify-email/validate')
  @ApiOkResponse({ description: 'Returns VALID, EXPIRED, USED, or INVALID' })
  validateVerifyEmailToken(@Query('token') token: string) {
    return this.authService.validateVerifyEmailToken(token);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Your email has been verified successfully.' })
  @ApiBadRequestResponse({ description: 'Token invalid, used, or expired' })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Successfully authenticated.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  login(@Body() loginDto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(loginDto, res, req.ip, req.headers['user-agent']);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'If the account exists, a reset link has been sent.' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(forgotPasswordDto, req.ip, req.headers['user-agent']);
  }

  @Get('reset-password/validate')
  @ApiOkResponse({ description: 'Returns VALID, EXPIRED, USED, or INVALID' })
  validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Password reset successful.' })
  @ApiBadRequestResponse({ description: 'Token invalid, used, or expired' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ description: 'Tokens refreshed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token.' })
  refresh(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(user, res, req.ip, req.headers['user-agent']);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard) // Require refresh token for logout to identify user
  @ApiOkResponse({ description: 'Logged out successfully.' })
  logout(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    this.authService.logout(user.sub, res);
    return { message: 'Logged out successfully.' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOkResponse({ description: 'Logged out from all devices successfully.' })
  logoutAll(@CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    this.authService.logoutAll(user.sub, res);
    return { message: 'Logged out from all devices successfully.' };
  }
}
