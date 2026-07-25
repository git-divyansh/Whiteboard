import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Create account' };

/**
 * Placeholder registration screen. The credential sign-up flow (validation with
 * `registerSchema`, Argon2id hashing, email verification) is implemented in the
 * security session. OAuth sign-in is available now from the login page.
 */
export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-8 shadow-sm text-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Email &amp; password registration is being finalized. For now, sign in with an OAuth
            provider.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
