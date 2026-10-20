import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
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

  @ApiProperty({
    description:
      'Body template values in the approved WhatsApp template placeholder order',
    example: ['John Doe', 'BILL-12345678', 'Oct 20, 2026'],
    minItems: 3,
    maxItems: 3,
  })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  templateParameters: string[];

  @ApiPropertyOptional({
    enum: WhatsAppChannel,
    default: WhatsAppChannel.BILLING,
  })
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
