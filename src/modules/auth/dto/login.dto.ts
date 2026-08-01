import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  password: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
