/**
 * Shared error taxonomy. A single, stable set of machine-readable codes lets the
 * API return safe, consistent error bodies without leaking internals
 * (Guideline #11: "Do not expose stack traces or internal implementation
 * details"). The realtime server uses the same codes over the wire.
 */

export const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Default HTTP status for each error code. */
export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
};

/**
 * Application error carrying a safe, client-facing message and a stable code.
 * Anything thrown that is NOT an AppError must be treated as INTERNAL and its
 * details logged server-side but never returned to the client.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Optional structured details (e.g. Zod field errors) safe to expose. */
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }

  /** Serialisable body shape returned to clients. Never includes a stack. */
  toResponseBody(): { error: { code: ErrorCode; message: string; details?: unknown } } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }

  static unauthenticated(message = 'Authentication required') {
    return new AppError(ERROR_CODES.UNAUTHENTICATED, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(ERROR_CODES.FORBIDDEN, message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(ERROR_CODES.NOT_FOUND, message);
  }
  static validation(message = 'Invalid request', details?: unknown) {
    return new AppError(ERROR_CODES.VALIDATION, message, details);
  }
  static rateLimited(message = 'Too many requests') {
    return new AppError(ERROR_CODES.RATE_LIMITED, message);
  }
  static payloadTooLarge(message = 'Payload too large') {
    return new AppError(ERROR_CODES.PAYLOAD_TOO_LARGE, message);
  }
  static internal(message = 'Something went wrong') {
    return new AppError(ERROR_CODES.INTERNAL, message);
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
