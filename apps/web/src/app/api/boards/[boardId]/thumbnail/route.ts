import { prisma } from '@whiteboard/db';
import { AppError, boardIdParamSchema, thumbnailUploadSchema } from '@whiteboard/shared';
import { NextResponse } from 'next/server';

import { defineRoute, json, requireUser } from '@/server/api/handler';
import { requireBoardPermission } from '@/server/authz';

/**
 * Board thumbnail (S3.4). PUT stores a small rasterized preview (board:edit);
 * GET streams it back (board:view). Stored in-row for the foundation; the
 * storage session moves this to signed-URL object storage (Guideline #13).
 */

const MAX_DECODED_BYTES = 256 * 1024;

export const PUT = defineRoute(
  { auth: true, body: thumbnailUploadSchema, rateLimit: 'API_DEFAULT' },
  async ({ user, body, params }) => {
    const me = requireUser(user);
    const { boardId } = boardIdParamSchema.parse(params);
    await requireBoardPermission(me, boardId, 'board:edit');

    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(body.dataUrl);
    if (!match?.[1] || !match[2]) {
      throw AppError.validation('Invalid image data URL');
    }
    const contentType = match[1];
    const data = Buffer.from(match[2], 'base64');
    if (data.byteLength === 0 || data.byteLength > MAX_DECODED_BYTES) {
      throw AppError.payloadTooLarge('Thumbnail too large');
    }

    await prisma.boardThumbnail.upsert({
      where: { boardId },
      update: { data, contentType },
      create: { boardId, data, contentType },
    });
    return json({ ok: true });
  },
);

export const GET = defineRoute({ auth: true, rateLimit: 'API_DEFAULT' }, async ({ user, params }) => {
  const me = requireUser(user);
  const { boardId } = boardIdParamSchema.parse(params);
  await requireBoardPermission(me, boardId, 'board:view');

  const thumb = await prisma.boardThumbnail.findUnique({ where: { boardId } });
  if (!thumb) {
    throw AppError.notFound('No thumbnail');
  }

  return new NextResponse(thumb.data, {
    status: 200,
    headers: {
      'Content-Type': thumb.contentType,
      // Private (auth-gated) content; revalidate so updates show promptly.
      'Cache-Control': 'private, max-age=10, must-revalidate',
    },
  });
});
