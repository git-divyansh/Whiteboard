// The Prisma monorepo workaround plugin ships no type declarations (PE-1).
declare module '@prisma/nextjs-monorepo-workaround-plugin' {
  export class PrismaPlugin {
    constructor();
    apply(compiler: unknown): void;
  }
}
