// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Create a few users
const user1 = await prisma.user.upsert({
    where: { email: 'kapil@example.com' },
    update: {},
    create: {
        email: 'kapil@example.com',
        name: 'Kapil Bamotriya',
    },
});

const user2 = await prisma.user.upsert({
    where: { email: 'het@example.com' },
    update: {},
    create: {
        email: 'het@example.com',
        name: 'Het Patel',
    },
});

const user3 = await prisma.user.upsert({
    where: { email: 'aniruddha@example.com' },
    update: {},
    create: {
        email: 'aniruddha@example.com',
        name: 'Aniruddha',
    },
});

  console.log(`Created users:`, { user1, user2, user3 });

  // Optionally, create a sample task
  await prisma.task.upsert({
    where: { id: 'initial-setup-review-id' }, // Use a unique identifier like id
    update: {},
    create: {
      id: 'initial-setup-review-id', // Add a unique id for the task
      title: 'Initial Setup Review',
      status: 'Logged',
      priority: 'High',
      requestedById: user1.id, // Alice requested
      assignedToId: user2.id,  // Bob is assigned
      tags: ['setup', 'review'],
    }
  })

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });