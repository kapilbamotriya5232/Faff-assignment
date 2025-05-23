// src/lib/socket-io-server.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

// This will hold our Socket.IO server instance once initialized.
export let io: SocketIOServer | null = null;

// Define the structure for what you might want to emit or listen for.
// This is optional but good for type safety if you expand.
export interface ServerToClientEvents {
  newTask: (task: any) => void; // Define 'any' or a proper Task type
  taskUpdated: (task: any) => void;
  taskDeleted: (data: { id: string }) => void;
  // Add chat events later: newChatMessage, userTyping, etc.
}

export interface ClientToServerEvents {
  // Example: client sends a message
  // sendMessage: (data: { taskId: string, content: string }) => void;
}

interface InterServerEvents {
  // ping: () => void;
}

interface SocketData {
  // userId?: string; // Example: store user ID on socket connection
}

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  if (!io) {
    io = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      // path: '/api/socketio', // if you want a custom path for the WebSocket endpoint
      cors: {
        origin: "*", // Adjust for your frontend URL in production for security
        methods: ["GET", "POST"]
      },
      // Add other options if needed
    });
    console.log('Socket.IO server initialized and attached to HTTP server.');

    io.on('connection', (socket: Socket) => {
      console.log(`A client connected: ${socket.id}`);
      // Example: Authenticate user or join rooms here if needed later
      // socket.data.userId = ... 

      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Add more specific event listeners from clients if needed
    });
  }
  return io;
};