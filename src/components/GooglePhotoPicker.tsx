import React from "react";
import { googlePhotosService, GooglePhotoPickerResult } from "../services/googlePhotos";

interface GooglePhotoPickerProps {
  accessToken: string;
  maxPhotos?: number;
  onPick: (photos: GooglePhotoPickerResult[]) => void;
}

const GooglePhotoPicker = ({ accessToken, maxPhotos = 50, onPick }: GooglePhotoPickerProps) => {
  const handleOpenPicker = async () => {
    try {
      const photos = await googlePhotosService.openPicker(accessToken, maxPhotos);
      onPick(photos);
    } catch (err) {
      console.error("Failed to open Google Photos Picker:", err);
    }
  };

  return (
    <button
      onClick={handleOpenPicker}
      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
    >
      Pick from Google Photos
    </button>
  );
};

export default GooglePhotoPicker;
