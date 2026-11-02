-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'SENT',
    "channel" TEXT NOT NULL DEFAULT 'BILLING',
    "entity_id" TEXT,
    "sent_by" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_phone_idx" ON "whatsapp_message_logs"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_channel_entity_id_idx" ON "whatsapp_message_logs"("channel", "entity_id");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_sent_by_idx" ON "whatsapp_message_logs"("sent_by");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_created_at_idx" ON "whatsapp_message_logs"("created_at");

-- CreateIndex
CREATE INDEX "bill_items_bill_id_idx" ON "bill_items"("bill_id");

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
