import { ArrowRight, Users2, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-12 px-6 py-16 text-center">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="space-y-6">
        <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
          Foundation build · v0.1
        </span>
        <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl">
          The collaborative canvas for your whole team
        </h1>
        <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
          Brainstorm, plan, and diagram together in real time. Freehand drawing, sticky notes,
          shapes, and live cursors — synced instantly across everyone on the board.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/board/demo-board">
              Open the demo board
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
        {process.env.NODE_ENV !== 'production' ? (
          <p className="text-xs text-muted-foreground">
            Dev tip: set{' '}
            <code className="rounded bg-muted px-1 py-0.5">ALLOW_DEV_ANON_REALTIME=true</code> to try
            the demo board before auth is wired.
          </p>
        ) : null}
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-3">
        <Feature icon={<Zap />} title="Real-time sync">
          Conflict-free collaboration powered by CRDTs (Yjs) — edits merge cleanly, even offline.
        </Feature>
        <Feature icon={<Users2 />} title="Presence">
          See who’s on the board and where their cursor is, live.
        </Feature>
        <Feature icon={<ShieldCheck />} title="Secure by design">
          RBAC, validation, and rate-limiting seams built into the foundation.
        </Feature>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 text-left">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
