// app/lib/socket-io-server.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Task } from '@/app/components/tasks/TaskItem'; // Adjust path if TaskItem has moved or UserMin is separate
import { MessageType } from '@/app/components/chat/ChatMessageItem'; // Assuming MessageType is exported here

const GLOBAL_SOCKET_IO_KEY = Symbol.for('__socket_io_instance__');

// Augment globalThis type
declare global {
  var __socket_io_instance__: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined;
}

// Define event types more specifically
export interface ServerToClientEvents {
  newTask: (task: Task) => void;
  taskUpdated: (task: Task) => void;
  taskDeleted: (data: { id: string }) => void;
  'new-chat-message': (message: MessageType) => void; // Use your MessageType
}

export interface ClientToServerEvents {
  'join-task-chat': (taskId: string) => void;
  'leave-task-chat': (taskId: string) => void;
}

interface InterServerEvents {
  // e.g., for server-to-server communication if ever needed
}

interface SocketData {
  // You can define data to store on the socket instance itself, e.g.:
  // currentRoom?: string;
}

export const CUSTOM_SOCKET_PATH = '/api/mycustomsocket/';

export const getIO = (): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null => {
  return globalThis.__socket_io_instance__ || null;
};

export const initSocketIO = (httpServer: HttpServer): SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> => {
  if (!globalThis.__socket_io_instance__) {
    console.log('[socket-io-server] No global Socket.IO instance found, creating new one...');
    const io_instance = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
      httpServer,
      {
        path: CUSTOM_SOCKET_PATH,
        cors: {
          origin: "*", // Adjust for production
          methods: ["GET", "POST"],
        },
      }
    );
    globalThis.__socket_io_instance__ = io_instance;

    console.log(`Socket.IO server initialized and stored globally on path: ${CUSTOM_SOCKET_PATH}`);

    io_instance.on('connection', (socket) => {
      console.log(`Socket.IO Client Connected (global instance) on ${CUSTOM_SOCKET_PATH}: ${socket.id}`);

      socket.on('join-task-chat', (taskId: string) => {
        const roomName = `task-chat-${taskId}`;
        socket.join(roomName);
        // socket.data.currentRoom = roomName; // Optional: store current room
        console.log(`Socket ${socket.id} joined room: ${roomName}`);
      });

      socket.on('leave-task-chat', (taskId: string) => {
        const roomName = `task-chat-${taskId}`;
        socket.leave(roomName);
        // if (socket.data.currentRoom === roomName) {
        //   delete socket.data.currentRoom;
        // }
        console.log(`Socket ${socket.id} left room: ${roomName}`);
      });

      socket.on('disconnect', (reason) => {
        console.log(`Socket.IO Client Disconnected (global instance) on ${CUSTOM_SOCKET_PATH}: ${socket.id}, Reason: ${reason}`);
        // Socket.IO v3+ automatically handles leaving rooms on disconnect.
      });
    });
  } else {
    console.log('[socket-io-server] Reusing existing global Socket.IO instance.');
  }
  return globalThis.__socket_io_instance__!;
};