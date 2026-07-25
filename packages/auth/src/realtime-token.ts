import { type RealtimeTokenClaims, type Role, isRole } from '@whiteboard/shared';
import { SignJWT, jwtVerify } from 'jose';

/**
 * Short-lived, signed handshake tokens for the realtime WebSocket server
 * (Guideline #9/#10). The web app mints a token scoped to a single board + role
 * after verifying the user's session and board membership; the realtime server
 * verifies it on connect. HS256 with a shared secret keeps both sides simple and
 * works in edge and Node runtimes (jose is runtime-agnostic).
 *
 * Tokens are intentionally short-lived (60s): they authenticate the *connection*
 * handshake, not the whole session. Long-lived authorization is re-checked
 * server-side against the database.
 */
const REALTIME_TOKEN_TTL_SECONDS = 60;
const ALG = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.REALTIME_JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('REALTIME_JWT_SECRET is missing or too short (need >= 16 chars).');
  }
  return new TextEncoder().encode(secret);
}

export async function signRealtimeToken(input: {
  userId: string;
  boardId: string;
  role: Role;
}): Promise<string> {
  return new SignJWT({ boardId: input.boardId, role: input.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${REALTIME_TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Verify and decode a realtime token. Throws if the signature/expiry is invalid
 * or the claims are malformed — callers must treat a throw as "reject the
 * connection".
 */
export async function verifyRealtimeToken(token: string): Promise<RealtimeTokenClaims> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });

  const { sub, boardId, role, iat, exp } = payload as Record<string, unknown>;

  if (
    typeof sub !== 'string' ||
    typeof boardId !== 'string' ||
    !isRole(role) ||
    typeof iat !== 'number' ||
    typeof exp !== 'number'
  ) {
    throw new Error('Malformed realtime token claims');
  }

  return { sub, boardId, role, iat, exp };
}
