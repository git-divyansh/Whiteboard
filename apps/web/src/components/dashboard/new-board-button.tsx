'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

/**
 * Creates a board via `POST /api/boards` and navigates into its canvas.
 *
 * Follows the Miro/FigJam pattern: the board is created immediately with a
 * default name (renamed in-canvas later) rather than prompting up front. The
 * server resolves the target workspace, so no workspace id is sent from the
 * client (Guideline #2 — the client never asserts where it may write).
 */

const DEFAULT_BOARD_NAME = 'Untitled board';

interface NewBoardButtonProps {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  label?: string;
  className?: string;
  /** Optional target workspace; when omitted the server uses the personal one. */
  workspaceId?: string;
}

export function NewBoardButton({
  variant = 'default',
  size,
  label = 'New board',
  className,
  workspaceId,
}: NewBoardButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function createBoard() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: DEFAULT_BOARD_NAME,
          ...(workspaceId ? { workspaceId } : {}),
        }),
      });

      // Session expired mid-session — bounce to login rather than showing an error.
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const payload = (await res.json().catch(() => null)) as {
        data?: { board?: { id?: string } };
        error?: { message?: string };
      } | null;

      if (!res.ok) {
        setError(payload?.error?.message ?? 'Could not create board. Please try again.');
        setPending(false);
        return;
      }

      const id = payload?.data?.board?.id;
      if (!id) {
        setError('Unexpected response from the server.');
        setPending(false);
        return;
      }

      // Success: keep the button disabled/"Creating…" through the navigation.
      router.push(`/board/${id}`);
    } catch {
      setError('Network error. Check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button onClick={createBoard} disabled={pending} variant={variant} size={size}>
        <Plus aria-hidden />
        {pending ? 'Creating…' : label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
