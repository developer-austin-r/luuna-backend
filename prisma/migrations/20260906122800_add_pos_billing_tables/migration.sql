-- CreateEnum
CREATE TYPE "BillPaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'NET_BANKING', 'OTHER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "billed_by" TEXT,
    "customer_name" TEXT,
    "customer_mobile" TEXT,
    "customer_email" TEXT,
    "customer_address" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "BillPaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "BillStatus" NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_items" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "bill_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bills_bill_number_key" ON "bills"("bill_number");

-- CreateIndex
CREATE INDEX "bills_bill_number_idx" ON "bills"("bill_number");

-- CreateIndex
CREATE INDEX "bills_created_at_idx" ON "bills"("created_at");

-- CreateIndex
CREATE INDEX "bills_status_idx" ON "bills"("status");

-- CreateIndex
CREATE INDEX "bills_billed_by_idx" ON "bills"("billed_by");

-- AddForeignKey
ALTER TABLE "bill_items" ADD CONSTRAINT "bill_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_billed_by_fkey" FOREIGN KEY ("billed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
