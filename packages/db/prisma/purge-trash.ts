/* eslint-disable no-console */
/**
 * Trash retention purge (S4.9). Permanently deletes boards that have been in
 * Trash (archived) longer than the retention window. All Board child rows
 * (collaborators, snapshots, thumbnails, stars, share links, invitations)
 * cascade-delete via their FKs.
 *
 * Run on a schedule (cron / platform scheduler), e.g. daily:
 *   pnpm db:purge-trash
 *
 * Keep RETENTION_DAYS in sync with TRASH_RETENTION_DAYS in @whiteboard/shared.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RETENTION_DAYS = 30;

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.board.deleteMany({
    where: { archivedAt: { lt: cutoff } },
  });
  console.log(
    `Trash purge: permanently deleted ${result.count} board(s) archived before ${cutoff.toISOString()}.`,
  );
}

main()
  .catch((error) => {
    console.error('Trash purge failed:', error);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
