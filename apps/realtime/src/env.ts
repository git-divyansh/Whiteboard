import { z } from 'zod';

/**
 * Realtime server environment (Guideline #20). Shares REALTIME_JWT_SECRET with
 * the web app so handshake tokens verify. DATABASE_URL is optional here — if
 * absent, document persistence simply degrades to in-memory (rooms are still
 * fully collaborative for the session's lifetime).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  REALTIME_PORT: z.coerce.number().int().positive().default(3001),
  REALTIME_JWT_SECRET: z.string().min(16, 'REALTIME_JWT_SECRET must be at least 16 characters'),
  REALTIME_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  DATABASE_URL: z.string().url().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid realtime environment:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. See logs above.');
  }
  return parsed.data;
}

export const env = loadEnv();
