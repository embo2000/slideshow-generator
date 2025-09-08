import React, { useState } from "react";
import GooglePhotoPicker from "../components/GooglePhotoPicker";
import { GooglePhotoPickerResult } from "../services/googlePhotos";

interface PhotosPageProps {
  accessToken: string;
}

const PhotosPage: React.FC<PhotosPageProps> = ({ accessToken }) => {
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhotoPickerResult[]>([]);

  const handleSelection = (photos: GooglePhotoPickerResult[]) => {
    setSelectedPhotos(photos);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4 font-bold">Select Photos from Google Photos</h1>

      {/* Google Photos Picker Button */}
      <GooglePhotoPicker
        accessToken={accessToken}
        maxPhotos={50}
        onSelection={handleSelection}
      />

      {/* Selected Photos Grid */}
      {selectedPhotos.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-4">
          {selectedPhotos.map((photo) => (
            <div key={photo.id} className="border rounded overflow-hidden">
              <img
                src={photo.url}
                alt={photo.name}
                className="w-full h-auto object-cover"
              />
              <div className="p-2 text-sm text-gray-700 text-center">{photo.name}</div>
            </div>
          ))}
        </div>
      )}

      {selectedPhotos.length === 0 && (
        <p className="mt-8 text-gray-500">No photos selected yet.</p>
      )}
    </div>
  );
};

export default PhotosPage;
