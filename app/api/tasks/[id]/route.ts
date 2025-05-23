// src/app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { io as globalSocketIOInstance } from '@/lib/socket-io-server'; // Import global instance

interface Params {
  id: string;
}

export async function GET(request: Request, context: { params: Params }) {
  const { id } = context.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error(`Failed to fetch task ${id}:`, error);
    return NextResponse.json({ error: `Failed to fetch task ${id}` }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Params }) {
  const { id } = context.params;
  try {
    const data = await request.json();
    const { title, status, assignedToId, priority, tags } = data;

    if (status && !['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }
    const finalAssignedToId = assignedToId === '' ? null : assignedToId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title, status,
        assignedToId: finalAssignedToId,
        priority, tags,
        updatedAt: new Date(),
      },
      include: { // Include relations for the emitted event
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    // Emit 'taskUpdated' event if Socket.IO server is initialized
    if (globalSocketIOInstance) {
      globalSocketIOInstance.emit('taskUpdated', updatedTask);
      console.log('Emitted "taskUpdated" event via WebSocket:', updatedTask.id);
    } else {
      console.warn('Socket.IO server not initialized. Cannot emit "taskUpdated" event.');
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error(`Failed to update task ${id}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Task not found for update' }, { status: 404 });
    return NextResponse.json({ error: `Failed to update task ${id}`, details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Params }) {
  const { id } = context.params;
  try {
    await prisma.task.delete({ where: { id } });

    // Emit 'taskDeleted' event if Socket.IO server is initialized
    if (globalSocketIOInstance) {
      globalSocketIOInstance.emit('taskDeleted', { id });
      console.log('Emitted "taskDeleted" event via WebSocket:', id);
    } else {
      console.warn('Socket.IO server not initialized. Cannot emit "taskDeleted" event.');
    }
    return NextResponse.json({ message: `Task ${id} deleted successfully` }, { status: 200 });
  } catch (error: any) {
    console.error(`Failed to delete task ${id}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Task not found for deletion' }, { status: 404 });
    return NextResponse.json({ error: `Failed to delete task ${id}` }, { status: 500 });
  }
}