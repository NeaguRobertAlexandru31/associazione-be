-- CreateEnum
CREATE TYPE "EventAccessType" AS ENUM ('public', 'limited', 'members_only');

-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "blocks" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "accessType" "EventAccessType" NOT NULL DEFAULT 'public';
