import 'server-only';

import type { AuthUser } from '@whiteboard/shared';

import { auth } from '@/server/auth';

/**
 * Resolve the authenticated principal for the current request, or null.
 * `emailVerified` / `mfaEnabled` are placeholders until the security session
 * enriches the JWT/session; consumers should treat them as authoritative only
 * after that work lands.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    emailVerified: false,
    mfaEnabled: false,
  };
}

/** Best-effort client IP for rate-limiting/audit. Trust only behind a proxy. */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}
