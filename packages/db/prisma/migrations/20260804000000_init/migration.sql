-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Prefixed CUID generator.
-- Every table's primary key carries a type prefix (png_..., usr_...) so an ID
-- from the wrong table fails loudly at the boundary instead of silently joining
-- against nothing.
CREATE OR REPLACE FUNCTION generate_prefixed_cuid(prefix text)
RETURNS text AS $$
  SELECT prefix || '_' || replace(gen_random_uuid()::text, '-', '');
$$ LANGUAGE sql VOLATILE;

-- CreateTable
CREATE TABLE "ping" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('png'::text),
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ping_createdAt_idx" ON "ping"("createdAt");
