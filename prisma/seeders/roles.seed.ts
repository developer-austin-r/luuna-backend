import type { PrismaClient } from '@prisma/client';

const ROLES = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Admin',
    description: 'Full system access',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Billing User',
    description: 'Billing user access',
  },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of ROLES) {
    const result = await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name, description: role.description },
      create: role,
    });
    console.log(`Upserted Role: ${result.name}`);
  }
}
