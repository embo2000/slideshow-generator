import React, { useState } from "react";
import { googlePhotosService, GooglePhotoPickerResult } from "../services/googlePhotos";

interface GooglePhotoPickerProps {
  accessToken: string;
  maxPhotos?: number;
  onSelection?: (photos: GooglePhotoPickerResult[]) => void;
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({
  accessToken,
  maxPhotos = 50,
  onSelection,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPicker = async () => {
    setError(null);
    setLoading(true);
    try {
      const selectedPhotos = await googlePhotosService.openPicker(accessToken, maxPhotos);
      setLoading(false);
      if (onSelection) {
        onSelection(selectedPhotos);
      }
    } catch (err: any) {
      console.error("Failed to open Google Photos Picker:", err);
      setError(err.message || "Unknown error");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleOpenPicker}
        disabled={loading}
        className="px-4 py-2 border rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Open Google Photos Picker"}
      </button>
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  );
};

export default GooglePhotoPicker;
