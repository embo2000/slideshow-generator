import React from "react";
import { X } from "lucide-react";

interface PhotoThumbnailDeleteButtonProps {
  onDelete: () => void;
}

const PhotoThumbnailDeleteButton: React.FC<PhotoThumbnailDeleteButtonProps> = ({ onDelete }) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      event.preventDefault();
      onDelete();
    }}
    className="absolute top-1 right-1 z-10 rounded-full bg-black/55 hover:bg-red-600 text-white p-0.5 shadow-sm"
    title="Remove photo"
    aria-label="Remove photo"
  >
    <X className="h-3 w-3" />
  </button>
);

export default PhotoThumbnailDeleteButton;
