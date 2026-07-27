import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

// Neon's serverless driver needs a WebSocket constructor in Node runtimes.
neonConfig.webSocketConstructor = ws;

/**
 * Prisma client singleton. In dev, Next.js hot-reload would otherwise spawn a
 * new client (and a new connection pool) on every reload, exhausting Postgres
 * connections. We cache it on globalThis outside production.
 *
 * On Neon (serverless/Vercel) we run through the Neon driver adapter, which uses
 * the WASM query engine — so no native `libquery_engine-*.so.node` binary is
 * needed at runtime (fixes PE-1). Locally (Docker Postgres) we use the native
 * engine. Connection pooling / SSL are configured via DATABASE_URL (Guideline #12).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? '';

  // NOTE: never enable statement-level `query` logging in production — it can
  // surface parameter values in logs (Guideline #16). Errors/warnings only.
  if (/neon\.tech/i.test(url)) {
    const pool = new Pool({ connectionString: url });
    return new PrismaClient({
      adapter: new PrismaNeon(pool),
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export the generated client namespace so consumers get enums (Role, …),
// model types (User, Board, …), and the Prisma helper from one place.
export * from '@prisma/client';
export { PrismaClient };
