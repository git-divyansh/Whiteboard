/**
 * Copy the generated Prisma query-engine binaries from the db package's custom
 * output into the web app, so the deployed serverless function can find them
 * (PE-1). The engine lands in `apps/web/src/generated/client/`, which is the
 * first path Prisma searches at runtime on Vercel. `next.config.ts`'s
 * `outputFileTracingIncludes` then bundles it into every function.
 *
 * Runs at build time — by then `prisma generate` (db package postinstall) has
 * already produced the runtime engine (rhel-openssl-3.0.x on Vercel).
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', '..', 'packages', 'db', 'src', 'generated', 'client');
const dest = join(here, '..', 'src', 'generated', 'client');

if (!existsSync(src)) {
  console.warn(`[copy-prisma-engine] source not found: ${src} — did "prisma generate" run?`);
  process.exit(0);
}

const engines = readdirSync(src).filter((f) => f.includes('query_engine') && f.endsWith('.node'));
if (engines.length === 0) {
  console.warn(`[copy-prisma-engine] no query-engine binaries in ${src}`);
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
for (const file of engines) {
  cpSync(join(src, file), join(dest, file));
  console.log(`[copy-prisma-engine] copied ${file}`);
}
