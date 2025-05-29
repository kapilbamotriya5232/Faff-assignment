import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Removed categories array
// Removed API_ENDPOINT constant
// Removed GeneratedTask interface

async function populateDb() {
  console.log('Starting database population from CSV file...');
  let totalTasksCreated = 0;
  const failedTasks: Array<{ name: string, reason: string }> = [];
  const inputFile = path.join(__dirname, 'real_tasks_input.csv'); // Assuming CSV is in the same directory

  try {
    if (!fs.existsSync(inputFile)) {
      console.error(`Error: Input file not found at ${inputFile}`);
      console.log('Please create a "real_tasks_input.csv" file in the "scripts" directory with columns: name,description,tags,category');
      console.log('The "tags" column should be a semicolon-separated string (e.g., "tag1;tag2;tag3").');
      return;
    }

    const fileContent = fs.readFileSync(inputFile, 'utf-8');
    const lines = fileContent.split('\n');

    if (lines.length <= 1) {
      console.log('No data found in CSV file (or only headers).');
      return;
    }

    // Skip header row (lines[0])
    const tasksToCreate = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Basic CSV parsing: splitting by comma.
      // This parser assumes no commas within quoted fields.
      // For more robust CSV parsing, a dedicated library would be better.
      const values = line.split(',');

      if (values.length < 4) { // Expecting name, description, tags, category
        console.warn(`Skipping malformed line ${i + 1}: Not enough columns. Content: "${line}"`);
        failedTasks.push({ name: `Line ${i + 1}`, reason: 'Not enough columns' });
        continue;
      }
      
      // Helper to remove quotes if present
      const unquote = (str: string) => {
        if (str && str.startsWith('"') && str.endsWith('"')) {
          return str.substring(1, str.length - 1);
        }
        return str;
      };

      const name = unquote(values[0]?.trim());
      const description = unquote(values[1]?.trim());
      const tagsString = unquote(values[2]?.trim());
      const category = unquote(values[3]?.trim());

      if (!name || !category) {
        console.warn(`Skipping line ${i + 1}: Name or category is missing. Content: "${line}"`);
        failedTasks.push({ name: name || `Line ${i + 1}`, reason: 'Name or category missing' });
        continue;
      }
      
      const tags = tagsString ? tagsString.split(';').map(tag => tag.trim()).filter(tag => tag) : [];

      tasksToCreate.push({
        name,
        description: description || '', // Ensure description is not undefined
        tags,
        category,
      });
    }

    if (tasksToCreate.length === 0) {
      console.log('No valid tasks to create from the CSV file.');
    } else {
      console.log(`Attempting to create ${tasksToCreate.length} tasks from CSV...`);
      try {
        const result = await prisma.realTask.createMany({
          data: tasksToCreate,
          skipDuplicates: true,
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
  console.log(`Database population attempt finished.`);
  console.log(`Total tasks created: ${totalTasksCreated}`);
  if (failedTasks.length > 0) {
    console.warn('The following tasks/lines failed or were skipped:');
    failedTasks.forEach(task => console.warn(`- Task/Line: ${task.name}, Reason: ${task.reason}`));
    console.warn('You may need to manually address these in your CSV or database.');
  }
  console.log('---------------------------------------------------');
}

populateDb()
  .catch(e => {
    console.error('Unhandled error in populateDb:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 