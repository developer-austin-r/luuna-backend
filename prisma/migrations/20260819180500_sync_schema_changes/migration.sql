-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "display_url" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "original_url" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "image_url" DROP NOT NULL;
