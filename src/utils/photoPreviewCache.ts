type FileWithPreviewUrl = File & { previewUrl?: string };

type PreviewMeta = {
  thumbnailUrl?: string;
  fullUrl?: string;
  thumbnailPromise?: Promise<string>;
  fullPromise?: Promise<string>;
};

const cache = new WeakMap<File, PreviewMeta>();
const THUMBNAIL_MAX_SIZE = 320;

const getRemoteUrl = (file: File): string | null =>
  (file as FileWithPreviewUrl).previewUrl || null;

const isBlobUrl = (url: string) => url.startsWith("blob:");

async function createThumbnailFromFile(file: File): Promise<string> {
  const remote = getRemoteUrl(file);
  if (remote) return remote;

  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: THUMBNAIL_MAX_SIZE,
      resizeHeight: THUMBNAIL_MAX_SIZE,
      resizeQuality: "medium",
    });

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return URL.createObjectURL(file);
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );
    return blob ? URL.createObjectURL(blob) : URL.createObjectURL(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

async function createFullUrlFromFile(file: File): Promise<string> {
  const remote = getRemoteUrl(file);
  if (remote) return remote;
  return URL.createObjectURL(file);
}

export const getPhotoThumbnailUrl = (file: File): Promise<string> => {
  let meta = cache.get(file);
  if (!meta) {
    meta = {};
    cache.set(file, meta);
  }

  if (meta.thumbnailUrl) {
    return Promise.resolve(meta.thumbnailUrl);
  }

  if (!meta.thumbnailPromise) {
    meta.thumbnailPromise = createThumbnailFromFile(file).then((url) => {
      meta!.thumbnailUrl = url;
      return url;
    });
  }

  return meta.thumbnailPromise;
};

export const getPhotoFullUrl = (file: File): Promise<string> => {
  let meta = cache.get(file);
  if (!meta) {
    meta = {};
    cache.set(file, meta);
  }

  if (meta.fullUrl) {
    return Promise.resolve(meta.fullUrl);
  }

  if (!meta.fullPromise) {
    meta.fullPromise = createFullUrlFromFile(file).then((url) => {
      meta!.fullUrl = url;
      return url;
    });
  }

  return meta.fullPromise;
};

export const revokePhotoPreview = (file: File): void => {
  const meta = cache.get(file);
  if (!meta) return;

  const remote = getRemoteUrl(file);
  if (meta.thumbnailUrl && (!remote || isBlobUrl(meta.thumbnailUrl))) {
    URL.revokeObjectURL(meta.thumbnailUrl);
  }
  if (meta.fullUrl && (!remote || isBlobUrl(meta.fullUrl))) {
    URL.revokeObjectURL(meta.fullUrl);
  }

  cache.delete(file);
};

export const revokePhotoPreviews = (files: File[]): void => {
  files.forEach(revokePhotoPreview);
};

const resolveFetchUrl = (url: string): string => {
  if (/^[a-z][a-z\d+\-.]*:/i.test(url)) {
    return url;
  }
  return new URL(url, window.location.origin).href;
};

export const downloadPhotoFile = async (file: File): Promise<void> => {
  const fullUrl = await getPhotoFullUrl(file);
  let blob: Blob;

  if (fullUrl.startsWith("blob:")) {
    const response = await fetch(fullUrl);
    blob = await response.blob();
  } else if (file.size > 0 && !getRemoteUrl(file)) {
    blob = file;
  } else {
    const response = await fetch(resolveFetchUrl(fullUrl));
    if (!response.ok) {
      throw new Error(`Download failed (${response.status})`);
    }
    blob = await response.blob();
  }

  const extFromType = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  let filename = file.name?.trim() || `photo.${extFromType}`;
  if (!/\.\w+$/.test(filename)) {
    filename = `${filename}.${extFromType}`;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
