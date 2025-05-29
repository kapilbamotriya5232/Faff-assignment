import type { RealMessage, RealTask } from '@prisma/client'; // RealTask and RealMessage are types
import prismaPkg from '@prisma/client';
import { generateEmbedding } from '../lib/embedding.ts';
const { PrismaClient } = prismaPkg; // PrismaClient is a value (class)

const prisma = new PrismaClient();

// Hardcode your search query here
const searchQuery = "small frequent commits for refactoring";

const TOP_K = 5; // Number of closest results to retrieve for each entity type

interface TaskWithDistance extends RealTask {
  distance?: number; // pgvector distance is a float
}

interface MessageWithDistance extends RealMessage {
  distance?: number; // pgvector distance is a float
}

async function searchEntities() {
  console.log(`Starting semantic search for query: "${searchQuery}"`);

  // 1. Generate embedding for the search query
  console.log('Generating embedding for the search query...');
  const queryEmbeddingVector = await generateEmbedding(searchQuery);

  if (!queryEmbeddingVector || queryEmbeddingVector.length === 0) {
    console.error('Failed to generate embedding for the search query.');
    return;
  }
  console.log('Query embedding generated.');

  const queryEmbeddingString = `[${queryEmbeddingVector.join(',')}]`;

  // 2. Perform vector similarity search for RealTasks
  console.log(`\nSearching for the top ${TOP_K} closest RealTasks...`);
  try {
    const foundTasks: TaskWithDistance[] = await prisma.$queryRaw<TaskWithDistance[]>`
      SELECT id, name, description, tags, category, "createdAt", "updatedAt", (embedding <=> ${queryEmbeddingString}::vector) AS distance
      FROM "RealTask"
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${TOP_K};
    `;

    if (foundTasks.length === 0) {
      console.log('No matching RealTasks found.');
    } else {
      console.log(`Found ${foundTasks.length} closest RealTasks:`);
      foundTasks.forEach((task, index) => {
        console.log(`\n--- Task ${index + 1} (Distance: ${task.distance?.toFixed(4)}) ---`);
        console.log(`  ID: ${task.id}`);
        console.log(`  Name: ${task.name}`);
        console.log(`  Description: ${task.description}`);
        console.log(`  Tags: ${task.tags.join(', ')}`);
        console.log(`  Category: ${task.category}`);
        console.log(`  Created At: ${task.createdAt}`);
      });
    }
  } catch (error: any) {
    console.error('Error during RealTask semantic search:', error.message);
    // Additional error logging can be kept or adjusted
  }

  // 3. Perform vector similarity search for RealMessages
  console.log(`\nSearching for the top ${TOP_K} closest RealMessages...`);
  try {
    const foundMessages: MessageWithDistance[] = await prisma.$queryRaw<MessageWithDistance[]>`
      SELECT id, content, "senderId", "createdAt", "realTaskId", "parentId", (embedding <=> ${queryEmbeddingString}::vector) AS distance
      FROM "RealMessage"
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${TOP_K};
    `;

    if (foundMessages.length === 0) {
      console.log('No matching RealMessages found.');
    } else {
      console.log(`Found ${foundMessages.length} closest RealMessages:`);
      foundMessages.forEach((message, index) => {
        console.log(`\n--- Message ${index + 1} (Distance: ${message.distance?.toFixed(4)}) ---`);
        console.log(`  ID: ${message.id}`);
        console.log(`  Content: "${message.content.substring(0, 150)}${message.content.length > 150 ? '...' : ''}"`);
        console.log(`  Sender ID: ${message.senderId}`);
        console.log(`  RealTask ID: ${message.realTaskId}`);
        console.log(`  Created At: ${message.createdAt}`);
      });
    }
  } catch (error: any) {
    console.error('Error during RealMessage semantic search:', error.message);
    // Additional error logging can be kept or adjusted
  }
}

async function main() {
  await searchEntities();
}

main()
  .catch((e) => {
    console.error('Unhandled error in search script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\nSearch script finished.');
  }); 