// app/api/search/route.ts (or your specific path)
import { generateEmbedding } from '@/lib/embedding'; // Assuming your embedding lib path
import prismaPkg from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const TOP_K_INITIAL_SEARCH = 20; // Fetch more initial candidates
const FINAL_RESULTS_LIMIT = 5;   // Limit final unique tasks returned

// --- Interfaces for Clarity ---
interface BaseRealTask {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BaseRealMessage {
  id: string;
  content: string;
  senderId: string; // Assuming this is just an ID string as per your schema
  createdAt: Date;
  realTaskId: string;
  // parentId?: string | null; // Included from your query, keep if needed for context
}

// For results from the DB queries
type FoundTask = BaseRealTask & { distance: number };
type FoundMessage = BaseRealMessage & { distance: number };

// For combining results
interface MatchedMessageContext {
  id: string;
  content: string;
  distance: number;
  createdAt: Date;
  snippet?: string;
}

interface CombinedCandidateInfo {
  taskId: string;
  taskData?: BaseRealTask;
  taskDistance?: number; // Distance if task matched directly
  matchedMessages: MatchedMessageContext[];
  bestOverallDistance: number;
}

// Final enriched task result for the API response
interface EnrichedTaskResult extends BaseRealTask {
  bestOverallDistance: number;
  matchSource: 'task' | 'message' | 'task_and_message';
  // If messages were the primary source or added context
  relevantMessages?: MatchedMessageContext[];
  // If the task itself was the primary match, snippet from its content
  taskContextSnippet?: string;
}

// --- Snippet Generation Helper ---
function getContextSnippet(text: string, query: string, maxLength = 150): string {
  if (!text) return "";
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let bestMatchIndex = -1;

  // Try to find the first word of the query for a more relevant start
  const queryWords = lowerQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length > 0) {
    const firstWordIndex = lowerText.indexOf(queryWords[0]);
    if (firstWordIndex !== -1) {
      bestMatchIndex = firstWordIndex;
    }
  }

  // Fallback to the whole query string if the first word isn't found
  if (bestMatchIndex === -1) {
    bestMatchIndex = lowerText.indexOf(lowerQuery);
  }

  // If no match at all, return the beginning of the text
  if (bestMatchIndex === -1) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  }

  const start = Math.max(0, bestMatchIndex - Math.floor(maxLength / 4)); // Show a bit more context before
  const end = Math.min(text.length, bestMatchIndex + query.length + Math.floor(maxLength * 3 / 4)); // And after
  let snippet = text.substring(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim() === "") {
    return NextResponse.json({ message: 'Search query is required' }, { status: 400 });
  }

  try {
    // 1. Generate embedding for the search query
    const queryEmbeddingVector = await generateEmbedding(query);
    if (!queryEmbeddingVector || queryEmbeddingVector.length === 0) {
      return NextResponse.json({ message: 'Failed to generate query embedding' }, { status: 500 });
    }
    const queryEmbeddingString = `[${queryEmbeddingVector.join(',')}]`;

    // --- Database Queries ---
    // Reminder: The operator `<=>` is for L2 distance.
    // If your pgvector index uses `vector_cosine_ops`, prefer the `<->` operator.
    // Ensure your index type (`vector_l2_ops` or `vector_cosine_ops`) matches the operator used.

    // 2. Search RealTasks
    const foundTasks = await prisma.$queryRaw<FoundTask[]>`
      SELECT id, name, description, tags, category, "createdAt", "updatedAt", (embedding <=> ${queryEmbeddingString}::vector) AS distance
      FROM "RealTask"
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${TOP_K_INITIAL_SEARCH};
    `;

    // 3. Search RealMessages
    const foundMessages = await prisma.$queryRaw<FoundMessage[]>`
      SELECT id, content, "senderId", "createdAt", "realTaskId", (embedding <=> ${queryEmbeddingString}::vector) AS distance
      FROM "RealMessage"
      WHERE embedding IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${TOP_K_INITIAL_SEARCH};
    `;

    // --- Combine and Process Results ---
    const combinedCandidates = new Map<string, CombinedCandidateInfo>();

    // Process direct task matches
    for (const task of foundTasks) {
      combinedCandidates.set(task.id, {
        taskId: task.id,
        taskData: task,
        taskDistance: task.distance,
        matchedMessages: [],
        bestOverallDistance: task.distance,
      });
    }

    // Process message matches and update/add candidates
    for (const message of foundMessages) {
      const existingCandidate = combinedCandidates.get(message.realTaskId);
      const messageContext: MatchedMessageContext = {
        id: message.id,
        content: message.content,
        distance: message.distance,
        createdAt: message.createdAt,
        snippet: getContextSnippet(message.content, query),
      };

      if (existingCandidate) {
        existingCandidate.matchedMessages.push(messageContext);
        // Sort messages by relevance for this task
        existingCandidate.matchedMessages.sort((a, b) => a.distance - b.distance);
        if (message.distance < existingCandidate.bestOverallDistance) {
          existingCandidate.bestOverallDistance = message.distance;
        }
      } else {
        // Task was not found by direct task search, add it based on this message
        combinedCandidates.set(message.realTaskId, {
          taskId: message.realTaskId,
          // taskData will be fetched later
          matchedMessages: [messageContext],
          bestOverallDistance: message.distance,
        });
      }
    }

    // --- Fetch Full Task Details for Candidates Missing Them ---
    const tasksIdsToFetchDetails = Array.from(combinedCandidates.values())
      .filter(candidate => !candidate.taskData)
      .map(candidate => candidate.taskId);

    if (tasksIdsToFetchDetails.length > 0) {
      const detailedTasksFromDb = await prisma.realTask.findMany({
        where: { id: { in: tasksIdsToFetchDetails } },
        // No need to include realMessages here, we use the specifically matched ones
      });
      for (const taskDetail of detailedTasksFromDb) {
        const candidate = combinedCandidates.get(taskDetail.id);
        if (candidate) {
          candidate.taskData = taskDetail as BaseRealTask;
        }
      }
    }

    // --- Construct Final Enriched Results ---
    const enrichedResults: EnrichedTaskResult[] = [];
    for (const candidate of combinedCandidates.values()) {
      if (!candidate.taskData) {
        // This might happen if a message matched but its parent task was deleted or inaccessible
        console.warn(`Skipping task ID ${candidate.taskId} as its details could not be fetched.`);
        continue;
      }

      let matchSource: 'task' | 'message' | 'task_and_message';
      const hasDirectTaskMatch = candidate.taskDistance !== undefined;
      const hasMessageMatch = candidate.matchedMessages.length > 0;

      if (hasDirectTaskMatch && candidate.bestOverallDistance === candidate.taskDistance) {
        matchSource = hasMessageMatch ? 'task_and_message' : 'task';
      } else {
        matchSource = 'message'; // Message provided the best or only match
      }
      
      const result: EnrichedTaskResult = {
        ...candidate.taskData,
        bestOverallDistance: candidate.bestOverallDistance,
        matchSource: matchSource,
        relevantMessages: candidate.matchedMessages.length > 0 
                          ? candidate.matchedMessages.slice(0, 3) // Return top 3 matched messages for context
                          : undefined,
        taskContextSnippet: (matchSource === 'task' || matchSource === 'task_and_message')
                          ? getContextSnippet(candidate.taskData.description || candidate.taskData.name, query)
                          : undefined,
      };
      enrichedResults.push(result);
    }

    // Sort final results by overall distance and limit
    const finalRankedResults = enrichedResults
      .sort((a, b) => a.bestOverallDistance - b.bestOverallDistance)
      .slice(0, FINAL_RESULTS_LIMIT);

    return NextResponse.json(finalRankedResults);

  } catch (error: any) {
    console.error('Error during semantic search:', error);
    // More detailed error logging for server, generic for client
    const errorMessage = error.message || 'Failed to perform semantic search';
    const errorStack = error.stack; // For server-side logging
    console.error(`Full error: ${errorMessage}\nStack: ${errorStack}`);
    return NextResponse.json({ message: 'An unexpected error occurred during the search.' }, { status: 500 });
  }
}