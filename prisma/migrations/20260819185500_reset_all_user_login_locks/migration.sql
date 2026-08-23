-- One-time data migration: clear any existing account lock for every user.
-- Password hashes, verification status, roles, and all other user data remain unchanged.
UPDATE "users"
SET
  "failed_attempts" = 0,
  "locked_until" = NULL
WHERE "failed_attempts" <> 0 OR "locked_until" IS NOT NULL;
