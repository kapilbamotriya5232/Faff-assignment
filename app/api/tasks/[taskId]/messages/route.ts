// app/api/tasks/[taskId]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'; // Changed Request to NextRequest
import { prisma } from '@/lib/prisma'; // Your prisma instance
import { getIO } from '@/lib/socket-io-server'; // Get the Socket.IO instance

const MESSAGES_INITIAL_LOAD_LIMIT = 30;

// The MessageParams interface can be removed if it was only used for this,
// or kept if used elsewhere. For the handlers, we'll inline the type.
// interface MessageParams {
//   taskId: string;
// }

// GET messages for a task
export async function GET(
  request: NextRequest, // Changed to NextRequest
  { params }: { params: { taskId: string } } // Inlined params type
) {
  const { taskId } = params;
  if (!taskId) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  console.log(`[API Messages GET] Attempting to fetch messages for taskId: ${taskId}`);
  try {
    const messages = await prisma.message.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGES_INITIAL_LOAD_LIMIT,
      include: { sender: { select: { id: true, name: true, email: true } } },
    });
    if (!messages) { // Note: findMany returns [], not null/undefined if no records found.
                     // This check might be redundant if an empty array is a valid response.
                     // Consider what !messages would evaluate to. It will likely always be false for an array.
                     // Perhaps you meant `if (messages.length === 0)` for a specific handling,
                     // but returning an empty array is fine as per your original code: NextResponse.json([], { status: 200 });
        return NextResponse.json([], { status: 200 }); // Kept original logic
    }
    console.log(`[API Messages GET] Found ${messages.length} messages for taskId: ${taskId}`);
    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error(`[API Messages GET] Failed to fetch messages for task ${taskId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages', details: (error as Error).message }, { status: 500 });
  }
}

// POST a new message to a task
export async function POST(
  request: NextRequest, // Changed to NextRequest
  { params }: { params: { taskId: string } } // Inlined params type
) {
  const { taskId } = params;
  const io = getIO(); // Get the Socket.IO instance

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }
  console.log(`[API Messages POST] Attempting to create message for taskId: ${taskId}`);
  try {
    const { content, senderId } = await request.json();
    if (!content || !senderId) {
      return NextResponse.json({ error: 'Content and senderId are required' }, { status: 400 });
    }
    const senderExists = await prisma.user.findUnique({ where: { id: senderId } });
    if (!senderExists) {
      return NextResponse.json({ error: 'Invalid senderId' }, { status: 400 });
    }
    const newMessage = await prisma.message.create({
      data: { content, senderId, taskId },
      include: { // Ensure sender details are included for the broadcasted message
        sender: { select: { id: true, name: true, email: true } },
      },
    });
    console.log(`[API Messages POST] Message created for taskId ${taskId}:`, newMessage.id);

    // Emit WebSocket event to the specific task room
    if (io) {
      const roomName = `task-chat-${taskId}`;
      io.to(roomName).emit('new-chat-message', newMessage);
      console.log(`[API Messages POST] Emitted 'new-chat-message' to room ${roomName} for message ID: ${newMessage.id}`);
    } else {
      console.warn(`[API Messages POST] Socket.IO instance NOT FOUND globally. Cannot emit 'new-chat-message'.`);
    }

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error(`[API Messages POST] Failed to post message for task ${taskId}:`, error);
    return NextResponse.json({ error: 'Failed to post message', details: (error as Error).message }, { status: 500 });
  }
}