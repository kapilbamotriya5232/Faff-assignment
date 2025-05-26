import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HttpServer } from 'http';
// Adjust the import path if your 'lib' folder is structured differently relative to 'pages/api'
import { initSocketIO, getIO, CUSTOM_SOCKET_PATH } from '../../lib/socket-io-server';

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: NextApiResponse["socket"] & {
    server: HttpServer & {
      // io?: ReturnType<typeof initSocketIO>; // Optional
    };
  };
}

export const config = { api: { bodyParser: false } };

export default function socketIoCustomPathHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // req.url for /api/mycustomsocket/?EIO=4... will start with /api/mycustomsocket/
  // CUSTOM_SOCKET_PATH is /api/mycustomsocket/
  // We check if the request URL starts with the base path of our socket io instance.
  if (req.url?.startsWith(CUSTOM_SOCKET_PATH.slice(0, -1))) { // Check against /api/mycustomsocket
    let ioInstance = getIO(); 

    if (!ioInstance) {
      console.log(`[api${CUSTOM_SOCKET_PATH}] Socket.IO instance not found. Initializing...`);
      const httpServerInstance: HttpServer = res.socket.server as any;
      // initSocketIO configures the IO server with CUSTOM_SOCKET_PATH,
      // attaches event listeners, and stores it globally.
      initSocketIO(httpServerInstance);
    } else {
      console.log(`[api${CUSTOM_SOCKET_PATH}] Socket.IO instance already available.`);
    }
  } else {
    // This should not be hit if Vercel routes /api/mycustomsocket/... requests here correctly.
    console.warn(`[api${CUSTOM_SOCKET_PATH}] Received request for unexpected URL: ${req.url}`);
    res.status(404).end("Resource not found or path mismatch.");
    return; // Important to return if not handling
  }
  
  // End the response for the HTTP request that invoked this API route.
  // Socket.IO engine, once attached, handles its specific protocol requests.
  res.end();
}