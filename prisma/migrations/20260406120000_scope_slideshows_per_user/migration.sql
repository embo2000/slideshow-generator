-- Add owner scoping to slideshows
ALTER TABLE "Slideshow"
ADD COLUMN "ownerEmail" TEXT;

-- Replace global slideshow name uniqueness with per-user uniqueness
DROP INDEX IF EXISTS "Slideshow_name_key";
CREATE UNIQUE INDEX "Slideshow_ownerEmail_name_key" ON "Slideshow"("ownerEmail", "name");
CREATE INDEX "Slideshow_ownerEmail_updatedAt_idx" ON "Slideshow"("ownerEmail", "updatedAt" DESC);
