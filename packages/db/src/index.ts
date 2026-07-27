import { PrismaClient } from '@prisma/client';

/**
 * Prisma client singleton. In dev, Next.js hot-reload would otherwise spawn a
 * new client (and a new connection pool) on every reload, exhausting Postgres
 * connections. We cache it on globalThis outside production.
 *
 * Connection pooling / SSL are configured via DATABASE_URL (Guideline #12).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // NOTE: never enable statement-level `query` logging in production — it can
    // surface parameter values in logs (Guideline #16). Errors/warnings only.
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
