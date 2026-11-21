ALTER TABLE "user_review"
  ADD COLUMN "title" VARCHAR(100),
  ADD COLUMN "image_keys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "user_review_public_lookup_idx"
  ON "user_review"("product_id", "status", "deleted_at", "created_at");
