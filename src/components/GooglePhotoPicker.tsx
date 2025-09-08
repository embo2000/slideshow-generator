import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Download } from 'lucide-react';
import { googlePhotosService, GooglePhotoPickerResult } from '../services/googlePhotos';
import { googleAuthService } from '../services/googleAuth';

interface GooglePhotoPickerProps {
  onPhotosSelected: (photos: GooglePhotoPickerResult[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({
  onPhotosSelected,
  onClose,
  maxPhotos = 5,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState<GooglePhotoPickerResult[]>([]);
  const [isPicking, setIsPicking] = useState(false);

  useEffect(() => {
    // Load Google Picker API script
    googlePhotosService.loadPickerScript().catch(console.error);
  }, []);

  const handleOpenPicker = async () => {
    const token = googleAuthService.getAccessToken();
    if (!token) {
      alert('Please sign in with Google first.');
      return;
    }

    setIsPicking(true);
    try {
      const picked = await googlePhotosService.openPicker(token, maxPhotos);
      setPhotos(picked);
      setSelectedPhotos(new Set(picked.map(p => p.id)));
    } catch (err) {
      console.error('Failed to open Google Photos Picker:', err);
      alert('Failed to open Google Photos Picker. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else if (newSelected.size < maxPhotos) {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleConfirmSelection = () => {
    const selected = photos.filter(p => selectedPhotos.has(p.id));
    if (selected.length === 0) {
      alert('Please select at least one photo.');
      return;
    }
    onPhotosSelected(selected);
    onClose();
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
          <h2 className="text-xl font-bold text-gray-900">Select from Google Photos</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <button
            onClick={handleOpenPicker}
            disabled={isPicking}
            className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center mb-6"
          >
            <ImageIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <span className="text-blue-700 font-medium">
              {isPicking ? 'Opening Picker...' : 'Browse Google Photos'}
            </span>
          </button>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  onClick={() => togglePhotoSelection(photo.id)}
                  className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedPhotos.has(photo.id)
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  {selectedPhotos.has(photo.id) && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  {selectedPhotos.size >= maxPhotos && !selectedPhotos.has(photo.id) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Max reached</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleConfirmSelection}
              className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Add Selected Photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
