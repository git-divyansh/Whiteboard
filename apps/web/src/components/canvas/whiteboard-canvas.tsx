'use client';

import { YJS_KEYS } from '@whiteboard/shared';
import * as fabric from 'fabric';
import { MousePointer2, Pencil, Square, Circle, Type, StickyNote, Trash2, Eye } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { bindFabricToYjs } from '@/lib/canvas/bind-fabric-yjs';
import { seedTemplate } from '@/lib/canvas/templates-canvas';
import { useCollabDoc } from '@/lib/realtime/use-collab-doc';
import { isTemplateKey } from '@/lib/templates';
import { cn } from '@/lib/utils';
import { PresenceCursors } from './presence-cursors';

type Tool = 'select' | 'draw';

/** Best-effort downscaled canvas snapshot for the dashboard thumbnail (S3.4). */
async function captureThumbnail(canvas: fabric.Canvas, boardId: string): Promise<void> {
  try {
    const width = canvas.getWidth() || 1;
    const multiplier = Math.min(1, 480 / width);
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.55, multiplier });
    if (dataUrl.length > 400_000) return; // stay within the upload limit
    await fetch(`/api/boards/${boardId}/thumbnail`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl }),
    });
  } catch {
    // Best-effort: ignore failures (offline, or no edit permission).
  }
}

const CURSOR_PALETTE = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

const STATUS_LABEL: Record<string, string> = {
  connecting: 'Connecting…',
  connected: 'Live',
  disconnected: 'Reconnecting…',
  error: 'Offline',
};

export function WhiteboardCanvas({
  boardId,
  initialTemplate,
  canEdit = true,
}: {
  boardId: string;
  initialTemplate?: string;
  /** When false, the canvas is read-only (Viewer/Guest) — no select/move/draw/edit. */
  canEdit?: boolean;
}) {
  const { doc, provider, status } = useCollabDoc(boardId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [tool, setTool] = useState<Tool>('select');

  // Stable per-session identity for presence.
  const identity = useMemo(
    () => ({
      name: 'You',
      color: CURSOR_PALETTE[Math.floor(Math.random() * CURSOR_PALETTE.length)] ?? '#3b82f6',
    }),
    [],
  );

  // Initialize the Fabric canvas and bind it to the Yjs document.
  useEffect(() => {
    const el = canvasElRef.current;
    if (!el || !doc) return;

    const canvas = new fabric.Canvas(el, {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      // Read-only for non-editors: no marquee selection, nothing targetable
      // (can't select/move objects). Writes are also blocked server-side (S5.2).
      selection: canEdit,
      skipTargetFind: !canEdit,
    });
    fabricRef.current = canvas;

    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight });
    };
    resize();
    window.addEventListener('resize', resize);

    const binding = bindFabricToYjs(canvas, doc);

    // Seed a template into a brand-new, empty board (S3.5). Delayed so the
    // provider has a chance to sync any existing state first; guarded on an
    // empty shapes map so it never overwrites real content.
    let seedTimer: ReturnType<typeof setTimeout> | undefined;
    if (initialTemplate && isTemplateKey(initialTemplate)) {
      const shapes = doc.getMap(YJS_KEYS.SHAPES);
      seedTimer = setTimeout(() => {
        if (shapes.size === 0) seedTemplate(canvas, initialTemplate);
      }, 500);
    }

    // Debounced thumbnail capture on any content change (S3.4).
    let thumbTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleThumbnail = () => {
      if (thumbTimer) clearTimeout(thumbTimer);
      thumbTimer = setTimeout(() => void captureThumbnail(canvas, boardId), 4000);
    };
    canvas.on('object:added', scheduleThumbnail);
    canvas.on('object:modified', scheduleThumbnail);
    canvas.on('object:removed', scheduleThumbnail);

    return () => {
      window.removeEventListener('resize', resize);
      if (seedTimer) clearTimeout(seedTimer);
      if (thumbTimer) clearTimeout(thumbTimer);
      canvas.off('object:added', scheduleThumbnail);
      canvas.off('object:modified', scheduleThumbnail);
      canvas.off('object:removed', scheduleThumbnail);
      binding.destroy();
      void canvas.dispose();
      fabricRef.current = null;
    };
  }, [doc, boardId, initialTemplate, canEdit]);

  // Toggle freehand drawing mode (never in read-only).
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = canEdit && tool === 'draw';
    if (canEdit && tool === 'draw') {
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 3;
      brush.color = '#111827';
      canvas.freeDrawingBrush = brush;
    }
  }, [tool, canEdit]);

  // Pan (drag empty space) + zoom (wheel) — no scrollbars (D5.3).
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const onWheel = (opt: { e: WheelEvent }) => {
      const e = opt.e;
      let zoom = canvas.getZoom() * 0.999 ** e.deltaY;
      zoom = Math.min(Math.max(zoom, 0.2), 5);
      canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), zoom);
      e.preventDefault();
      e.stopPropagation();
    };

    const onDown = (opt: { target?: fabric.FabricObject; viewportPoint?: fabric.Point }) => {
      // Dragging an object moves it; dragging empty space pans the board.
      if (opt.target || !opt.viewportPoint) return;
      isPanning = true;
      canvas.selection = false;
      canvas.setCursor('grabbing');
      lastX = opt.viewportPoint.x;
      lastY = opt.viewportPoint.y;
    };

    const onMove = (opt: { viewportPoint?: fabric.Point }) => {
      if (!isPanning || !opt.viewportPoint) return;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      vpt[4] += opt.viewportPoint.x - lastX;
      vpt[5] += opt.viewportPoint.y - lastY;
      lastX = opt.viewportPoint.x;
      lastY = opt.viewportPoint.y;
      canvas.requestRenderAll();
    };

    const onUp = () => {
      if (!isPanning) return;
      isPanning = false;
      canvas.selection = canEdit;
      if (canvas.viewportTransform) canvas.setViewportTransform(canvas.viewportTransform);
    };

    canvas.on('mouse:wheel', onWheel);
    canvas.on('mouse:down', onDown);
    canvas.on('mouse:move', onMove);
    canvas.on('mouse:up', onUp);
    return () => {
      canvas.off('mouse:wheel', onWheel);
      canvas.off('mouse:down', onDown);
      canvas.off('mouse:move', onMove);
      canvas.off('mouse:up', onUp);
    };
  }, [doc, canEdit]);

  // Broadcast local cursor + identity through Yjs awareness.
  useEffect(() => {
    const canvas = fabricRef.current;
    const awareness = provider?.awareness;
    if (!canvas || !awareness) return;

    awareness.setLocalStateField('user', identity);

    // Throttle cursor broadcasts to ~25/s. Unthrottled, every mouse:move emitted
    // an awareness frame and flooded the realtime rate limit, starving the Yjs
    // sync frames that actually carry edits (S5.1).
    let lastCursorSent = 0;
    const onMove = (opt: { scenePoint?: fabric.Point; viewportPoint?: fabric.Point }) => {
      const point = opt.scenePoint ?? opt.viewportPoint;
      if (!point) return;
      const now = Date.now();
      if (now - lastCursorSent < 40) return;
      lastCursorSent = now;
      awareness.setLocalStateField('cursor', { x: point.x, y: point.y });
    };
    canvas.on('mouse:move', onMove);

    return () => {
      canvas.off('mouse:move', onMove);
      awareness.setLocalStateField('cursor', null);
    };
  }, [provider, identity]);

  const addObject = useCallback(
    (factory: () => fabric.FabricObject) => {
      const canvas = fabricRef.current;
      if (!canvas || !canEdit) return;
      const object = factory();
      canvas.add(object);
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
    },
    [canEdit],
  );

  const addRect = useCallback(
    () =>
      addObject(
        () =>
          new fabric.Rect({
            left: 120,
            top: 120,
            width: 160,
            height: 100,
            rx: 8,
            ry: 8,
            fill: '#bfdbfe',
            stroke: '#1d4ed8',
            strokeWidth: 2,
          }),
      ),
    [addObject],
  );

  const addEllipse = useCallback(
    () =>
      addObject(
        () =>
          new fabric.Ellipse({
            left: 140,
            top: 140,
            rx: 80,
            ry: 55,
            fill: '#bbf7d0',
            stroke: '#15803d',
            strokeWidth: 2,
          }),
      ),
    [addObject],
  );

  const addText = useCallback(
    () =>
      addObject(
        () =>
          new fabric.IText('Double-click to edit', {
            left: 160,
            top: 160,
            fontSize: 24,
            fill: '#111827',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }),
      ),
    [addObject],
  );

  const addSticky = useCallback(
    () =>
      addObject(
        () =>
          new fabric.Textbox('Sticky note', {
            left: 180,
            top: 180,
            width: 180,
            padding: 12,
            fontSize: 18,
            fill: '#78350f',
            backgroundColor: '#fde68a',
            textAlign: 'left',
          }),
      ),
    [addObject],
  );

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canEdit) return;
    canvas.getActiveObjects().forEach((object) => canvas.remove(object));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [canEdit]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      <canvas ref={canvasElRef} />
      <PresenceCursors provider={provider} />

      {/* Toolbar — editing tools only when the viewer can edit (S5.2) */}
      {canEdit ? (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-background/95 p-1 shadow-lg backdrop-blur">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} label="Select">
            <MousePointer2 />
          </ToolButton>
          <ToolButton active={tool === 'draw'} onClick={() => setTool('draw')} label="Draw">
            <Pencil />
          </ToolButton>
          <Separator />
          <ToolButton onClick={addRect} label="Rectangle">
            <Square />
          </ToolButton>
          <ToolButton onClick={addEllipse} label="Ellipse">
            <Circle />
          </ToolButton>
          <ToolButton onClick={addText} label="Text">
            <Type />
          </ToolButton>
          <ToolButton onClick={addSticky} label="Sticky note">
            <StickyNote />
          </ToolButton>
          <Separator />
          <ToolButton onClick={deleteSelected} label="Delete selection">
            <Trash2 />
          </ToolButton>
        </div>
      ) : (
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow backdrop-blur">
          <Eye className="size-3.5" />
          View only
        </div>
      )}

      {/* Connection status */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-xs font-medium shadow backdrop-blur">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            status === 'connected'
              ? 'bg-green-500'
              : status === 'error'
                ? 'bg-red-500'
                : 'bg-amber-500',
          )}
        />
        {STATUS_LABEL[status] ?? status}
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}

function Separator() {
  return <span className="mx-0.5 h-6 w-px bg-border" />;
}
