/**
 * Preset avatars (10). Tiny inline SVG data URLs (~0.5 KB each) — a gradient
 * background with a white silhouette. Server-defined so the client picks one by
 * INDEX and never sends arbitrary SVG (which could carry an XSS payload); the
 * API maps the index to the trusted string here.
 */

const AVATAR_GRADIENTS: readonly [string, string][] = [
  ['#f97316', '#ef4444'],
  ['#f59e0b', '#f97316'],
  ['#22c55e', '#16a34a'],
  ['#10b981', '#0ea5e9'],
  ['#3b82f6', '#6366f1'],
  ['#6366f1', '#a855f7'],
  ['#a855f7', '#ec4899'],
  ['#ec4899', '#f43f5e'],
  ['#14b8a6', '#06b6d4'],
  ['#64748b', '#334155'],
];

function avatarDataUrl([from, to]: [string, string]): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="128" height="128" fill="url(#g)"/>` +
    `<circle cx="64" cy="52" r="20" fill="#fff" fill-opacity="0.92"/>` +
    `<path d="M32 104c0-17 14-28 32-28s32 11 32 28z" fill="#fff" fill-opacity="0.92"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The 10 preset avatar data URLs. Index into this from `avatarPreset`. */
export const AVATAR_PRESETS: readonly string[] = AVATAR_GRADIENTS.map(avatarDataUrl);
