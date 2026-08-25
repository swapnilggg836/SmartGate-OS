import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../src/services/seed.service';

const prisma = new PrismaClient();

async function main() {
  await seedDatabase(prisma, true);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
