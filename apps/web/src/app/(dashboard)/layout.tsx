import { prisma } from '@whiteboard/db';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { signOutAction } from '@/app/(dashboard)/actions';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { getAuthUser } from '@/server/api/context';

/**
 * Dashboard shell (S2.1): persistent sidebar + topbar around the routed content.
 * Authentication is enforced here so every dashboard route inherits it; the
 * security session will additionally move this behind edge middleware.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspace: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const workspaces = memberships.map((membership) => membership.workspace);

  return (
    <div className="flex h-dvh overflow-hidden">
      <DashboardSidebar workspaces={workspaces} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          userEmail={user.email}
          userName={user.name}
          signOutAction={signOutAction}
        />
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
