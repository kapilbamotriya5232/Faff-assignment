// pages/api/socketio.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HttpServer } from 'http';
import { initSocketIO } from '@/lib/socket-io-server';
// import { Server as NetServer } from 'net'; // For type compatibility (might not be needed with 'any')


interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NextApiResponse["socket"] & {
    server: HttpServer & {
      io?: ReturnType<typeof initSocketIO>;
    };
  };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function socketIOHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (req.method === 'GET') {
    if (!res.socket.server.io) {
      console.log('First time setup: Initializing Socket.IO server via pages/api...');
      const httpServer: HttpServer = res.socket.server as any;
      initSocketIO(httpServer); // This attaches io to httpServer
    } else {
      console.log('Socket.IO server (pages/api) already running.');
    }
    res.end();
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}