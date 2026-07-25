import { z } from 'zod';

import { AVATAR_PRESETS } from '../avatars';

/**
 * Self-service profile updates (S6.9). Avatar is either a preset (chosen by
 * index — the server maps it to a trusted SVG) or a small uploaded base64 data
 * URL (the client resizes to ~128px WebP). `image: null` clears it.
 */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    image: z
      .string()
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, { message: 'Invalid image' })
      .max(120_000)
      .nullable()
      .optional(),
    avatarPreset: z
      .number()
      .int()
      .min(0)
      .max(AVATAR_PRESETS.length - 1)
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.image !== undefined || value.avatarPreset !== undefined,
    { message: 'Nothing to update' },
  );

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
