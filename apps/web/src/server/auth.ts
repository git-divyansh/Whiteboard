import 'server-only';

import { createAuthConfig } from '@whiteboard/auth';
import NextAuth from 'next-auth';

import { authLogger } from '@/server/auth-logger';

/**
 * Node-runtime Auth.js instance (full config: Prisma adapter + Credentials).
 * Import `auth()` in Server Components / route handlers to read the session.
 *
 * The edge middleware uses a *separate*, adapter-free instance built from
 * `@whiteboard/auth/edge` — see `src/middleware.ts`.
 *
 * `events` + `logger` are routed to the file-based auth logger (D5.5) so the
 * authentication flow is observable without console noise. Only safe fields are
 * recorded — never tokens/passwords/secrets (Guideline #16).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...createAuthConfig(),
  events: {
    signIn({ user, account, isNewUser }) {
      void authLogger.signIn({
        provider: account?.provider,
        userId: user?.id,
        email: user?.email ?? undefined,
        isNewUser,
      });
    },
    signOut(message) {
      // JWT strategy passes { token }; DB strategy passes { session }.
      const token = 'token' in message ? message.token : null;
      void authLogger.signOut({
        userId: (token?.uid as string | undefined) ?? token?.sub,
        email: token?.email ?? undefined,
      });
    },
    createUser({ user }) {
      void authLogger.createUser({ userId: user?.id, email: user?.email ?? undefined });
    },
    linkAccount({ user, account }) {
      void authLogger.linkAccount({ userId: user?.id, provider: account?.provider });
    },
  },
  logger: {
    error(error) {
      // Also emit to the console so the real cause is visible in serverless
      // (Vercel) function logs — the file logger can't write on a read-only FS.
      console.error('[auth]', error);
      void authLogger.error({ name: error.name, message: error.message, stack: error.stack });
    },
    warn(code) {
      console.warn('[auth]', code);
      void authLogger.warn(code);
    },
    // `debug` intentionally omitted — too noisy for the auth log.
  },
});
