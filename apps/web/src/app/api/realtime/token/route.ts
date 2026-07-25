import { signRealtimeToken } from '@whiteboard/auth/realtime-token';
import { AppError } from '@whiteboard/shared';
import { z } from 'zod';

import { env } from '@/env';
import { defineRoute, json } from '@/server/api/handler';
import { requireBoardPermission } from '@/server/authz';

/**
 * Mint a short-lived, board-scoped token the browser uses to authenticate its
 * WebSocket handshake with the realtime server (Guideline #9). Authorization is
 * resolved server-side against the DB — the client never asserts its own role.
 */
const bodySchema = z.object({
  // Room ids are opaque to the realtime layer; validate as a bounded string.
  boardId: z.string().min(1).max(100),
});

export const POST = defineRoute(
  { auth: false, body: bodySchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body }) => {
    const { boardId } = body;

    if (user) {
      const context = await requireBoardPermission(user, boardId, 'board:view');
      const token = await signRealtimeToken({
        userId: user.id,
        boardId,
        role: context.role,
      });
      return json({ token });
    }

    // DEV-ONLY fallback so the canvas is usable before credential auth exists.
    // Gated behind NODE_ENV + ALLOW_DEV_ANON_REALTIME; the env loader forbids
    // this flag in production. SECURITY SESSION: delete this branch.
    if (env.NODE_ENV !== 'production' && env.ALLOW_DEV_ANON_REALTIME) {
      const token = await signRealtimeToken({
        userId: 'dev-anon',
        boardId,
        role: 'EDITOR',
      });
      return json({ token, anonymous: true });
    }

    throw AppError.unauthenticated();
  },
);
