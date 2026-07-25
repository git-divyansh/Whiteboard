import { prisma } from '@whiteboard/db';
import { loginSchema } from '@whiteboard/shared';
import Credentials from 'next-auth/providers/credentials';

import { verifyPassword } from './password';

/**
 * Email & password provider (Node runtime only — depends on Prisma + hashing).
 *
 * The input is validated with the shared `loginSchema` before any DB work.
 * The heavy security logic lives in the security session; the seam is here:
 *   - account lockout after repeated failures (Guideline #1)
 *   - Argon2id verification (via the installed hasher)
 *   - MFA/TOTP challenge when `mfaEnabled`
 *   - audit logging of success/failure (Guideline #16)
 *
 * Until an Argon2id hasher is installed, `verifyPassword` fails closed, so this
 * provider correctly rejects all credential logins rather than allowing them.
 */
export function buildCredentialsProvider() {
  return Credentials({
    id: 'credentials',
    name: 'Email & Password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      totp: { label: 'Authenticator code', type: 'text' },
    },
    async authorize(raw) {
      const parsed = loginSchema.safeParse(raw);
      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });

      // No user, OAuth-only account (no hash), or bad password → reject.
      if (!user || !user.passwordHash) {
        return null;
      }

      const valid = await verifyPassword(user.passwordHash, parsed.data.password);
      if (!valid) {
        return null;
      }

      // SECURITY SESSION: enforce emailVerified, lockout, and MFA here.
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  });
}
