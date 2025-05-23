// src/app/api/tasks/search/route.ts
import { NextResponse } from 'next/server';
import {prisma} from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const SEARCH_RESULTS_LIMIT = 5; // Number of search recommendations to show

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) { // Require at least 2 characters for search
    return NextResponse.json({ error: 'Search query must be at least 2 characters long' }, { status: 400 });
  }

  try {
    // Define fields to search in. Adjust as needed.
    // For 'tags', we use 'hasSome' if it's an array.
    // For text fields like 'title', we use 'contains' in a case-insensitive way.
    const searchWhereClause: Prisma.TaskWhereInput = {
      OR: [
        {
          title: {
            contains: query,
            mode: 'insensitive', // Case-insensitive search
          },
        },
        {
          tags: {
            hasSome: [query], // Assumes query might match a whole tag.
                               // For partial tag matching, you might need a different strategy or iterate possible tags.
                               // Or, if tags are simple strings, you might query them like title.
                               // Let's assume for now tags are an array of strings and we're looking for an exact tag match in the query.
                               // A more robust tag search might involve searching for tasks where ANY tag CONTAINS the query.
          },
        },
        // You could also add search on description if you had one:
        // {
        //   description: {
        //     contains: query,
        //     mode: 'insensitive',
        //   }
        // }
      ],
    };

    const tasks = await prisma.task.findMany({
      where: searchWhereClause,
      take: SEARCH_RESULTS_LIMIT,
      orderBy: {
        // Basic relevance: tasks updated more recently and matching might be more relevant.
        // Or, if using full-text search, you'd sort by relevance score.
        updatedAt: 'desc',
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Failed to search tasks:', error);
    return NextResponse.json({ error: 'Failed to search tasks' }, { status: 500 });
  }
}