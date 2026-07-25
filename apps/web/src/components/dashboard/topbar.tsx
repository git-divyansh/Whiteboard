'use client';

import { LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SearchInput } from '@/components/dashboard/search-input';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
  userEmail: string;
  userName: string | null;
  /** Server action passed down from the layout. */
  signOutAction: () => Promise<void>;
}

export function DashboardTopbar({ userEmail, userName, signOutAction }: TopbarProps) {
  const initial = (userName ?? userEmail).slice(0, 1).toUpperCase();
  const router = useRouter();

  async function handleSignOut() {
    await signOutAction(); // clears all auth cookies server-side (no redirect)
    router.refresh(); // purge the client Router Cache (previous user's RSC data)
    router.replace('/login');
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4 sm:px-6">
      <SearchInput />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="flex size-9 items-center justify-center rounded-full border bg-muted text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {initial}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate">{userName ?? 'Account'}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {userEmail}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* preventDefault keeps the menu open (and this handler mounted)
                until the async sign-out completes and we navigate away. */}
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => {
                event.preventDefault();
                void handleSignOut();
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
