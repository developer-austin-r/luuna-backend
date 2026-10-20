import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum WhatsAppChannel {
  BILLING = 'BILLING',
  ORDER = 'ORDER',
  MANUAL = 'MANUAL',
}

export class SendWhatsAppDto {
  @ApiProperty({
    description: 'Recipient phone number with country code (e.g. 919876543210)',
    example: '919876543210',
  })
  @IsString()
  @Matches(/^\d{10,15}$/, {
    message: 'Phone must be 10–15 digits (no +, spaces, or dashes)',
  })
  phone: string;

  @ApiProperty({ description: 'WhatsApp message text' })
  @IsString()
  @MaxLength(4096)
  message: string;

  @ApiPropertyOptional({ enum: WhatsAppChannel, default: WhatsAppChannel.BILLING })
  @IsOptional()
  @IsEnum(WhatsAppChannel)
  channel?: WhatsAppChannel;

  @ApiPropertyOptional({
    description: 'ID of the related entity (bill ID, order ID, etc.)',
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}
