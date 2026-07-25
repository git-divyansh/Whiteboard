/**
 * Board template catalog (S3.5). Metadata only — the canvas shapes are built by
 * `seedTemplate` in `lib/canvas/templates-canvas.ts`. Kept fabric-free so the
 * dashboard gallery doesn't pull the canvas engine into its bundle.
 */

export const TEMPLATES = [
  {
    key: 'flowchart',
    name: 'Flowchart',
    description: 'Start → Process → Decision → End, pre-connected.',
  },
  {
    key: 'kanban',
    name: 'Kanban board',
    description: 'To do · In progress · Done columns with cards.',
  },
  {
    key: 'mindmap',
    name: 'Mind map',
    description: 'A central idea with four branches.',
  },
] as const;

export type TemplateKey = (typeof TEMPLATES)[number]['key'];

export function isTemplateKey(value: string | null | undefined): value is TemplateKey {
  return !!value && TEMPLATES.some((template) => template.key === value);
}
