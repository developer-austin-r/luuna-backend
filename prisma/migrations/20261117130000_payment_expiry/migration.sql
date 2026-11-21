ALTER TABLE "payments" ADD COLUMN "expires_at" TIMESTAMP(3);
CREATE INDEX "payments_status_expires_at_idx" ON "payments"("status", "expires_at");
