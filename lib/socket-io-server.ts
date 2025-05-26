// app/lib/socket-io-server.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Task } from '@/app/components/tasks/TaskItem';
import { MessageType } from '@/app/components/chat/ChatMessageItem';

// +++ IMPORTS FOR REDIS ADAPTER +++
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
// +++++++++++++++++++++++++++++++++++

const GLOBAL_SOCKET_IO_KEY = Symbol.for('__socket_io_instance__');

declare global {
  var __socket_io_instance__: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined;
  // Optional: Store Redis clients globally if you need to manage their lifecycle more explicitly,
  // though for serverless it's often simpler to create them on init.
  // var __redis_pub_client__: Redis | undefined;
  // var __redis_sub_client__: Redis | undefined;
}

export interface ServerToClientEvents {
  newTask: (task: Task) => void;
  taskUpdated: (task: Task) => void;
  taskDeleted: (data: { id: string }) => void;
  'new-chat-message': (message: MessageType) => void;
}

export interface ClientToServerEvents {
  'join-task-chat': (taskId: string) => void;
  'leave-task-chat': (taskId: string) => void;
}

interface InterServerEvents {}

interface SocketData {}

export const CUSTOM_SOCKET_PATH = '/api/mycustomsocket/';

export const getIO = (): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null => {
  return globalThis.__socket_io_instance__ || null;
};

export const initSocketIO = (httpServer: HttpServer): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> => {
  if (!globalThis.__socket_io_instance__) {
    console.log('[socket-io-server] No global Socket.IO instance found, creating new one...');

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error("REDIS_URL is not defined. Please set it in your environment variables.");
      // Fallback to in-memory adapter for local dev if REDIS_URL is missing,
      // or throw an error if Redis is mandatory.
      // For production, you should ensure REDIS_URL is always available.
      // throw new Error("REDIS_URL is not configured.");
      // For now, let's log an error and proceed without Redis for local, but this is NOT for production.
    }

    const io_instance = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
      httpServer,
      {
        path: CUSTOM_SOCKET_PATH,
        cors: {
          origin: "*", // Adjust for production (e.g., process.env.NEXT_PUBLIC_SITE_URL)
          methods: ["GET", "POST"],
        },
        // +++ ADD REDIS ADAPTER CONFIGURATION +++
        // Only configure adapter if redisUrl is available
        adapter: redisUrl ? undefined : undefined, // Placeholder, will be set below
        // +++++++++++++++++++++++++++++++++++++++
      }
    );

    if (redisUrl) {
      console.log(`[socket-io-server] Attempting to connect to Redis: ${redisUrl.split('@').pop()}`); // Hide password from logs
      const pubClient = new Redis(redisUrl, {
        // ioredis options (e.g., tls, keepAlive) can be added here if needed
        // For Vercel KV or Upstash, often their provided URL has SSL configured.
        // enableTLSForSentinelMode: false, // Example option
        // tls: process.env.NODE_ENV === 'production' ? {} : undefined, // For some Redis providers
      });
      const subClient = pubClient.duplicate(); // Recommended to use a separate client for pub and sub

      // Handle Redis connection errors
      pubClient.on('error', (err) => {
        console.error('[socket-io-server] Redis PubClient Error:', err);
      });
      subClient.on('error', (err) => {
        console.error('[socket-io-server] Redis SubClient Error:', err);
      });

      pubClient.on('connect', () => {
        console.log('[socket-io-server] Redis PubClient Connected.');
      });
      subClient.on('connect', () => {
        console.log('[socket-io-server] Redis SubClient Connected.');
      });

      // Attach the Redis adapter
      io_instance.adapter(createAdapter(pubClient, subClient));
      console.log('[socket-io-server] Redis adapter configured.');

      // Store clients globally if you plan to manage their lifecycle,
      // but in serverless, functions are short-lived, so creating them on init is common.
      // globalThis.__redis_pub_client__ = pubClient;
      // globalThis.__redis_sub_client__ = subClient;

    } else {
      console.warn('[socket-io-server] REDIS_URL not found. Running Socket.IO with default in-memory adapter. This is not suitable for multi-instance production environments.');
    }


    globalThis.__socket_io_instance__ = io_instance;
    console.log(`Socket.IO server initialized and stored globally on path: ${CUSTOM_SOCKET_PATH}`);

    io_instance.on('connection', (socket) => {
      console.log(`Socket.IO Client Connected (global instance) on ${CUSTOM_SOCKET_PATH}: ${socket.id}`);

      socket.on('join-task-chat', (taskId: string) => {
        const roomName = `task-chat-${taskId}`;
        socket.join(roomName);
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
      });

      socket.on('leave-task-chat', (taskId: string) => {
        const roomName = `task-chat-${taskId}`;
        socket.leave(roomName);
        console.log(`Socket ${socket.id} left room: ${roomName}`);
      });

      socket.on('disconnect', (reason) => {
        console.log(`Socket.IO Client Disconnected (global instance) on ${CUSTOM_SOCKET_PATH}: ${socket.id}, Reason: ${reason}`);
      });
    });

  } else {
    console.log('[socket-io-server] Reusing existing global Socket.IO instance.');
  }
  return globalThis.__socket_io_instance__!;
};

// Optional: Graceful shutdown for Redis clients if needed, though less critical for serverless
// export const cleanupSocketIO = async () => {
//   if (globalThis.__redis_pub_client__) {
//     await globalThis.__redis_pub_client__.quit();
//     globalThis.__redis_pub_client__ = undefined;
//     console.log('[socket-io-server] Redis PubClient disconnected.');
//   }
//   if (globalThis.__redis_sub_client__) {
//     await globalThis.__redis_sub_client__.quit();
//     globalThis.__redis_sub_client__ = undefined;
//     console.log('[socket-io-server] Redis SubClient disconnected.');
//   }
//   if (globalThis.__socket_io_instance__) {
//      // Socket.IO server doesn't have a direct 'close' that's easy to manage with global instance
//      // and serverless. The adapter handles much of the external communication cleanup.
//   }
// };