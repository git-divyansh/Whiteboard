import { YJS_KEYS } from '@whiteboard/shared';
import * as fabric from 'fabric';
import type * as Y from 'yjs';

/**
 * Two-way binding between a Fabric.js canvas and a Yjs document.
 *
 * Model: a single `Y.Map<SerializedObject>` (`YJS_KEYS.SHAPES`) keyed by a
 * stable per-object id. Local Fabric mutations write serialized objects into the
 * map; remote map changes are enlivened back onto the canvas. An `applyingRemote`
 * guard suppresses echo loops — it is toggled around the *synchronous* canvas
 * mutation, so even though enlivening is async, the `object:added` it triggers is
 * correctly ignored.
 *
 * This is the collaboration foundation. The security session adds server-side
 * validation of each `SerializedObject` against the shape schema before it is
 * trusted (Guideline #22).
 */

const OBJ_ID_KEY = 'wbId';

type SerializedObject = Record<string, unknown>;

export interface FabricYjsBinding {
  destroy(): void;
}

type ObjectEvent = { target?: fabric.FabricObject };

function readId(obj: fabric.FabricObject): string | undefined {
  const value = (obj as unknown as Record<string, unknown>)[OBJ_ID_KEY];
  return typeof value === 'string' ? value : undefined;
}

function writeId(obj: fabric.FabricObject, id: string): void {
  (obj as unknown as Record<string, unknown>)[OBJ_ID_KEY] = id;
}

export function bindFabricToYjs(canvas: fabric.Canvas, doc: Y.Doc): FabricYjsBinding {
  const shapes = doc.getMap<SerializedObject>(YJS_KEYS.SHAPES);
  let applyingRemote = false;

  const ensureId = (obj: fabric.FabricObject): string => {
    let id = readId(obj);
    if (!id) {
      id = crypto.randomUUID();
      writeId(obj, id);
    }
    return id;
  };

  const findById = (id: string): fabric.FabricObject | undefined =>
    canvas.getObjects().find((obj) => readId(obj) === id);

  const serialize = (obj: fabric.FabricObject): SerializedObject =>
    obj.toObject([OBJ_ID_KEY]) as SerializedObject;

  // --- local Fabric mutations -> Yjs ---
  const handleUpsert = (event: ObjectEvent): void => {
    if (applyingRemote) return;
    const obj = event.target;
    if (!obj) return;
    const id = ensureId(obj);
    doc.transact(() => shapes.set(id, serialize(obj)));
  };

  const handleRemove = (event: ObjectEvent): void => {
    if (applyingRemote) return;
    const obj = event.target;
    if (!obj) return;
    const id = readId(obj);
    if (id) {
      doc.transact(() => shapes.delete(id));
    }
  };

  canvas.on('object:added', handleUpsert);
  canvas.on('object:modified', handleUpsert);
  canvas.on('object:removed', handleRemove);

  // --- Yjs -> Fabric ---
  const applyEnlivened = (id: string, data: SerializedObject): void => {
    void fabric.util.enlivenObjects([data]).then((objects) => {
      const revived = objects[0] as fabric.FabricObject | undefined;
      if (!revived) return;
      writeId(revived, id);
      applyingRemote = true;
      const existing = findById(id);
      if (existing) canvas.remove(existing);
      canvas.add(revived);
      canvas.requestRenderAll();
      applyingRemote = false;
    });
  };

  const observer = (event: Y.YMapEvent<SerializedObject>): void => {
    event.changes.keys.forEach((change, id) => {
      if (change.action === 'delete') {
        const existing = findById(id);
        if (existing) {
          applyingRemote = true;
          canvas.remove(existing);
          applyingRemote = false;
        }
        return;
      }
      const data = shapes.get(id);
      if (data) applyEnlivened(id, data);
    });
  };
  shapes.observe(observer);

  // --- hydrate any pre-existing document state ---
  for (const [id, data] of shapes.entries()) {
    applyEnlivened(id, data);
  }

  return {
    destroy() {
      canvas.off('object:added', handleUpsert);
      canvas.off('object:modified', handleUpsert);
      canvas.off('object:removed', handleRemove);
      shapes.unobserve(observer);
    },
  };
}
