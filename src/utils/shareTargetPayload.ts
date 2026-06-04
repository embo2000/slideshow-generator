import { dedupeFiles } from "./dedupeFiles";
import {
  SHARE_PAYLOAD_CACHE,
  sharePayloadFileRequest,
  sharePayloadMetaRequest,
} from "./sharedImageFiles";

export interface SharedPayloadMeta {
  id: string;
  fileCount: number;
  createdAt: string;
}

export const readSharedPayload = async (id: string): Promise<File[]> => {
  if (!("caches" in window)) return [];

  const origin = window.location.origin;
  const cache = await caches.open(SHARE_PAYLOAD_CACHE);
  const metaResponse = await cache.match(sharePayloadMetaRequest(id, origin));
  if (!metaResponse) return [];

  let meta: SharedPayloadMeta | null = null;
  try {
    meta = (await metaResponse.json()) as SharedPayloadMeta;
  } catch {
    return [];
  }

  const files: File[] = [];
  for (let index = 0; index < meta.fileCount; index += 1) {
    const response = await cache.match(sharePayloadFileRequest(id, index, origin));
    if (!response) continue;

    const blob = await response.blob();
    const encodedName = response.headers.get("X-File-Name") || `shared-image-${index + 1}`;
    const fileName = decodeURIComponent(encodedName);
    const fileType = response.headers.get("Content-Type") || blob.type || "image/jpeg";
    files.push(new File([blob], fileName, { type: fileType }));
  }

  return dedupeFiles(files);
};

export const clearSharedPayload = async (id: string): Promise<void> => {
  if (!("caches" in window)) return;

  const origin = window.location.origin;
  const cache = await caches.open(SHARE_PAYLOAD_CACHE);
  const metaResponse = await cache.match(sharePayloadMetaRequest(id, origin));
  if (!metaResponse) return;

  let meta: SharedPayloadMeta | null = null;
  try {
    meta = (await metaResponse.json()) as SharedPayloadMeta;
  } catch {
    await cache.delete(sharePayloadMetaRequest(id, origin));
    return;
  }

  await cache.delete(sharePayloadMetaRequest(id, origin));
  for (let index = 0; index < meta.fileCount; index += 1) {
    await cache.delete(sharePayloadFileRequest(id, index, origin));
  }
};
