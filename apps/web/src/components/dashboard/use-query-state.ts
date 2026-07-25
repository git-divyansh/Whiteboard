'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

/**
 * Returns a setter that merges updates into the current URL query string and
 * navigates (replace, no scroll). Passing `''`/`null` removes a key. The
 * dashboard keeps all view state (filter/search/sort/view) in the URL so it is
 * shareable, bookmarkable, and server-rendered.
 */
export function useQueryState(): (updates: Record<string, string | null>) => void {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  return React.useCallback(
    (updates) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname],
  );
}
