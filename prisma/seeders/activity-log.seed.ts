import { type PrismaClient } from '@prisma/client';

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

  for (const m of MODULES_AND_ACTIONS) {
    const mod = await prisma.module.upsert({
      where: { name: m.module },
      update: { description: m.description, isActive: true },
      create: { name: m.module, description: m.description, isActive: true },
    });
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

  console.log('Modules & Actions seeded successfully.');
}
