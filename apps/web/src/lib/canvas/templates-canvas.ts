import * as fabric from 'fabric';

import type { TemplateKey } from '@/lib/templates';

/**
 * Seeds a board's canvas with a template's starter shapes (S3.5). Each object is
 * added individually (no groups) so the Fabric↔Yjs binding serializes and syncs
 * them cleanly. Callers must ensure the board is empty before seeding.
 */

interface BoxOptions {
  left: number;
  top: number;
  text: string;
  fill: string;
  stroke: string;
  width?: number;
  height?: number;
}

function addBox(canvas: fabric.Canvas, options: BoxOptions): void {
  const { left, top, text, fill, stroke, width = 170, height = 66 } = options;
  canvas.add(
    new fabric.Rect({ left, top, width, height, rx: 10, ry: 10, fill, stroke, strokeWidth: 2 }),
  );
  canvas.add(
    new fabric.Textbox(text, {
      left,
      top: top + height / 2 - 11,
      width,
      fontSize: 16,
      textAlign: 'center',
      fill: '#0f172a',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    }),
  );
}

function addLine(canvas: fabric.Canvas, x1: number, y1: number, x2: number, y2: number): void {
  canvas.add(
    new fabric.Line([x1, y1, x2, y2], { stroke: '#94a3b8', strokeWidth: 2, selectable: true }),
  );
}

function addSticky(canvas: fabric.Canvas, left: number, top: number, text: string): void {
  canvas.add(
    new fabric.Textbox(text, {
      left,
      top,
      width: 150,
      padding: 10,
      fontSize: 14,
      fill: '#78350f',
      backgroundColor: '#fde68a',
      textAlign: 'left',
    }),
  );
}

export function seedTemplate(canvas: fabric.Canvas, key: TemplateKey): void {
  switch (key) {
    case 'flowchart': {
      const x = 180;
      addBox(canvas, { left: x, top: 40, text: 'Start', fill: '#bbf7d0', stroke: '#15803d' });
      addLine(canvas, x + 85, 106, x + 85, 150);
      addBox(canvas, { left: x, top: 150, text: 'Process', fill: '#bfdbfe', stroke: '#1d4ed8' });
      addLine(canvas, x + 85, 216, x + 85, 260);
      addBox(canvas, { left: x, top: 260, text: 'Decision?', fill: '#fde68a', stroke: '#b45309' });
      addLine(canvas, x + 85, 326, x + 85, 370);
      addBox(canvas, { left: x, top: 370, text: 'End', fill: '#fecaca', stroke: '#b91c1c' });
      break;
    }
    case 'kanban': {
      const columns = [
        { title: 'To do', fill: '#f1f5f9' },
        { title: 'In progress', fill: '#e0f2fe' },
        { title: 'Done', fill: '#dcfce7' },
      ];
      columns.forEach((column, index) => {
        const left = 40 + index * 210;
        canvas.add(
          new fabric.Rect({
            left,
            top: 40,
            width: 190,
            height: 380,
            rx: 12,
            ry: 12,
            fill: column.fill,
            stroke: '#cbd5e1',
            strokeWidth: 1,
          }),
        );
        canvas.add(
          new fabric.Textbox(column.title, {
            left: left + 12,
            top: 54,
            width: 166,
            fontSize: 16,
            fontWeight: 'bold',
            fill: '#0f172a',
          }),
        );
      });
      addSticky(canvas, 60, 100, 'First task');
      addSticky(canvas, 60, 170, 'Second task');
      addSticky(canvas, 270, 100, 'Working on this');
      break;
    }
    case 'mindmap': {
      const cx = 300;
      const cy = 210;
      addBox(canvas, { left: cx, top: cy, text: 'Main idea', fill: '#ede9fe', stroke: '#6d28d9' });
      const branches = [
        { left: cx, top: cy - 150, text: 'Idea 1' },
        { left: cx, top: cy + 150, text: 'Idea 2' },
        { left: cx - 230, top: cy, text: 'Idea 3' },
        { left: cx + 230, top: cy, text: 'Idea 4' },
      ];
      branches.forEach((branch) => {
        addLine(canvas, cx + 85, cy + 33, branch.left + 85, branch.top + 33);
        addBox(canvas, {
          ...branch,
          fill: '#f5f3ff',
          stroke: '#8b5cf6',
          width: 150,
          height: 56,
        });
      });
      break;
    }
  }
  canvas.requestRenderAll();
}
