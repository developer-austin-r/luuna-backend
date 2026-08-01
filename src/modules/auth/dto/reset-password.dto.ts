import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '../../../common/decorators/match.decorator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'your-reset-token-here' })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd!' })
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword!: string;
}
