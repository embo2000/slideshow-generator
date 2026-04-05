-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('image', 'audio', 'photo');

-- CreateTable
CREATE TABLE "Slideshow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slideshowName" TEXT NOT NULL,
    "classes" JSONB NOT NULL,
    "classData" JSONB NOT NULL,
    "selectedMusic" JSONB,
    "backgroundOption" JSONB,
    "selectedTransition" JSONB NOT NULL,
    "slideDuration" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slideshow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "name" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "s3Key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Slideshow_name_key" ON "Slideshow"("name");

-- CreateIndex
CREATE INDEX "Slideshow_updatedAt_idx" ON "Slideshow"("updatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_s3Key_key" ON "Asset"("s3Key");

-- CreateIndex
CREATE INDEX "Asset_kind_createdAt_idx" ON "Asset"("kind", "createdAt" DESC);
