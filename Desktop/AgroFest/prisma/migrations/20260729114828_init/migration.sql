-- CreateEnum
CREATE TYPE "GuestCategory" AS ENUM ('GUEST', 'FARMER');

-- CreateEnum
CREATE TYPE "GuestLanguage" AS ENUM ('RU', 'KZ');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SCANNER');

-- CreateEnum
CREATE TYPE "CheckInMode" AS ENUM ('ONLINE', 'OFFLINE_SYNC', 'MANUAL');

-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('ALLOWED', 'ALREADY_USED', 'INVALID', 'BLOCKED', 'WRONG_DAY', 'NOT_FOUND', 'OFFLINE_QUEUED', 'DUPLICATE_OPERATION');

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" "GuestCategory" NOT NULL,
    "language" "GuestLanguage" NOT NULL DEFAULT 'RU',
    "publicTicketToken" TEXT NOT NULL,
    "qrTokenHash" TEXT NOT NULL,
    "status" "GuestStatus" NOT NULL DEFAULT 'ACTIVE',
    "consentAccepted" BOOLEAN NOT NULL,
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestEventDate" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,

    CONSTRAINT "GuestEventDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannerUserId" TEXT,
    "scannerDeviceId" TEXT,
    "mode" "CheckInMode" NOT NULL,
    "operationId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerDevice" (
    "id" TEXT NOT NULL,
    "deviceToken" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScannerDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanAttempt" (
    "id" TEXT NOT NULL,
    "guestId" TEXT,
    "tokenFingerprint" TEXT NOT NULL,
    "result" "ScanResult" NOT NULL,
    "reason" TEXT,
    "eventDate" DATE,
    "scannerUserId" TEXT,
    "scannerDeviceId" TEXT,
    "ip" TEXT,
    "operationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSettings" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL DEFAULT 'AgroFest 2026',
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "publicBaseUrl" TEXT,
    "supportContact" TEXT,
    "captchaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_registrationNumber_key" ON "Guest"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_publicTicketToken_key" ON "Guest"("publicTicketToken");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_qrTokenHash_key" ON "Guest"("qrTokenHash");

-- CreateIndex
CREATE INDEX "Guest_phone_idx" ON "Guest"("phone");

-- CreateIndex
CREATE INDEX "Guest_lastName_firstName_idx" ON "Guest"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Guest_category_idx" ON "Guest"("category");

-- CreateIndex
CREATE INDEX "Guest_status_idx" ON "Guest"("status");

-- CreateIndex
CREATE INDEX "Guest_createdAt_idx" ON "Guest"("createdAt");

-- CreateIndex
CREATE INDEX "GuestEventDate_eventDate_idx" ON "GuestEventDate"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "GuestEventDate_guestId_eventDate_key" ON "GuestEventDate"("guestId", "eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_operationId_key" ON "CheckIn"("operationId");

-- CreateIndex
CREATE INDEX "CheckIn_eventDate_idx" ON "CheckIn"("eventDate");

-- CreateIndex
CREATE INDEX "CheckIn_checkedInAt_idx" ON "CheckIn"("checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_scannerUserId_idx" ON "CheckIn"("scannerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_guestId_eventDate_key" ON "CheckIn"("guestId", "eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ScannerDevice_deviceToken_key" ON "ScannerDevice"("deviceToken");

-- CreateIndex
CREATE INDEX "ScanAttempt_tokenFingerprint_idx" ON "ScanAttempt"("tokenFingerprint");

-- CreateIndex
CREATE INDEX "ScanAttempt_result_idx" ON "ScanAttempt"("result");

-- CreateIndex
CREATE INDEX "ScanAttempt_createdAt_idx" ON "ScanAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "GuestEventDate" ADD CONSTRAINT "GuestEventDate_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_scannerUserId_fkey" FOREIGN KEY ("scannerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_scannerDeviceId_fkey" FOREIGN KEY ("scannerDeviceId") REFERENCES "ScannerDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerDevice" ADD CONSTRAINT "ScannerDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanAttempt" ADD CONSTRAINT "ScanAttempt_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
