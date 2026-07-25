import { prisma } from '@whiteboard/db';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ProfileSettings } from '@/components/settings/profile-settings';
import { WorkspaceSettings } from '@/components/settings/workspace-settings';
import { getAuthUser } from '@/server/api/context';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect('/login');
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id, role: { in: ['OWNER', 'ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: { workspace: { select: { id: true, name: true } } },
  });
  const workspaces = memberships.map((m) => m.workspace);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <ProfileSettings name={user.name} email={user.email} image={user.image} />
      <WorkspaceSettings workspaces={workspaces} />
    </main>
  );
}
