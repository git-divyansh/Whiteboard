'use client';

import { Check, Copy, Link2, Mail, Trash2, Users2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ShareLink {
  id: string;
  token: string;
  access: string;
  role: string;
}

type Scope = 'board' | 'workspace';

const BOARD_ROLES: [string, string][] = [
  ['VIEWER', 'Viewer'],
  ['EDITOR', 'Editor'],
  ['ADMIN', 'Admin'],
  ['GUEST', 'Guest'],
];
const WORKSPACE_ROLES: [string, string][] = [
  ['MEMBER', 'Member'],
  ['ADMIN', 'Admin'],
  ['VIEWER', 'Viewer'],
];

/**
 * Grant access to a board (D5.2). Two scopes — Board and Workspace — each granted
 * by email invite; board scope also supports share links. Default roles:
 * workspace → Member, board → Viewer. Viewing/editing existing members lives in
 * the Members page (D5.1), not here.
 */
export function ShareDialog({
  boardId,
  boardName,
  workspaceId,
  open,
  onOpenChange,
}: {
  boardId: string;
  boardName: string;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [scope, setScope] = React.useState<Scope>('board');
  const [email, setEmail] = React.useState('');
  const [boardRole, setBoardRole] = React.useState('VIEWER');
  const [workspaceRole, setWorkspaceRole] = React.useState('MEMBER');
  const [links, setLinks] = React.useState<ShareLink[]>([]);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const refetchLinks = React.useCallback(async () => {
    const l = await fetch(`/api/boards/${boardId}/share-links`).then((r) => (r.ok ? r.json() : null));
    setLinks(l?.data?.shareLinks ?? []);
  }, [boardId]);

  React.useEffect(() => {
    if (open) void refetchLinks();
  }, [open, refetchLinks]);

  async function mutate(input: string, init: RequestInit): Promise<boolean> {
    setError(null);
    setNotice(null);
    setPending(true);
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
    } finally {
      setPending(false);
    }
  }

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    const url =
      scope === 'board'
        ? `/api/boards/${boardId}/collaborators`
        : `/api/workspaces/${workspaceId}/members`;
    const role = scope === 'board' ? boardRole : workspaceRole;
    const ok = await mutate(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, role }),
    });
    if (ok) {
      setEmail('');
      setNotice(`${trimmed} was given ${scope} access.`);
      router.refresh();
    }
  }

  async function createLink() {
    // Links default to Viewer; a role selector returns with S6.1 (redemption),
    // when links actually grant access.
    const ok = await mutate(`/api/boards/${boardId}/share-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access: 'RESTRICTED', role: 'VIEWER' }),
    });
    if (ok) await refetchLinks();
  }

  async function revokeLink(id: string) {
    if (await mutate(`/api/boards/${boardId}/share-links/${id}`, { method: 'DELETE' })) {
      await refetchLinks();
    }
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  const roleOptions = scope === 'board' ? BOARD_ROLES : WORKSPACE_ROLES;
  const roleValue = scope === 'board' ? boardRole : workspaceRole;
  const setRoleValue = scope === 'board' ? setBoardRole : setWorkspaceRole;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share “{boardName}”</DialogTitle>
          <DialogDescription>Invite people or create a link.</DialogDescription>
        </DialogHeader>

        {/* Scope segmented control */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <ScopeTab
            active={scope === 'board'}
            icon={<Link2 className="size-4" />}
            label="This board"
            onClick={() => setScope('board')}
          />
          <ScopeTab
            active={scope === 'workspace'}
            icon={<Users2 className="size-4" />}
            label="Workspace"
            onClick={() => setScope('workspace')}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {scope === 'board'
            ? 'Access to this board only.'
            : 'Access to every board in the workspace.'}
        </p>

        {/* Email invite */}
        <form onSubmit={invite} className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Mail className="size-3.5" /> Invite by email
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              aria-label="Invite by email"
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value)}
              aria-label="Role"
              className="h-9 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {roleOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={pending || !email.trim()}>
              Invite
            </Button>
          </div>
        </form>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}

        {/* Share links (board scope only) */}
        {scope === 'board' ? (
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Link2 className="size-3.5" /> Share link
              </label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => void createLink()}
              >
                Create link
              </Button>
            </div>
            {links.length > 0 ? (
              <ul className="space-y-1">
                {links.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      /share/{l.token.slice(0, 12)}… · {l.role.toLowerCase()}
                    </span>
                    <button
                      type="button"
                      aria-label="Copy link"
                      onClick={() => void copyLink(l.token)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      {copied === l.token ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      aria-label="Revoke link"
                      onClick={() => void revokeLink(l.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ScopeTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
