import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { AddCartItemDto, SetCartQuantityDto } from './cart.dto';
import { CART_COOKIE_AGE, type CartChange, CartService } from './cart.service';

type CartRequest = Request & { user?: JwtPayload };
const cookieName = 'luuna_guest_cart';

@ApiTags('Cart')
@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(
    private readonly carts: CartService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  find(
    @Req() request: CartRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.handle(request, response);
  }

  @Post('items')
  add(
    @Req() request: CartRequest,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: AddCartItemDto,
  ) {
    return this.handle(request, response, { kind: 'add', ...dto });
  }

  @Patch('items/:productId')
  update(
    @Req() request: CartRequest,
    @Res({ passthrough: true }) response: Response,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SetCartQuantityDto,
  ) {
    return this.handle(request, response, {
      kind: 'set',
      productId,
      quantity: dto.quantity,
    });
  }

  @Delete('items/:productId')
  remove(
    @Req() request: CartRequest,
    @Res({ passthrough: true }) response: Response,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.handle(request, response, { kind: 'remove', productId });
  }

  private async handle(
    request: CartRequest,
    response: Response,
    change?: CartChange,
  ) {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const rawToken = cookies?.[cookieName];
    const token =
      typeof rawToken === 'string' && /^[a-f0-9]{64}$/.test(rawToken)
        ? rawToken
        : undefined;
    const result = await this.carts.access(request.user?.sub, token, change);
    response.setHeader('Cache-Control', 'private, no-store');
    const options = {
      httpOnly: true,
      secure:
        request.secure || this.config.get<boolean>('auth.cookieSecure', false),
      sameSite: 'lax' as const,
      path: '/',
    };

    if (result.newToken) {
      response.cookie(cookieName, result.newToken, {
        ...options,
        maxAge: CART_COOKIE_AGE,
      });
    } else if (rawToken && (request.user || !result.hasGuestCart)) {
      response.clearCookie(cookieName, options);
    }

    return { items: result.items, notices: result.notices };
  }
}
