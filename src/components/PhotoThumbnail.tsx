import React from "react";
import { usePhotoThumbnail } from "../hooks/usePhotoPreview";

interface PhotoThumbnailProps {
  file: File;
  alt: string;
  className?: string;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({ file, alt, className = "" }) => {
  const { src, loading } = usePhotoThumbnail(file);

  if (loading || !src) {
    return (
      <div
        className={`bg-gray-100 animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
};

export default PhotoThumbnail;
