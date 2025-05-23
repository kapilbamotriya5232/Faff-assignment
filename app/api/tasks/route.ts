// src/app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { io as globalSocketIOInstance } from '@/lib/socket-io-server'; // Import global instance

const TASKS_PER_PAGE = 10;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || `${TASKS_PER_PAGE}`, 10);
  const status = searchParams.get('status');
  const assignedToId = searchParams.get('assignedToId');
  const priority = searchParams.get('priority');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const skip = (page - 1) * limit;

  const where: Prisma.TaskWhereInput = {};
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (priority) where.priority = priority;

  const orderBy: Prisma.TaskOrderByWithRelationInput = {};
  if (sortBy && (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'title' || sortBy === 'priority' || sortBy === 'status')) {
    orderBy[sortBy as keyof Prisma.TaskOrderByWithRelationInput] = sortOrder as Prisma.SortOrder;
  } else {
    orderBy.createdAt = 'desc';
  }

  try {
    const tasks = await prisma.task.findMany({
      where, skip, take: limit, orderBy,
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    const totalTasks = await prisma.task.count({ where });
    const totalPages = Math.ceil(totalTasks / limit);
    return NextResponse.json({ tasks, currentPage: page, totalPages, totalTasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, requestedById, assignedToId, status, priority, tags } = data;

    if (!title || !requestedById) {
      return NextResponse.json({ error: 'Title and requestedById are required' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title, requestedById,
        assignedToId: assignedToId || null,
        status: status || 'Logged',
        priority: priority || null,
        tags: tags || [],
      },
      include: { // Include relations for the emitted event
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      }
    });

    // Emit 'newTask' event if Socket.IO server is initialized
    if (globalSocketIOInstance) {
      globalSocketIOInstance.emit('newTask', task);
      console.log('Emitted "newTask" event via WebSocket:', task.id);
    } else {
      console.warn('Socket.IO server not initialized. Cannot emit "newTask" event.');
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}