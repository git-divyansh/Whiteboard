-- Sprint 4: workspace roles distinct from board roles.

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- AlterTable: convert WorkspaceMember.role (Role -> WorkspaceRole), preserving data.
ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "WorkspaceMember"
  ALTER COLUMN "role" TYPE "WorkspaceRole"
  USING (
    CASE "role"::text
      WHEN 'OWNER' THEN 'OWNER'
      WHEN 'ADMIN' THEN 'ADMIN'
      WHEN 'EDITOR' THEN 'MEMBER'
      WHEN 'VIEWER' THEN 'VIEWER'
      WHEN 'GUEST' THEN 'VIEWER'
      ELSE 'MEMBER'
    END::"WorkspaceRole"
  );

ALTER TABLE "WorkspaceMember" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
