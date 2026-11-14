import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddWishlistDto {
  @ApiProperty({
    example: 'd9b2d63d-a233-4f32-9cb7-7f8921867123',
    description: 'Product UUID to add to wishlist',
  })
  @IsUUID('all', { message: 'productId must be a valid UUID' })
  @IsNotEmpty({ message: 'productId is required' })
  productId!: string;
}
