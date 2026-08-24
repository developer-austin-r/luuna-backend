-- Keep the database schema in sync with the User model.
ALTER TABLE "users"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
