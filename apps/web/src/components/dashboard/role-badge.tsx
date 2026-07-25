import type { Role } from '@whiteboard/shared';

import { cn } from '@/lib/utils';

/**
 * Small pill showing the current user's role on a board. Colors are advisory
 * only — actual authorization is always enforced server-side (Guideline #2).
 */

const ROLE_STYLES: Record<Role, string> = {
  OWNER: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  ADMIN: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  EDITOR: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  VIEWER: 'border-muted-foreground/25 bg-muted text-muted-foreground',
  GUEST: 'border-muted-foreground/25 bg-transparent text-muted-foreground',
};

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
  GUEST: 'Guest',
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none',
        ROLE_STYLES[role],
        className,
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
