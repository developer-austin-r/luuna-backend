/*
  Warnings:

  - You are about to drop the column `last_sync` on the `inventories` table. All the data in the column will be lost.
  - You are about to drop the column `archive` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `products` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `inventories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status_id` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "products_status_archive_idx";

-- AlterTable
ALTER TABLE "inventories" DROP COLUMN "last_sync",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "archive",
DROP COLUMN "status",
ADD COLUMN     "status_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "statuses" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "statuses_slug_key" ON "statuses"("slug");

-- CreateIndex
CREATE INDEX "products_status_id_idx" ON "products"("status_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
