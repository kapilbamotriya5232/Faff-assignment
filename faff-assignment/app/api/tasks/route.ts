// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// GET all tasks (we'll build on this for the list view)
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        requestedBy: { select: { name: true, email: true } }, // Select specific fields from User [cite: 1]
        assignedTo: { select: { name: true, email: true } },  // Select specific fields from User [cite: 1]
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST a new task
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, requestedById, assignedToId, status, priority, tags } = data;

    if (!title || !requestedById) {
      return NextResponse.json({ error: 'Title and requestedById are required' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        requestedById,
        assignedToId: assignedToId || null, // Ensure null if not provided
        status: status || 'Logged', // Default status [cite: 1]
        priority: priority || null,
        tags: tags || [], // Default tags [cite: 1]
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    // Consider more specific error handling, e.g., foreign key constraint
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}