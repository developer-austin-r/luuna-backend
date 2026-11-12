/*
  Warnings:

  - A unique constraint covering the columns `[whatsapp_message_id]` on the table `whatsapp_message_logs` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WhatsAppMessageStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "WhatsAppMessageStatus" ADD VALUE 'READ';

-- AlterTable
ALTER TABLE "whatsapp_message_logs" ADD COLUMN     "status_updated_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_message_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_message_logs_whatsapp_message_id_key" ON "whatsapp_message_logs"("whatsapp_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_whatsapp_message_id_idx" ON "whatsapp_message_logs"("whatsapp_message_id");
