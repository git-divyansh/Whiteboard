import { prisma } from '@whiteboard/db';
import { AVATAR_PRESETS, AppError, updateUserSchema } from '@whiteboard/shared';

import { defineRoute, json, requireUser } from '@/server/api/handler';

/**
 * PATCH /api/user — update the current user's own profile (S6.9): display name
 * and/or avatar (a small base64 data URL, or null to clear). Users can only
 * edit themselves — the id comes from the session, never the client.
 */
const MAX_AVATAR_BYTES = 90 * 1024;

export const PATCH = defineRoute(
  { auth: true, body: updateUserSchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body }) => {
    const me = requireUser(user);

    const data: { name?: string; image?: string | null } = {};
    if (body.name !== undefined) {
      data.name = body.name;
    }
    // Preset takes precedence: map the trusted index to its server-defined SVG.
    if (body.avatarPreset !== undefined) {
      data.image = AVATAR_PRESETS[body.avatarPreset] ?? null;
    } else if (body.image !== undefined) {
      if (body.image !== null) {
        const base64 = body.image.split(',', 2)[1] ?? '';
        if (Buffer.from(base64, 'base64').byteLength > MAX_AVATAR_BYTES) {
          throw AppError.payloadTooLarge('Avatar too large');
        }
      }
      data.image = body.image;
    }

    const updated = await prisma.user.update({
      where: { id: me.id },
      data,
      select: { id: true, name: true, image: true },
    });
    return json({ user: updated });
  },
);
