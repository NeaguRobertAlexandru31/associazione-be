-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "blocks" SET DEFAULT '[]'::jsonb;

-- CreateTable
CREATE TABLE "DocScanToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "usedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "submittedEmail" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocScanToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocScanToken_token_key" ON "DocScanToken"("token");
