// seed_data.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const API_BASE_URL = 'http://localhost:3000'; // Adjust if your app runs elsewhere
const NUM_USERS = 200;
const NUM_TASKS = 100; // This means each pair of users will be associated with one task
const CSV_FILENAME = 'user_data.csv';

// --- Helper Functions ---
async function makeRequest(method, endpoint, data) {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data,
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error ${method} ${endpoint}:`,
      error.response ? error.response.data : error.message
    );
    // throw error; // Re-throw if you want to stop execution on any error
    return null; // Return null to allow script to continue for other items
  }
}

// --- Main Seeding Functions ---
async function createUsers() {
  console.log(`Creating ${NUM_USERS} users...`);
  const users = [];
  for (let i = 0; i < NUM_USERS; i++) {
    const userData = {
      email: `user${i + 1}@example.com`,
      name: `User ${i + 1}`,
    };
    const createdUser = await makeRequest('POST', '/api/users', userData);
    if (createdUser && createdUser.id) {
      users.push(createdUser);
      console.log(`Created user: ${createdUser.name} (ID: ${createdUser.id})`);
    } else {
      console.log(`Failed to create user ${userData.name}. Skipping.`);
    }
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to avoid overwhelming the server
  }
  console.log(`${users.length} users created successfully.\n`);
  return users;
}

async function createTasks(createdUsers) {
  console.log(`Creating ${NUM_TASKS} tasks...`);
  if (createdUsers.length < NUM_TASKS * 2 && createdUsers.length < 2) { // Need at least 2 users for 1 task if assigning both roles
    console.error('Not enough users to create tasks with unique requesters and assignees as intended.');
    if (createdUsers.length < 1) {
        console.error('No users available to act as requester.');
        return [];
    }
  }

  const tasks = [];
  for (let i = 0; i < NUM_TASKS; i++) {
    // Ensure we have enough users for distinct requester and assignee for each task
    // For task i, use user 2i as requester and user 2i+1 as assignee
    const requesterIndex = i * 2;
    const assigneeIndex = i * 2 + 1;

    if (requesterIndex >= createdUsers.length) {
        console.log(`Not enough users to create task ${i + 1} (requester missing). Stopping task creation.`);
        break;
    }
    const requestedById = createdUsers[requesterIndex].id;
    let assignedToId = null;
    if (assigneeIndex < createdUsers.length) {
        assignedToId = createdUsers[assigneeIndex].id;
    } else {
        console.warn(`Task ${i + 1}: Not enough unique users for assignee. Assigning to requester or leaving null if preferred.`);
        // Decide: assign to requester, leave null, or use a modulo user. For simplicity, we'll use null if not enough unique.
        // assignedToId = requestedById; // Or use some other fallback
    }


    const taskData = {
      title: `Sample Task ${i + 1}`,
      requestedById: requestedById,
      assignedToId: assignedToId, // Can be null if not enough distinct users or by design
      status: 'Logged',
      priority: i % 3 === 0 ? 'High' : i % 2 === 0 ? 'Medium' : 'Low',
      tags: [`sample-tag-${i % 5}`],
    };

    // API call to create task
    const createdTask = await makeRequest('POST', '/api/tasks', taskData);
    if (createdTask && createdTask.id) {
      tasks.push(createdTask);
      console.log(`Created task: ${createdTask.title} (ID: ${createdTask.id}), Req: ${requestedById}, Assign: ${assignedToId || 'None'}`);
    } else {
      console.log(`Failed to create task ${taskData.title}. Skipping.`);
    }
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
  }
  console.log(`${tasks.length} tasks created successfully.\n`);
  return tasks;
}

function generateCsv(users, tasks) {
  console.log(`Generating CSV file: ${CSV_FILENAME}...`);
  if (users.length === 0 || tasks.length === 0) {
    console.log('No users or tasks available to generate CSV. Skipping.');
    return;
  }

  const csvRows = ['email,userId,targetTaskId']; // Header updated

  // We want each task to be targeted by its two associated users (requester and assignee)
  // This ensures that the users directly involved with the task are in the CSV.
  // For a robust load test, we'll try to ensure all users are in the CSV,
  // and tasks are distributed among them.

  let currentUserIndexForCsv = 0;
  const filledCsvRows = ['email,userId,targetTaskId']; // Header updated

  for (let i = 0; i < NUM_TASKS; i++) {
    const task = tasks[i];
    if (!task || !task.id) continue; // Skip if task is invalid

    // User 1 for this task (e.g., requester)
    if (currentUserIndexForCsv < users.length) {
      const user1 = users[currentUserIndexForCsv];
      if (user1 && user1.id && user1.email) {
        filledCsvRows.push(`${user1.email},${user1.id},${task.id}`);
      }
      currentUserIndexForCsv++;
    } else {
      break; // No more users
    }

    // User 2 for this task (e.g., assignee)
    if (currentUserIndexForCsv < users.length) {
      const user2 = users[currentUserIndexForCsv];
      if (user2 && user2.id && user2.email) {
        filledCsvRows.push(`${user2.email},${user2.id},${task.id}`);
      }
      currentUserIndexForCsv++;
    } else {
      break; // No more users
    }
    // This structure ensures tasks are assigned to pairs of users sequentially from the user list.
  }

  // If there are still users left who haven't been assigned a task in CSV
  // (because NUM_USERS > NUM_TASKS * 2), assign them tasks in a round-robin fashion.
  let taskAssignIndex = 0;
  while(currentUserIndexForCsv < users.length && tasks.length > 0) {
    const user = users[currentUserIndexForCsv];
    const taskToAssign = tasks[taskAssignIndex % tasks.length];
    if (user && user.id && user.email && taskToAssign && taskToAssign.id) {
        filledCsvRows.push(`${user.email},${user.id},${taskToAssign.id}`);
    }
    currentUserIndexForCsv++;
    taskAssignIndex++;
  }

  fs.writeFileSync(path.join(__dirname, CSV_FILENAME), filledCsvRows.join('\n'));
  console.log(`CSV file "${CSV_FILENAME}" generated successfully with ${filledCsvRows.length -1} user-task entries.`);
}


// --- Run the Seeding Process ---
async function main() {
  console.log('Starting data seeding process...');

  const createdUsers = await createUsers();
  if (createdUsers.length === 0) {
    console.error('No users were created. Aborting task creation and CSV generation.');
    return;
  }

  const createdTasks = await createTasks(createdUsers);
  if (createdTasks.length === 0) {
    console.error('No tasks were created. Aborting CSV generation.');
    return;
  }

  generateCsv(createdUsers, createdTasks);

  console.log('\nData seeding process completed.');
}

main().catch(error => {
  console.error('An critical error occurred during the seeding process:', error);
});