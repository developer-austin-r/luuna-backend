import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsUUID, Length, Matches, Min } from 'class-validator';

export const checkoutShipping = {
  standard: { courierName: 'Standard Courier', price: 50 },
  fast: { courierName: 'Fast Courier', price: 100 },
} as const;

const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value,
);

export class CreateCheckoutOrderDto {
  @IsUUID('4')
  checkoutId: string;

  @IsIn(Object.keys(checkoutShipping))
  shippingMethod: keyof typeof checkoutShipping;

  @IsInt()
  @Min(1)
  expectedAmount: number;

  @trim
  @Length(1, 240)
  address: string;

  @trim
  @Length(1, 80)
  city: string;

  @trim
  @Length(1, 80)
  state: string;

  @Matches(/^[1-9]\d{5}$/)
  postalCode: string;

  @Matches(/^\+91[6-9]\d{9}$/)
  phone: string;
}
