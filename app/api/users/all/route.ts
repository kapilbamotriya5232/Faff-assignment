// src/app/api/users/all/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }, // Only select necessary fields
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch all users:', error);
    return NextResponse.json({ error: 'Failed to fetch all users' }, { status: 500 });
  }
}