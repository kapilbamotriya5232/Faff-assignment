'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const CUSTOM_SOCKET_PATH_CLIENT = '/api/mycustomsocket/'; 

interface AppSocket extends Socket {} 

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
    console.log(`[SocketContext] Attempting to connect Socket.IO client.`);
    console.log(`[SocketContext] Target path: ${CUSTOM_SOCKET_PATH_CLIENT}`);
    // For Vercel/same-origin, omitting the URL (or using undefined/empty string)
    // makes it connect to the current host, which is generally preferred.
    // process.env.NEXT_PUBLIC_SITE_URL can be used if you have specific reasons,
    // but ensure it's correctly configured in Vercel.
    console.log(`[SocketContext] NEXT_PUBLIC_SITE_URL (if used): ${process.env.NEXT_PUBLIC_SITE_URL}`);

    const newSocket = io(undefined, { // Omitting URL connects to current host
      path: CUSTOM_SOCKET_PATH_CLIENT,
      reconnectionAttempts: 5, // Number of reconnection attempts
      timeout: 10000,          // Connection timeout in ms
      transports: ['polling', 'websocket'], // Start with polling, upgrade to WebSocket
      // query: { clientVersion: "1.0.0" } // Example of custom query parameters
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[SocketContext] Socket.IO Client Connected. ID:', newSocket.id, 'Transport:', newSocket.io.engine.transport.name);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('[SocketContext] Socket.IO Client Disconnected. Reason:', reason, 'Socket ID was:', newSocket.id);
      setIsConnected(false);
      // if (reason === 'io server disconnect') {
      //   // This happens if the server explicitly disconnects the socket.
      //   // newSocket.connect(); // You might want to reconnect here.
      // }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SocketContext] Socket.IO Connection Error. Details:', {
        message: error.message,
        name: error.name,
        // @ts-ignore
        description: error.description, // Often contains the underlying error
        // @ts-ignore
        cause: error.cause,
        // @ts-ignore
        data: error.data, // Additional data from the server, if any
        stack: error.stack?.substring(0, 300) + "..." // First part of stack
      });
      setIsConnected(false);
    });
    
    // Engine.IO events for deeper debugging
    if (newSocket.io && newSocket.io.engine) {
      newSocket.io.engine.on('error', (error) => {
        console.error('[SocketContext] Socket.IO Engine Error:', {
          message: error,
          // @ts-ignore
          type: error.type, // e.g., 'TransportError'
          // @ts-ignore
          description: error.description, // e.g., the XHR error object
          // @ts-ignore
          cause: error.cause,
        });
      });
    }
    
    newSocket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[SocketContext] Socket.IO Reconnect Attempt: ${attempt}`);
    });

    newSocket.io.on('reconnect_failed', () => {
      console.error('[SocketContext] Socket.IO Reconnect Failed after all attempts.');
    });
    
    newSocket.io.on('reconnect_error', (error) => {
      console.error('[SocketContext] Socket.IO Reconnect Error. Details:', {
        message: error.message,
        name: error.name,
        // @ts-ignore
        description: error.description,
        // @ts-ignore
        cause: error.cause,
        stack: error.stack?.substring(0, 300) + "..."
      });
    });

    return () => {
      console.log('[SocketContext] Cleaning up: Disconnecting socket...', newSocket.id);
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