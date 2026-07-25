'use client';

import { ArrowDownAZ, ArrowUpDown, Check, Clock, LayoutGrid, List } from 'lucide-react';
import type { ReactNode } from 'react';

import { useQueryState } from '@/components/dashboard/use-query-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type SortKey = 'updated' | 'name';
export type ViewMode = 'grid' | 'list';

const SORTS: { key: SortKey; label: string; icon: typeof Clock }[] = [
  { key: 'updated', label: 'Last updated', icon: Clock },
  { key: 'name', label: 'Name (A–Z)', icon: ArrowDownAZ },
];

/** Sort menu + grid/list toggle (S2.4). Both persist to the URL. */
export function ViewControls({ sort, view }: { sort: SortKey; view: ViewMode }) {
  const setQuery = useQueryState();
  const activeLabel = (SORTS.find((option) => option.key === sort) ?? SORTS[0])?.label ?? 'Sort';

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowUpDown className="size-4 text-muted-foreground" />
          <span className="hidden sm:inline">{activeLabel}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {SORTS.map(({ key, label, icon: Icon }) => (
            <DropdownMenuItem
              key={key}
              onSelect={() => setQuery({ sort: key === 'updated' ? null : key })}
            >
              <Icon />
              <span>{label}</span>
              {sort === key ? <Check className="ml-auto" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex h-9 items-center rounded-md border p-0.5">
        <ToggleButton
          active={view === 'grid'}
          label="Grid view"
          onClick={() => setQuery({ view: null })}
        >
          <LayoutGrid className="size-4" />
        </ToggleButton>
        <ToggleButton
          active={view === 'list'}
          label="List view"
          onClick={() => setQuery({ view: 'list' })}
        >
          <List className="size-4" />
        </ToggleButton>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
