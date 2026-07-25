'use client';

import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useQueryState } from '@/components/dashboard/use-query-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface WorkspaceOption {
  id: string;
  name: string;
}

/**
 * Switches the active workspace scope via `?ws=` (S3.1) and creates new
 * workspaces (S4.4). "All workspaces" clears the param. Membership is
 * re-verified server-side before scoping.
 */
export function WorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const setQuery = useQueryState();
  const activeId = params.get('ws');
  const active = workspaces.find((w) => w.id === activeId);
  const label = active?.name ?? 'All workspaces';

  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function createWorkspace(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        data?: { workspace?: { id?: string } };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Could not create workspace.');
        setPending(false);
        return;
      }
      const id = body?.data?.workspace?.id;
      setCreateOpen(false);
      setName('');
      setPending(false);
      if (id) setQuery({ ws: id }); // switch to the new workspace
      router.refresh(); // refresh the sidebar's workspace list
    } catch {
      setError('Network error. Please try again.');
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[13rem]">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setQuery({ ws: null })}>
            <span className="flex-1 truncate">All workspaces</span>
            {!activeId ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
          {workspaces.length > 0 ? <DropdownMenuSeparator /> : null}
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => setQuery({ ws: workspace.id })}>
              <span className="flex-1 truncate">{workspace.name}</span>
              {activeId === workspace.id ? <Check className="size-4" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setError(null);
              setName('');
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span>New workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              You&apos;ll be the owner. Invite people once it&apos;s created.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createWorkspace} className="space-y-4">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workspace name"
              aria-label="Workspace name"
              maxLength={80}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? 'Creating…' : 'Create workspace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
