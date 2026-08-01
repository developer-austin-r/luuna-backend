import type { PrismaClient } from '@prisma/client';

const categories = [
  {
    id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    name: 'Apparel',
    slug: 'apparel',
    description: 'Stylish shirts, dresses, trousers and outerwear.',
    status: true,
  },
  {
    id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    name: 'Bags',
    slug: 'bags',
    description: 'Handcrafted leather totes, wallets, and daily backpacks.',
    status: true,
  },
  {
    id: 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3',
    name: 'Jewelry',
    slug: 'jewelry',
    description: 'High-quality gold, sterling silver, and precious stones.',
    status: true,
  },
  {
    id: 'd4d4d4d4-d4d4-d4d4-d4d4-d4d4d4d4d4d4',
    name: 'Shoes',
    slug: 'shoes',
    description: 'From casual sneakers to formal leather dress shoes and boots.',
    status: true,
  },
  {
    id: 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5',
    name: 'Accessories',
    slug: 'accessories',
    description: 'Scarves, belts, sunglasses and small tech items.',
    status: true,
  },
];

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  for (const category of categories) {
    const upserted = await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
    console.log('Upserted Category:', upserted.name);
  }
}
