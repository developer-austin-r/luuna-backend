/*
  Warnings:

  - You are about to drop the column `last_sync` on the `inventories` table. All the data in the column will be lost.
  - You are about to drop the column `archive` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `products` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `inventories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status_id` to the `products` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable (must come first so we can backfill products.status_id)
CREATE TABLE "statuses" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "statuses_slug_key" ON "statuses"("slug");

-- Seed default statuses needed for backfill
INSERT INTO "statuses" ("id", "status", "slug") VALUES
  ('11111111-1111-4111-a111-111111111111', 'Active', 'active'),
  ('22222222-2222-4222-a222-222222222222', 'Inactive', 'inactive'),
  ('33333333-3333-4333-a333-333333333333', 'Archive', 'archive');

-- DropIndex
DROP INDEX IF EXISTS "products_status_archive_idx";

-- AlterTable inventories: add updated_at with a default so existing rows are handled
ALTER TABLE "inventories" DROP COLUMN IF EXISTS "last_sync",
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- AlterTable products: drop old columns, add status_id as nullable first
ALTER TABLE "products" DROP COLUMN IF EXISTS "archive",
DROP COLUMN IF EXISTS "status",
ADD COLUMN "status_id" TEXT;

-- Backfill: point all existing products to the 'active' status
UPDATE "products" SET "status_id" = 'status-active-0001-0001-000000000001' WHERE "status_id" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "products" ALTER COLUMN "status_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "products_status_id_idx" ON "products"("status_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

