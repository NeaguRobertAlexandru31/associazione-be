-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "profileImage" TEXT;

-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "blocks" SET DEFAULT '[]'::jsonb;
