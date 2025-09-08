import React, { useState } from 'react';
import { X, Check, Download, Image as ImageIcon } from 'lucide-react';
import { googlePhotosService, GooglePhotoPickerResult } from '../services/googlePhotos';
import { googleAuthService } from '../services/googleAuth';

interface GooglePhotoPickerProps {
  onPhotosSelected: (photos: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({
  onPhotosSelected,
  onClose,
  maxPhotos = 5,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhotoPickerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenPicker = async () => {
    if (!googleAuthService.isSignedIn()) return;

    setIsLoading(true);
    try {
      const token = googleAuthService.getAccessToken();
      if (!token) throw new Error('No access token available');

      const photos: GooglePhotoPickerResult[] = await googlePhotosService.openPicker(token, maxPhotos);

      setSelectedPhotos(photos);
    } catch (err) {
      console.error('Failed to open picker:', err);
      alert('Failed to open Google Photos Picker. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedPhotos.length === 0) return;

    setIsLoading(true);
    try {
      const files: File[] = await Promise.all(
        selectedPhotos.map(async (photo) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          return new File([blob], photo.name, { type: photo.mimeType });
        })
      );

      onPhotosSelected(files);
      onClose();
    } catch (err) {
      console.error('Failed to download photos:', err);
      alert('Failed to download photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhotoSelection = (photo: GooglePhotoPickerResult) => {
    const exists = selectedPhotos.find((p) => p.id === photo.id);
    if (exists) {
      setSelectedPhotos(selectedPhotos.filter((p) => p.id !== photo.id));
    } else if (selectedPhotos.length < maxPhotos) {
      setSelectedPhotos([...selectedPhotos, photo]);
    }
  };

  if (!googleAuthService.isSignedIn()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-4">
            Please sign in with your Google account to access Google Photos.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Select Photos from Google</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center flex-1 overflow-y-auto w-full">
          <button
            onClick={handleOpenPicker}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mb-6"
          >
            {isLoading ? 'Loading...' : 'Open Google Photos Picker'}
          </button>

          {selectedPhotos.length > 0 && (
            <>
              <div className="text-sm text-gray-600 mb-2">
                {selectedPhotos.length}/{maxPhotos} selected
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
                {selectedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedPhotos.find((p) => p.id === photo.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => togglePhotoSelection(photo)}
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    {selectedPhotos.find((p) => p.id === photo.id) && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    {selectedPhotos.length >= maxPhotos &&
                      !selectedPhotos.find((p) => p.id === photo.id) && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">Max reached</span>
                        </div>
                      )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirmSelection}
                disabled={isLoading}
                className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <Download className="h-4 w-4 inline-block mr-2" />
                Add Selected Photos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
