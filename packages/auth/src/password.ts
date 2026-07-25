/**
 * Password hashing seam (Guideline #1 / #15).
 *
 * The foundation ships a *fail-closed* placeholder: `hash()` throws and
 * `verify()` returns false, so credential auth simply cannot succeed until the
 * security session installs a real Argon2id hasher via `setPasswordHasher()`.
 * This guarantees we never accidentally ship a no-op or plaintext comparison.
 *
 * Security session:
 *   import argon2 from 'argon2';
 *   setPasswordHasher({
 *     hash: (p) => argon2.hash(p, { type: argon2.argon2id, ... }),
 *     verify: (h, p) => argon2.verify(h, p),
 *   });
 */
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

class UnconfiguredPasswordHasher implements PasswordHasher {
  hash(): Promise<string> {
    throw new Error(
      'Password hashing is not configured. Install an Argon2id hasher via setPasswordHasher() (security session).',
    );
  }
  verify(): Promise<boolean> {
    // Fail closed — credential login is disabled until a real hasher is set.
    return Promise.resolve(false);
  }
}

let activeHasher: PasswordHasher = new UnconfiguredPasswordHasher();

/** Install the production hasher (Argon2id) — called once at app bootstrap. */
export function setPasswordHasher(hasher: PasswordHasher): void {
  activeHasher = hasher;
}

export function hashPassword(password: string): Promise<string> {
  return activeHasher.hash(password);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return activeHasher.verify(hash, password);
}
