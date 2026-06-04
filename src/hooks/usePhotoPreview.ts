import { useEffect, useState } from "react";
import { getPhotoFullUrl, getPhotoThumbnailUrl } from "../utils/photoPreviewCache";

export const usePhotoThumbnail = (file: File | undefined) => {
  const [src, setSrc] = useState<string | null>(() => {
    if (!file) return null;
    return (file as File & { previewUrl?: string }).previewUrl || null;
  });
  const [loading, setLoading] = useState(Boolean(file) && !src);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const remote = (file as File & { previewUrl?: string }).previewUrl;
    if (remote) {
      setSrc(remote);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPhotoThumbnailUrl(file)
      .then((url) => {
        if (!cancelled) {
          setSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  return { src, loading };
};

export const usePhotoFullPreview = (file: File | undefined, enabled: boolean) => {
  const [src, setSrc] = useState<string | null>(() => {
    if (!enabled || !file) return null;
    return (file as File & { previewUrl?: string }).previewUrl || null;
  });
  const [loading, setLoading] = useState(Boolean(enabled && file) && !src);

  useEffect(() => {
    if (!enabled || !file) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const remote = (file as File & { previewUrl?: string }).previewUrl;
    if (remote) {
      setSrc(remote);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPhotoFullUrl(file)
      .then((url) => {
        if (!cancelled) {
          setSrc(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, enabled]);

  return { src, loading };
};
