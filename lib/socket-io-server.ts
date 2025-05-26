// app/lib/socket-io-server.ts
import { MessageType } from '@/app/components/chat/ChatMessageItem';
import { Task } from '@/app/components/tasks/TaskItem';
import { Server as HttpServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';

// +++ IMPORTS FOR REDIS ADAPTER +++
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis, RedisOptions } from 'ioredis';
// +++++++++++++++++++++++++++++++++++

const GLOBAL_SOCKET_IO_KEY = Symbol.for('__socket_io_instance__');

declare global {
  var __socket_io_instance__: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined;
  var __redis_pub_client__: Redis | undefined;
  var __redis_sub_client__: Redis | undefined;
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
  if (globalThis.__socket_io_instance__) {
    console.log('[socket-io-server] Reusing existing global Socket.IO instance.');
    if (globalThis.__socket_io_instance__.sockets.adapter) {
      console.log(`[socket-io-server] Current adapter: ${globalThis.__socket_io_instance__.sockets.adapter.constructor.name}`);
    }
    return globalThis.__socket_io_instance__;
  }

  console.log('[socket-io-server] No global Socket.IO instance found, creating new one...');

  const io_instance = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      path: CUSTOM_SOCKET_PATH,
      cors: {
        origin: process.env.NEXT_PUBLIC_SITE_URL || "*", // Be more specific in production
        methods: ["GET", "POST"],
      },
      // Adapter will be set after Redis clients are configured
    }
  );

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    console.log(`[socket-io-server] Attempting to connect to Redis: ${redisUrl.substring(redisUrl.indexOf('@') + 1)}`); // Log host/port, hide credentials

    const redisOptions: RedisOptions = {
      // enableReadyCheck: true, // Default is true
      // maxRetriesPerRequest: 3, // Default is 20. Set to null for infinite connection retries.
      // showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
      // You might need TLS options if your Redis Cloud provider requires it and uses a redis:// URL
      // e.g. for some providers: tls: { rejectUnauthorized: false } (use with caution)
      // For Redis Cloud, usually the `rediss://` protocol handles TLS automatically.
      // If your URL is `redis://` but it's an SSL port, you might need to specify `tls: {}`.
    };

    const pubClient = new Redis(redisUrl, { ...redisOptions, connectionName: "faff-socketio-pub" });
    const subClient = pubClient.duplicate({ connectionName: "faff-socketio-sub" });

    let pubReady = false;
    let subReady = false;

    const checkAndSetAdapter = () => {
        if (pubReady && subReady) {
            console.log('[socket-io-server] Both Redis Pub and Sub clients are ready. Setting adapter.');
            io_instance.adapter(createAdapter(pubClient, subClient));
            console.log(`[socket-io-server] Redis adapter configured. Active adapter: ${io_instance.sockets.adapter.constructor.name}`);
        }
    };

    const setupRedisEventHandlers = (client: Redis, clientName: string) => {
      client.on('connect', () => console.log(`[socket-io-server] Redis ${clientName} client: command 'connect' received.`));
      client.on('ready', () => {
        console.log(`[socket-io-server] Redis ${clientName} client: command 'ready' received.`);
        if (clientName === 'Pub') pubReady = true;
        if (clientName === 'Sub') subReady = true;
        checkAndSetAdapter();
      });
      client.on('error', (err) => {
        console.error(`[socket-io-server] Redis ${clientName} client ERROR:`, err);
        // Potentially mark client as not ready
        if (clientName === 'Pub') pubReady = false;
        if (clientName === 'Sub') subReady = false;
      });
      client.on('close', () => {
        console.warn(`[socket-io-server] Redis ${clientName} client: connection closed.`);
        if (clientName === 'Pub') pubReady = false;
        if (clientName === 'Sub') subReady = false;
      });
      client.on('reconnecting', (delay: number) => console.warn(`[socket-io-server] Redis ${clientName} client: reconnecting in ${delay}ms...`));
      client.on('end', () => {
        console.warn(`[socket-io-server] Redis ${clientName} client: connection ended. (No more reconnections)`);
        if (clientName === 'Pub') pubReady = false;
        if (clientName === 'Sub') subReady = false;
      });
    };

    setupRedisEventHandlers(pubClient, 'Pub');
    setupRedisEventHandlers(subClient, 'Sub');

    globalThis.__redis_pub_client__ = pubClient;
    globalThis.__redis_sub_client__ = subClient;

  } else {
    console.warn('[socket-io-server] REDIS_URL not defined. Socket.IO will use in-memory adapter. This is NOT suitable for production on Vercel.');
    console.log(`[socket-io-server] Active adapter (default): ${io_instance.sockets.adapter.constructor.name}`);
  }

  globalThis.__socket_io_instance__ = io_instance;
  console.log(`[socket-io-server] Socket.IO server instance created. Path: ${CUSTOM_SOCKET_PATH}`);

  io_instance.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client Connected. ID: ${socket.id}. Transport: ${socket.conn.transport.name}. Adapter: ${io_instance.sockets.adapter.constructor.name}`);

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client Disconnected. ID: ${socket.id}. Reason: ${reason}. Adapter still: ${io_instance.sockets.adapter.constructor.name}`);
    });

    socket.on('error', (error) => {
      console.error(`[Socket.IO] Error on socket ${socket.id}:`, error);
    });

    // Your existing event handlers
    socket.on('join-task-chat', (taskId: string) => {
        const roomName = `task-chat-${taskId}`;
        socket.join(roomName);
        console.log(`[Socket.IO] Socket ${socket.id} joined room: ${roomName}`);
    });

    socket.on('leave-task-chat', (taskId: string) => {
        const roomName = `task-chat-${taskId}`;
        socket.leave(roomName);
        console.log(`[Socket.IO] Socket ${socket.id} left room: ${roomName}`);
    });
  });

  return globalThis.__socket_io_instance__;
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