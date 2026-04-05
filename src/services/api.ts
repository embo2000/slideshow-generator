import { BackgroundOption, ClassData, MusicTrack, TransitionType } from "../types";

export interface StoredFile {
  id: string;
  name: string;
  url: string;
  createdTime: string;
  size?: string;
  mimeType?: string;
  kind?: "image" | "audio" | "photo";
}

export interface StoredSlideshow {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
}

export interface SlideshowPayload {
  name: string;
  classData: Record<string, Array<{ id: string; name: string; url: string }>>;
  selectedMusic: MusicTrack | null;
  backgroundOption: BackgroundOption;
  selectedTransition: TransitionType;
  classes: string[];
  slideDuration: number;
  slideshowName: string;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

const uploadAsset = async (
  file: File,
  kind: "image" | "audio" | "photo",
  name?: string
): Promise<StoredFile> => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  if (name) form.append("name", name);

  const response = await fetch(`${apiBase}/assets/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<StoredFile>;
};

const serializeClassData = async (classData: ClassData) => {
  const result: Record<string, Array<{ id: string; name: string; url: string }>> = {};

  for (const [className, files] of Object.entries(classData)) {
    result[className] = [];
    for (const file of files) {
      const uploaded = await uploadAsset(file, "photo", file.name);
      result[className].push({
        id: uploaded.id,
        name: uploaded.name,
        url: uploaded.url,
      });
    }
  }

  return result;
};

const saveSlideshow = async (params: {
  name: string;
  classData: ClassData;
  selectedMusic: MusicTrack | null;
  backgroundOption: BackgroundOption;
  selectedTransition: TransitionType;
  classes: string[];
  slideDuration: number;
  slideshowName: string;
}): Promise<StoredSlideshow> => {
  const uploadedClassData = await serializeClassData(params.classData);

  let selectedMusic = params.selectedMusic;
  if (params.selectedMusic?.file) {
    const uploadedMusic = await uploadAsset(
      params.selectedMusic.file,
      "audio",
      params.selectedMusic.name
    );
    selectedMusic = {
      ...params.selectedMusic,
      assetId: uploadedMusic.id,
      url: uploadedMusic.url,
      file: undefined,
    };
  }

  let backgroundOption = params.backgroundOption;
  if (params.backgroundOption.type === "image" && params.backgroundOption.image?.file) {
    const uploadedBackground = await uploadAsset(
      params.backgroundOption.image.file,
      "image",
      params.backgroundOption.image.file.name
    );
    backgroundOption = {
      ...params.backgroundOption,
      image: {
        ...params.backgroundOption.image,
        assetId: uploadedBackground.id,
        url: uploadedBackground.url,
        file: undefined,
      },
    };
  }

  return apiFetch<StoredSlideshow>("/slideshows", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      classData: uploadedClassData,
      selectedMusic,
      backgroundOption,
      selectedTransition: params.selectedTransition,
      classes: params.classes,
      slideDuration: params.slideDuration,
      slideshowName: params.slideshowName,
    }),
  });
};

export const backendService = {
  saveSlideshow,
  listSlideshows: () => apiFetch<StoredSlideshow[]>("/slideshows"),
  loadSlideshow: (id: string) => apiFetch<any>(`/slideshows/${id}`),
  deleteSlideshow: (id: string) => apiFetch<void>(`/slideshows/${id}`, { method: "DELETE" }),
  listMusicFiles: () => apiFetch<StoredFile[]>("/assets?kind=audio"),
  listBackgroundImages: () => apiFetch<StoredFile[]>("/assets?kind=image"),
  loadGroupsSettings: async () => {
    const data = await apiFetch<{ classes: string[] | null }>("/settings/groups");
    return data.classes;
  },
  saveGroupsSettings: (classes: string[]) =>
    apiFetch<{ success: boolean }>("/settings/groups", {
      method: "PUT",
      body: JSON.stringify({ classes }),
    }),
};
