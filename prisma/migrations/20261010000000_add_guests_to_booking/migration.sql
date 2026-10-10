-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "guests" JSONB;
