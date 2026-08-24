import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'NewStrongPassword123!' })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'BLOCKED'])
  status?: string;
}
