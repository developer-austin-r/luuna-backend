import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpay_order_id: string;

  @IsString()
  @IsNotEmpty()
  razorpay_payment_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  razorpay_signature: string;
}

export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
