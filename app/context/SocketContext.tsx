// app/context/SocketContext.tsx
'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
// Assuming ServerToClientEvents, ClientToServerEvents are defined correctly elsewhere if needed by client
// For this file, we mainly need the CUSTOM_SOCKET_PATH if defined globally, or just use it directly.
// Let's import it if defined in a shared place, or hardcode if simpler for this step.
// For now, we will hardcode it here to match the server modification.
// import { CUSTOM_SOCKET_PATH } from '@/lib/socket-io-server'; // Adjust path as needed

const CUSTOM_SOCKET_PATH_CLIENT = '/api/mycustomsocket/'; // Ensure this EXACTLY matches the server path

interface AppSocket extends Socket {} // Simplified type for client

interface SocketContextType {
  socket: AppSocket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

interface SocketProviderProps { children: ReactNode; }

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // The GET request to /api/socketio is still useful to ensure the HTTP server has the io instance attached
    // This doesn't change with the custom path for socket.io's engine.
    // fetch('/api/socketio').catch(err => console.error("[SocketContext] Error pinging setup endpoint /api/socketio:", err));

    console.log(`[SocketContext] Attempting to connect Socket.IO client to path: ${CUSTOM_SOCKET_PATH_CLIENT}`);
    
    const newSocket = io(process.env.NEXT_PUBLIC_SITE_URL || '', {
      path: CUSTOM_SOCKET_PATH_CLIENT, // Crucial: Use the same custom path as the server
      reconnectionAttempts: 3,
      timeout: 10000, // Increased timeout for debugging
      transports: ['polling', 'websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SocketContext] Socket.IO Client Connected via custom path:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SocketContext] Socket.IO Client Disconnected (custom path):', reason);
      setIsConnected(false);
      // if (reason === 'io server disconnect') { newSocket.connect(); }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SocketContext] Socket.IO Connection Error (custom path):', error.message, error.name, error.cause || error);
      setIsConnected(false);
    });

    return () => {
      console.log('[SocketContext] Disconnecting socket (custom path)...');
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};