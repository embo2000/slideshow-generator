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
  const assignmentById = new Map<string, { file: File; groupName: string }>();

  const recordGroup = (groupName: string, photos: File[]) => {
    for (const file of photos) {
      const assetId = getAssetId(file);
      if (!assetId) continue;
      assignmentById.set(assetId, { file, groupName });
    }
  };

  for (const groupName of classes) {
    recordGroup(groupName, classData[groupName] ?? []);
  }

  for (const [groupName, photos] of Object.entries(classData)) {
    if (classes.includes(groupName)) continue;
    recordGroup(groupName, photos);
  }

  const deduped: ClassData = Object.fromEntries(classes.map((groupName) => [groupName, []]));
  for (const { file, groupName } of assignmentById.values()) {
    if (!deduped[groupName]) deduped[groupName] = [];
    deduped[groupName].push(file);
  }

  return deduped;
};
