import type { PrismaClient } from '@prisma/client';

const ROLES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Admin',
    slug: 'admin',
    description: 'Full system access',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Billing User',
    slug: 'billing-user',
    description: 'Billing and invoice access',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'User',
    slug: 'user',
    description: 'Standard customer user access',
  },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of ROLES) {
    const result = await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name, slug: role.slug, description: role.description },
      create: role,
    });
    console.log(`Upserted Role: ${result.name} (${result.slug})`);
  }
}
