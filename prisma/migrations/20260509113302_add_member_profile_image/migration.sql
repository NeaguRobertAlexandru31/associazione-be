-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "blocks" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "profileImage" TEXT;
