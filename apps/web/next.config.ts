import path from 'node:path';

import type { NextConfig } from 'next';

import { securityHeaders } from './src/server/security/headers';

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

  // The Prisma client lives at a custom output in packages/db; its native query
  // engine (.so.node) isn't traced automatically. The build first copies the
  // engine into ./src/generated/client (a path Prisma searches at runtime — see
  // scripts/copy-prisma-engine.mjs), and this traces it into every function
  // bundle so it lands at /var/task/apps/web/src/generated/client (PE-1).
  outputFileTracingIncludes: {
    '/**/*': ['./src/generated/client/*.node'],
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
