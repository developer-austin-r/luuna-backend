import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateUserReviewDto {
  @ApiProperty({ example: '11111111-1111-4111-a111-111111111111' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  starRate: number;

  @ApiPropertyOptional({ example: 'Excellent product.' })
  @IsOptional()
  @IsString()
  review?: string;
}
