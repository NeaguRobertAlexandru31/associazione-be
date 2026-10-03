-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "blocks" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "uploadToken" TEXT,
ADD COLUMN     "uploadUrl" TEXT;
