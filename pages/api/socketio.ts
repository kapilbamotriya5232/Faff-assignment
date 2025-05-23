// pages/api/socketio.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HttpServer } from 'http';
import { initSocketIO, getIO } from '@/lib/socket-io-server'; // <<<< ADJUST PATH CAREFULLY

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NextApiResponse["socket"] & {
    server: HttpServer & {
      // No need to store io here directly if using global
    };
  };
}

export const config = { api: { bodyParser: false } };

export default function socketIOHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (req.method === 'GET') {
    let ioInstance = getIO(); // Check if instance exists globally
    if (!ioInstance) {
      console.log('[pages/api/socketio] Global Socket.IO instance not found. Initializing...');
      const httpServerInstance: HttpServer = res.socket.server as any;
      initSocketIO(httpServerInstance); // This will create and store it globally
    } else {
      console.log('[pages/api/socketio] Global Socket.IO instance already available.');
    }
    res.end('Socket.IO setup check complete.');
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}