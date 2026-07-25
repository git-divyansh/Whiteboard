import 'server-only';

import { existsSync } from 'node:fs';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * File-based authentication logger (D5.5). Writes structured JSON lines to
 * time-based files under a repo-root `logs/` directory — NOT the console.
 *
 * Security (Guideline #16): logs auth *events* and identifiers only. Never logs
 * passwords, tokens, secrets, OAuth codes/access-tokens, or session JWTs. Log
 * writes are best-effort and never throw into the auth flow.
 *
 * Files: `logs/auth-YYYY-MM-DD.log` (one per day). Each line is a JSON object
 * with an ISO `ts`. Tail with: `tail -f logs/auth-$(date +%F).log`.
 */

/** Walk up from the cwd to the monorepo root (marked by pnpm-workspace.yaml). */
function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

const LOG_DIR = join(findRepoRoot(process.cwd()), 'logs');

async function write(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const now = new Date();
    const file = join(LOG_DIR, `auth-${now.toISOString().slice(0, 10)}.log`);
    const line = `${JSON.stringify({ ts: now.toISOString(), event, ...data })}\n`;
    await appendFile(file, line, 'utf8');
  } catch {
    // Best-effort: logging must never break authentication.
  }
}

export const authLogger = {
  signIn: (data: { provider?: string; userId?: string; email?: string; isNewUser?: boolean }) =>
    write('sign_in', data),
  signOut: (data: { userId?: string; email?: string }) => write('sign_out', data),
  createUser: (data: { userId?: string; email?: string }) => write('create_user', data),
  linkAccount: (data: { userId?: string; provider?: string }) => write('link_account', data),
  warn: (code: string) => write('warn', { code }),
  error: (data: { name?: string; message?: string; stack?: string }) => write('error', data),
};
