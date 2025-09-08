import React, { useState } from 'react';
import { X, Download, Image as ImageIcon } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenPicker = async () => {
    if (!googleAuthService.isSignedIn()) return;

    setIsLoading(true);
    try {
      const token = googleAuthService.getAccessToken();
      if (!token) throw new Error('No access token available');

      const selectedPhotos: GooglePhotoPickerResult[] = await googlePhotosService.openPicker(token, maxPhotos);

      // Download selected photos as File objects
      const files: File[] = await Promise.all(
        selectedPhotos.map(async (photo) => {
          const response = await fetch(photo.url);
          const blob = await response.blob();
          return new File([blob], photo.name, { type: photo.mimeType });
        })
      );

      if (files.length > 0) {
        onPhotosSelected(files);
        onClose();
      }
    } catch (err) {
      console.error('Failed to select photos:', err);
      alert('Failed to select photos. Please try again.');
    } finally {
      setIsLoading(false);
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Select Photos from Google</h2>
        <button
          onClick={handleOpenPicker}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {isLoading ? 'Loading...' : 'Open Google Photos Picker'}
        </button>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
