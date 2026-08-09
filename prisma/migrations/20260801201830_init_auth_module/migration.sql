-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'REFRESH_TOKEN', 'OTP', 'INVITE');

-- CreateEnum
CREATE TYPE "TokenStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_type" "TokenType" NOT NULL,
    "status" "TokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tokens_user_id_idx" ON "tokens"("user_id");

-- CreateIndex
CREATE INDEX "tokens_token_type_idx" ON "tokens"("token_type");

-- CreateIndex
CREATE INDEX "tokens_status_idx" ON "tokens"("status");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
