import { verifyRealtimeToken } from '@whiteboard/auth/realtime-token';
import { LIMITS, can } from '@whiteboard/shared';
import type { IncomingMessage } from 'node:http';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocketServer } from 'ws';

import { setupWSConnection } from './collaboration/yjs-ws';
import { env } from './env';
import { logger } from './logger';
import { isAllowedOrigin } from './security/connection-guard';

/**
 * Realtime WebSocket server bootstrap.
 *
 * Every connection is authenticated at the HTTP upgrade (Guideline #9): we
 * verify the short-lived handshake token, confirm it was issued for the exact
 * room being joined, and derive write permission from the token's role BEFORE
 * accepting the socket. Unauthenticated upgrades never reach the Yjs layer.
 */
export function createRealtimeServer() {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: LIMITS.REALTIME_MESSAGE_MAX_BYTES,
  });

  const httpServer = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  httpServer.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    void authenticateAndUpgrade(wss, req, socket, head);
  });

  return {
    listen: () =>
      httpServer.listen(env.REALTIME_PORT, () => {
        logger.info('realtime server listening', {
          port: env.REALTIME_PORT,
          env: env.NODE_ENV,
          allowedOrigins: env.REALTIME_ALLOWED_ORIGINS,
        });
      }),
    close: () =>
      new Promise<void>((resolve) => {
        wss.close(() => httpServer.close(() => resolve()));
      }),
  };
}

async function authenticateAndUpgrade(
  wss: WebSocketServer,
  req: IncomingMessage,
  socket: Socket,
  head: Buffer,
): Promise<void> {
  try {
    if (!isAllowedOrigin(req.headers.origin)) {
      return reject(socket, 403, 'Forbidden origin');
    }

    const requestUrl = new URL(req.url ?? '/', 'http://localhost');
    const roomName = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
    const token = requestUrl.searchParams.get('token');

    if (!roomName || !token) {
      return reject(socket, 401, 'Missing room or token');
    }

    const claims = await verifyRealtimeToken(token);

    // The token must have been minted for this exact board (Guideline #22:
    // prevent access to a board via a token issued for another).
    if (claims.boardId !== roomName) {
      return reject(socket, 403, 'Token/room mismatch');
    }

    const canWrite = can(claims.role, 'shape:create');

    wss.handleUpgrade(req, socket, head, (conn) => {
      setupWSConnection(conn, roomName, { canWrite });
      logger.info('client connected', {
        room: roomName,
        user: claims.sub,
        role: claims.role,
        canWrite,
      });
    });
  } catch (error) {
    logger.warn('rejected websocket upgrade', { error: String(error) });
    reject(socket, 401, 'Unauthorized');
  }
}

function reject(socket: Socket, code: number, reason: string): void {
  socket.write(`HTTP/1.1 ${code} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}
