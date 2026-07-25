import './load-env';

import { createRealtimeServer } from './server';
import { logger } from './logger';

const server = createRealtimeServer();
server.listen();

async function shutdown(signal: string): Promise<void> {
  logger.info('shutting down', { signal });
  try {
    await server.close();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('uncaught exception', { error: String(error) });
});
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', { reason: String(reason) });
});
