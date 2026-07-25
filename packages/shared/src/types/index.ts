/**
 * Domain types shared across apps that are not directly inferred from a Zod
 * schema. Schema-inferred types (RegisterInput, ShapeRecord, …) are exported
 * from their schema modules; import those directly.
 */
import type { Permission, Role } from '../rbac';

/** The authenticated principal, as resolved by the auth layer and passed to
 *  handlers. Kept minimal and provider-agnostic so the auth implementation can
 *  change without touching consumers. */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

/** Result of resolving a user's authorization context for a specific board. */
export interface BoardAuthContext {
  user: AuthUser;
  boardId: string;
  role: Role;
  permissions: ReadonlySet<Permission>;
}

/** Standard success envelope for API responses. */
export interface ApiSuccess<T> {
  data: T;
}

/** Cursor-paginated list envelope. */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

/** Minimal session claims embedded in the short-lived realtime handshake token. */
export interface RealtimeTokenClaims {
  sub: string; // user id
  boardId: string;
  role: Role;
  /** Issued-at / expiry (seconds since epoch). */
  iat: number;
  exp: number;
}
