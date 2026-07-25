import 'server-only';

import { AppError, isAppError } from '@whiteboard/shared';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Convert any thrown value into a safe JSON error response. Unknown errors are
 * logged server-side and returned as a generic 500 — stack traces and internals
 * are never sent to the client (Guideline #11).
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (isAppError(error)) {
    return NextResponse.json(error.toResponseBody(), { status: error.status });
  }

  if (error instanceof ZodError) {
    const appError = AppError.validation('Validation failed', error.flatten());
    return NextResponse.json(appError.toResponseBody(), { status: appError.status });
  }

  console.error('[api] Unhandled error:', error);
  const internal = AppError.internal();
  return NextResponse.json(internal.toResponseBody(), { status: internal.status });
}
