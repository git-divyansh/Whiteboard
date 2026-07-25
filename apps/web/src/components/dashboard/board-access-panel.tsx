'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import * as React from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';

export interface BoardOption {
  id: string;
  name: string;
}
export interface BoardCollaboratorRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

const BOARD_ROLES: [string, string][] = [
  ['ADMIN', 'Admin'],
  ['EDITOR', 'Editor'],
  ['VIEWER', 'Viewer'],
  ['GUEST', 'Guest'],
];

/**
 * Board-level access management inside the Members page (D5.1). Pick a board,
 * then view/edit its collaborators. The current user's own row is marked "(you)"
 * and locked; the board owner is not shown (owner access is implicit).
 */
export function BoardAccessPanel({
  workspaceId,
  boards,
  selectedBoardId,
  collaborators,
  currentUserId,
}: {
  workspaceId: string;
  boards: BoardOption[];
  selectedBoardId: string | null;
  collaborators: BoardCollaboratorRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState<BoardCollaboratorRow | null>(null);

  async function call(input: string, init: RequestInit): Promise<boolean> {
    setError(null);
    try {
      const res = await fetch(input, init);
      if (res.status === 401) {
        router.push('/login');
        return false;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? 'Something went wrong.');
        return false;
      }
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    }
  }

  async function changeRole(userId: string, email: string, role: string) {
    if (!selectedBoardId) return;
    setBusy(userId);
    const ok = await call(`/api/boards/${selectedBoardId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    setBusy(null);
    if (ok) router.refresh();
  }

  async function remove(userId: string) {
    if (!selectedBoardId) return;
    setBusy(userId);
    const ok = await call(`/api/boards/${selectedBoardId}/collaborators/${userId}`, {
      method: 'DELETE',
    });
    setBusy(null);
    if (ok) router.refresh();
  }

  if (boards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No boards here you can manage access for.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <select
        value={selectedBoardId ?? ''}
        onChange={(e) =>
          router.push(`/members?tab=boards&ws=${workspaceId}&board=${e.target.value}`)
        }
        aria-label="Select a board"
        className="h-9 w-full max-w-sm rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {collaborators.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No one has explicit access to this board yet. Use a board&apos;s Share button to add
          people.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {collaborators.map((c) => {
            const isSelf = c.id === currentUserId;
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium">
                  {(c.name ?? c.email).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {c.name ?? c.email}
                    {isSelf ? (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                </div>

                {isSelf ? (
                  <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {c.role.charAt(0) + c.role.slice(1).toLowerCase()}
                  </span>
                ) : (
                  <>
                    <select
                      value={c.role}
                      disabled={busy === c.id}
                      onChange={(e) => void changeRole(c.id, c.email, e.target.value)}
                      aria-label={`Role for ${c.email}`}
                      className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {BOARD_ROLES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ${c.email}`}
                      disabled={busy === c.id}
                      onClick={() => setConfirmRemove(c)}
                      className="rounded-md p-1.5 text-muted-foreground transition hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmRemove(null);
        }}
        title="Remove access?"
        description={
          confirmRemove
            ? `${confirmRemove.name ?? confirmRemove.email} will lose access to this board.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (confirmRemove) await remove(confirmRemove.id);
        }}
      />
    </div>
  );
}
