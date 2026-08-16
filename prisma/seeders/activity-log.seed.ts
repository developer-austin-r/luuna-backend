import { Prisma, type PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const MODULES_AND_ACTIONS = [
  {
    module: 'authentication',
    description: 'User registration and login flows',
    actions: [
      { name: 'login', description: 'User login' },
      { name: 'logout', description: 'User logout' },
      { name: 'login_failed', description: 'Failed login attempt' },
      { name: 'signup_started', description: 'Signup process initiated' },
      { name: 'signup_completed', description: 'Signup completed and verified' },
    ],
  },
  {
    module: 'product',
    description: 'Product catalog views',
    actions: [
      { name: 'product_viewed', description: 'Product page viewed' },
    ],
  },
  {
    module: 'search',
    description: 'Search operations',
    actions: [
      { name: 'search_performed', description: 'Product search executed' },
    ],
  },
  {
    module: 'cart',
    description: 'Shopping cart activities',
    actions: [
      { name: 'add_to_cart', description: 'Product added to shopping cart' },
      { name: 'remove_from_cart', description: 'Product removed from shopping cart' },
      { name: 'cart_viewed', description: 'Shopping cart viewed' },
      { name: 'cart_quantity_updated', description: 'Shopping cart item quantity updated' },
    ],
  },
  {
    module: 'checkout',
    description: 'Checkout flows',
    actions: [
      { name: 'checkout_started', description: 'Checkout process started' },
      { name: 'checkout_completed', description: 'Checkout process completed' },
    ],
  },
  {
    module: 'order',
    description: 'Order management',
    actions: [
      { name: 'order_created', description: 'New order created' },
      { name: 'order_viewed', description: 'Order details viewed' },
      { name: 'order_cancelled', description: 'Order cancelled by user or admin' },
      { name: 'order_status_changed', description: 'Order status updated' },
    ],
  },
  {
    module: 'profile',
    description: 'User profile management',
    actions: [
      { name: 'profile_viewed', description: 'User profile viewed' },
      { name: 'profile_updated', description: 'User profile details updated' },
    ],
  },
  {
    module: 'password',
    description: 'Password and credential updates',
    actions: [
      { name: 'password_changed', description: 'User password changed' },
      { name: 'forgot_password_requested', description: 'Password reset email requested' },
      { name: 'password_reset_completed', description: 'Password reset completed via token' },
    ],
  },
];

export async function seedModulesAndActions(prisma: PrismaClient): Promise<void> {
  console.log('Seeding Modules & Actions for Activity Log...');

  // Map to hold created module records for relationship seeding
  const moduleMap = new Map<string, any>();

  for (const m of MODULES_AND_ACTIONS) {
    const mod = await prisma.module.upsert({
      where: { name: m.module },
      update: { description: m.description, isActive: true },
      create: { name: m.module, description: m.description, isActive: true },
    });
    moduleMap.set(m.module, mod);
    console.log(`Upserted Module: ${mod.name}`);

    for (const a of m.actions) {
      const action = await prisma.action.upsert({
        where: {
          moduleId_name: {
            moduleId: mod.id,
            name: a.name,
          },
        },
        update: { description: a.description, isActive: true },
        create: {
          moduleId: mod.id,
          name: a.name,
          description: a.description,
          isActive: true,
        },
      });
      console.log(`  Upserted Action: ${action.name}`);
    }
  }

  // Seed mock activity logs for testing UI
  console.log('Seeding mock activity logs...');

  // Check if we have test users, otherwise create a mock user
  let testUser = await prisma.user.findFirst({ where: { email: 'austin@example.com' } });
  if (!testUser) {
    const userRole = await prisma.role.findFirst({ where: { name: 'User' } });
    const passwordHash = await hash('Password@123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'austin@example.com',
        name: 'Austin Miller',
        password: passwordHash,
        isVerified: true,
        roleId: userRole?.id || null,
      },
    });
  }

  // Clear existing logs to avoid duplication in local dev seed
  await prisma.activityLog.deleteMany({});

  const now = new Date();
  const getPastTime = (minutesOffset: number) => new Date(now.getTime() - minutesOffset * 60 * 1000);

  // Setup relations
  const authModule = moduleMap.get('authentication')!;
  const productModule = moduleMap.get('product')!;
  const searchModule = moduleMap.get('search')!;
  const cartModule = moduleMap.get('cart')!;
  const checkoutModule = moduleMap.get('checkout')!;
  const orderModule = moduleMap.get('order')!;
  const profileModule = moduleMap.get('profile')!;
  const passwordModule = moduleMap.get('password')!;

  const getActionIdByName = async (moduleId: bigint, name: string): Promise<bigint> => {
    const act = await prisma.action.findFirst({ where: { moduleId, name } });
    return act!.id;
  };

  const logs: Prisma.ActivityLogUncheckedCreateInput[] = [
    // 1. Guest Browsing Session
    {
      userId: null,
      sessionId: 'sess_993e8400-e29b-41d4-a716-446655440001',
      moduleId: productModule.id,
      actionId: await getActionIdByName(productModule.id, 'product_viewed'),
      entityId: 'p-1001',
      description: 'Guest viewed product "Classic Leather Tote Bag"',
      ipAddress: '192.168.1.55',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      deviceType: 'mobile',
      browser: 'Safari',
      os: 'iOS',
      metadata: { product_id: 'p-1001', product_name: 'Classic Leather Tote Bag', price: 159.00 },
      createdAt: getPastTime(180),
    },
    {
      userId: null,
      sessionId: 'sess_993e8400-e29b-41d4-a716-446655440001',
      moduleId: cartModule.id,
      actionId: await getActionIdByName(cartModule.id, 'add_to_cart'),
      entityId: 'p-1001',
      description: 'Guest added product "Classic Leather Tote Bag" to cart',
      ipAddress: '192.168.1.55',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      deviceType: 'mobile',
      browser: 'Safari',
      os: 'iOS',
      metadata: { product_id: 'p-1001', quantity: 1, unit_price: 159.00 },
      createdAt: getPastTime(175),
    },
    {
      userId: null,
      sessionId: 'sess_993e8400-e29b-41d4-a716-446655440001',
      moduleId: searchModule.id,
      actionId: await getActionIdByName(searchModule.id, 'search_performed'),
      entityId: null,
      description: 'Guest searched catalog for keyword "backpack"',
      ipAddress: '192.168.1.55',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      deviceType: 'mobile',
      browser: 'Safari',
      os: 'iOS',
      metadata: { keyword: 'backpack' },
      createdAt: getPastTime(170),
    },

    // 2. Austin Session - Login and Profile Flow
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: authModule.id,
      actionId: await getActionIdByName(authModule.id, 'login'),
      entityId: null,
      description: 'Austin Miller logged in successfully',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: { email: testUser.email },
      createdAt: getPastTime(120),
    },
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: profileModule.id,
      actionId: await getActionIdByName(profileModule.id, 'profile_viewed'),
      entityId: testUser.id,
      description: 'Austin Miller viewed their user profile',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: Prisma.DbNull,
      createdAt: getPastTime(115),
    },
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: profileModule.id,
      actionId: await getActionIdByName(profileModule.id, 'profile_updated'),
      entityId: testUser.id,
      description: 'Austin Miller updated profile details (name/email)',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: { updated_fields: ['name'] },
      createdAt: getPastTime(110),
    },

    // 3. Austin Checkout Flow
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: checkoutModule.id,
      actionId: await getActionIdByName(checkoutModule.id, 'checkout_started'),
      entityId: null,
      description: 'Austin Miller started checkout process',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: { cart_total: 159.00 },
      createdAt: getPastTime(105),
    },
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: orderModule.id,
      actionId: await getActionIdByName(orderModule.id, 'order_created'),
      entityId: 'o-5001',
      description: 'Austin Miller created order ORD-5001',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: { order_number: 'ORD-5001', total_amount: 173.99 },
      createdAt: getPastTime(100),
    },
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: checkoutModule.id,
      actionId: await getActionIdByName(checkoutModule.id, 'checkout_completed'),
      entityId: 'o-5001',
      description: 'Austin Miller completed checkout for order ORD-5001',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: { order_id: 'o-5001', order_number: 'ORD-5001' },
      createdAt: getPastTime(100),
    },

    // 4. Authentication Failures
    {
      userId: null,
      sessionId: 'sess_222e8400-e29b-41d4-a716-446655440002',
      moduleId: authModule.id,
      actionId: await getActionIdByName(authModule.id, 'login_failed'),
      entityId: null,
      description: 'Failed login attempt: Invalid credentials',
      ipAddress: '12.34.56.78',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15',
      deviceType: 'desktop',
      browser: 'Safari',
      os: 'macOS',
      metadata: { email: 'hacker@example.com' },
      createdAt: getPastTime(60),
    },

    // 5. Password Update Flow
    {
      userId: testUser.id,
      sessionId: 'sess_550e8400-e29b-41d4-a716-446655440000',
      moduleId: passwordModule.id,
      actionId: await getActionIdByName(passwordModule.id, 'password_changed'),
      entityId: testUser.id,
      description: 'Austin Miller changed password',
      ipAddress: '8.8.8.8',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      metadata: Prisma.DbNull,
      createdAt: getPastTime(10),
    },
  ];

  for (const log of logs) {
    await prisma.activityLog.create({
      data: log,
    });
  }

  console.log(`Successfully seeded ${logs.length} activity logs.`);
}
