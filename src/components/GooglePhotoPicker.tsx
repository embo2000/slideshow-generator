import React, { useState } from 'react';
import { googlePhotosService, GooglePhotoPickerResult } from '../services/googlePhotos';

export const GooglePhotoPicker: React.FC<{ onSelect: (items: GooglePhotoPickerResult[]) => void }> = ({ onSelect }) => {
  const [loading, setLoading] = useState(false);

  const handleOpenPicker = async () => {
    setLoading(true);
    try {
      // Step 1: Get session URL from server
      const sessionUrl = await googlePhotosService.getSessionUrl();

      // Step 2: Open the session URL in a new tab
      window.open(sessionUrl, '_blank');

      // Step 3: Poll server until user selects photos
      const poll = async () => {
        const items = await googlePhotosService.pollSelectedMedia();
        if (items.length > 0) {
          onSelect(items);
          setLoading(false);
        } else {
          setTimeout(poll, 3000); // poll every 3 seconds
        }
      };
      poll();
    } catch (err) {
      console.error('Failed to open Google Photos Picker:', err);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleOpenPicker}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {loading ? 'Loading...' : 'Pick Photos from Google Photos'}
      </button>
    </div>
  );
};
