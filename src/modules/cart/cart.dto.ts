import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class SetCartQuantityDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity: number;
}

export class AddCartItemDto extends SetCartQuantityDto {
  @IsUUID()
  productId: string;
}
