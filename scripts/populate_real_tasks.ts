import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function populateDbFromCsv() {
  console.log('Starting database population from CSV (name column only)...');
  let totalTasksCreated = 0;
  const failedTasks: Array<{ name: string, reason: string }> = [];
  const inputFile = path.join(__dirname, 'real_tasks_input.csv');

  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file not found at ${inputFile}`);
      console.log('Please create a "real_tasks_input.csv" file in the "scripts" directory with a header column: name');
      return;
    }

    const fileContent = fs.readFileSync(inputFile, 'utf-8');
    const lines = fileContent.split('\n').map(line => line.trim());

    if (lines.length <= 1 || !lines[0] || lines[0].toLowerCase() !== 'name') {
      console.log('No data found in CSV file, or header is missing/incorrect. Expected header: "name"');
      return;
    }

    const tasksToCreate = [];
    // Start from index 1 to skip header
    for (let i = 1; i < lines.length; i++) {
      const taskName = lines[i];
      if (!taskName) continue; // Skip empty lines

      // Since migration for optional fields didn't pass, we provide defaults
      tasksToCreate.push({
        name: taskName,
        description: '', // Default empty string
        tags: [],        // Default empty array
        category: '',     // Default empty string
      });
    }

    if (tasksToCreate.length === 0) {
      console.log('No valid tasks to create from the CSV file.');
    } else {
      console.log(`Attempting to create ${tasksToCreate.length} tasks from CSV...`);
      try {
        const result = await prisma.realTask.createMany({
          data: tasksToCreate,
          skipDuplicates: true, // Avoids creating duplicate tasks if a task with the same name already exists
        });
        console.log(`Successfully created ${result.count} tasks.`);
        totalTasksCreated = result.count;
      } catch (dbError) {
        console.error('Error creating tasks in database:', dbError);
        tasksToCreate.forEach(task => failedTasks.push({ name: task.name, reason: 'Database insertion error' }));
      }
    }

  } catch (error) {
    console.error('Failed to process CSV file:', error);
  }

  console.log('---------------------------------------------------');
  console.log(`Database population attempt from CSV finished.`);
  console.log(`Total tasks created: ${totalTasksCreated}`);
  if (failedTasks.length > 0) {
    console.warn('The following tasks/lines failed or were skipped:');
    failedTasks.forEach(task => console.warn(`- Task/Line: ${task.name}, Reason: ${task.reason}`));
  }
  console.log('---------------------------------------------------');
}

populateDbFromCsv()
  .catch(e => {
    console.error('Unhandled error in populateDbFromCsv:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 