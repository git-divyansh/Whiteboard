/**
 * HTTP security headers (Guideline #14) — single source of truth, consumed by
 * `next.config.ts`. Kept dependency-light (reads process.env directly) because
 * next.config is evaluated outside the app's module-resolution/alias context.
 *
 * The CSP here is a sound baseline but still permits `'unsafe-inline'` for
 * styles/scripts to keep the foundation working before the app is refactored to
 * nonce/hash-based scripts. The SECURITY SESSION should:
 *   - move to a nonce-based script-src via middleware
 *   - drop 'unsafe-inline'/'unsafe-eval'
 *   - add report-uri / report-to for CSP violation monitoring
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function buildContentSecurityPolicy(): string {
  const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'ws://localhost:3001';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const connectSrc = ["'self'", realtimeUrl, appUrl].filter(Boolean);
  // Inline images (avatar presets/uploads, canvas thumbnails via same-origin API)
  // plus OAuth provider avatar CDNs.
  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https://lh3.googleusercontent.com',
    'https://avatars.githubusercontent.com',
  ];

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // 'unsafe-eval' only in dev (Next.js dev/react-refresh); dropped in prod.
    'script-src': ["'self'", "'unsafe-inline'", ...(isProd() ? [] : ["'unsafe-eval'"])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': imgSrc,
    'font-src': ["'self'", 'data:'],
    'connect-src': connectSrc,
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    ...(isProd() ? { 'upgrade-insecure-requests': [] } : {}),
  };

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

export function securityHeaders(): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // WebRTC voice/video needs camera+mic; everything else is denied by default.
    {
      key: 'Permissions-Policy',
      value: 'camera=(self), microphone=(self), display-capture=(self), geolocation=(), payment=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'off' },
  ];

  if (isProd()) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    });
  }

  return headers;
}
