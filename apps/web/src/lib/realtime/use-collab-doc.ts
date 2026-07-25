'use client';

import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

/**
 * Establishes a collaborative Yjs document for a board:
 *   1. requests a short-lived, board-scoped handshake token from the API
 *   2. opens an authenticated WebSocket to the realtime server
 *   3. exposes the doc + provider (awareness) and connection status
 *
 * The token is passed as a query param; the realtime server verifies it on
 * connect (Guideline #9). Lifecycle is fully cleaned up on unmount / board change.
 */
export type CollabStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface CollabDoc {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  status: CollabStatus;
}

async function fetchRealtimeToken(boardId: string): Promise<string> {
  const response = await fetch('/api/realtime/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ boardId }),
  });
  if (!response.ok) {
    throw new Error(`Realtime token request failed (${response.status})`);
  }
  const payload = (await response.json()) as { data?: { token?: string } };
  const token = payload.data?.token;
  if (!token) {
    throw new Error('Realtime token missing from response');
  }
  return token;
}

export function useCollabDoc(boardId: string): CollabDoc {
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<CollabStatus>('connecting');

  useEffect(() => {
    let cancelled = false;
    const nextDoc = new Y.Doc();
    setDoc(nextDoc);
    setStatus('connecting');

    const serverUrl = process.env.NEXT_PUBLIC_REALTIME_URL ?? 'ws://localhost:3001';
    let activeProvider: WebsocketProvider | null = null;

    fetchRealtimeToken(boardId)
      .then((token) => {
        if (cancelled) return;
        activeProvider = new WebsocketProvider(serverUrl, boardId, nextDoc, {
          params: { token },
          connect: true,
        });
        activeProvider.on('status', (event: { status: string }) => {
          setStatus(event.status === 'connected' ? 'connected' : 'disconnected');
        });
        setProvider(activeProvider);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      activeProvider?.destroy();
      nextDoc.destroy();
      setProvider(null);
      setDoc(null);
    };
  }, [boardId]);

  return { doc, provider, status };
}
