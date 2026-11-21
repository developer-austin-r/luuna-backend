import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { CreateSupportInquiryDto } from './dto/create-support-inquiry.dto';

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('contact')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Submit customer support inquiry',
    description:
      'Receives, validates, and routes a customer inquiry to the Luuna support team. Rate limited to 5 submissions per minute.',
  })
  @ApiCreatedResponse({ description: 'Inquiry received and ticket routed.' })
  submitInquiry(@Body() dto: CreateSupportInquiryDto) {
    return this.supportService.submitInquiry(dto);
  }
}
