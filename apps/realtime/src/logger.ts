/* eslint-disable no-console -- this module is the console boundary. */
/**
 * Minimal structured logger with redaction (Guideline #16: never log secrets).
 * Emits one JSON object per line — friendly to log aggregators. The security
 * session can swap this for pino/winston without changing call sites.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = new Set(['token', 'secret', 'password', 'authorization', 'cookie']);

function redact(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = REDACT_KEYS.has(key.toLowerCase()) ? '[redacted]' : value;
  }
  return out;
}

function emit(level: Level, message: string, meta: Record<string, unknown> = {}): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  });
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit('error', message, meta),
};
