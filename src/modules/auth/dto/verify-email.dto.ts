import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'your-verification-token-here' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
