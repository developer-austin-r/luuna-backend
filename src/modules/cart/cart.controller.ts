import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post('add')
  async addToCart(
    @Body()
    body: { productId: string; name: string; price: number; quantity: number },
    @Req() req: Request,
  ) {
    await this.activityLogService.log({
      userId: (req.user as { sub?: string } | undefined)?.sub,
      sessionId: req['sessionId'],
      moduleName: 'cart',
      actionName: 'add_to_cart',
      entityId: body.productId,
      description: `Added "${body.name}" to cart`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: body,
    });
    return { success: true, message: 'Item added to cart' };
  }

  @Post('remove')
  async removeFromCart(
    @Body() body: { productId: string; name: string },
    @Req() req: Request,
  ) {
    await this.activityLogService.log({
      userId: (req.user as { sub?: string } | undefined)?.sub,
      sessionId: req['sessionId'],
      moduleName: 'cart',
      actionName: 'remove_from_cart',
      entityId: body.productId,
      description: `Removed "${body.name}" from cart`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { product_id: body.productId, product_name: body.name },
    });
    return { success: true, message: 'Item removed from cart' };
  }

  @Post('update')
  async updateQuantity(
    @Body() body: { productId: string; name: string; quantity: number },
    @Req() req: Request,
  ) {
    await this.activityLogService.log({
      userId: (req.user as { sub?: string } | undefined)?.sub,
      sessionId: req['sessionId'],
      moduleName: 'cart',
      actionName: 'cart_quantity_updated',
      entityId: body.productId,
      description: `Updated quantity of "${body.name}" to ${body.quantity}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        product_id: body.productId,
        product_name: body.name,
        quantity: body.quantity,
      },
    });
    return { success: true, message: 'Cart quantity updated' };
  }

  @Get()
  async getCart(@Req() req: Request) {
    await this.activityLogService.log({
      userId: (req.user as { sub?: string } | undefined)?.sub,
      sessionId: req['sessionId'],
      moduleName: 'cart',
      actionName: 'cart_viewed',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { success: true, items: [] };
  }
}
