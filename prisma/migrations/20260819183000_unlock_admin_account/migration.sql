-- One-time data migration: unlock the affected administrator account.
-- This deliberately preserves the existing password hash and user data.
UPDATE "users"
SET
  "failed_attempts" = 0,
  "locked_until" = NULL
WHERE lower("email") = lower('austindev2003@gmail.com');
