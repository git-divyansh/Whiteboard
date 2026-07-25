import { z } from 'zod';

import { LIMITS, SHAPE_KINDS } from '../constants';
import { finiteNumber, hexColorSchema } from './common';

/**
 * Schema for a single board object ("shape") as stored in the Yjs document and
 * rendered by Fabric.js. Every drawing operation is validated against this
 * before it is trusted (Guideline #22: "Validate all drawing operations").
 *
 * The transform block (position/scale/rotation) is common to all Fabric objects.
 * Kind-specific data lives under `props`, kept as a bounded record so the
 * schema tolerates new shape attributes without a breaking change, while still
 * rejecting oversized/hostile payloads.
 */

export const shapeKindSchema = z.enum(SHAPE_KINDS);

/** Geometric transform mirrored from Fabric's object model. */
export const transformSchema = z.object({
  left: finiteNumber,
  top: finiteNumber,
  width: finiteNumber.nonnegative().optional(),
  height: finiteNumber.nonnegative().optional(),
  scaleX: finiteNumber.default(1),
  scaleY: finiteNumber.default(1),
  angle: finiteNumber.default(0),
  skewX: finiteNumber.default(0),
  skewY: finiteNumber.default(0),
  flipX: z.boolean().default(false),
  flipY: z.boolean().default(false),
});

/** Common style attributes. Kind-specific extras go in `props`. */
export const styleSchema = z.object({
  fill: hexColorSchema.nullable().optional(),
  stroke: hexColorSchema.nullable().optional(),
  strokeWidth: finiteNumber.nonnegative().max(200).optional(),
  opacity: finiteNumber.min(0).max(1).optional(),
});

/**
 * A JSON-serialisable value tree with bounded depth is hard to express in Zod
 * cheaply; instead we accept a shallow record of primitives/arrays for
 * kind-specific props and cap the whole shape by byte size in the realtime
 * layer (LIMITS.REALTIME_MESSAGE_MAX_BYTES). Rich text is sanitised separately
 * (Guideline #6) before it is trusted for rendering.
 */
export const shapePropsSchema = z.record(
  z.string().max(64),
  z.union([z.string().max(LIMITS.TEXT_MAX_LENGTH), finiteNumber, z.boolean(), z.null(), z.array(finiteNumber)]),
);

export const shapeRecordSchema = z.object({
  id: z.string().min(1).max(64),
  kind: shapeKindSchema,
  transform: transformSchema,
  style: styleSchema.optional(),
  props: shapePropsSchema.optional(),
  /** z-order within the board layer stack. */
  z: finiteNumber.default(0),
  /** Author of the object — set server-side, never trusted from the client. */
  createdBy: z.string().optional(),
  /** Millisecond timestamps. */
  createdAt: finiteNumber.optional(),
  updatedAt: finiteNumber.optional(),
});

export type Transform = z.infer<typeof transformSchema>;
export type ShapeStyle = z.infer<typeof styleSchema>;
export type ShapeRecord = z.infer<typeof shapeRecordSchema>;
