import path from 'node:path';

import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';
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

  // Prisma (default output) + ioredis are server-only native deps: keep them out
  // of the client/edge bundles. Vercel bundles the Prisma query engine for the
  // default `@prisma/client` location automatically (PE-1 root cause was a custom
  // output that defeated that); PrismaPlugin below adds monorepo-safe copying.
  serverExternalPackages: ['@prisma/client', 'ioredis'],

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
