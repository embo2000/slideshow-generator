export const fileDedupeKey = (file: File, index: number) => {
  if (file.lastModified) {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }
  return `${file.name}:${file.size}:${index}`;
};

export const dedupeFiles = <T extends File>(files: T[]): T[] => {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const [index, file] of files.entries()) {
    const key = fileDedupeKey(file, index);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(file);
  }
  return unique;
};
