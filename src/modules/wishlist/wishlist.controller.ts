import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { WishlistService } from './wishlist.service';
import { AddWishlistDto } from './dto/add-wishlist.dto';

@ApiTags('wishlist')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user wishlist',
    description: 'Returns all wishlist items for the authenticated user.',
  })
  @ApiOkResponse({ description: 'Wishlist items retrieved successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  getUserWishlist(@CurrentUser() user: JwtPayload) {
    return this.wishlistService.getUserWishlist(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Add product to wishlist',
    description: 'Adds a product to the authenticated user wishlist.',
  })
  @ApiCreatedResponse({ description: 'Product added to wishlist.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  addToWishlist(@CurrentUser() user: JwtPayload, @Body() dto: AddWishlistDto) {
    return this.wishlistService.addToWishlist(user.sub, dto.productId);
  }

  @Get('check/:productId')
  @ApiOperation({
    summary: 'Check if product is in wishlist',
    description: 'Returns whether a given product is in the user wishlist.',
  })
  @ApiOkResponse({ description: 'Wishlist status returned.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  checkWishlist(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.checkWishlistStatus(user.sub, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove product from wishlist',
    description:
      'Removes a specific product from the authenticated user wishlist.',
  })
  @ApiOkResponse({ description: 'Product removed from wishlist.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  removeFromWishlist(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user.sub, productId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear user wishlist',
    description: 'Removes all products from the authenticated user wishlist.',
  })
  @ApiOkResponse({ description: 'Wishlist cleared successfully.' })
  @ApiUnauthorizedResponse({ description: 'Authentication required.' })
  clearWishlist(@CurrentUser() user: JwtPayload) {
    return this.wishlistService.clearWishlist(user.sub);
  }
}
