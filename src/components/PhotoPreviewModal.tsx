import React from "react";
import { usePhotoFullPreview } from "../hooks/usePhotoPreview";

interface PhotoPreviewModalProps {
  file: File;
  onClose: () => void;
}

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({ file, onClose }) => {
  const { src, loading } = usePhotoFullPreview(file, true);
  const alt = file.name || "Photo preview";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-medium text-gray-800 truncate pr-4">{alt}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>
        <div className="bg-black flex items-center justify-center min-h-[240px] max-h-[80vh]">
          {loading || !src ? (
            <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          ) : (
            <img src={src} alt={alt} className="max-w-full max-h-[80vh] object-contain" decoding="async" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoPreviewModal;
