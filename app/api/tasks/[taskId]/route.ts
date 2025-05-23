import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getIO } from '@/lib/socket-io-server';

interface Params {
  taskId: string;
}

export async function GET(request: Request, context: { params: Params }) {
  const { taskId } = context.params;
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error(`Failed to fetch task ${taskId}:`, error);
    return NextResponse.json({ error: `Failed to fetch task ${taskId}` }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Params }) {
  const io = getIO();
  const { taskId } = context.params;

  try {
    const data = await request.json();
    const { title, status, assignedToId, priority, tags } = data;

    if (status && !['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }
    const finalAssignedToId = assignedToId === '' ? null : assignedToId;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(assignedToId !== undefined && { assignedToId: finalAssignedToId }),
        ...(priority !== undefined && { priority }),
        ...(tags !== undefined && { tags }),
        updatedAt: new Date(),
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    console.log(`[PUT /api/tasks/${taskId}] Task data updated in DB:`, updatedTask);

    if (io) {
      io.emit('taskUpdated', updatedTask);
      console.log(`[PUT /api/tasks/${taskId}] Emitted "taskUpdated" event for task ID: ${updatedTask.id}`);
    } else {
      console.warn(`[PUT /api/tasks/${taskId}] Socket.IO instance NOT FOUND globally. Cannot emit "taskUpdated".`);
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error(`[PUT /api/tasks/${taskId}] Failed to update task:`, error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Task not found for update' }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to update task ${taskId}`, details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Params }) {
  const io = getIO();
  const { taskId } = context.params;
  try {
    await prisma.task.delete({ where: { id: taskId } });

    if (io) {
      io.emit('taskDeleted', { id: taskId });
      console.log(`[DELETE /api/tasks/${taskId}] Emitted "taskDeleted" event for id:`, taskId);
    } else {
      console.warn(`[DELETE /api/tasks/${taskId}] Socket.IO instance NOT FOUND globally. Cannot emit.`);
    }
    return NextResponse.json({ message: `Task ${taskId} deleted successfully` }, { status: 200 });
  } catch (error: any) {
    console.error(`[DELETE /api/tasks/${taskId}] Failed to delete task:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Task not found for deletion' }, { status: 404 });
    return NextResponse.json({ error: `Failed to delete task ${taskId}` }, { status: 500 });
  }
}
