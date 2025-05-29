// scripts/ambed-data.ts
import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../lib/embedding.ts';

const prisma = new PrismaClient();

const BATCH_SIZE = 50; // Process records in batches
// const TEST_ITEM_LIMIT = 3; // No longer needed for full blown mode

async function embedRealTasks() {
  console.log('Starting FULL RealTask embedding process for tasks with messages and no existing embedding...');
  let tasksProcessed = 0;

  const tasksToProcessIds: Array<{ id: string }> = await prisma.$queryRaw`
    SELECT rt.id
    FROM "RealTask" rt
    WHERE rt.embedding IS NULL
    AND EXISTS (SELECT 1 FROM "RealMessage" rm WHERE rm."realTaskId" = rt.id);
  `;

  if (tasksToProcessIds.length === 0) {
    console.log('No RealTasks found that meet the criteria for embedding.');
    return;
  }

  console.log(`Found ${tasksToProcessIds.length} RealTasks to embed. Processing in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < tasksToProcessIds.length; i += BATCH_SIZE) {
    const idBatch = tasksToProcessIds.slice(i, i + BATCH_SIZE).map(t => t.id);
    if (idBatch.length === 0) continue;

    console.log(`Processing RealTask batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(tasksToProcessIds.length / BATCH_SIZE)} (size: ${idBatch.length})`);

    const tasksToEmbed = await prisma.realTask.findMany({
      where: { id: { in: idBatch } },
      select: { id: true, name: true, description: true, tags: true },
    });

    for (const task of tasksToEmbed) {
      try {
        const taskTextToEmbed = `${task.name} ${task.description || ''} ${task.tags.join(' ')}`.trim();
        if (!taskTextToEmbed) {
          console.warn(`Skipping RealTask ${task.id} due to empty text content.`);
          continue;
        }
        const embeddingVector = await generateEmbedding(taskTextToEmbed);
        if (embeddingVector) {
          const embeddingString = `[${embeddingVector.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE "RealTask" SET embedding = $1::vector WHERE id = $2`,
            embeddingString,
            task.id
          );
          tasksProcessed++;
        } else {
          console.log(`    Failed to generate embedding for RealTask ${task.id}.`);
        }
      } catch (error: any) {
        console.error(`  Error embedding RealTask ${task.id}:`, error.message);
      }
    }
    console.log(`RealTask batch processed. Total RealTasks embedded in this run so far: ${tasksProcessed}`);
  }
  console.log(`RealTask embedding finished. Total embedded in this run: ${tasksProcessed}`);
}

async function embedRealMessages() {
  console.log('\nStarting FULL RealMessage embedding process...');
  let messagesProcessed = 0;

  const messagesToProcessIds: Array<{ id: string }> = await prisma.$queryRaw`
    SELECT id FROM "RealMessage" WHERE embedding IS NULL;
  `;

  if (messagesToProcessIds.length === 0) {
    console.log('No RealMessages found that need embedding.');
    return;
  }

  console.log(`Found ${messagesToProcessIds.length} RealMessages to embed. Processing in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < messagesToProcessIds.length; i += BATCH_SIZE) {
    const idBatch = messagesToProcessIds.slice(i, i + BATCH_SIZE).map(m => m.id);
    if (idBatch.length === 0) continue;

    console.log(`Processing RealMessage batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(messagesToProcessIds.length / BATCH_SIZE)} (size: ${idBatch.length})`);

    const messagesToEmbed = await prisma.realMessage.findMany({
      where: { id: { in: idBatch } },
      select: { id: true, content: true },
    });

    for (const message of messagesToEmbed) {
      try {
        const messageTextToEmbed = message.content.trim();
        if (!messageTextToEmbed) {
          console.warn(`Skipping RealMessage ${message.id} due to empty content.`);
          continue;
        }
        const embeddingVector = await generateEmbedding(messageTextToEmbed);
        if (embeddingVector) {
          const embeddingString = `[${embeddingVector.join(',')}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE "RealMessage" SET embedding = $1::vector WHERE id = $2`,
            embeddingString,
            message.id
          );
          messagesProcessed++;
        } else {
          console.log(`    Failed to generate embedding for RealMessage ${message.id}.`);
        }
      } catch (error: any) {
        console.error(`  Error embedding RealMessage ${message.id}:`, error.message);
      }
    }
    console.log(`RealMessage batch processed. Total RealMessages embedded in this run so far: ${messagesProcessed}`);
  }
  console.log(`RealMessage embedding finished. Total embedded in this run: ${messagesProcessed}`);
}

async function main() {
  console.log('Starting data embedding process (FULL mode)...');
  await embedRealTasks();
  await embedRealMessages();
  console.log('\nData embedding process (FULL mode) completed.');
}

main()
  .catch((e) => {
    console.error('Unhandled error in embedding script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });