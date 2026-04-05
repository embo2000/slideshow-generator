CREATE TABLE "UploadLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "UploadLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadLink_tokenHash_key" ON "UploadLink"("tokenHash");
CREATE INDEX "UploadLink_active_expiresAt_idx" ON "UploadLink"("active", "expiresAt");
