export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
}

export interface GatewayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
}

export interface PaymentGateway {
  createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
  }): Promise<GatewayOrder>;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  fetchPaymentsForOrder(orderId: string): Promise<GatewayPayment[]>;
  createRefund(
    paymentId: string,
    amount: number,
    receipt: string,
  ): Promise<{ id: string; status: string; amount: number }>;
  fetchRefund(
    paymentId: string,
    refundId: string,
  ): Promise<{ id: string; status: string; amount: number }>;
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean;
  verifyWebhookSignature(body: Buffer, signature: string): boolean;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
