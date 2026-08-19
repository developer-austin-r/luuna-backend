import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'StrongPassword123!',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example:
      '00000000-0000-0000-0000-000000000002',
    description:
      'Role ID: Admin = ...001, User = ...002',
  })
  @IsNotEmpty()
  @IsString()
  roleId: string;
}