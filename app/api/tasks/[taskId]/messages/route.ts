// app/api/tasks/[taskId]/messages/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma'; // <<<< CHECK THIS PATH

const MESSAGES_INITIAL_LOAD_LIMIT = 30;

interface MessageParams {
  taskId: string; // This 'taskId' MUST match your directory name [taskId]
}

// GET messages for a task
export async function GET(request: Request, context: { params: MessageParams }) {
  const { params } = context;
  console.log(`[API Messages GET] Received request for messages with params:`, params);
  const { taskId } = params; // params.taskId comes from the directory name [taskId]

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  console.log(`[API Messages GET] Attempting to fetch messages for taskId: ${taskId}`);

  try {
    const messages = await prisma.message.findMany({
      where: { taskId },
      orderBy: { 
        createdAt: 'desc', 
      },
      take: MESSAGES_INITIAL_LOAD_LIMIT,
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!messages || messages.length === 0) {
      console.log(`[API Messages GET] No messages found for taskId: ${taskId}`);
      return NextResponse.json([], { status: 200 });
    }

    console.log(`[API Messages GET] Found ${messages.length} messages for taskId: ${taskId}`);
    // Messages are fetched latest first, reverse here so client gets them in display order (oldest first)
    return NextResponse.json(messages.reverse());
  } catch (error) {
    console.error(`[API Messages GET] Failed to fetch messages for task ${taskId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch messages', details: (error as Error).message }, { status: 500 });
  }
}

// POST a new message to a task
export async function POST(request: Request, { params }: { params: MessageParams }) {
  const { taskId } = params;

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
      data: {
        content,
        senderId,
        taskId,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    console.log(`[API Messages POST] Message created for taskId ${taskId}:`, newMessage.id);
    // WebSocket emit will be in the next phase for real-time chat.

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error(`[API Messages POST] Failed to post message for task ${taskId}:`, error);
    return NextResponse.json({ error: 'Failed to post message', details: (error as Error).message }, { status: 500 });
  }
}