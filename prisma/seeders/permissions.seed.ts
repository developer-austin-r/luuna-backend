import type { PrismaClient } from '@prisma/client';

const PERMISSIONS = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'View Dashboard',
    slug: 'dashboard.view',
    description: 'View dashboard',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'View Users',
    slug: 'users.view',
    description: 'View users',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Create Users',
    slug: 'users.create',
    description: 'Create users',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Update Users',
    slug: 'users.update',
    description: 'Update users',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name: 'Delete Users',
    slug: 'users.delete',
    description: 'Delete users',
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    name: 'View Billing',
    slug: 'billing.view',
    description: 'View billing',
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name: 'Create Invoice',
    slug: 'invoice.create',
    description: 'Create invoice',
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    name: 'Update Invoice',
    slug: 'invoice.update',
    description: 'Update invoice',
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    name: 'Delete Invoice',
    slug: 'invoice.delete',
    description: 'Delete invoice',
  },
  {
    id: '10000000-0000-0000-0000-000000000010',
    name: 'View Reports',
    slug: 'reports.view',
    description: 'View reports',
  },
];

export async function seedPermissions(
  prisma: PrismaClient,
): Promise<void> {
  for (const permission of PERMISSIONS) {
    const result = await prisma.permission.upsert({
      where: { id: permission.id },
      update: {
        name: permission.name,
        slug: permission.slug,
        description: permission.description,
      },
      create: permission,
    });

    console.log(`Upserted Permission: ${result.name}`);
  }
}