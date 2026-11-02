import { PrismaClient } from '@prisma/client';

const PAYMENT_METHODS = [
  { slug: 'cash', value: 'Cash' },
  { slug: 'card', value: 'Card' },
  { slug: 'upi', value: 'UPI' },
  { slug: 'net_banking', value: 'Net Banking' },
  { slug: 'other', value: 'Other' },
];

export async function seedPaymentMethodOptions(prisma: PrismaClient) {
  for (const method of PAYMENT_METHODS) {
    await prisma.paymentMethodOption.upsert({
      where: { slug: method.slug },
      create: method,
      update: { value: method.value },
    });
    console.log(`   ✔ PaymentMethodOption: ${method.value}`);
  }
}
