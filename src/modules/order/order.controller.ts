import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
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
import { CreateCheckoutOrderDto } from './dto/create-checkout-order.dto';
import { OrderService } from './order.service';
import type { Request } from 'express';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({ description: 'Order created successfully.' })
  async create(@Body() createOrderDto: CreateOrderDto, @Req() req: Request) {
    createOrderDto.userId = (req.user as JwtPayload).sub;
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

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutOrderDto,
  ) {
    return this.orderService.createCheckout(user.sub, dto);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  @ApiOkResponse({ description: 'Returns all orders.' })
  findAll() {
    return this.orderService.findAll();
  }

  @Get(':id/confirmation')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, no-store')
  getConfirmation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderService.getConfirmation(id, user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Returns an order by ID.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const order = await this.orderService.findOne(id);
    if (order.userId !== user.sub && user.role !== 'Admin') {
      throw new ForbiddenException('Order does not belong to this user');
    }
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
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
