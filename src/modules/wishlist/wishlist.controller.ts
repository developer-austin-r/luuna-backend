import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AddWishlistDto } from './dto/add-wishlist.dto';
import { GetWishlistQueryDto } from './dto/get-wishlist-query.dto';
import {
  type WishlistAction,
  WishlistService,
  WISHLIST_COOKIE_AGE,
} from './wishlist.service';

type WishlistRequest = Request & { user?: JwtPayload };
const cookieName = 'luuna_guest_wishlist';

@ApiTags('wishlist')
@UseGuards(OptionalJwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(
    private readonly wishlist: WishlistService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(
    @Req() req: WishlistRequest,
    @Res({ passthrough: true }) res: Response,
    @Query() query: GetWishlistQueryDto,
  ) {
    return this.handle(req, res, { kind: 'list', query });
  }

  @Get('summary')
  summary(
    @Req() req: WishlistRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, { kind: 'summary' });
  }

  @Get('check/:productId')
  check(
    @Req() req: WishlistRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.handle(req, res, { kind: 'check', productId });
  }

  @Post()
  add(
    @Req() req: WishlistRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddWishlistDto,
  ) {
    return this.handle(req, res, { kind: 'add', productId: dto.productId });
  }

  @Delete(':productId')
  remove(
    @Req() req: WishlistRequest,
    @Res({ passthrough: true }) res: Response,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.handle(req, res, { kind: 'remove', productId });
  }

  @Delete()
  clear(
    @Req() req: WishlistRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.handle(req, res, { kind: 'clear' });
  }

  private async handle(
    req: WishlistRequest,
    res: Response,
    action: WishlistAction,
  ) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const rawToken = cookies?.[cookieName];
    const token =
      typeof rawToken === 'string' && /^[a-f0-9]{64}$/.test(rawToken)
        ? rawToken
        : undefined;
    const result = await this.wishlist.access(action, req.user?.sub, token);
    res.setHeader('Cache-Control', 'private, no-store');
    const options = {
      httpOnly: true,
      secure:
        req.secure || this.config.get<boolean>('auth.cookieSecure', false),
      sameSite: 'lax' as const,
      path: '/',
    };
    if (result.cookie) {
      res.cookie(cookieName, result.cookie, {
        ...options,
        maxAge: WISHLIST_COOKIE_AGE,
      });
    } else if (rawToken && (req.user || action.kind === 'clear')) {
      res.clearCookie(cookieName, options);
    }
    return result.data;
  }
}
