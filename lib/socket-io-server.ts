// app/lib/socket-io-server.ts
import { MessageType } from '@/app/components/chat/ChatMessageItem';
import { Task } from '@/app/components/tasks/TaskItem';
import { Server as HttpServer } from 'http';
import { Socket, Server as SocketIOServer } from 'socket.io';

const GLOBAL_SOCKET_IO_KEY = Symbol.for('__socket_io_instance__');

declare global {
  var __socket_io_instance__: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined;
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
    }
  );

  console.log(`[socket-io-server] Active adapter (default): ${io_instance.sockets.adapter.constructor.name}`);

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