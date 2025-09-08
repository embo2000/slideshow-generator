import React, { useState } from 'react';
import { googlePhotosService, GooglePhotoPickerResult } from '../services/googlePhotos';

const GooglePhotoPicker: React.FC = () => {
  const [photos, setPhotos] = useState<GooglePhotoPickerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleOpenPicker = async () => {
    setLoading(true);
    try {
      // You need a valid access token here
      const accessToken = await getAccessTokenSomehow();
      const selectedPhotos = await googlePhotosService.openPicker(accessToken, 50);
      setPhotos(selectedPhotos);
    } catch (err) {
      console.error('Failed to open Google Photos Picker:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleOpenPicker} disabled={loading}>
        {loading ? 'Loading...' : 'Pick Photos from Google'}
      </button>

      <div className="photo-grid">
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.name}
            style={{ width: 100, height: 100, objectFit: 'cover', margin: 4 }}
          />
        ))}
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
