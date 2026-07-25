import 'server-only';

import { AppError, LIMITS, type AuthUser, type RateLimitKey } from '@whiteboard/shared';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { env } from '@/env';
import { enforceRateLimit } from '@/server/security/rate-limit';
import { getAuthUser, getClientIp } from './context';
import { toErrorResponse } from './errors';

/**
 * Composable route-handler pipeline for App Router route handlers. Each stage is
 * the seam the security session hardens; the *order* is the important contract:
 *
 *   rate-limit → authenticate → validate body → handler → uniform error mapping
 *
 * Every API route should be defined via `defineRoute` so no endpoint can forget
 * a stage (Guideline #11: every endpoint enforces auth, validation, limits).
 */

type RouteParams = Record<string, string | string[]>;

interface RouteConfig<TBody extends z.ZodTypeAny | undefined> {
  /** Require an authenticated session; 401 otherwise. */
  auth?: boolean;
  /** Zod schema the JSON body is parsed against. */
  body?: TBody;
  /** Rate-limit budget key (keyed by client IP). */
  rateLimit?: RateLimitKey;
}

type InferBody<T> = T extends z.ZodTypeAny ? z.infer<T> : undefined;

interface RouteContext<TBody> {
  req: Request;
  user: AuthUser | null;
  body: TBody;
  params: RouteParams;
}

export function defineRoute<TBody extends z.ZodTypeAny | undefined = undefined>(
  config: RouteConfig<TBody>,
  handler: (ctx: RouteContext<InferBody<TBody>>) => Promise<Response> | Response,
): (req: Request, segment?: { params: Promise<RouteParams> }) => Promise<Response> {
  return async (req, segment) => {
    try {
      if (config.rateLimit) {
        await enforceRateLimit(config.rateLimit, getClientIp(req));
      }

      const user = await getAuthUser();
      if (config.auth && !user) {
        throw AppError.unauthenticated();
      }

      let body: unknown;
      if (config.body) {
        body = config.body.parse(await readJsonBody(req));
      }

      const params = segment?.params ? await segment.params : {};

      return await handler({
        req,
        user,
        body: body as InferBody<TBody>,
        params,
      });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

async function readJsonBody(req: Request): Promise<unknown> {
  const declaredLength = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > LIMITS.REALTIME_MESSAGE_MAX_BYTES) {
    throw AppError.payloadTooLarge();
  }

  const text = await req.text();
  if (text.length > LIMITS.REALTIME_MESSAGE_MAX_BYTES) {
    throw AppError.payloadTooLarge();
  }
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw AppError.validation('Request body must be valid JSON');
  }
}

/** Standard success envelope: `{ data: ... }`. */
export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

/** Narrow `ctx.user` to non-null inside an `auth: true` handler. */
export function requireUser(user: AuthUser | null): AuthUser {
  if (!user) {
    throw AppError.unauthenticated();
  }
  return user;
}

// Re-export so route files import env-derived flags from one place if needed.
export { env };
