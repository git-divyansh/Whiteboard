import type { DefaultSession } from 'next-auth';

/**
 * Module augmentation so `session.user.id` is typed everywhere. The security
 * session extends these with `role`, `emailVerified`, and `mfaEnabled` once the
 * JWT callback is enriched.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
  }
}
