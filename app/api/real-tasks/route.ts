import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const realTasks = await prisma.realTask.findMany({
      include: {
        realMessages: {
          orderBy: {
            createdAt: 'asc', // Order messages by creation date
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Show newest tasks first, for example
      },
      take: 50,
    });
    return NextResponse.json(realTasks);
  } catch (error) {
    console.error('Failed to fetch real tasks:', error);
    // It's good practice to not send raw error messages to the client
    return NextResponse.json(
      { message: 'Failed to fetch real tasks. Please try again later.' }, 
      { status: 500 }
    );
  }
} 