#!/bin/bash
# Initialize shadow database for Prisma migrations
# This script is run when PostgreSQL container starts

set -e

echo "Creating shadow database for Prisma migrations..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE "${POSTGRES_DB}_shadow" OWNER "$POSTGRES_USER";
  GRANT ALL PRIVILEGES ON DATABASE "${POSTGRES_DB}_shadow" TO "$POSTGRES_USER";
EOSQL

echo "Shadow database created successfully!"
