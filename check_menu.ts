import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.menu.count({ where: { slug: 'invoice-history' } });
  console.log('Invoice History count:', count);
  await prisma.$disconnect();
}
main();
