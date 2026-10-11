-- AlterTable
ALTER TABLE "Member" ADD COLUMN "cognitoSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_cognitoSub_key" ON "Member"("cognitoSub");
