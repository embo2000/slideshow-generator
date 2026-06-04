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
