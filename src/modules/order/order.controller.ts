import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { OrderService } from './order.service';
import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Order created successfully.' })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    // Obtain secure user_id from token context if authenticated
    if (req.user?.sub) {
      createOrderDto.userId = (req.user as { sub: string }).sub;
    }
    const order = await this.orderService.create(createOrderDto);

    if (order) {
      // 1. Log order_created
      await this.activityLogService.log({
        userId: order.userId,
        sessionId: req['sessionId'],
        moduleName: 'order',
        actionName: 'order_created',
        entityId: order.id,
        description: `Created order "${order.orderNumber}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          order_number: order.orderNumber,
          total_amount: Number(order.totalAmount),
        },
      });
    }

    return order;
  }

  // ========================================
  // GET ORDERS OF CURRENT AUTHENTICATED USER
  // Must be declared before @Get(':id')
  // ========================================
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOkResponse({
    description: 'Returns all orders belonging to the current user.',
  })
  async findMyOrders(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const orders = await this.orderService.findByUser(user.sub);
    await this.activityLogService.log({
      userId: user.sub,
      sessionId: req['sessionId'],
      moduleName: 'order',
      actionName: 'my_orders_viewed',
      description: `Viewed user orders list (${orders.length} orders)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return orders;
  }

  @Get()
  @ApiOkResponse({ description: 'Returns all orders.' })
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Returns an order by ID.' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const order = await this.orderService.findOne(id);
    await this.activityLogService.log({
      userId: req.user?.sub,
      sessionId: req['sessionId'],
      moduleName: 'order',
      actionName: 'order_viewed',
      entityId: id,
      description: `Viewed order "${order.orderNumber}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return order;
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOkResponse({
    description: 'Cancels an order belonging to the current user.',
  })
  async cancelMyOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const order = await this.orderService.cancelUserOrder(id, user.sub);
    await this.activityLogService.log({
      userId: user.sub,
      sessionId: req['sessionId'],
      moduleName: 'order',
      actionName: 'order_cancelled',
      entityId: id,
      description: `User cancelled order "${order.orderNumber}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return order;
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Order updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Req() req: Request,
  ) {
    const order = await this.orderService.update(id, updateOrderDto);
    if (order) {
      await this.activityLogService.log({
        userId: req.user?.sub,
        sessionId: req['sessionId'],
        moduleName: 'order',
        actionName: 'order_status_changed',
        entityId: id,
        description: `Updated status of order "${order.orderNumber}" to "${order.orderStatus}"`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          order_status: order.orderStatus,
          payment_status: order.paymentStatus,
        },
      });
    }
    return order;
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Order deleted successfully.' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const order = await this.orderService.findOne(id);
    const result = await this.orderService.remove(id);
    await this.activityLogService.log({
      userId: req.user?.sub,
      sessionId: req['sessionId'],
      moduleName: 'order',
      actionName: 'order_deleted',
      entityId: id,
      description: `Deleted order "${order.orderNumber}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return result;
  }
}
