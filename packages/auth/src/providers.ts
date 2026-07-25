import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import type { Provider } from 'next-auth/providers';

/**
 * OAuth providers, gated on env presence so the app boots even when a provider
 * is not yet configured. These are edge-safe (no Node-only crypto), so they can
 * live in the base config used by the edge middleware.
 *
 * `allowDangerousEmailAccountLinking` is deliberately left off — the security
 * session decides the account-linking policy explicitly.
 */
export function buildOAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        // Always show Google's account chooser so you can pick a different
        // account instead of being silently reused into the last one.
        authorization: { params: { prompt: 'select_account' } },
      }),
    );
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(
      GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      }),
    );
  }

  return providers;
}
