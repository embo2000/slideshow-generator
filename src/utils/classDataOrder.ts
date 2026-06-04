import { ClassData } from "../types";

export const getClassesWithPhotosInOrder = (
  classes: string[],
  classData: ClassData
): Array<[string, File[]]> =>
  classes
    .filter((groupName) => (classData[groupName] ?? []).length > 0)
    .map((groupName) => [groupName, classData[groupName]!]);

export const collectPhotosInClassOrder = (
  classes: string[],
  classData: ClassData
): Array<{ file: File; className: string }> => {
  const photos: Array<{ file: File; className: string }> = [];
  for (const className of classes) {
    const groupPhotos = classData[className];
    if (!groupPhotos?.length) continue;
    for (const file of groupPhotos) {
      photos.push({ file, className });
    }
  }
  return photos;
};

export const dedupeClassDataByAssetId = (
  classes: string[],
  classData: ClassData,
  getAssetId: (file: File) => string | undefined
): ClassData => {
  const seen = new Set<string>();
  const deduped: ClassData = {};

  for (const groupName of classes) {
    deduped[groupName] = (classData[groupName] ?? []).filter((file) => {
      const assetId = getAssetId(file);
      if (!assetId) return true;
      if (seen.has(assetId)) return false;
      seen.add(assetId);
      return true;
    });
  }

  for (const [groupName, photos] of Object.entries(classData)) {
    if (classes.includes(groupName)) continue;
    deduped[groupName] = photos.filter((file) => {
      const assetId = getAssetId(file);
      if (!assetId) return true;
      if (seen.has(assetId)) return false;
      seen.add(assetId);
      return true;
    });
  }

  return deduped;
};
