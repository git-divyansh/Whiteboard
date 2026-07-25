/**
 * Cross-cutting constants shared by the web app and the realtime server.
 *
 * Keeping limits here (rather than hard-coded per app) means the security
 * session can tighten a single value and have it enforced everywhere:
 * payload caps, rate windows, upload rules, etc.
 */

/** Hard limits — enforced by Zod schemas and middleware. */
export const LIMITS = {
  /** Max characters for a text label / sticky note body. */
  TEXT_MAX_LENGTH: 10_000,
  /** Max characters for a board name. */
  BOARD_NAME_MAX_LENGTH: 120,
  /** Max characters for an organization / workspace name. */
  ORG_NAME_MAX_LENGTH: 80,
  /** Max size (bytes) of a single realtime message payload. Enforced server-side. */
  REALTIME_MESSAGE_MAX_BYTES: 128 * 1024, // 128 KiB
  /** Max size (bytes) of a single uploaded file. */
  UPLOAD_MAX_BYTES: 25 * 1024 * 1024, // 25 MiB
  /** Max number of collaborators returned per page. */
  PAGE_SIZE_DEFAULT: 25,
  PAGE_SIZE_MAX: 100,
} as const;

/**
 * Days a soft-deleted (archived) board stays in Trash before the purge job
 * permanently removes it (S4.9). Keep the purge script's value in sync with this.
 */
export const TRASH_RETENTION_DAYS = 30;

/**
 * Approved upload MIME types. The file-upload security controls (Guideline #8)
 * will validate against this allowlist. Executables/scripts are never allowed.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

/**
 * Rate-limit budgets (requests per window, in seconds). The security session
 * wires these into the Redis-backed limiter; defined here so limits are auditable
 * in one place (Guideline #17).
 */
export const RATE_LIMITS = {
  LOGIN: { points: 5, windowSeconds: 60 },
  REGISTER: { points: 3, windowSeconds: 3600 },
  PASSWORD_RESET: { points: 3, windowSeconds: 3600 },
  INVITE: { points: 20, windowSeconds: 3600 },
  API_DEFAULT: { points: 100, windowSeconds: 60 },
  /** Resource-creation writes are tighter than reads to blunt board-spam. */
  BOARD_CREATE: { points: 30, windowSeconds: 60 },
  /**
   * Per-connection realtime message budget. Sized for live collaboration:
   * throttled cursor updates (~25/s) + Yjs sync frames + awareness. The old
   * 240/10s dropped legitimate sync frames during normal drawing/cursor
   * activity, so edits failed to propagate.
   */
  REALTIME_EVENTS: { points: 1200, windowSeconds: 10 },
  UPLOAD: { points: 30, windowSeconds: 3600 },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

/** Kinds of objects a board can contain. Fabric.js maps these to concrete types. */
export const SHAPE_KINDS = [
  'path', // freehand drawing
  'rect',
  'ellipse',
  'triangle',
  'line',
  'arrow',
  'text',
  'sticky',
  'image',
  'connector',
  'group',
] as const;

export type ShapeKind = (typeof SHAPE_KINDS)[number];

/**
 * Realtime protocol message types. Yjs document sync + awareness rides on the
 * binary Yjs protocol; these application-level control messages ride alongside
 * it for presence metadata, permission changes, and heartbeats.
 */
export const REALTIME_MESSAGE_TYPES = [
  'sync', // Yjs sync step (binary handled separately)
  'awareness', // cursor / presence
  'auth', // handshake / re-auth
  'permission', // board permission changed — client should re-evaluate
  'ping',
  'pong',
  'error',
] as const;

export type RealtimeMessageType = (typeof REALTIME_MESSAGE_TYPES)[number];

/** Yjs sub-document shared-type keys. Keep stable — changing breaks persistence. */
export const YJS_KEYS = {
  /** Y.Map<string, ShapeRecord> keyed by shape id. */
  SHAPES: 'shapes',
  /** Y.Map<string, unknown> for board-level metadata (background, grid, etc.). */
  META: 'meta',
} as const;
