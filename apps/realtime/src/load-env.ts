import { config } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Load environment before anything else reads it. Must be the FIRST import in
 * index.ts so `env.ts` sees the values. Reads the repo-root `.env` (shared with
 * the web app + docker-compose), then an optional local override, without
 * overwriting variables already present in the real environment (prod injects
 * them directly). Missing files are ignored.
 */
config({ path: resolve(process.cwd(), '../../.env') });
config();
