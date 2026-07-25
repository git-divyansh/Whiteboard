'use client';

import { Clock, LayoutGrid, LayoutTemplate, Star, Trash2, Users, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { NewBoardButton } from '@/components/dashboard/new-board-button';
import {
  WorkspaceSwitcher,
  type WorkspaceOption,
} from '@/components/dashboard/workspace-switcher';
import { cn } from '@/lib/utils';

/**
 * Left navigation. Filter items drive the `?filter=` query param the dashboard
 * reads server-side; the workspace switcher drives `?ws=` (S3.1).
 */

const PRIMARY = [
  { key: 'recent', label: 'Recent', icon: Clock },
  { key: 'mine', label: 'My boards', icon: LayoutGrid },
  { key: 'shared', label: 'Shared with me', icon: Users },
  { key: 'starred', label: 'Starred', icon: Star },
] as const;

const SECONDARY = [
  { key: 'templates', label: 'Templates', icon: LayoutTemplate },
  { key: 'trash', label: 'Trash', icon: Trash2 },
] as const;

export function DashboardSidebar({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeFilter = searchParams.get('filter') ?? 'recent';
  const activeWs = searchParams.get('ws') ?? undefined;
  const membersHref = activeWs ? `/members?ws=${activeWs}` : '/members';

  const hrefFor = React.useCallback(
    (filterKey: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (filterKey === 'recent') next.delete('filter');
      else next.set('filter', filterKey);
      next.delete('q'); // start each section with a clean search
      const qs = next.toString();
      return qs ? `/dashboard?${qs}` : '/dashboard';
    },
    [searchParams],
  );

  const renderItem = ({
    key,
    label,
    icon: Icon,
  }: {
    key: string;
    label: string;
    icon: typeof Clock;
  }) => {
    const active = activeFilter === key;
    return (
      <Link
        key={key}
        href={hrefFor(key)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/20 md:flex">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          Whiteboard
        </Link>
      </div>

      <div className="space-y-3 p-3">
        <WorkspaceSwitcher workspaces={workspaces} />
        <NewBoardButton className="[&>button]:w-full" workspaceId={activeWs} />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {PRIMARY.map(renderItem)}
        <div className="!mt-4 space-y-1 border-t pt-4">
          {SECONDARY.map(renderItem)}
          <Link
            href={membersHref}
            aria-current={pathname === '/members' ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/members'
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            <UsersRound className="size-4 shrink-0" />
            Members
          </Link>
        </div>
      </nav>

      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        {workspaces.length > 0 ? `${workspaces.length} workspace${workspaces.length === 1 ? '' : 's'}` : 'Personal workspace'}
      </div>
    </aside>
  );
}
