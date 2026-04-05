-- Add ownership scope for assets (especially audio library rows)
ALTER TABLE "Asset"
ADD COLUMN "ownerEmail" TEXT;

-- Replace global s3Key uniqueness with per-user uniqueness.
DROP INDEX IF EXISTS "Asset_s3Key_key";
CREATE UNIQUE INDEX "Asset_ownerEmail_s3Key_key" ON "Asset"("ownerEmail", "s3Key");
CREATE INDEX "Asset_s3Key_idx" ON "Asset"("s3Key");
