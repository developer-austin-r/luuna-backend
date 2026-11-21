CREATE TABLE "carts" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "guest_token_hash" TEXT,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "carts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "carts_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "guest_token_hash" IS NULL AND "expires_at" IS NULL) OR
    ("user_id" IS NULL AND "guest_token_hash" IS NOT NULL AND "expires_at" IS NOT NULL)
  ),
  CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
CREATE UNIQUE INDEX "carts_guest_token_hash_key" ON "carts"("guest_token_hash");
CREATE INDEX "carts_expires_at_idx" ON "carts"("expires_at");

CREATE TABLE "cart_items" (
  "cart_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cart_items_pkey" PRIMARY KEY ("cart_id", "product_id"),
  CONSTRAINT "cart_items_positive_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");
