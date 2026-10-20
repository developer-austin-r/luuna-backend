import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { WhatsAppService } from './whatsapp.service';
import { SendWhatsAppDto } from './dto';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Send a WhatsApp template message through Meta's Cloud API.
   */
  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a WhatsApp template message through Meta' })
  @ApiCreatedResponse({ description: 'Meta API send result returned.' })
  async send(@Body() dto: SendWhatsAppDto, @CurrentUser() user?: JwtPayload) {
    return this.whatsAppService.send(dto, user?.sub);
  }

  /**
   * Retrieve WhatsApp message history with optional filters.
   */
  @Get('logs')
  @ApiOperation({ summary: 'Get WhatsApp message send history' })
  @ApiOkResponse({ description: 'Log entries returned.' })
  @ApiQuery({ name: 'phone', required: false })
  @ApiQuery({ name: 'channel', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLogs(
    @Query('phone') phone?: string,
    @Query('channel') channel?: string,
    @Query('entityId') entityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.whatsAppService.getLogs({
      phone,
      channel,
      entityId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
