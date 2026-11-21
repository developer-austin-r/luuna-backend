import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportInquiryDto {
  @ApiProperty({
    description: 'Full name of the customer submitting inquiry',
    example: 'Aarav Sharma',
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Contact email address',
    example: 'aarav@example.com',
  })
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @ApiPropertyOptional({
    description: 'Inquiry category',
    example: 'Orders & Payments',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Inquiry subject line',
    example: 'Order delivery tracking question',
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    description: 'Detailed inquiry message',
    example: 'Hello, when will order ORD-9832 be dispatched?',
  })
  @IsString()
  @IsNotEmpty({ message: 'Message content is required' })
  @MaxLength(2000)
  message: string;
}
