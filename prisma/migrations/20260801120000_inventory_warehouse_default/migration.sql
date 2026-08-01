-- Keep the database default aligned with the Prisma Inventory model. The
-- warehouse column already exists in production and is required.
ALTER TABLE "inventories"
ALTER COLUMN "warehouse" SET DEFAULT 'Main Warehouse';
