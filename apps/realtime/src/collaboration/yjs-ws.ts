import { LIMITS } from '@whiteboard/shared';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import type { WebSocket } from 'ws';
import * as Y from 'yjs';

import { logger } from '../logger';
import { createRateLimiter } from '../security/connection-guard';
import { flushDocument, loadDocument, schedulePersist } from './persistence';

/**
 * Yjs collaboration over WebSockets (Guideline #9). Implements the standard Yjs
 * message protocol (sync + awareness) with hardening seams:
 *   - write operations are gated on the connection's resolved role (canWrite)
 *   - oversized frames are rejected (payload limit)
 *   - per-connection heartbeat evicts dead clients
 *   - document state is persisted (debounced) via the persistence module
 *
 * One shared Y.Doc per board room, held in `docs` for the room's lifetime.
 */

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// Yjs sync sub-message types (stable wire constants).
const SYNC_STEP_1 = 0;
const SYNC_STEP_2 = 1;
const SYNC_UPDATE = 2;

const HEARTBEAT_INTERVAL_MS = 30_000;

class SharedDoc extends Y.Doc {
  readonly name: string;
  /** conn -> set of awareness client ids it controls. */
  readonly conns = new Map<WebSocket, Set<number>>();
  readonly awareness: awarenessProtocol.Awareness;

  constructor(name: string) {
    super({ gc: true });
    this.name = name;
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.awareness.on('update', this.handleAwarenessUpdate);
    this.on('update', this.handleDocUpdate);
  }

  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ): void => {
    const { added, updated, removed } = changes;
    const changed = added.concat(updated, removed);

    if (origin && this.conns.has(origin as WebSocket)) {
      const controlled = this.conns.get(origin as WebSocket);
      if (controlled) {
        added.forEach((id) => controlled.add(id));
        removed.forEach((id) => controlled.delete(id));
      }
    }

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed),
    );
    const message = encoding.toUint8Array(encoder);
    this.conns.forEach((_, conn) => sendMessage(this, conn, message));
  };

  private handleDocUpdate = (update: Uint8Array, _origin: unknown): void => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    this.conns.forEach((_, conn) => sendMessage(this, conn, message));
    schedulePersist(this.name, this);
  };
}

const docs = new Map<string, SharedDoc>();

function getDoc(name: string): SharedDoc {
  let doc = docs.get(name);
  if (!doc) {
    doc = new SharedDoc(name);
    docs.set(name, doc);
    void loadDocument(name, doc);
  }
  return doc;
}

function sendMessage(doc: SharedDoc, conn: WebSocket, message: Uint8Array): void {
  // 0 = CONNECTING, 1 = OPEN
  if (conn.readyState !== 0 && conn.readyState !== 1) {
    closeConn(doc, conn);
    return;
  }
  try {
    conn.send(message, (err) => {
      if (err) closeConn(doc, conn);
    });
  } catch {
    closeConn(doc, conn);
  }
}

function closeConn(doc: SharedDoc, conn: WebSocket): void {
  const controlled = doc.conns.get(conn);
  if (controlled) {
    doc.conns.delete(conn);
    awarenessProtocol.removeAwarenessStates(doc.awareness, Array.from(controlled), null);
    if (doc.conns.size === 0) {
      // Last participant left — flush a final snapshot. The doc is kept in
      // memory for fast rejoin; idle eviction is a future optimization.
      void flushDocument(doc.name, doc);
    }
  }
  try {
    conn.close();
  } catch {
    // already closed
  }
}

/** Apply an inbound sync message, gating mutations on write permission. */
function readSyncMessageGuarded(
  decoder: decoding.Decoder,
  encoder: encoding.Encoder,
  doc: SharedDoc,
  conn: WebSocket,
  canWrite: boolean,
): void {
  const messageType = decoding.readVarUint(decoder);
  switch (messageType) {
    case SYNC_STEP_1:
      // Client requests our state — always allowed (read).
      syncProtocol.readSyncStep1(decoder, encoder, doc);
      break;
    case SYNC_STEP_2:
      if (canWrite) syncProtocol.readSyncStep2(decoder, doc, conn);
      break;
    case SYNC_UPDATE:
      if (canWrite) syncProtocol.readUpdate(decoder, doc, conn);
      break;
    default:
      throw new Error(`Unknown sync message type: ${messageType}`);
  }
}

function handleMessage(
  conn: WebSocket,
  doc: SharedDoc,
  data: Uint8Array,
  canWrite: boolean,
): void {
  try {
    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case MESSAGE_SYNC:
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        readSyncMessageGuarded(decoder, encoder, doc, conn, canWrite);
        if (encoding.length(encoder) > 1) {
          sendMessage(doc, conn, encoding.toUint8Array(encoder));
        }
        break;
      case MESSAGE_AWARENESS:
        awarenessProtocol.applyAwarenessUpdate(
          doc.awareness,
          decoding.readVarUint8Array(decoder),
          conn,
        );
        break;
      default:
        // Ignore unknown top-level message types.
        break;
    }
  } catch (error) {
    logger.error('failed to handle message', { room: doc.name, error: String(error) });
  }
}

export interface ConnectionOptions {
  /** Whether this connection's role is allowed to mutate the document. */
  canWrite: boolean;
}

export function setupWSConnection(
  conn: WebSocket,
  roomName: string,
  options: ConnectionOptions,
): void {
  conn.binaryType = 'arraybuffer';
  const doc = getDoc(roomName);
  doc.conns.set(conn, new Set());

  const allow = createRateLimiter();

  conn.on('message', (raw: ArrayBuffer) => {
    const data = new Uint8Array(raw);
    if (data.byteLength > LIMITS.REALTIME_MESSAGE_MAX_BYTES) {
      logger.warn('dropping oversized frame', { room: roomName, bytes: data.byteLength });
      closeConn(doc, conn);
      return;
    }
    if (!allow()) {
      logger.warn('rate limit exceeded; dropping frame', { room: roomName });
      return;
    }
    handleMessage(conn, doc, data, options.canWrite);
  });

  // Heartbeat: evict connections that stop responding to pings.
  let alive = true;
  const heartbeat = setInterval(() => {
    if (!alive) {
      closeConn(doc, conn);
      clearInterval(heartbeat);
      return;
    }
    alive = false;
    try {
      conn.ping();
    } catch {
      closeConn(doc, conn);
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_INTERVAL_MS);
  conn.on('pong', () => {
    alive = true;
  });

  conn.on('close', () => {
    closeConn(doc, conn);
    clearInterval(heartbeat);
  });

  // Initial handshake: send sync step 1 and the current awareness snapshot.
  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  sendMessage(doc, conn, encoding.toUint8Array(syncEncoder));

  const states = doc.awareness.getStates();
  if (states.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(doc.awareness, Array.from(states.keys())),
    );
    sendMessage(doc, conn, encoding.toUint8Array(awarenessEncoder));
  }
}

export function getActiveRoomCount(): number {
  return docs.size;
}
