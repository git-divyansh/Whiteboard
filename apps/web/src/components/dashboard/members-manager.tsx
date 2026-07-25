'use client';

import { ASSIGNABLE_WORKSPACE_ROLES, type WorkspaceRole } from '@whiteboard/shared';
import { Trash2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MemberRow {
  id: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
}

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

export function MembersManager({
  workspaceId,
  members,
  canManage,
  currentUserId,
}: {
  workspaceId: string;
  members: MemberRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<WorkspaceRole>('MEMBER');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState<MemberRow | null>(null);

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

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || pending) return;
    setPending(true);
    const ok = await call(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    setPending(false);
    if (ok) {
      setEmail('');
      router.refresh();
    }
  }

  async function changeRole(userId: string, nextRole: WorkspaceRole) {
    setBusyId(userId);
    const ok = await call(`/api/workspaces/${workspaceId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: nextRole }),
    });
    setBusyId(null);
    if (ok) router.refresh();
  }

  async function removeMember(userId: string) {
    setBusyId(userId);
    const ok = await call(`/api/workspaces/${workspaceId}/members/${userId}`, { method: 'DELETE' });
    setBusyId(null);
    if (ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <form onSubmit={addMember} className="flex flex-wrap items-center gap-2 rounded-xl border p-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            aria-label="Invite by email"
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as WorkspaceRole)}
            aria-label="Role"
            className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ASSIGNABLE_WORKSPACE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={pending || !email.trim()}>
            <UserPlus />
            {pending ? 'Adding…' : 'Add'}
          </Button>
        </form>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="divide-y rounded-xl border">
        {members.map((member) => {
          const isOwner = member.role === 'OWNER';
          const isSelf = member.id === currentUserId;
          const editable = canManage && !isOwner && !isSelf;
          return (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-medium">
                {(member.name ?? member.email).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {member.name ?? member.email}
                  {isSelf ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">{member.email}</div>
              </div>

              {editable ? (
                <select
                  value={member.role}
                  disabled={busyId === member.id}
                  onChange={(event) => changeRole(member.id, event.target.value as WorkspaceRole)}
                  aria-label={`Role for ${member.email}`}
                  className="h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ASSIGNABLE_WORKSPACE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    isOwner
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'text-muted-foreground',
                  )}
                >
                  {ROLE_LABEL[member.role]}
                </span>
              )}

              {editable ? (
                <button
                  type="button"
                  aria-label={`Remove ${member.email}`}
                  disabled={busyId === member.id}
                  onClick={() => setConfirmRemove(member)}
                  className="rounded-md p-1.5 text-muted-foreground transition hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmRemove(null);
        }}
        title="Remove member?"
        description={
          confirmRemove
            ? `${confirmRemove.name ?? confirmRemove.email} will lose access to this workspace.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (confirmRemove) await removeMember(confirmRemove.id);
        }}
      />
    </div>
  );
}
