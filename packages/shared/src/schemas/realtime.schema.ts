import { z } from 'zod';

import { REALTIME_MESSAGE_TYPES } from '../constants';
import { cuidSchema, finiteNumber, hexColorSchema } from './common';

/**
 * Application-level realtime control messages (Guideline #9).
 *
 * The bulk of collaboration rides on the binary Yjs sync + awareness protocol,
 * which is length-prefixed and handled by the Yjs layer directly. These JSON
 * envelopes carry control-plane concerns: the auth handshake, permission
 * invalidation, and heartbeats. Every inbound message is validated against
 * this discriminated union before the server acts on it.
 */

export const realtimeMessageTypeSchema = z.enum(REALTIME_MESSAGE_TYPES);

/** Presence payload broadcast via Yjs awareness. Rendered as live cursors. */
export const presenceSchema = z.object({
  cursor: z
    .object({
      x: finiteNumber,
      y: finiteNumber,
    })
    .nullable(),
  name: z.string().max(80).optional(),
  color: hexColorSchema.optional(),
  /** Ids of shapes the user currently has selected. */
  selection: z.array(z.string().max(64)).max(500).optional(),
});

/** Client -> server: initial handshake carrying the short-lived realtime token. */
export const authMessageSchema = z.object({
  type: z.literal('auth'),
  token: z.string().min(1),
  boardId: cuidSchema,
});

export const pingMessageSchema = z.object({
  type: z.literal('ping'),
  t: finiteNumber.optional(),
});

/** Server -> client: a permission changed; client should re-fetch/re-evaluate. */
export const permissionMessageSchema = z.object({
  type: z.literal('permission'),
  boardId: cuidSchema,
});

export const errorMessageSchema = z.object({
  type: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

/** Discriminated union of all JSON control messages. */
export const realtimeControlMessageSchema = z.discriminatedUnion('type', [
  authMessageSchema,
  pingMessageSchema,
  permissionMessageSchema,
  errorMessageSchema,
]);

export type Presence = z.infer<typeof presenceSchema>;
export type AuthMessage = z.infer<typeof authMessageSchema>;
export type RealtimeControlMessage = z.infer<typeof realtimeControlMessageSchema>;
