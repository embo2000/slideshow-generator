import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Download, Check } from 'lucide-react';
import { googlePhotosService, GooglePhoto } from '../services/googlePhotos';

interface GooglePhotoPickerProps {
  onPhotosSelected: (photos: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({
  onPhotosSelected,
  onClose,
  maxPhotos = 5
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhoto[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const openPicker = async () => {
    setIsLoading(true);
    try {
      // Initialize the API (make sure your developer key & client ID are correct)
      await googlePhotosService.init(
        process.env.NEXT_PUBLIC_GOOGLE_DEV_KEY!,
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!
      );

      const photos: GooglePhoto[] = await googlePhotosService.openPicker(
        process.env.NEXT_PUBLIC_GOOGLE_DEV_KEY!,
        maxPhotos
      );

      setSelectedPhotos(photos);
    } catch (err) {
      console.error('Failed to open Google Photos Picker:', err);
      alert('Failed to open Google Photos Picker. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedPhotos.length === 0) return;

    setIsDownloading(true);
    try {
      const downloadedFiles: File[] = [];
      for (const photo of selectedPhotos) {
        try {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          const file = new File([blob], photo.filename || 'photo.jpg', { type: blob.type });
          downloadedFiles.push(file);
        } catch (error) {
          console.error(`Failed to download photo ${photo.filename}:`, error);
        }
      }

      if (downloadedFiles.length > 0) {
        onPhotosSelected(downloadedFiles);
        onClose();
      } else {
        alert('Failed to download any photos. Please try again.');
      }
    } catch (err) {
      console.error('Error downloading photos:', err);
      alert('Failed to download photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    openPicker();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Select from Google Photos</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedPhotos.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No photos selected
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {selectedPhotos.map((photo) => (
                <div key={photo.url} className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-500">
                  <img src={photo.url} alt={photo.filename} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedPhotos.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleConfirmSelection}
              disabled={isDownloading}
              className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Add Selected Photos
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
