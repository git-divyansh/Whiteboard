import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
import type { NextConfig } from 'next';

import { securityHeaders } from './src/server/security/headers';

/**
 * PE-1 belt-and-suspenders: the Prisma query engine lives at a custom output in
 * packages/db and wasn't reaching the serverless bundle. We now cover every path
 * Prisma searches at runtime:
 *   1. PrismaPlugin (webpack)  -> copies the engine next to the server bundle
 *      (.next/server), independent of how the build is invoked.
 *   2. copyPrismaEngine()      -> copies it into ./src/generated/client (the
 *      FIRST path Prisma searches), guaranteed at build start via this config.
 *   3. outputFileTracingIncludes -> bundles that copy into each function.
 */
function copyPrismaEngine(): void {
  try {
    const src = path.join(process.cwd(), '..', '..', 'packages', 'db', 'src', 'generated', 'client');
    const dest = path.join(process.cwd(), 'src', 'generated', 'client');
    if (!existsSync(src)) return;
    const engines = readdirSync(src).filter((f) => f.includes('query_engine') && f.endsWith('.node'));
    if (engines.length === 0) return;
    mkdirSync(dest, { recursive: true });
    for (const file of engines) cpSync(path.join(src, file), path.join(dest, file));
  } catch {
    // best-effort; the build script / PrismaPlugin are the other layers
  }
}
copyPrismaEngine();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Do not advertise the framework/version (Guideline #11).
  poweredByHeader: false,

  // Constrain output file tracing to the monorepo root. Without this, tracing
  // can walk outside the workspace (on Windows it globs the user home dir and
  // hits protected junctions). Standalone output eases the Docker/VPS path too.
  outputFileTracingRoot: path.join(process.cwd(), '../../'),

  // Internal packages are shipped as TypeScript source and transpiled here.
  transpilePackages: ['@whiteboard/shared', '@whiteboard/db', '@whiteboard/auth'],

  // Keep native/server-only deps out of the client/edge bundles.
  serverExternalPackages: ['@prisma/client', 'ioredis'],

  // Bundle the copied Prisma engine into every function (path 2 above).
  outputFileTracingIncludes: {
    '/**/*': ['./src/generated/client/*.node'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...(config.plugins ?? []), new PrismaPlugin()];
    }
    return config;
  },

  eslint: {
    // Lint is run as its own turbo task; don't fail `next build` on lint.
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
