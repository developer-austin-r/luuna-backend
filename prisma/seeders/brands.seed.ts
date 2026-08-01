import type { PrismaClient } from '@prisma/client';

export async function seedBrands(prisma: PrismaClient): Promise<void> {
  const brand = await prisma.brand.upsert({
    where: { id: 'b75f8dbd-0df0-4b21-863a-bbce86207865' },
    update: {},
    create: {
      id: 'b75f8dbd-0df0-4b21-863a-bbce86207865',
      name: 'Luuna Luxury',
      logo: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=100&q=80',
      status: true,
    },
  });
  console.log('Upserted Brand:', brand.name);
}
