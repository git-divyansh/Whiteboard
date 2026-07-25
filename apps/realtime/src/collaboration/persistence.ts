import { prisma } from '@whiteboard/db';
import * as Y from 'yjs';

import { logger } from '../logger';

/**
 * Document persistence seam (powers durable saves + version history). Snapshots
 * are debounced Yjs state updates written to `BoardSnapshot`. Everything is
 * guarded and best-effort: if the DB is unavailable, or the room is an ephemeral
 * board that doesn't exist (e.g. the dev demo board), persistence simply no-ops
 * and the room stays collaborative in memory.
 *
 * SECURITY/SCALE SESSION: add snapshot pruning, compaction, and (for multi-node)
 * a Redis-backed update log so instances converge.
 */
const DEBOUNCE_MS = 3000;
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export async function loadDocument(name: string, doc: Y.Doc): Promise<void> {
  try {
    const snapshot = await prisma.boardSnapshot.findFirst({
      where: { boardId: name },
      orderBy: { version: 'desc' },
      select: { state: true },
    });
    if (snapshot) {
      Y.applyUpdate(doc, new Uint8Array(snapshot.state));
      logger.info('document loaded from snapshot', { room: name });
    }
  } catch (error) {
    logger.warn('failed to load document snapshot', { room: name, error: String(error) });
  }
}

export function schedulePersist(name: string, doc: Y.Doc): void {
  const existing = pendingTimers.get(name);
  if (existing) clearTimeout(existing);
  pendingTimers.set(
    name,
    setTimeout(() => {
      void persist(name, doc);
    }, DEBOUNCE_MS),
  );
}

export async function flushDocument(name: string, doc: Y.Doc): Promise<void> {
  const existing = pendingTimers.get(name);
  if (existing) {
    clearTimeout(existing);
    pendingTimers.delete(name);
  }
  await persist(name, doc);
}

async function persist(name: string, doc: Y.Doc): Promise<void> {
  pendingTimers.delete(name);
  try {
    const board = await prisma.board.findUnique({
      where: { id: name },
      select: { version: true },
    });
    // Only persist real, existing boards. Ephemeral rooms are ignored.
    if (!board) return;

    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    const nextVersion = board.version + 1;

    await prisma.$transaction([
      prisma.boardSnapshot.create({
        data: { boardId: name, version: nextVersion, state },
      }),
      prisma.board.update({
        where: { id: name },
        data: { version: nextVersion },
      }),
    ]);
    logger.debug('document persisted', { room: name, version: nextVersion });
  } catch (error) {
    logger.warn('failed to persist document', { room: name, error: String(error) });
  }
}
