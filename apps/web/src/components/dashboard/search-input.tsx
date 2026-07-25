'use client';

import { Search, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import { useQueryState } from '@/components/dashboard/use-query-state';

/**
 * Debounced board search (S2.3). Writes to `?q=` (300ms after typing stops) so
 * the server component re-queries. Kept controlled + synced to the URL so
 * external changes (e.g. switching filter clears the query) reflect here.
 */
export function SearchInput() {
  const params = useSearchParams();
  const setQuery = useQueryState();
  const urlQuery = params.get('q') ?? '';
  const [value, setValue] = React.useState(urlQuery);

  // Reflect URL-driven changes (filter switch clears q, back/forward, etc.).
  React.useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  // Debounce writes back to the URL.
  React.useEffect(() => {
    if (value === urlQuery) return;
    const timer = setTimeout(() => setQuery({ q: value || null }), 300);
    return () => clearTimeout(timer);
  }, [value, urlQuery, setQuery]);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search boards…"
        aria-label="Search boards"
        className="h-9 w-full rounded-md border bg-background pl-9 pr-8 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
