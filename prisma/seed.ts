import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default categories and brands...');

  // Create Brand
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

  // Define categories to seed
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

  for (const cat of categories) {
    const upserted = await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
    console.log('Upserted Category:', upserted.name);
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
