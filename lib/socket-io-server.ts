// app/lib/socket-io-server.ts
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

// Define a unique symbol or string for the global property
// This helps avoid conflicts if other parts of the app use global.
const SOCKET_IO_INSTANCE_KEY = Symbol.for('__socket_io_instance__');

// Augment the globalThis type to include our custom property
type CustomGlobalThis = typeof globalThis & {
  [SOCKET_IO_INSTANCE_KEY]?: SocketIOServer;
};

// Type assertion for globalThis to our augmented interface
const customGlobal = globalThis as CustomGlobalThis;

export interface ServerToClientEvents {
  newTask: (task: any) => void;
  taskUpdated: (task: any) => void;
  taskDeleted: (data: { id: string }) => void;
}
export interface ClientToServerEvents {}
interface InterServerEvents {}
interface SocketData {}

export const CUSTOM_SOCKET_PATH = '/api/mycustomsocket/';

export const getIO = (): SocketIOServer | null => {
  return customGlobal[SOCKET_IO_INSTANCE_KEY] || null;
};

export const initSocketIO = (httpServer: HttpServer): SocketIOServer => {
  if (!customGlobal[SOCKET_IO_INSTANCE_KEY]) {
    console.log('[socket-io-server] No global Socket.IO instance found, creating new one...');
    const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
      httpServer,
      {
        path: CUSTOM_SOCKET_PATH,
        cors: {
          origin: "*", // Adjust for production
          methods: ["GET", "POST"],
        },
      }
    );
    customGlobal[SOCKET_IO_INSTANCE_KEY] = io; // Store the instance globally

    console.log(`Socket.IO server initialized and stored globally on path: ${CUSTOM_SOCKET_PATH}`);

    io.on('connection', (socket: Socket) => {
      console.log(`Socket.IO Client Connected (via global instance) on ${CUSTOM_SOCKET_PATH}: ${socket.id}`);
      socket.on('disconnect', (reason) => {
        console.log(`Socket.IO Client Disconnected (global instance) on ${CUSTOM_SOCKET_PATH}: ${socket.id}, Reason: ${reason}`);
      });
    });
  } else {
    console.log('[socket-io-server] Reusing existing global Socket.IO instance.');
  }
  return customGlobal[SOCKET_IO_INSTANCE_KEY]!;
};