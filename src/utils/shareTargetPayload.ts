const SHARE_PAYLOAD_CACHE = "share-target-payload-v1";
const META_PATH_PREFIX = "/share-target-payload/";

export interface SharedPayloadMeta {
  id: string;
  fileCount: number;
  createdAt: string;
}

const metaRequest = (id: string) => new Request(`${META_PATH_PREFIX}${id}/meta`);
const fileRequest = (id: string, index: number) =>
  new Request(`${META_PATH_PREFIX}${id}/file/${index}`);

export const readSharedPayload = async (id: string): Promise<File[]> => {
  if (!("caches" in window)) return [];

  const cache = await caches.open(SHARE_PAYLOAD_CACHE);
  const metaResponse = await cache.match(metaRequest(id));
  if (!metaResponse) return [];

  let meta: SharedPayloadMeta | null = null;
  try {
    meta = (await metaResponse.json()) as SharedPayloadMeta;
  } catch {
    return [];
  }

  const files: File[] = [];
  for (let index = 0; index < meta.fileCount; index += 1) {
    const response = await cache.match(fileRequest(id, index));
    if (!response) continue;

    const blob = await response.blob();
    const encodedName = response.headers.get("X-File-Name") || `shared-image-${index + 1}`;
    const fileName = decodeURIComponent(encodedName);
    const fileType = response.headers.get("Content-Type") || blob.type || "image/jpeg";
    files.push(new File([blob], fileName, { type: fileType }));
  }

  return files;
};

export const clearSharedPayload = async (id: string): Promise<void> => {
  if (!("caches" in window)) return;
  const cache = await caches.open(SHARE_PAYLOAD_CACHE);

  const metaResponse = await cache.match(metaRequest(id));
  if (!metaResponse) return;

  let meta: SharedPayloadMeta | null = null;
  try {
    meta = (await metaResponse.json()) as SharedPayloadMeta;
  } catch {
    // If metadata is malformed, at least clear the meta key.
    await cache.delete(metaRequest(id));
    return;
  }

  await cache.delete(metaRequest(id));
  for (let index = 0; index < meta.fileCount; index += 1) {
    await cache.delete(fileRequest(id, index));
  }
};
