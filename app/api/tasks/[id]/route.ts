// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma'; // Adjust path
import { getIO } from '@/lib/socket-io-server'; // <<<< ADJUST PATH CAREFULLY

interface Params {
  id: string;
}

// GET handler ... (can be kept as is)
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
  const io = getIO(); // Get the globally stored instance
  const { id } = context.params;

  try {
    const data = await request.json();
    const { title, status, assignedToId, priority, tags } = data;

    // Basic validation
    if (status && !['Logged', 'Ongoing', 'Reviewed', 'Done', 'Blocked'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }
    const finalAssignedToId = assignedToId === '' ? null : assignedToId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        // Only update fields that are passed in the request
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

    console.log(`[PUT /api/tasks/${id}] Task data updated in DB:`, updatedTask); // Log DB update

    if (io) {
      console.log(`[PUT /api/tasks/${id}] IO instance found. Attempting to emit 'taskUpdated'.`);
      io.emit('taskUpdated', updatedTask);
      console.log(`[PUT /api/tasks/${id}] Emitted "taskUpdated" event for task ID: ${updatedTask.id}`);
    } else {
      console.warn(`[PUT /api/tasks/${id}] Socket.IO instance NOT FOUND globally. Cannot emit "taskUpdated".`);
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error(`[PUT /api/tasks/${id}] Failed to update task:`, error);
    if (error.code === 'P2025') { // Prisma error code for record not found
        return NextResponse.json({ error: 'Task not found for update' }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to update task ${id}`, details: error.message }, { status: 500 });
  }
}

// DELETE handler ... (ensure getIO() and emit are here too if you implement delete)
export async function DELETE(request: Request, context: { params: Params }) {
  const io = getIO();
  const { id } = context.params;
  try {
      await prisma.task.delete({ where: { id } });

      if (io) {
          io.emit('taskDeleted', { id });
          console.log(`[DELETE /api/tasks/${id}] Emitted "taskDeleted" event for id:`, id);
      } else {
          console.warn(`[DELETE /api/tasks/${id}] Socket.IO instance NOT FOUND globally. Cannot emit.`);
      }
      return NextResponse.json({ message: `Task ${id} deleted successfully` }, { status: 200 });
  } catch (error: any) {
      console.error(`[DELETE /api/tasks/${id}] Failed to delete task:`, error);
      if (error.code === 'P2025') return NextResponse.json({ error: 'Task not found for deletion' }, { status: 404 });
      return NextResponse.json({ error: `Failed to delete task ${id}` }, { status: 500 });
  }
}