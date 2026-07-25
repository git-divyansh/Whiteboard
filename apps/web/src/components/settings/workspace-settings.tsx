'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';

export interface WorkspaceRow {
  id: string;
  name: string;
}

/**
 * Rename workspaces the user owns/administers (S6.9). Each row saves
 * independently; the server re-checks Owner/Admin.
 */
export function WorkspaceSettings({ workspaces }: { workspaces: WorkspaceRow[] }) {
  if (workspaces.length === 0) {
    return (
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-medium">Workspaces</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t own or administer any workspace to rename.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border p-6">
      <h2 className="text-lg font-medium">Workspaces</h2>
      <p className="mt-1 text-sm text-muted-foreground">Rename the workspaces you manage.</p>
      <ul className="mt-4 space-y-3">
        {workspaces.map((workspace) => (
          <li key={workspace.id}>
            <WorkspaceRowEditor workspace={workspace} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function WorkspaceRowEditor({ workspace }: { workspace: WorkspaceRow }) {
  const router = useRouter();
  const [name, setName] = React.useState(workspace.name);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(b?.error?.message ?? 'Could not rename.');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex max-w-sm items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        aria-label={`Rename ${workspace.name}`}
        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button
        type="button"
        size="sm"
        disabled={pending || !name.trim() || name.trim() === workspace.name}
        onClick={() => void save()}
      >
        Save
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
