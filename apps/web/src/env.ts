import { z } from 'zod';

/**
 * Typed, validated server environment (Guideline #20). The app refuses to boot
 * with a missing/malformed secret rather than failing mysteriously at runtime.
 *
 * Server-only. Do NOT import this from client components — read `NEXT_PUBLIC_*`
 * values via `process.env` directly on the client (Next.js inlines them).
 *
 * `SKIP_ENV_VALIDATION=true` bypasses validation for tooling that runs without a
 * full environment (e.g. `next build` in CI producing a Docker image).
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  REALTIME_JWT_SECRET: z.string().min(16, 'REALTIME_JWT_SECRET must be at least 16 characters'),

  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_REALTIME_URL: z.string().default('ws://localhost:3001'),

  // Dev-only escape hatch: mint a realtime token without a full session so the
  // canvas can be exercised before credential auth lands. MUST be false in prod;
  // the security session should delete this path entirely.
  ALLOW_DEV_ANON_REALTIME: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return process.env as unknown as ServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Log field-level issues (keys only, never values) and fail fast.
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. See logs above.');
  }

  if (parsed.data.NODE_ENV === 'production' && parsed.data.ALLOW_DEV_ANON_REALTIME) {
    throw new Error('ALLOW_DEV_ANON_REALTIME must not be enabled in production.');
  }

  return parsed.data;
}

export const env = loadEnv();
