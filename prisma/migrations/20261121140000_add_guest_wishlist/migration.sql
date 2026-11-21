ALTER TABLE "wishlists"
  ALTER COLUMN "user_id" DROP NOT NULL,
  ADD COLUMN "guest_token_hash" TEXT,
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD CONSTRAINT "wishlists_owner_check" CHECK (
    ("user_id" IS NOT NULL AND "guest_token_hash" IS NULL AND "expires_at" IS NULL) OR
    ("user_id" IS NULL AND "guest_token_hash" IS NOT NULL AND "expires_at" IS NOT NULL)
  );

CREATE UNIQUE INDEX "wishlists_guest_token_hash_product_id_key"
  ON "wishlists"("guest_token_hash", "product_id");
CREATE INDEX "wishlists_expires_at_idx" ON "wishlists"("expires_at");
