'use server';

import { cookies } from 'next/headers';

import { signOut } from '@/server/auth';

/**
 * Server action for the account menu's sign-out button (D5.4).
 *
 * Clears the session cookie (via Auth.js) AND every remaining Auth.js cookie
 * (csrf-token, callback-url — including `__Secure-`/`__Host-` prefixed variants
 * in production), so no trace of the previous user's auth state survives in the
 * browser. Does not redirect: the client follows with `router.refresh()` to
 * purge the Router Cache, then navigates to /login.
 *
 * NOTE: this is local cleanup only. Server-side token revocation / "sign out
 * everywhere" (all devices) needs a session store — deferred to Sprint 7.
 */
export async function signOutAction() {
  await signOut({ redirect: false });

  const store = await cookies();
  for (const cookie of store.getAll()) {
    if (/^(?:__Secure-|__Host-)?authjs\./.test(cookie.name)) {
      store.delete(cookie.name);
    }
  }
}
