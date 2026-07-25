import type { NextAuthConfig } from 'next-auth';

import { buildOAuthProviders } from './providers';

/**
 * Edge-safe Auth.js configuration.
 *
 * This half contains NO database adapter and NO Node-only providers, so it can
 * run in the Next.js middleware (edge runtime). The Node runtime augments it
 * with the Prisma adapter and the Credentials provider — see `node-config.ts`.
 * This split is the officially recommended Auth.js v5 pattern.
 *
 * Session strategy is JWT (Guideline: "JWT + Refresh Tokens"). Refresh-token
 * rotation and the accompanying persistence (RefreshToken table) are wired in
 * the security session.
 */
export const baseAuthConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: buildOAuthProviders(),
  trustHost: true,
  callbacks: {
    /** Consulted by the edge middleware to gate protected routes. */
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    /** Persist the user id (and later: role, mfa, emailVerified) onto the JWT. */
    jwt({ token, user }) {
      if (user?.id) {
        (token as Record<string, unknown>).uid = user.id;
      }
      return token;
    },
    /** Surface the user id on the session object for downstream consumers. */
    session({ session, token }) {
      const uid = (token as Record<string, unknown>).uid;
      if (typeof uid === 'string' && session.user) {
        (session.user as { id?: string }).id = uid;
      }
      return session;
    },
  },
};
