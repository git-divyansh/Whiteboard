import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@whiteboard/db';
import type { NextAuthConfig } from 'next-auth';

import { baseAuthConfig } from './base-config';
import { buildCredentialsProvider } from './credentials';

/**
 * Full Auth.js configuration for the Node runtime: the edge-safe base plus the
 * Prisma adapter (account/passkey/verification persistence) and the Credentials
 * provider. The web app calls `NextAuth(createAuthConfig())` in its Node-only
 * auth entrypoint.
 */
export function createAuthConfig(): NextAuthConfig {
  return {
    ...baseAuthConfig,
    // `prisma` is typed via `.prisma/client` while the adapter expects the
    // `@prisma/client` PrismaClient type — same generated client, but two
    // distinct type identities. Cast to the adapter's exact parameter type.
    adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
    providers: [...baseAuthConfig.providers, buildCredentialsProvider()],
  };
}
