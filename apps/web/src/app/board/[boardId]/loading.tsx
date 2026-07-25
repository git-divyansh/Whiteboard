import { Loader2 } from 'lucide-react';

/**
 * Shown instantly by the App Router while the board route loads, so a click
 * gives immediate feedback instead of appearing to do nothing.
 */
export default function BoardLoading() {
  return (
    <div className="flex h-dvh w-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-semibold">Whiteboard</span>
        <span className="text-muted-foreground">/</span>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </header>
      <div className="flex flex-1 items-center justify-center bg-muted/20">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading board…
        </div>
      </div>
    </div>
  );
}
