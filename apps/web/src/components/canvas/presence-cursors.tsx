'use client';

import { useEffect, useState } from 'react';
import type { WebsocketProvider } from 'y-websocket';

/**
 * Renders remote collaborators' live cursors from Yjs awareness state
 * (Guideline: "live cursors, user presence indicators"). Positions are in
 * canvas/scene coordinates; once pan/zoom lands, apply the viewport transform
 * here so overlays track the canvas.
 */
interface RemoteCursor {
  clientId: number;
  x: number;
  y: number;
  name: string;
  color: string;
}

export function PresenceCursors({ provider }: { provider: WebsocketProvider | null }) {
  const [cursors, setCursors] = useState<RemoteCursor[]>([]);

  useEffect(() => {
    const awareness = provider?.awareness;
    if (!awareness) return;

    const update = () => {
      const next: RemoteCursor[] = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        const cursor = state.cursor as { x: number; y: number } | undefined;
        const user = state.user as { name?: string; color?: string } | undefined;
        if (cursor) {
          next.push({
            clientId,
            x: cursor.x,
            y: cursor.y,
            name: user?.name ?? 'Guest',
            color: user?.color ?? '#6366f1',
          });
        }
      });
      setCursors(next);
    };

    awareness.on('change', update);
    update();
    return () => awareness.off('change', update);
  }, [provider]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cursors.map((cursor) => (
        <div
          key={cursor.clientId}
          className="absolute left-0 top-0 will-change-transform"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={cursor.color} aria-hidden>
            <path d="M4 2l7 18 2.5-7.5L21 10 4 2z" />
          </svg>
          <span
            className="ml-3 inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white shadow"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </span>
        </div>
      ))}
    </div>
  );
}
