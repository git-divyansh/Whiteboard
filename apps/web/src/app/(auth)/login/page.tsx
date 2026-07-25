import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { signIn } from '@/server/auth';

export const metadata: Metadata = { title: 'Sign in' };

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const githubEnabled = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        <div className="space-y-2">
          {googleEnabled ? (
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/dashboard' });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Continue with Google
              </Button>
            </form>
          ) : null}

          {githubEnabled ? (
            <form
              action={async () => {
                'use server';
                await signIn('github', { redirectTo: '/dashboard' });
              }}
            >
              <Button type="submit" variant="outline" className="w-full">
                Continue with GitHub
              </Button>
            </form>
          ) : null}

          {!googleEnabled && !githubEnabled ? (
            <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
              No OAuth providers configured yet. Add credentials to <code>.env</code> to enable
              Google / GitHub sign-in.
            </p>
          ) : null}
        </div>

        {/* Email & password ships in the security session (Argon2id + MFA). */}
        <div className="space-y-2 opacity-60">
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="bg-card px-2">or email &amp; password (coming soon)</span>
          </div>
          <input
            disabled
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            disabled
            type="password"
            placeholder="••••••••"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <Button disabled className="w-full">
            Sign in
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          New here?{' '}
          <Link href="/register" className="underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
