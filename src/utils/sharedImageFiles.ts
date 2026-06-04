const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;

export const isSharedImageFile = (file: File): boolean => {
  if (file.type.startsWith("image/")) {
    return true;
  }

  if (IMAGE_EXTENSIONS.test(file.name)) {
    return true;
  }

  // Android often shares photos with an empty MIME type from the gallery.
  return !file.type && file.size > 0;
};

export const SHARE_PAYLOAD_CACHE = "share-target-payload-v1";

export const sharePayloadMetaUrl = (id: string, origin: string) =>
  `${origin}/share-target-payload/${id}/meta`;

export const sharePayloadFileUrl = (id: string, index: number, origin: string) =>
  `${origin}/share-target-payload/${id}/file/${index}`;

export const sharePayloadMetaRequest = (id: string, origin: string) =>
  new Request(sharePayloadMetaUrl(id, origin));

export const sharePayloadFileRequest = (id: string, index: number, origin: string) =>
  new Request(sharePayloadFileUrl(id, index, origin));

export const collectSharedImageFiles = (formData: FormData, fieldName = "files"): File[] => {
  const entries = formData
    .getAll(fieldName)
    .filter((entry): entry is File => entry instanceof File);

  return entries.filter(isSharedImageFile);
};
