import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
const prisma = new PrismaClient();

const requiredEnv = [
  "DATABASE_URL",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
];

const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.warn(`Missing required environment variables: ${missing.join(", ")}`);
}

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 },
});

const apiPrefix = "/api";
const port = Number(process.env.PORT || 3001);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const normalizeName = (name) => name.replace(/[^\w.\-]+/g, "_");

const buildAssetUrl = async (s3Key) => {
  const publicBase = process.env.S3_PUBLIC_URL_BASE;
  if (publicBase) {
    return `${publicBase.replace(/\/$/, "")}/${s3Key}`;
  }

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
    }),
    { expiresIn: 3600 }
  );
};

const mapAssetForClient = async (asset) => {
  const url = await buildAssetUrl(asset.s3Key);
  return {
    id: asset.id,
    name: asset.name,
    url,
    createdTime: asset.createdAt.toISOString(),
    size: String(asset.size),
    mimeType: asset.mimeType,
    kind: asset.kind,
  };
};

app.get(`${apiPrefix}/health`, async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({ ok: false, error: "Database unavailable" });
  }
});

app.get(`${apiPrefix}/settings/groups`, async (_req, res) => {
  const groups = await prisma.appSetting.findUnique({
    where: { key: "groups" },
  });

  res.json({
    classes: Array.isArray(groups?.value?.classes) ? groups.value.classes : null,
  });
});

app.put(`${apiPrefix}/settings/groups`, async (req, res) => {
  const { classes } = req.body ?? {};
  if (!Array.isArray(classes)) {
    return res.status(400).json({ error: "classes must be an array of strings" });
  }

  await prisma.appSetting.upsert({
    where: { key: "groups" },
    update: { value: { classes } },
    create: { key: "groups", value: { classes } },
  });

  res.json({ success: true });
});

app.post(`${apiPrefix}/assets/upload`, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }

    const kind = req.body.kind;
    if (!["image", "audio", "photo"].includes(kind)) {
      return res.status(400).json({ error: "kind must be image, audio, or photo" });
    }

    const displayName = (req.body.name || req.file.originalname).trim();
    const objectKey = `${kind}/${Date.now()}-${crypto.randomUUID()}-${normalizeName(
      req.file.originalname
    )}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: objectKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    const asset = await prisma.asset.create({
      data: {
        kind,
        name: displayName,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype || "application/octet-stream",
        size: req.file.size,
        s3Key: objectKey,
      },
    });

    res.json(await mapAssetForClient(asset));
  } catch (error) {
    console.error("Asset upload failed:", error);
    res.status(500).json({ error: "Failed to upload asset" });
  }
});

app.get(`${apiPrefix}/assets`, async (req, res) => {
  const kind = req.query.kind;
  const where = ["image", "audio", "photo"].includes(String(kind))
    ? { kind: String(kind) }
    : undefined;

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const mapped = await Promise.all(assets.map((asset) => mapAssetForClient(asset)));
  res.json(mapped);
});

app.get(`${apiPrefix}/slideshows`, async (_req, res) => {
  const slideshows = await prisma.slideshow.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(
    slideshows.map((slideshow) => ({
      id: slideshow.id,
      name: slideshow.name,
      createdTime: slideshow.createdAt.toISOString(),
      modifiedTime: slideshow.updatedAt.toISOString(),
    }))
  );
});

app.get(`${apiPrefix}/slideshows/:id`, async (req, res) => {
  const slideshow = await prisma.slideshow.findUnique({
    where: { id: req.params.id },
  });

  if (!slideshow) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  res.json({
    id: slideshow.id,
    name: slideshow.name,
    classData: slideshow.classData,
    selectedMusic: slideshow.selectedMusic,
    backgroundOption: slideshow.backgroundOption,
    selectedTransition: slideshow.selectedTransition,
    classes: slideshow.classes,
    slideDuration: slideshow.slideDuration,
    slideshowName: slideshow.slideshowName,
    createdAt: slideshow.createdAt.toISOString(),
    updatedAt: slideshow.updatedAt.toISOString(),
  });
});

app.post(`${apiPrefix}/slideshows`, async (req, res) => {
  const payload = req.body ?? {};
  if (!payload.name || typeof payload.name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }

  const baseData = {
    slideshowName: payload.slideshowName || payload.name,
    classes: payload.classes || [],
    classData: payload.classData || {},
    selectedMusic: payload.selectedMusic || null,
    backgroundOption: payload.backgroundOption || null,
    selectedTransition: payload.selectedTransition || { id: "fade", name: "Fade" },
    slideDuration: Number(payload.slideDuration || 3),
  };

  const saved = await prisma.slideshow.upsert({
    where: { name: payload.name },
    update: baseData,
    create: {
      name: payload.name,
      ...baseData,
    },
  });

  res.json({
    id: saved.id,
    name: saved.name,
    createdTime: saved.createdAt.toISOString(),
    modifiedTime: saved.updatedAt.toISOString(),
  });
});

app.delete(`${apiPrefix}/slideshows/:id`, async (req, res) => {
  await prisma.slideshow.delete({
    where: { id: req.params.id },
  });
  res.status(204).send();
});

app.use(express.static(distDir));
app.use((req, res, next) => {
  if (req.path.startsWith(apiPrefix)) {
    return next();
  }
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
