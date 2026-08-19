/*
  Warnings:

  - The values [COD,BANK_TRANSFER] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [OTP,INVITE] on the enum `TokenType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `expected_delivery` on the `shipments` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('CREDIT_CARD', 'PAYPAL', 'STRIPE', 'CASH_ON_DELIVERY');
ALTER TABLE "orders" ALTER COLUMN "payment_method" TYPE "PaymentMethod_new" USING ("payment_method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TokenType_new" AS ENUM ('REFRESH_TOKEN', 'PASSWORD_RESET', 'EMAIL_VERIFICATION');
ALTER TABLE "tokens" ALTER COLUMN "token_type" TYPE "TokenType_new" USING ("token_type"::text::"TokenType_new");
ALTER TYPE "TokenType" RENAME TO "TokenType_old";
ALTER TYPE "TokenType_new" RENAME TO "TokenType";
DROP TYPE "public"."TokenType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_order_id_fkey";

-- DropIndex
DROP INDEX "shipments_tracking_number_idx";

-- DropIndex
DROP INDEX "shipments_tracking_number_key";

-- DropIndex
DROP INDEX "tokens_status_idx";

-- DropIndex
DROP INDEX "tokens_token_type_idx";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "order_status" SET DEFAULT 'PENDING',
ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "shipments" DROP COLUMN "expected_delivery",
ALTER COLUMN "tracking_number" DROP NOT NULL,
ALTER COLUMN "courier_name" DROP NOT NULL,
ALTER COLUMN "shipment_status" SET DEFAULT 'PENDING',
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "modules" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions" (
    "id" BIGSERIAL NOT NULL,
    "module_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "session_id" VARCHAR(100),
    "module_id" BIGINT NOT NULL,
    "action_id" BIGINT NOT NULL,
    "entity_id" TEXT,
    "description" VARCHAR(500),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "device_type" VARCHAR(20),
    "browser" VARCHAR(50),
    "os" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modules_name_key" ON "modules"("name");

-- CreateIndex
CREATE INDEX "actions_module_id_idx" ON "actions"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "actions_module_id_name_key" ON "actions"("module_id", "name");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_session_id_created_at_idx" ON "activity_logs"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_module_id_created_at_idx" ON "activity_logs"("module_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_action_id_created_at_idx" ON "activity_logs"("action_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_id_created_at_idx" ON "activity_logs"("entity_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "tokens_token_hash_idx" ON "tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
