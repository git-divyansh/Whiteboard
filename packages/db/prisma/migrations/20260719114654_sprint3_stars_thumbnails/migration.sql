-- CreateTable
CREATE TABLE "BoardStar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardStar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardThumbnail" (
    "boardId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardThumbnail_pkey" PRIMARY KEY ("boardId")
);

-- CreateIndex
CREATE INDEX "BoardStar_userId_idx" ON "BoardStar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardStar_userId_boardId_key" ON "BoardStar"("userId", "boardId");

-- AddForeignKey
ALTER TABLE "BoardStar" ADD CONSTRAINT "BoardStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardStar" ADD CONSTRAINT "BoardStar_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardThumbnail" ADD CONSTRAINT "BoardThumbnail_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
