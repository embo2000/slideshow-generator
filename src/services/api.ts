import { BackgroundOption, ClassData, MusicTrack, TransitionType } from "../types";

export interface StoredFile {
  id: string;
  name: string;
  url: string;
  createdTime: string;
  size?: string;
  mimeType?: string;
  kind?: "image" | "audio" | "photo" | "video";
}

export interface StoredSlideshow {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
}

export interface IntakeBootstrap {
  tokenId: string;
  defaultClasses: string[];
  slideshows: Array<{
    id: string;
    name: string;
    slideshowName: string;
    classes: string[];
    updatedAt: string;
  }>;
}

/** Serialized photo refs for API; `pendingUpload` when S3 upload failed but we still persist the slideshow row. */
export type SerializedClassPhoto = {
  id: string;
  name: string;
  url: string;
  pendingUpload?: boolean;
};

export interface SlideshowPayload {
  name: string;
  classData: Record<string, SerializedClassPhoto[]>;
  selectedMusic: MusicTrack | null;
  backgroundOption: BackgroundOption;
  selectedTransition: TransitionType;
  classes: string[];
  slideDuration: number;
  slideshowName: string;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
let currentUserEmail: string | null = null;

const buildApiUrl = (path: string): string => {
  if (/^[a-z][a-z\d+\-.]*:/i.test(path)) {
    return path;
  }

  const normalizedBase = apiBase.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    normalizedPath.startsWith("/api/") &&
    (normalizedBase === "/api" || normalizedBase.endsWith("/api"))
  ) {
    return `${normalizedBase.slice(0, -"/api".length)}${normalizedPath}`;
  }

  return `${normalizedBase}${normalizedPath}`;
};

const isAbsoluteUrl = (value: string): boolean => /^[a-z][a-z\d+\-.]*:/i.test(value);

const resolveAssetFetchUrl = (url: string): string => {
  if (isAbsoluteUrl(url) || url.startsWith("/api/")) {
    return url;
  }
  return buildApiUrl(url);
};

const extractAssetIdFromContentUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url, window.location.origin);
    const match = parsed.pathname.match(/\/assets\/([^/]+)\/content$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const buildHeaders = (baseHeaders: HeadersInit = {}, includeJsonContentType = true): HeadersInit => {
  const headers: Record<string, string> = {};

  if (includeJsonContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (currentUserEmail) {
    headers["X-User-Email"] = currentUserEmail;
  }

  if (baseHeaders instanceof Headers) {
    baseHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(baseHeaders)) {
    baseHeaders.forEach(([key, value]) => {
      headers[key] = value;
    });
  } else {
    Object.assign(headers, baseHeaders);
  }

  return headers;
};

const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: buildHeaders(init?.headers, true),
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `Request failed with ${response.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

/** Format JSON API error bodies (upload routes return error + optional phase + message). */
const formatApiErrorBody = (text: string): string => {
  try {
    const parsed = JSON.parse(text) as {
      error?: string;
      message?: string;
      phase?: string;
    };
    const bits: string[] = [];
    if (parsed.error) bits.push(parsed.error);
    if (parsed.phase) bits.push(`[${parsed.phase}]`);
    if (parsed.message) bits.push(parsed.message);
    if (bits.length > 0) return bits.join(" ");
  } catch {
    // not JSON
  }
  return text;
};

const uploadAsset = async (
  file: File,
  kind: "image" | "audio" | "photo" | "video",
  name?: string
): Promise<StoredFile> => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  if (name) form.append("name", name);

  const response = await fetch(buildApiUrl("/assets/upload"), {
    method: "POST",
    body: form,
    headers: buildHeaders({}, false),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatApiErrorBody(text) || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<StoredFile>;
};

const serializeClassData = async (
  classData: ClassData,
  uploadedPhotoAssets?: WeakMap<File, StoredFile>
): Promise<Record<string, SerializedClassPhoto[]>> => {
  const result: Record<string, SerializedClassPhoto[]> = {};

  for (const [className, files] of Object.entries(classData)) {
    result[className] = [];
    for (const file of files) {
      const uploadedFromCache = uploadedPhotoAssets?.get(file);
      if (uploadedFromCache) {
        result[className].push({
          id: uploadedFromCache.id,
          name: uploadedFromCache.name,
          url: uploadedFromCache.url,
        });
        continue;
      }
      try {
        const uploaded = await uploadAsset(file, "photo", file.name);
        if (uploadedPhotoAssets) {
          uploadedPhotoAssets.set(file, uploaded);
        }
        result[className].push({
          id: uploaded.id,
          name: uploaded.name,
          url: uploaded.url,
        });
      } catch (error) {
        console.warn(
          `Photo upload failed for "${file.name}"; saving slideshow metadata without this asset.`,
          error
        );
        result[className].push({
          id: "",
          name: file.name,
          url: "",
          pendingUpload: true,
        });
      }
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
  uploadedPhotoAssets?: WeakMap<File, StoredFile>;
}): Promise<StoredSlideshow> => {
  const uploadedClassData = await serializeClassData(
    params.classData,
    params.uploadedPhotoAssets
  );

  let selectedMusic = params.selectedMusic;
  if (params.selectedMusic?.file && !params.selectedMusic.assetId) {
    try {
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
    } catch (error) {
      console.warn("Music file upload failed; saving slideshow without that audio asset.", error);
      selectedMusic = params.selectedMusic.url
        ? { ...params.selectedMusic, file: undefined }
        : null;
    }
  }

  let backgroundOption = params.backgroundOption;
  if (
    params.backgroundOption.type === "image" &&
    params.backgroundOption.image?.file &&
    !params.backgroundOption.image.assetId
  ) {
    try {
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
    } catch (error) {
      console.warn("Background image upload failed; saving slideshow without that image asset.", error);
      backgroundOption = params.backgroundOption.image?.url
        ? {
            ...params.backgroundOption,
            image: {
              ...params.backgroundOption.image,
              file: undefined,
            },
          }
        : { type: "none" };
    }
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

const getPlayableAssetUrl = async (track: Pick<MusicTrack, "url" | "assetId">): Promise<string> => {
  const assetId = track.assetId || extractAssetIdFromContentUrl(track.url);
  if (!assetId) {
    return track.url;
  }

  try {
    const response = await apiFetch<{ path?: string; url?: string }>(
      `/assets/${encodeURIComponent(assetId)}/playback-token`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const playbackUrl = response.path || response.url;
    if (playbackUrl) {
      return isAbsoluteUrl(playbackUrl) ? playbackUrl : buildApiUrl(playbackUrl);
    }
  } catch (error) {
    console.warn("Playback token unavailable; falling back to authenticated audio fetch.", error);
  }

  const response = await fetch(resolveAssetFetchUrl(track.url), {
    headers: buildHeaders({}, false),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatApiErrorBody(text) || `Audio request failed with ${response.status}`);
  }

  return URL.createObjectURL(await response.blob());
};

export const backendService = {
  setCurrentUserEmail: (email: string | null) => {
    currentUserEmail = email?.trim().toLowerCase() || null;
  },
  saveSlideshow,
  uploadAsset,
  getPlayableAssetUrl,
  renameAsset: (id: string, name: string) =>
    apiFetch<StoredFile>(`/assets/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  deleteAsset: (id: string) => apiFetch<void>(`/assets/${id}`, { method: "DELETE" }),
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
  createIntakeLink: (expiresInDays = 7, metadata?: unknown) =>
    apiFetch<{ id: string; token: string; expiresAt: string }>("/intake-links", {
      method: "POST",
      body: JSON.stringify({ expiresInDays, metadata }),
    }),
  getPersonalIntakeLink: () =>
    apiFetch<{ id: string; token: string; expiresAt: string }>("/intake-links/personal"),
  revokePersonalIntakeLink: () =>
    apiFetch<{ success: boolean }>("/intake-links/personal/revoke", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  intakeBootstrap: (token: string) =>
    apiFetch<IntakeBootstrap>(`/intake/${encodeURIComponent(token)}/bootstrap`),
  intakeCreateSlideshow: (token: string, payload: { name: string; classes?: string[] }) =>
    apiFetch<{
      id: string;
      name: string;
      slideshowName: string;
      classes: string[];
      updatedAt: string;
    }>(`/intake/${encodeURIComponent(token)}/slideshows`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  intakeUploadPhotos: async (
    token: string,
    payload: { slideshowId: string; groupName: string; files: File[] }
  ) => {
    const form = new FormData();
    form.append("slideshowId", payload.slideshowId);
    form.append("groupName", payload.groupName);
    payload.files.forEach((file) => form.append("files", file));

    const response = await fetch(buildApiUrl(`/intake/${encodeURIComponent(token)}/upload`), {
      method: "POST",
      body: form,
      headers: buildHeaders({}, false),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(formatApiErrorBody(text) || `Upload failed (${response.status})`);
    }
    return response.json() as Promise<{
      slideshowId: string;
      groupName: string;
      uploadedCount: number;
      uploadedItems: Array<{ id: string; name: string; url: string }>;
    }>;
  },
};
