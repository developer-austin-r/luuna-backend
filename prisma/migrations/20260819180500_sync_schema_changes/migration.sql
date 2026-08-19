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
ALTER TABLE "product_images" ADD COLUMN     "display_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "original_url" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "image_url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "shipments" DROP COLUMN "expected_delivery",
ALTER COLUMN "tracking_number" DROP NOT NULL,
ALTER COLUMN "courier_name" DROP NOT NULL,
ALTER COLUMN "shipment_status" SET DEFAULT 'PENDING',
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "tokens_token_hash_idx" ON "tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
