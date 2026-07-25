'use client';

import { LayoutTemplate } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { TEMPLATES } from '@/lib/templates';

/**
 * Templates gallery (S3.5). Each card creates a board (server picks the
 * workspace, or the active one) and opens it with `?template=<key>`, which the
 * canvas uses to seed starter shapes into the empty document.
 */
export function TemplatesGallery({ workspaceId }: { workspaceId?: string }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function useTemplate(key: string, name: string) {
    if (pendingKey) return;
    setPendingKey(key);
    setError(null);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, ...(workspaceId ? { workspaceId } : {}) }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        data?: { board?: { id?: string } };
        error?: { message?: string };
      } | null;
      if (!res.ok) {
        setError(body?.error?.message ?? 'Could not create board. Please try again.');
        setPendingKey(null);
        return;
      }
      const id = body?.data?.board?.id;
      if (!id) {
        setError('Unexpected response from the server.');
        setPendingKey(null);
        return;
      }
      router.push(`/board/${id}?template=${key}`);
    } catch {
      setError('Network error. Please try again.');
      setPendingKey(null);
    }
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((template) => (
          <li key={template.key}>
            <div className="flex h-full flex-col rounded-xl border bg-card p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <LayoutTemplate className="size-5" />
              </div>
              <div className="font-medium">{template.name}</div>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{template.description}</p>
              <Button
                className="mt-4 self-start"
                size="sm"
                variant="outline"
                disabled={pendingKey !== null}
                onClick={() => void useTemplate(template.key, template.name)}
              >
                {pendingKey === template.key ? 'Creating…' : 'Use template'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
