-- CreateTable
CREATE TABLE "payment_method_options" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "payment_method_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "whatsapp_number" TEXT,
    "address" TEXT,
    "payment_method_id" TEXT,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "invoice_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_options_slug_key" ON "payment_method_options"("slug");

-- CreateIndex
CREATE INDEX "billing_invoices_payment_method_id_idx" ON "billing_invoices"("payment_method_id");

-- CreateIndex
CREATE INDEX "billing_invoices_created_at_idx" ON "billing_invoices"("created_at");

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
