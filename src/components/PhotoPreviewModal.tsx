import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { usePhotoFullPreview } from "../hooks/usePhotoPreview";
import { downloadPhotoFile } from "../utils/photoPreviewCache";

export interface MoveToGroupOption {
  name: string;
  photoCount: number;
  isCurrent?: boolean;
}

interface PhotoPreviewModalProps {
  photos: File[];
  activeIndex: number;
  onNavigate?: (index: number) => void;
  onClose: () => void;
  onDelete?: () => void;
  moveGroups?: MoveToGroupOption[];
  onMoveToGroup?: (groupName: string) => boolean;
}

const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  photos,
  activeIndex,
  onNavigate,
  onClose,
  onDelete,
  moveGroups,
  onMoveToGroup,
}) => {
  const file = photos[activeIndex];
  const { src, loading } = usePhotoFullPreview(file, true);
  const alt = file?.name || "Photo preview";
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  const canNavigate = photos.length > 1 && onNavigate;
  const hasPrevious = canNavigate && activeIndex > 0;
  const hasNext = canNavigate && activeIndex < photos.length - 1;

  const availableTargets =
    moveGroups?.filter((group) => !group.isCurrent && group.photoCount < 5) ?? [];

  const goPrevious = () => {
    if (hasPrevious) onNavigate!(activeIndex - 1);
  };

  const goNext = () => {
    if (hasNext) onNavigate!(activeIndex + 1);
  };

  useEffect(() => {
    setDownloadError(null);
    setMoveError(null);
  }, [activeIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (!onNavigate || photos.length <= 1) return;
      if (event.key === "ArrowLeft" && activeIndex > 0) {
        event.preventDefault();
        onNavigate(activeIndex - 1);
      }
      if (event.key === "ArrowRight" && activeIndex < photos.length - 1) {
        event.preventDefault();
        onNavigate(activeIndex + 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, onClose, onNavigate, photos.length]);

  useEffect(() => {
    if (availableTargets.length === 0) {
      setSelectedGroup("");
      return;
    }
    if (!availableTargets.some((group) => group.name === selectedGroup)) {
      setSelectedGroup(availableTargets[0].name);
    }
  }, [availableTargets, selectedGroup]);

  const handleDownload = async () => {
    if (!file) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadPhotoFile(file);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const handleMove = () => {
    if (!onMoveToGroup || !selectedGroup) return;
    setMoveError(null);
    const moved = onMoveToGroup(selectedGroup);
    if (moved) {
      onClose();
      return;
    }
    setMoveError("Could not move photo to that group.");
  };

  if (!file) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{alt}</p>
            {canNavigate && (
              <p className="text-xs text-gray-500 mt-0.5">
                Photo {activeIndex + 1} of {photos.length}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || downloading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              title="Download photo"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading…" : "Download"}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                title="Remove photo from this group"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
        <div className="relative bg-black flex items-center justify-center min-h-[240px] max-h-[70vh] flex-1">
          {canNavigate && (
            <button
              type="button"
              onClick={goPrevious}
              disabled={!hasPrevious}
              className="absolute left-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous photo (←)"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {loading || !src ? (
            <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          ) : (
            <img src={src} alt={alt} className="max-w-full max-h-[70vh] object-contain" decoding="async" />
          )}
          {canNavigate && (
            <button
              type="button"
              onClick={goNext}
              disabled={!hasNext}
              className="absolute right-2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next photo (→)"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>
        {moveGroups && onMoveToGroup && (
          <div className="px-4 py-3 border-t bg-gray-50 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label htmlFor="move-to-group" className="text-sm font-medium text-gray-700 shrink-0">
                Move to group
              </label>
              <select
                id="move-to-group"
                value={selectedGroup}
                onChange={(event) => {
                  setSelectedGroup(event.target.value);
                  setMoveError(null);
                }}
                disabled={availableTargets.length === 0}
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                {availableTargets.length === 0 ? (
                  <option value="">No groups with open slots</option>
                ) : (
                  availableTargets.map((group) => (
                    <option key={group.name} value={group.name}>
                      {group.name} ({group.photoCount}/5)
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={handleMove}
                disabled={!selectedGroup}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Move
              </button>
            </div>
            {moveError && <p className="text-sm text-red-600">{moveError}</p>}
          </div>
        )}
        {downloadError && (
          <p className="px-4 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">{downloadError}</p>
        )}
      </div>
    </div>
  );
};

export default PhotoPreviewModal;
