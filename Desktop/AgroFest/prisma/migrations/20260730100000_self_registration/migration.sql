ALTER TYPE "CheckInMode" ADD VALUE IF NOT EXISTS 'SELF_REGISTRATION';

ALTER TABLE "Guest" ADD COLUMN "registrationDedupKey" TEXT;

CREATE UNIQUE INDEX "Guest_registrationDedupKey_key" ON "Guest"("registrationDedupKey");
