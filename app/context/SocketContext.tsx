// src/context/SocketContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { ServerToClientEvents, ClientToServerEvents } from '@/lib/socket-io-server'; // Import types

// Define the type for your socket instance more specifically
type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextType {
  socket: AppSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // The path here should match where Socket.IO server is listening.
    // If you used a custom path in server setup, use it here.
    // Otherwise, it defaults.
    // For the setup using `/api/socketio` to *initialize* the server,
    // the actual WebSocket connection happens on the default path or custom path
    // defined in `new SocketIOServer({ path: '/my-custom-path' })`.
    // If no custom path, it's just the server URL.
    const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000', {
      // path: '/api/socketio_endpoint', // Use if you set a custom path on server
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      // Add other client options if needed
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO: Connected to server', newSocket.id);
      setIsConnected(true);
      // You might want to make a GET request to /api/socketio here if this is the first client
      // to ensure the server-side setup is triggered, though subsequent clients won't need it.
      // fetch('/api/socketio').catch(err => console.error("Error pinging socketio setup endpoint:", err));
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO: Disconnected from server', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO: Connection error', error);
      setIsConnected(false);
    });

    // Cleanup on component unmount
    return () => {
      console.log('Socket.IO: Disconnecting socket...');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};