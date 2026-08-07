import { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod, ShipmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_USER = process.env.DB_USER || 'luuna_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'luuna_pass';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_NAME = process.env.DB_NAME || 'luuna_db';
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=${DB_SCHEMA}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedOrders() {
  console.log('Seeding orders...');

  // 1. Get or create a status, a brand, and products
  const activeStatus = await prisma.status.findFirst({ where: { slug: 'active' } });
  if (!activeStatus) {
    console.error('Active status not found, run main seed first');
    return;
  }

  const brand = await prisma.brand.findFirst() || await prisma.brand.create({
    data: { name: 'Luuna Luxury', status: true }
  });

  const product1 = await prisma.product.findFirst({ where: { sku: 'BG-LTH-01' } }) || await prisma.product.create({
    data: {
      sku: 'BG-LTH-01',
      name: 'Classic Leather Tote Bag',
      slug: 'classic-leather-tote-bag',
      basePrice: 159.00,
      finalPrice: 159.00,
      stock: 10,
      availableStock: 10,
      statusId: activeStatus.id,
      brandId: brand.id
    }
  });

  const product2 = await prisma.product.findFirst({ where: { sku: 'BG-LTH-02' } }) || await prisma.product.create({
    data: {
      sku: 'BG-LTH-02',
      name: 'Luxury Suede Backpack',
      slug: 'luxury-suede-backpack',
      basePrice: 189.00,
      finalPrice: 189.00,
      stock: 5,
      availableStock: 5,
      statusId: activeStatus.id,
      brandId: brand.id
    }
  });

  // 2. Get or create users
  const user1 = await prisma.user.findFirst({ where: { email: 'emma.watson@gmail.com' } }) || await prisma.user.create({
    data: {
      email: 'emma.watson@gmail.com',
      name: 'Emma Watson',
      password: 'no-password-needed-for-seed',
    }
  });

  const user2 = await prisma.user.findFirst({ where: { email: 'liam.neeson@outlook.com' } }) || await prisma.user.create({
    data: {
      email: 'liam.neeson@outlook.com',
      name: 'Liam Neeson',
      password: 'no-password-needed-for-seed',
    }
  });

  // 3. Create Orders
  // Order 1: Emma Watson
  const existingOrder1 = await prisma.order.findFirst({ where: { orderNumber: 'ORD-9832' } });
  if (!existingOrder1) {
    const o1 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-9832',
        userId: user1.id,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        subtotal: 318.00,
        discount: 0.00,
        tax: 25.44,
        shippingCharge: 14.99,
        totalAmount: 358.43,
        orderedAt: new Date('2026-07-15T10:00:00Z'),
        orderItems: {
          create: {
            productId: product1.id,
            quantity: 2,
            price: 159.00,
            discount: 0.00,
            tax: 25.44,
            total: 318.00
          }
        },
        shipment: {
          create: {
            trackingNumber: 'TRK-FDX-902834',
            courierName: 'FedEx Express',
            shipmentStatus: ShipmentStatus.DELIVERED,
            shippedDate: new Date('2026-07-16T09:12:00Z'),
            deliveredDate: new Date('2026-07-19T14:45:00Z'),
            shippingAddress: '4582 Oakwood Avenue, Suite 100',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90004',
            country: 'US',
            phone: '+1234567890'
          }
        }
      }
    });
    console.log('Created seeded order: ORD-9832');
  }

  // Order 2: Liam Neeson
  const existingOrder2 = await prisma.order.findFirst({ where: { orderNumber: 'ORD-9833' } });
  if (!existingOrder2) {
    const o2 = await prisma.order.create({
      data: {
        orderNumber: 'ORD-9833',
        userId: user2.id,
        orderStatus: OrderStatus.PROCESSING,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.STRIPE,
        subtotal: 189.00,
        discount: 0.00,
        tax: 15.12,
        shippingCharge: 14.99,
        totalAmount: 219.11,
        orderedAt: new Date('2026-07-18T14:30:00Z'),
        orderItems: {
          create: {
            productId: product2.id,
            quantity: 1,
            price: 189.00,
            discount: 0.00,
            tax: 15.12,
            total: 189.00
          }
        },
        shipment: {
          create: {
            trackingNumber: 'TRK-DHL-109283',
            courierName: 'DHL eCommerce',
            shipmentStatus: ShipmentStatus.IN_TRANSIT,
            shippedDate: new Date('2026-07-19T10:00:00Z'),
            shippingAddress: '123 Ocean Drive, Penthouse A',
            city: 'Miami',
            state: 'FL',
            postalCode: '33139',
            country: 'US',
            phone: '+1987654321'
          }
        }
      }
    });
    console.log('Created seeded order: ORD-9833');
  }

  console.log('Orders seeding finished.');
}

seedOrders()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
