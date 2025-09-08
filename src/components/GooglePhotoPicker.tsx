import React, { useState } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import { googlePhotosPickerService } from '../services/googlePhotos';
import { googleAuthService } from '../services/googleAuth';

interface GooglePhotoPickerProps {
  onPhotosSelected: (photos: File[]) => void;
  onClose: () => void;
  maxPhotos: number;
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({
  onPhotosSelected,
  onClose,
  maxPhotos
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenPicker = async () => {
    if (!googleAuthService.isSignedIn()) {
      setError('Please sign in with Google first');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const selectedPhotos = await googlePhotosPickerService.openPhotoPicker();
      
      if (selectedPhotos.length > 0) {
        // Limit to maxPhotos
        const photosToAdd = selectedPhotos.slice(0, maxPhotos);
        onPhotosSelected(photosToAdd);
        
        if (selectedPhotos.length > maxPhotos) {
          alert(`Selected ${selectedPhotos.length} photos, but only ${maxPhotos} were added due to the limit.`);
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Failed to select photos:', error);
      setError(error instanceof Error ? error.message : 'Failed to select photos from Google Photos');
    } finally {
      setIsLoading(false);
    }
  };

  if (!googleAuthService.isSignedIn()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Sign In Required</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Select from Google Photos</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="text-center">
          <Camera className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Choose Photos from Google Photos
          </h3>
          <p className="text-gray-600 mb-6">
            Select up to {maxPhotos} photo{maxPhotos !== 1 ? 's' : ''} from your Google Photos library.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleOpenPicker}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Opening Picker...
              </>
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2" />
                Open Google Photos Picker
              </>
            )}
          </button>

          <p className="text-sm text-gray-500 mt-4">
            This will open Google's photo picker where you can browse and select your photos.
          </p>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700">
              <strong>Note:</strong> Make sure you've enabled the Google Picker API in your Google Cloud Console and added your domain to authorized origins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GooglePhotoPicker;