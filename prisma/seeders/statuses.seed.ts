import type { PrismaClient } from '@prisma/client';

const statuses = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    status: 'Active',
    slug: 'active',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    status: 'Inactive',
    slug: 'inactive',
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    status: 'Archive',
    slug: 'archive',
  },
];

export async function seedStatuses(prisma: PrismaClient): Promise<void> {
  for (const status of statuses) {
    const upserted = await prisma.status.upsert({
      where: { id: status.id },
      update: {},
      create: status,
    });
    console.log('Upserted Status:', upserted.status);
  }
}
