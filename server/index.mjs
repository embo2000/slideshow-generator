import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
const prisma = new PrismaClient();
const MAX_PHOTOS_PER_GROUP = 5;

const photoAssetKey = (image) => {
  if (!image || typeof image !== "object") return null;
  if (image.id) return `id:${image.id}`;
  if (image.url) return `url:${image.url}`;
  if (image.name) return `name:${image.name}`;
  return null;
};

const mergeClassData = (existingClassData, incomingClassData) => {
  const merged =
    existingClassData && typeof existingClassData === "object" ? { ...existingClassData } : {};

  for (const [groupName, incomingImages] of Object.entries(incomingClassData || {})) {
    if (!Array.isArray(incomingImages)) continue;

    const existingImages = Array.isArray(merged[groupName]) ? merged[groupName] : [];
    const seen = new Set();
    const combined = [];

    for (const image of [...existingImages, ...incomingImages]) {
      const key = photoAssetKey(image);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      combined.push(image);
    }

    merged[groupName] = combined.slice(0, MAX_PHOTOS_PER_GROUP);
  }

  return merged;
};

const reconcileClassDataForSave = (existingClassData, incomingClassData) => {
  const merged =
    existingClassData && typeof existingClassData === "object" ? { ...existingClassData } : {};
  const incomingPhotoIds = collectReferencedAssetIds(incomingClassData);

  // Drop moved photos from their old groups before applying incoming assignments.
  for (const [groupName, images] of Object.entries(merged)) {
    if (!Array.isArray(images)) continue;
    merged[groupName] = images.filter((image) => {
      const id = image?.id;
      return !id || !incomingPhotoIds.has(id);
    });
  }

  for (const [groupName, incomingImages] of Object.entries(incomingClassData || {})) {
    if (!Array.isArray(incomingImages)) continue;

    const seen = new Set();
    const next = [];
    for (const image of incomingImages) {
      const key = photoAssetKey(image);
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      next.push(image);
    }

    merged[groupName] = next.slice(0, MAX_PHOTOS_PER_GROUP);
  }

  return merged;
};

const collectReferencedAssetIds = (classData) => {
  const ids = new Set();
  if (!classData || typeof classData !== "object") return ids;
  for (const images of Object.values(classData)) {
    if (!Array.isArray(images)) continue;
    for (const image of images) {
      if (image?.id) ids.add(image.id);
    }
  }
  return ids;
};

const countClassDataPhotos = (classData) => {
  if (!classData || typeof classData !== "object") return 0;
  return Object.values(classData).reduce((total, images) => {
    return total + (Array.isArray(images) ? images.length : 0);
  }, 0);
};

const countUniqueClassDataPhotos = (classData) => collectReferencedAssetIds(classData).size;

const resolveClassDataForSave = (existingSlideshow, incomingClassData) => {
  const existingData = existingSlideshow?.classData;
  const existingCount = countClassDataPhotos(existingData);
  const incomingCount = countClassDataPhotos(incomingClassData);

  if (existingSlideshow && existingCount > 0 && incomingCount === 0) {
    return existingData;
  }

  const merged = existingSlideshow
    ? reconcileClassDataForSave(existingData, incomingClassData)
    : incomingClassData || {};

  const existingUniqueCount = countUniqueClassDataPhotos(existingData);
  const mergedUniqueCount = countUniqueClassDataPhotos(merged);
  if (existingSlideshow && mergedUniqueCount < existingUniqueCount) {
    console.warn(
      `Blocked slideshow save that would reduce unique photos from ${existingUniqueCount} to ${mergedUniqueCount}`
    );
    return existingData;
  }

  return merged;
};

const mapAssetToClassPhoto = (asset) => ({
  id: asset.id,
  name: asset.name,
  url: `${apiPrefix}/assets/${asset.id}/content`,
});

const distributePhotosToGroups = (groups, photoAssets) => {
  const classData = Object.fromEntries((groups || []).map((group) => [group, []]));
  if (!groups?.length) return classData;

  let groupIndex = 0;
  for (const asset of photoAssets) {
    let placed = false;
    for (let attempt = 0; attempt < groups.length; attempt += 1) {
      const groupName = groups[(groupIndex + attempt) % groups.length];
      const items = classData[groupName];
      if (items.length < MAX_PHOTOS_PER_GROUP) {
        items.push(mapAssetToClassPhoto(asset));
        groupIndex = (groupIndex + attempt + 1) % groups.length;
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }

  return classData;
};

const isIntakeImageFile = (file) => {
  if (file.mimetype?.startsWith("image/")) return true;
  const name = file.originalname || "";
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(name);
};

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

// Custom S3-compatible endpoints (MinIO, self-hosted gateways) usually do not have DNS for
// virtual-hosted-style URLs ({bucket}.{endpoint}). Default to path-style for those.
const customS3Endpoint = process.env.S3_ENDPOINT?.trim();
let forcePathStyle = false;
if (process.env.S3_FORCE_PATH_STYLE === "true") {
  forcePathStyle = true;
} else if (process.env.S3_FORCE_PATH_STYLE === "false") {
  forcePathStyle = false;
} else if (customS3Endpoint) {
  forcePathStyle = true;
}

if (customS3Endpoint && forcePathStyle) {
  console.log(
    "S3: using path-style URLs for custom endpoint (avoids ENOTFOUND on bucket.endpoint hostnames)."
  );
}

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: customS3Endpoint || undefined,
  forcePathStyle,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

/** Human-readable hint for S3 PutObject failures (shared by /assets/upload and intake upload). */
const buildS3StorageHint = (error) => {
  const errText = String(error?.message || error?.code || error);
  if (!process.env.S3_BUCKET || !process.env.S3_REGION) {
    return "Server is missing S3_BUCKET or S3_REGION.";
  }
  if (/ENOTFOUND|getaddrinfo/i.test(errText) && customS3Endpoint && !forcePathStyle) {
    return "DNS failed for virtual-hosted S3 URL. Set S3_FORCE_PATH_STYLE=true or redeploy (custom endpoints default to path-style).";
  }
  if (/ENOTFOUND|getaddrinfo/i.test(errText)) {
    return "DNS failed for S3 host. Check S3_ENDPOINT and network; path-style may be required.";
  }
  if (/credential|Credential|AccessDenied|InvalidAccessKeyId|SignatureDoesNotMatch/i.test(errText)) {
    return "Check S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, bucket policy, and region.";
  }
  return errText.slice(0, 400);
};

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
const normalizeEmail = (value) =>
  typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
const deriveFileNameFromKey = (key = "") => key.split("/").pop() || key;
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const groupsSettingKey = (ownerEmail) => (ownerEmail ? `groups:${ownerEmail}` : "groups");
const personalIntakeLinkSettingKey = (ownerEmail) => `personalIntakeLink:${ownerEmail}`;
const PERSONAL_LINK_EXPIRY_DAYS = 3650;
const ASSET_PLAYBACK_TOKEN_TTL_SECONDS = Math.max(
  60,
  Number(process.env.ASSET_PLAYBACK_TOKEN_TTL_SECONDS || 4 * 60 * 60)
);

const getRequestUserEmail = (req) => normalizeEmail(req.headers["x-user-email"]);

const requireUserEmail = (req, res) => {
  const ownerEmail = getRequestUserEmail(req);
  if (!ownerEmail) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return ownerEmail;
};

const readOwnerEmailFromMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return null;
  return normalizeEmail(metadata.ownerEmail);
};

const createUploadLinkForOwner = async ({ ownerEmail, expiresInDays = 7, metadata = {} }) => {
  const safeDays = Number.isFinite(expiresInDays)
    ? Math.max(1, Math.min(PERSONAL_LINK_EXPIRY_DAYS, expiresInDays))
    : 7;

  const token = crypto.randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000);

  const link = await prisma.uploadLink.create({
    data: {
      tokenHash,
      expiresAt,
      active: true,
      metadata: {
        ...metadata,
        ownerEmail,
      },
    },
  });

  return {
    id: link.id,
    token,
    expiresAt: link.expiresAt,
  };
};

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
  const url =
    asset.kind === "audio" || asset.kind === "photo" || asset.kind === "image"
      ? `${apiPrefix}/assets/${asset.id}/content`
      : await buildAssetUrl(asset.s3Key);
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

const inferAudioMimeType = (key = "") => {
  const lower = key.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/*";
};

const displayNameFromFileName = (fileName = "") => {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/[_-]+/g, " ").trim() || fileName;
};

const findAssetByIdOrKey = async (idOrKey, ownerEmail = null) => {
  let asset = await prisma.asset.findUnique({ where: { id: idOrKey } });
  if (asset) return asset;
  asset = await prisma.asset.findFirst({
    where: {
      s3Key: idOrKey,
      ...(ownerEmail ? { ownerEmail } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return asset;
};

const ensureAudioAssetOwnership = (req, res, asset) => {
  if (!asset || asset.kind !== "audio") {
    return true;
  }

  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (hasValidAssetPlaybackToken(asset.id, token)) {
    return true;
  }

  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) {
    return false;
  }
  if (asset.ownerEmail !== ownerEmail) {
    res.status(404).json({ error: "Asset not found" });
    return false;
  }
  return true;
};

const getValidUploadLink = async (token) => {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const uploadLink = await prisma.uploadLink.findUnique({
    where: { tokenHash },
  });
  if (!uploadLink) return null;
  if (!uploadLink.active) return null;
  if (uploadLink.expiresAt <= new Date()) return null;
  if (!readOwnerEmailFromMetadata(uploadLink.metadata)) return null;
  return uploadLink;
};

const pipeS3BodyToResponse = async (body, res) => {
  if (!body) {
    res.end();
    return;
  }
  if (typeof body.pipe === "function") {
    body.pipe(res);
    return;
  }
  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    res.end(Buffer.from(bytes));
    return;
  }
  res.end();
};

const getAssetPlaybackTokenSecret = () =>
  process.env.ASSET_PLAYBACK_TOKEN_SECRET ||
  process.env.S3_SECRET_ACCESS_KEY ||
  process.env.DATABASE_URL ||
  "local-development-asset-playback-secret";

const signAssetPlaybackPayload = (payload) =>
  crypto.createHmac("sha256", getAssetPlaybackTokenSecret()).update(payload).digest("base64url");

const createAssetPlaybackToken = (assetId) => {
  const expiresAt = Date.now() + ASSET_PLAYBACK_TOKEN_TTL_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ assetId, expiresAt })).toString("base64url");
  const signature = signAssetPlaybackPayload(payload);
  return {
    token: `${payload}.${signature}`,
    expiresAt,
  };
};

const hasValidAssetPlaybackToken = (assetId, token) => {
  if (!token || typeof token !== "string") return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = signAssetPlaybackPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.assetId === assetId && Number(parsed.expiresAt) > Date.now();
  } catch {
    return false;
  }
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

app.get(`${apiPrefix}/settings/groups`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const groups = await prisma.appSetting.findUnique({
    where: { key: groupsSettingKey(ownerEmail) },
  });

  res.json({
    classes: Array.isArray(groups?.value?.classes) ? groups.value.classes : null,
  });
});

app.put(`${apiPrefix}/settings/groups`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const { classes } = req.body ?? {};
  if (!Array.isArray(classes)) {
    return res.status(400).json({ error: "classes must be an array of strings" });
  }

  await prisma.appSetting.upsert({
    where: { key: groupsSettingKey(ownerEmail) },
    update: { value: { classes } },
    create: { key: groupsSettingKey(ownerEmail), value: { classes } },
  });

  res.json({ success: true });
});

app.post(`${apiPrefix}/intake-links`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const expiresInDays = Number(req.body?.expiresInDays ?? 7);
  const safeDays = Number.isFinite(expiresInDays) ? Math.max(1, Math.min(30, expiresInDays)) : 7;
  const metadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};
  const link = await createUploadLinkForOwner({
    ownerEmail,
    expiresInDays: safeDays,
    metadata,
  });

  res.status(201).json({
    id: link.id,
    token: link.token,
    expiresAt: link.expiresAt.toISOString(),
  });
});

app.get(`${apiPrefix}/intake-links/personal`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const settingKey = personalIntakeLinkSettingKey(ownerEmail);
  const current = await prisma.appSetting.findUnique({
    where: { key: settingKey },
  });

  const currentValue = current?.value && typeof current.value === "object" ? current.value : null;
  const existingToken = typeof currentValue?.token === "string" ? currentValue.token : null;
  const existingUploadLinkId =
    typeof currentValue?.uploadLinkId === "string" ? currentValue.uploadLinkId : null;

  if (existingToken && existingUploadLinkId) {
    const uploadLink = await prisma.uploadLink.findUnique({
      where: { id: existingUploadLinkId },
    });
    const tokenMatches = uploadLink && hashToken(existingToken) === uploadLink.tokenHash;
    const ownerMatches = uploadLink && readOwnerEmailFromMetadata(uploadLink.metadata) === ownerEmail;
    if (
      uploadLink &&
      tokenMatches &&
      ownerMatches &&
      uploadLink.active &&
      uploadLink.expiresAt > new Date()
    ) {
      return res.json({
        id: uploadLink.id,
        token: existingToken,
        expiresAt: uploadLink.expiresAt.toISOString(),
      });
    }
  }

  const created = await createUploadLinkForOwner({
    ownerEmail,
    expiresInDays: PERSONAL_LINK_EXPIRY_DAYS,
    metadata: { linkType: "personal" },
  });

  await prisma.appSetting.upsert({
    where: { key: settingKey },
    update: {
      value: {
        uploadLinkId: created.id,
        token: created.token,
        active: true,
        createdAt:
          typeof currentValue?.createdAt === "string"
            ? currentValue.createdAt
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    create: {
      key: settingKey,
      value: {
        uploadLinkId: created.id,
        token: created.token,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  });

  return res.json({
    id: created.id,
    token: created.token,
    expiresAt: created.expiresAt.toISOString(),
  });
});

app.post(`${apiPrefix}/intake-links/personal/revoke`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const settingKey = personalIntakeLinkSettingKey(ownerEmail);
  const current = await prisma.appSetting.findUnique({
    where: { key: settingKey },
  });
  const currentValue = current?.value && typeof current.value === "object" ? current.value : null;
  const existingUploadLinkId =
    typeof currentValue?.uploadLinkId === "string" ? currentValue.uploadLinkId : null;

  if (existingUploadLinkId) {
    await prisma.uploadLink.updateMany({
      where: {
        id: existingUploadLinkId,
      },
      data: {
        active: false,
      },
    });
  }

  await prisma.appSetting.upsert({
    where: { key: settingKey },
    update: {
      value: {
        ...(currentValue || {}),
        token: null,
        uploadLinkId: null,
        active: false,
        updatedAt: new Date().toISOString(),
      },
    },
    create: {
      key: settingKey,
      value: {
        token: null,
        uploadLinkId: null,
        active: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  });

  return res.json({ success: true });
});

app.get(`${apiPrefix}/intake/:token/bootstrap`, async (req, res) => {
  const { token } = req.params;
  const uploadLink = await getValidUploadLink(token);
  if (!uploadLink) {
    return res.status(401).json({ error: "Invalid or expired intake token" });
  }

  const intakeOwnerEmail = readOwnerEmailFromMetadata(uploadLink.metadata);
  if (!intakeOwnerEmail) {
    return res.status(401).json({ error: "Invalid or expired intake token" });
  }
  const groups = await prisma.appSetting.findUnique({
    where: { key: groupsSettingKey(intakeOwnerEmail) },
  });
  const defaultClasses = Array.isArray(groups?.value?.classes) ? groups.value.classes : [];

  const slideshows = await prisma.slideshow.findMany({
    where: { ownerEmail: intakeOwnerEmail },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slideshowName: true,
      classes: true,
      classData: true,
      updatedAt: true,
    },
  });

  res.json({
    tokenId: uploadLink.id,
    defaultClasses,
    slideshows: slideshows.map((item) => {
      const classData =
        item.classData && typeof item.classData === "object" ? item.classData : {};
      const classes = Array.isArray(item.classes) ? item.classes : [];
      const groupPhotoCounts = Object.fromEntries(
        classes.map((group) => [
          group,
          Array.isArray(classData[group]) ? classData[group].length : 0,
        ])
      );
      const totalPhotoCount = Object.values(classData).reduce(
        (sum, images) => sum + (Array.isArray(images) ? images.length : 0),
        0
      );

      return {
        id: item.id,
        name: item.name,
        slideshowName: item.slideshowName,
        classes,
        groupPhotoCounts,
        totalPhotoCount,
        updatedAt: item.updatedAt.toISOString(),
      };
    }),
  });
});

app.post(`${apiPrefix}/intake/:token/slideshows`, async (req, res) => {
  const { token } = req.params;
  const uploadLink = await getValidUploadLink(token);
  if (!uploadLink) {
    return res.status(401).json({ error: "Invalid or expired intake token" });
  }

  const providedName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!providedName) {
    return res.status(400).json({ error: "name is required" });
  }

  const requestedClasses = Array.isArray(req.body?.classes)
    ? req.body.classes.filter((c) => typeof c === "string" && c.trim())
    : null;
  const ownerEmail = readOwnerEmailFromMetadata(uploadLink.metadata);
  if (!ownerEmail) {
    return res.status(401).json({ error: "Invalid or expired intake token" });
  }
  const groups = await prisma.appSetting.findUnique({
    where: { key: groupsSettingKey(ownerEmail) },
  });
  const defaultClasses = Array.isArray(groups?.value?.classes) ? groups.value.classes : [];
  const classes = requestedClasses && requestedClasses.length > 0 ? requestedClasses : defaultClasses;

  const uniqueName = async (base) => {
    let candidate = base;
    let idx = 2;
    while (
      await prisma.slideshow.findFirst({
        where: { ownerEmail, name: candidate },
      })
    ) {
      candidate = `${base} (${idx})`;
      idx += 1;
    }
    return candidate;
  };

  const name = await uniqueName(providedName);
  const classData = Object.fromEntries((classes || []).map((group) => [group, []]));

  const created = await prisma.slideshow.create({
    data: {
      ownerEmail,
      name,
      slideshowName: name,
      classes: classes || [],
      classData,
      selectedTransition: { id: "fade", name: "Fade", description: "Smooth fade between images" },
      slideDuration: 3,
    },
  });

  res.status(201).json({
    id: created.id,
    name: created.name,
    slideshowName: created.slideshowName,
    classes: Array.isArray(created.classes) ? created.classes : [],
    updatedAt: created.updatedAt.toISOString(),
  });
});

const intakeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 },
});

app.post(`${apiPrefix}/intake/:token/upload`, intakeUpload.array("files", 20), async (req, res) => {
  const { token } = req.params;
  const uploadLink = await getValidUploadLink(token);
  if (!uploadLink) {
    return res.status(401).json({ error: "Invalid or expired intake token" });
  }

  const slideshowId = req.body?.slideshowId;
  const groupName = typeof req.body?.groupName === "string" ? req.body.groupName.trim() : "";
  if (!slideshowId || !groupName) {
    return res.status(400).json({ error: "slideshowId and groupName are required" });
  }

  const files = req.files || [];
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "At least one file is required" });
  }

  const tokenOwnerEmail = readOwnerEmailFromMetadata(uploadLink.metadata);
  if (!tokenOwnerEmail) {
    return res.status(401).json({ error: "Invalid or expired intake token" });
  }
  const slideshow = await prisma.slideshow.findUnique({ where: { id: slideshowId } });
  if (!slideshow) {
    return res.status(404).json({ error: "Slideshow not found" });
  }
  if (tokenOwnerEmail && slideshow.ownerEmail !== tokenOwnerEmail) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  const classes = Array.isArray(slideshow.classes) ? slideshow.classes : [];
  if (!classes.includes(groupName)) {
    return res.status(400).json({ error: "Selected group does not exist in slideshow" });
  }

  const classData =
    slideshow.classData && typeof slideshow.classData === "object"
      ? { ...slideshow.classData }
      : {};
  const existingGroupItems = Array.isArray(classData[groupName]) ? classData[groupName] : [];
  const remainingSlots = MAX_PHOTOS_PER_GROUP - existingGroupItems.length;

  if (remainingSlots <= 0) {
    return res.status(400).json({
      error: `This group already has the maximum of ${MAX_PHOTOS_PER_GROUP} photos.`,
    });
  }

  const seenIncoming = new Set();
  const uniqueImageFiles = [];
  for (const file of files) {
    if (!isIntakeImageFile(file)) {
      continue;
    }
    const dedupeKey = `${file.originalname}:${file.size}`;
    if (seenIncoming.has(dedupeKey)) {
      continue;
    }
    seenIncoming.add(dedupeKey);
    uniqueImageFiles.push(file);
  }

  if (uniqueImageFiles.length === 0) {
    return res.status(400).json({ error: "No valid image files found" });
  }

  const filesToUpload = uniqueImageFiles.slice(0, remainingSlots);
  const skippedForLimit = uniqueImageFiles.length - filesToUpload.length;
  const skippedDuplicates = files.length - uniqueImageFiles.length;

  const uploadedItems = [];
  for (const file of filesToUpload) {

    const objectKey = `photo/${Date.now()}-${crypto.randomUUID()}-${normalizeName(file.originalname)}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
    } catch (s3Err) {
      console.error("Intake S3 upload failed:", s3Err);
      return res.status(500).json({
        error: "Photo upload failed",
        phase: "storage",
        message: buildS3StorageHint(s3Err),
      });
    }

    let asset;
    try {
      asset = await prisma.asset.create({
        data: {
          ownerEmail: tokenOwnerEmail,
          kind: "photo",
          name: file.originalname,
          originalFileName: file.originalname,
          mimeType: file.mimetype || "application/octet-stream",
          size: file.size,
          s3Key: objectKey,
        },
      });
    } catch (dbErr) {
      console.error("Intake asset DB create failed after S3 upload:", dbErr);
      return res.status(500).json({
        error: "Photo upload failed",
        phase: "database",
        message: String(dbErr?.message || dbErr).slice(0, 400),
      });
    }

    uploadedItems.push({
      id: asset.id,
      name: asset.name,
      url: await buildAssetUrl(asset.s3Key),
    });
  }

  if (uploadedItems.length === 0) {
    return res.status(400).json({ error: "No valid image files found" });
  }

  try {
    const groupItems = [...existingGroupItems];
    groupItems.push(...uploadedItems);
    classData[groupName] = groupItems;

    await prisma.slideshow.update({
      where: { id: slideshow.id },
      data: { classData },
    });
  } catch (dbError) {
    console.error("Failed to update slideshow after intake upload:", dbError);
    return res.status(500).json({ error: "Photos were uploaded but failed to attach to slideshow. Please try again." });
  }

  res.status(201).json({
    slideshowId: slideshow.id,
    groupName,
    uploadedCount: uploadedItems.length,
    skippedDuplicates,
    skippedForLimit,
    groupPhotoCount: existingGroupItems.length + uploadedItems.length,
    uploadedItems,
  });
});

app.post(`${apiPrefix}/assets/upload`, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }

    const kind = req.body.kind;
    if (!["image", "audio", "photo", "video"].includes(kind)) {
      return res.status(400).json({ error: "kind must be image, audio, photo, or video" });
    }
    const ownerEmail = getRequestUserEmail(req);
    if (kind === "audio" && !ownerEmail) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const displayName = (req.body.name || req.file.originalname).trim();
    const s3Prefix = kind === "video" ? "photo" : kind;
    const objectKey = `${s3Prefix}/${Date.now()}-${crypto.randomUUID()}-${normalizeName(
      req.file.originalname
    )}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: objectKey,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
    } catch (error) {
      console.error("S3 upload failed:", error);
      return res.status(500).json({
        error: "Failed to upload asset",
        phase: "storage",
        message: buildS3StorageHint(error),
      });
    }

    let asset;
    try {
      asset = await prisma.asset.create({
        data: {
          ownerEmail: ownerEmail || null,
          kind,
          name: displayName,
          originalFileName: req.file.originalname,
          mimeType: req.file.mimetype || "application/octet-stream",
          size: req.file.size,
          s3Key: objectKey,
        },
      });
    } catch (error) {
      console.error("Asset DB record failed after S3 upload:", error);
      // Orphan object may remain in S3; ops can reconcile by key prefix if needed.
      return res.status(500).json({
        error: "Failed to upload asset",
        phase: "database",
        message: String(error?.message || error).slice(0, 400),
      });
    }

    res.json(await mapAssetForClient(asset));
  } catch (error) {
    console.error("Asset upload failed:", error);
    res.status(500).json({
      error: "Failed to upload asset",
      message: String(error?.message || error).slice(0, 400),
    });
  }
});

app.get(`${apiPrefix}/assets`, async (req, res) => {
  const kind = req.query.kind;

  // Audio library should mirror S3 /audio/ folder content directly.
  if (String(kind) === "audio") {
    const ownerEmail = requireUserEmail(req, res);
    if (!ownerEmail) return;

    try {
      const list = await s3.send(
        new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET,
          Prefix: "audio/",
        })
      );

      const objects = (list.Contents || []).filter((obj) => obj.Key && !obj.Key.endsWith("/"));
      const keys = objects.map((obj) => obj.Key);

      const existingAssets = keys.length
        ? await prisma.asset.findMany({
            where: { ownerEmail, kind: "audio", s3Key: { in: keys } },
          })
        : [];
      const assetsByKey = new Map(existingAssets.map((asset) => [asset.s3Key, asset]));

      // Ensure orphan S3 audio files are represented in DB so they can have assignable names.
      for (const obj of objects) {
        const key = obj.Key;
        if (assetsByKey.has(key)) continue;

        const fileName = deriveFileNameFromKey(key);
        const createdAsset = await prisma.asset.upsert({
          where: {
            ownerEmail_s3Key: {
              ownerEmail,
              s3Key: key,
            },
          },
          update: {
            // Keep user-assigned name if it already exists; only refresh mutable metadata.
            mimeType: inferAudioMimeType(key),
            size: Number(obj.Size || 0),
            originalFileName: fileName,
          },
          data: {
            ownerEmail,
            kind: "audio",
            name: displayNameFromFileName(fileName),
            originalFileName: fileName,
            mimeType: inferAudioMimeType(key),
            size: Number(obj.Size || 0),
            s3Key: key,
          },
        });
        assetsByKey.set(key, createdAsset);
      }

      const files = await Promise.all(
        objects.map(async (obj) => {
          const key = obj.Key;
          const asset = assetsByKey.get(key);
          const url = asset?.id
            ? `${apiPrefix}/assets/${asset.id}/content`
            : await buildAssetUrl(key);
          const fileName = deriveFileNameFromKey(key);

          return {
            id: asset?.id || key,
            name: asset?.name || displayNameFromFileName(fileName),
            url,
            createdTime: (obj.LastModified || asset?.createdAt || new Date()).toISOString(),
            size: String(obj.Size ?? asset?.size ?? 0),
            mimeType: asset?.mimeType || inferAudioMimeType(key),
            kind: "audio",
          };
        })
      );

      files.sort((a, b) => (a.createdTime < b.createdTime ? 1 : -1));
      return res.json(files);
    } catch (error) {
      console.error("Failed to list audio files from S3:", error);
      return res.status(500).json({ error: "Failed to list audio files from S3" });
    }
  }

  const where = ["image", "audio", "photo", "video"].includes(String(kind))
    ? { kind: String(kind) }
    : undefined;

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const mapped = await Promise.all(assets.map((asset) => mapAssetForClient(asset)));
  res.json(mapped);
});

app.post(`${apiPrefix}/assets/:id/playback-token`, async (req, res) => {
  const { id } = req.params;
  const asset = await findAssetByIdOrKey(id, getRequestUserEmail(req));
  if (!asset || asset.kind !== "audio") {
    return res.status(404).json({ error: "Asset not found" });
  }
  if (!ensureAudioAssetOwnership(req, res, asset)) {
    return;
  }

  const { token, expiresAt } = createAssetPlaybackToken(asset.id);
  res.json({
    path: `${apiPrefix}/assets/${encodeURIComponent(asset.id)}/content?token=${encodeURIComponent(token)}`,
    expiresAt: new Date(expiresAt).toISOString(),
  });
});

app.get(`${apiPrefix}/assets/:id/content`, async (req, res) => {
  const { id } = req.params;
  const asset = await findAssetByIdOrKey(id, getRequestUserEmail(req));
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }

  const queryToken = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  const legacyQueryToken = Array.isArray(req.query.playbackToken)
    ? req.query.playbackToken[0]
    : req.query.playbackToken;
  const hasPlaybackToken =
    asset.kind === "audio" && hasValidAssetPlaybackToken(asset.id, queryToken || legacyQueryToken);

  if (!hasPlaybackToken && !ensureAudioAssetOwnership(req, res, asset)) {
    return;
  }

  const rangeHeader = req.headers.range;
  try {
    if (rangeHeader) {
      let total = Number(asset.size || 0);
      if (!Number.isFinite(total) || total <= 0) {
        const head = await s3.send(
          new HeadObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: asset.s3Key,
          })
        );
        total = Number(head.ContentLength || 0);
      }

      if (!Number.isFinite(total) || total <= 0) {
        res.setHeader("Accept-Ranges", "bytes");
        res.status(416).end();
        return;
      }

      const range = rangeHeader.replace(/bytes=/, "").split("-");
      const start = Number.parseInt(range[0], 10) || 0;
      const requestedEnd = range[1] ? Number.parseInt(range[1], 10) : total - 1;
      const end = Number.isFinite(requestedEnd) ? requestedEnd : total - 1;

      if (start >= total || start < 0 || end < start) {
        res.setHeader("Content-Range", `bytes */${total}`);
        res.setHeader("Accept-Ranges", "bytes");
        res.status(416).end();
        return;
      }

      const chunkEnd = Math.min(end, total - 1);
      const chunkSize = chunkEnd - start + 1;

      const response = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: asset.s3Key,
          Range: `bytes=${start}-${chunkEnd}`,
        })
      );

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${chunkEnd}/${total}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", String(chunkSize));
      res.setHeader("Content-Type", response.ContentType || asset.mimeType || "application/octet-stream");
      await pipeS3BodyToResponse(response.Body, res);
      return;
    }

    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: asset.s3Key,
      })
    );

    res.setHeader("Content-Type", response.ContentType || asset.mimeType || "application/octet-stream");
    if (response.ContentLength) {
      res.setHeader("Content-Length", String(response.ContentLength));
    }
    res.setHeader("Accept-Ranges", "bytes");
    await pipeS3BodyToResponse(response.Body, res);
  } catch (error) {
    console.error("Failed to stream asset content:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream asset" });
    } else {
      res.end();
    }
  }
});

app.patch(`${apiPrefix}/assets/:id`, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  const asset = await findAssetByIdOrKey(id, getRequestUserEmail(req));
  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }
  if (!ensureAudioAssetOwnership(req, res, asset)) {
    return;
  }

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: { name: name.trim() },
  });

  res.json(await mapAssetForClient(updated));
});

app.delete(`${apiPrefix}/assets/:id`, async (req, res) => {
  const { id } = req.params;
  const asset = await findAssetByIdOrKey(id, getRequestUserEmail(req));

  if (!asset) {
    return res.status(404).json({ error: "Asset not found" });
  }
  if (!ensureAudioAssetOwnership(req, res, asset)) {
    return;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: asset.s3Key,
      })
    );
  } catch (error) {
    console.error("Failed deleting asset from S3:", error);
  }

  await prisma.asset.delete({ where: { id: asset.id } });
  res.status(204).send();
});

app.get(`${apiPrefix}/slideshows`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const slideshows = await prisma.slideshow.findMany({
    where: { ownerEmail },
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
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const slideshow = await prisma.slideshow.findUnique({
    where: { id: req.params.id },
  });

  if (!slideshow || slideshow.ownerEmail !== ownerEmail) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  const classData = slideshow.classData || {};
  const classDataWithFreshUrls = {};

  for (const [groupName, images] of Object.entries(classData)) {
    if (!Array.isArray(images)) {
      classDataWithFreshUrls[groupName] = [];
      continue;
    }

    const mappedImages = await Promise.all(
      images.map(async (image) => {
        if (!image || typeof image !== "object") return image;
        if (!image.id) return image;

        const asset = await prisma.asset.findUnique({ where: { id: image.id } });
        if (!asset) return image;

        const freshUrl = `${apiPrefix}/assets/${asset.id}/content`;
        return {
          ...image,
          name: image.name || asset.name,
          url: freshUrl,
        };
      })
    );

    classDataWithFreshUrls[groupName] = mappedImages;
  }

  let selectedMusic = slideshow.selectedMusic;
  if (selectedMusic?.assetId) {
    const asset = await prisma.asset.findUnique({ where: { id: selectedMusic.assetId } });
    if (asset) {
      selectedMusic = {
        ...selectedMusic,
        url: `${apiPrefix}/assets/${asset.id}/content`,
        name: selectedMusic.name || asset.name,
      };
    }
  }

  let backgroundOption = slideshow.backgroundOption;
  if (backgroundOption?.type === "image" && backgroundOption.image?.assetId) {
    const asset = await prisma.asset.findUnique({ where: { id: backgroundOption.image.assetId } });
    if (asset) {
      backgroundOption = {
        ...backgroundOption,
        image: {
          ...backgroundOption.image,
          url: `${apiPrefix}/assets/${asset.id}/content`,
        },
      };
    }
  }

  res.json({
    id: slideshow.id,
    name: slideshow.name,
    classData: classDataWithFreshUrls,
    selectedMusic,
    backgroundOption,
    selectedTransition: slideshow.selectedTransition,
    classes: slideshow.classes,
    slideDuration: slideshow.slideDuration,
    slideshowName: slideshow.slideshowName,
    createdAt: slideshow.createdAt.toISOString(),
    updatedAt: slideshow.updatedAt.toISOString(),
  });
});

app.get(`${apiPrefix}/slideshows/:id/recoverable-photos`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const slideshow = await prisma.slideshow.findUnique({
    where: { id: req.params.id },
  });
  if (!slideshow || slideshow.ownerEmail !== ownerEmail) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  const ownerSlideshows = await prisma.slideshow.findMany({
    where: { ownerEmail },
    select: { classData: true },
  });
  const referencedIds = new Set();
  for (const item of ownerSlideshows) {
    collectReferencedAssetIds(item.classData).forEach((id) => referencedIds.add(id));
  }

  const orphanPhotos = await prisma.asset.findMany({
    where: {
      ownerEmail,
      kind: "photo",
      createdAt: { gte: slideshow.createdAt },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const recoverableIds = orphanPhotos.filter((asset) => !referencedIds.has(asset.id));
  res.json({ count: recoverableIds.length });
});

app.post(`${apiPrefix}/slideshows/:id/restore-photos`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const slideshow = await prisma.slideshow.findUnique({
    where: { id: req.params.id },
  });
  if (!slideshow || slideshow.ownerEmail !== ownerEmail) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  const groups = Array.isArray(slideshow.classes) ? slideshow.classes : [];
  if (groups.length === 0) {
    return res.status(400).json({ error: "Slideshow has no image groups configured" });
  }

  const ownerSlideshows = await prisma.slideshow.findMany({
    where: { ownerEmail },
    select: { classData: true },
  });
  const referencedIds = new Set();
  for (const item of ownerSlideshows) {
    collectReferencedAssetIds(item.classData).forEach((id) => referencedIds.add(id));
  }

  const candidatePhotos = await prisma.asset.findMany({
    where: {
      ownerEmail,
      kind: "photo",
      createdAt: { gte: slideshow.createdAt },
    },
    orderBy: { createdAt: "asc" },
  });
  const orphanPhotos = candidatePhotos.filter((asset) => !referencedIds.has(asset.id));
  if (orphanPhotos.length === 0) {
    return res.json({ restoredCount: 0, totalPhotos: countClassDataPhotos(slideshow.classData) });
  }

  const restoredClassData = distributePhotosToGroups(groups, orphanPhotos);
  const mergedClassData = mergeClassData(slideshow.classData, restoredClassData);

  const saved = await prisma.slideshow.update({
    where: { id: slideshow.id },
    data: { classData: mergedClassData },
  });

  res.json({
    restoredCount: orphanPhotos.length,
    totalPhotos: countClassDataPhotos(saved.classData),
  });
});

app.post(`${apiPrefix}/slideshows`, async (req, res) => {
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

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

  let existingSlideshow = null;
  if (payload.id && typeof payload.id === "string") {
    existingSlideshow = await prisma.slideshow.findUnique({ where: { id: payload.id } });
  } else {
    existingSlideshow = await prisma.slideshow.findFirst({
      where: { ownerEmail, name: payload.name },
    });
  }

  if (existingSlideshow && existingSlideshow.ownerEmail !== ownerEmail) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  const mergedClassData = resolveClassDataForSave(existingSlideshow, baseData.classData);

  const saved = existingSlideshow
    ? await prisma.slideshow.update({
        where: { id: existingSlideshow.id },
        data: { ...baseData, classData: mergedClassData },
      })
    : await prisma.slideshow.create({
        data: {
          ownerEmail,
          name: payload.name,
          ...baseData,
          classData: mergedClassData,
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
  const ownerEmail = requireUserEmail(req, res);
  if (!ownerEmail) return;

  const slideshow = await prisma.slideshow.findUnique({
    where: { id: req.params.id },
    select: { id: true, ownerEmail: true },
  });
  if (!slideshow || slideshow.ownerEmail !== ownerEmail) {
    return res.status(404).json({ error: "Slideshow not found" });
  }

  await prisma.slideshow.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "File is too large. Maximum size is 25 MB per photo.",
      LIMIT_FILE_COUNT: "Too many files. Maximum is 20 photos at once.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field in upload.",
    };
    return res.status(400).json({ error: messages[err.code] || `Upload error: ${err.message}` });
  }
  next(err);
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
