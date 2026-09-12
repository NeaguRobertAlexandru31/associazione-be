/*
  Warnings:

  - You are about to drop the `AdminInvite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'MEMBER');

-- DropForeignKey
ALTER TABLE "AdminInvite" DROP CONSTRAINT "AdminInvite_createdById_fkey";

-- DropForeignKey
ALTER TABLE "AdminUser" DROP CONSTRAINT "AdminUser_memberId_fkey";

-- AlterTable
ALTER TABLE "Article" ALTER COLUMN "blocks" SET DEFAULT '[]'::jsonb;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "boardRoles" TEXT[],
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
ALTER COLUMN "isMinor" SET DEFAULT false,
ALTER COLUMN "category" SET DEFAULT 'ordinario',
ALTER COLUMN "fiscalCode" DROP NOT NULL,
ALTER COLUMN "birthDate" DROP NOT NULL,
ALTER COLUMN "birthPlace" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "docType" DROP NOT NULL,
ALTER COLUMN "docNumber" DROP NOT NULL,
ALTER COLUMN "docExpiry" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "addressStreet" DROP NOT NULL,
ALTER COLUMN "addressZip" DROP NOT NULL,
ALTER COLUMN "addressCity" DROP NOT NULL,
ALTER COLUMN "addressProvince" DROP NOT NULL,
ALTER COLUMN "membershipYear" DROP NOT NULL,
ALTER COLUMN "paymentMethod" DROP NOT NULL,
ALTER COLUMN "privacyBase" SET DEFAULT false;

-- DropTable
DROP TABLE "AdminInvite";

-- DropTable
DROP TABLE "AdminUser";

-- DropEnum
DROP TYPE "AdminRole";
