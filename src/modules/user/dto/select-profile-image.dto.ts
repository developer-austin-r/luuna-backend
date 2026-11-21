import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectProfileImageDto {
  @ApiProperty({
    example: 'assets/Profile-img/Profile-1.jpg',
    description: 'Relative S3 path to the selected profile image',
  })
  @IsString()
  @IsNotEmpty()
  imagePath: string;
}
