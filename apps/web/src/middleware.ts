import { baseAuthConfig } from '@whiteboard/auth/edge';
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * Edge middleware. Uses the adapter-free Auth.js instance (edge runtime cannot
 * use Prisma) purely to read the session and gate protected routes.
 *
 * Global security headers are applied in `next.config.ts`. The security session
 * may move CSP here to attach a per-request nonce.
 */
const { auth } = NextAuth(baseAuthConfig);

// Route prefixes that require an authenticated session. `/board/*` is
// intentionally left open in the foundation so the canvas can be exercised
// before credential auth lands; the security session should add it here and
// enforce board-level authorization on entry.
const PROTECTED_PREFIXES = ['/dashboard', '/settings'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const requiresAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (requiresAuth && !req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
