import { prisma } from '@/lib/prisma';
import { getIO } from '@/lib/socket-io-server';
import { NextRequest, NextResponse } from 'next/server';

const MESSAGES_INITIAL_LOAD_LIMIT = 30

// Helper to log duration - place it outside or import if used elsewhere
function logStageDuration(stageName: string, startTime: [number, number], context?: object) {
  const duration = process.hrtime(startTime);
  const durationMs = (duration[0] * 1000 + duration[1] / 1e6).toFixed(2);
  console.log(`PERF_TRACE: Stage='${stageName}', Duration=${durationMs}ms`, context || '');
  return process.hrtime(); // Return new start time for the next stage
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const { taskId } = params
  if (!taskId)
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
  console.log(
    `[API Messages GET] Attempting to fetch messages for taskId: ${taskId}`,
  )
  try {
    const messages = await prisma.message.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: MESSAGES_INITIAL_LOAD_LIMIT,
      include: { sender: { select: { id: true, name: true, email: true } } },
    })
    if (!messages) {
      return NextResponse.json([], { status: 200 }) //
    }
    console.log(
      `[API Messages GET] Found ${messages.length} messages for taskId: ${taskId}`,
    )
    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error(
      `[API Messages GET] Failed to fetch messages for task ${taskId}:`,
      error,
    )
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: (error as Error).message },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const overallApiStartTime = process.hrtime();
  let stageStartTime = process.hrtime();

  const { taskId } = params
  const io = getIO()

  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
  }
  console.log(
    `[API Messages POST] Attempting to create message for taskId: ${taskId}`,
  )
  try {
    const body = await request.json()
    stageStartTime = logStageDuration('1. Request JSON Parsing', stageStartTime, { taskId })

    const { content, senderId } = body
    if (!content || !senderId) {
      return NextResponse.json(
        { error: 'Content and senderId are required' },
        { status: 400 },
      )
    }
    stageStartTime = logStageDuration('2. Input Validation', stageStartTime, { taskId, senderId })

    const senderExists = await prisma.user.findUnique({
      where: { id: senderId },
    })
    stageStartTime = logStageDuration('3. Prisma User FindUnique', stageStartTime, { taskId, senderId, userFound: !!senderExists })

    if (!senderExists) {
      return NextResponse.json({ error: 'Invalid senderId' }, { status: 400 })
    }

    const newMessage = await prisma.message.create({
      data: { content, senderId, taskId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    })
    stageStartTime = logStageDuration('4. Prisma Message Create', stageStartTime, { taskId, messageId: newMessage.id })

    if (io) {
      const roomName = `task-chat-${taskId}`
      const messageForEmit = {
        ...newMessage,
        createdAt: newMessage.createdAt.toISOString(),
        updatedAt: newMessage.updatedAt.toISOString()
      };
      io.to(roomName).emit('new-chat-message', messageForEmit)
      logStageDuration('5. Socket.IO Emit', stageStartTime, { taskId, roomName, messageId: newMessage.id })
    } else {
      console.warn(
        `[API Messages POST] Socket.IO instance NOT FOUND globally. Cannot emit 'new-chat-message'.`,
      )
    }

    const overallApiDuration = process.hrtime(overallApiStartTime);
    const overallApiDurationMs = (overallApiDuration[0] * 1000 + overallApiDuration[1] / 1e6).toFixed(2);
    console.log(`MONITORING_METRIC: APIPostMessageLatency=${overallApiDurationMs}ms, TaskID=${params.taskId}`);

    return NextResponse.json(newMessage, { status: 201 })
  } catch (error) {
    const overallApiDuration = process.hrtime(overallApiStartTime);
    const overallApiDurationMs = (overallApiDuration[0] * 1000 + overallApiDuration[1] / 1e6).toFixed(2);
    console.error(
      `MONITORING_METRIC: APIPostMessageLatency=${overallApiDurationMs}ms (ERROR), TaskID=${params.taskId}, Error=${(error as Error).message}`,
    );
    return NextResponse.json(
      { error: 'Failed to post message', details: (error as Error).message },
      { status: 500 },
    )
  }
}
