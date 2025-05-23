// app/api/tasks/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma'; // Adjust path
import { Prisma } from '@prisma/client';
import { getIO } from '@/lib/socket-io-server'; // <<<< ADJUST PATH CAREFULLY

// ... (TASKS_PER_PAGE, GET handler remain the same) ...
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
  const io = getIO(); // Get the globally stored instance
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
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      }
    });

    if (io) {
      io.emit('newTask', task);
      console.log('[POST /api/tasks] Emitted "newTask" event via WebSocket:', task.id);
    } else {
      console.warn('[POST /api/tasks] Socket.IO instance NOT FOUND globally. Cannot emit.');
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Failed to create task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}