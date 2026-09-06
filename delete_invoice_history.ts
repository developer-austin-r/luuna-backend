import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.menu.deleteMany({
      where: { slug: 'invoice-history' },
    });
    console.log('Invoice History menu deleted.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
