import React, { useState, useEffect } from 'react';
import { googleAuthService } from '../services/googleAuth';
import { googlePhotosService, GooglePhoto, GooglePhotosAlbum } from '../services/googlePhotos';
import { X, Image as ImageIcon, Folder, Check, Download } from 'lucide-react';

interface Props {
  onPhotosSelected: (photos: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

const GooglePhotoPicker: React.FC<Props> = ({ onPhotosSelected, onClose, maxPhotos = 5 }) => {
  const [albums, setAlbums] = useState<GooglePhotosAlbum[]>([]);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [currentAlbum, setCurrentAlbum] = useState<GooglePhotosAlbum | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (googleAuthService.isSignedIn()) loadAlbums();
  }, []);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const data = await googlePhotosService.getAlbums();
      setAlbums(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load albums. Make sure Photos API is enabled and account is authorized.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotos = async (album: GooglePhotosAlbum) => {
    setIsLoading(true);
    setCurrentAlbum(album);
    try {
      const { photos } = await googlePhotosService.getPhotosFromAlbum(album.id);
      setPhotos(photos);
    } catch (err) {
      console.error(err);
      alert('Failed to load photos.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhoto = (id: string) => {
    const copy = new Set(selectedPhotos);
    if (copy.has(id)) copy.delete(id);
    else if (copy.size < maxPhotos) copy.add(id);
    setSelectedPhotos(copy);
  };

  const confirmSelection = async () => {
    const selected = photos.filter(p => selectedPhotos.has(p.id));
    const files: File[] = [];
    for (const photo of selected) {
      try {
        const file = await googlePhotosService.downloadPhoto(photo);
        files.push(file);
      } catch {}
    }
    if (files.length) onPhotosSelected(files);
    onClose();
  };

  if (!googleAuthService.isSignedIn())
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-xl w-full max-w-md text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="mb-4">Please sign in with Google to access Photos.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Select Photos</h2>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {currentAlbum ? (
            <>
              <button onClick={() => setCurrentAlbum(null)} className="text-blue-600 mb-4">
                ← Back to Albums
              </button>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    onClick={() => togglePhoto(photo.id)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 ${
                      selectedPhotos.has(photo.id) ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={`${photo.baseUrl}=w200-h200-c`}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                    />
                    {selectedPhotos.has(photo.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {albums.map(album => (
                <div
                  key={album.id}
                  onClick={() => loadPhotos(album)}
                  className="cursor-pointer"
                >
                  <div className="aspect-square bg-gray-200 mb-2">
                    {album.coverPhotoBaseUrl && (
                      <img
                        src={`${album.coverPhotoBaseUrl}=w200-h200-c`}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <h3 className="font-medium">{album.title}</h3>
                  <p className="text-sm text-gray-500">{album.mediaItemsCount} photos</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedPhotos.size > 0 && (
          <div className="p-4 border-t flex justify-between items-center">
            <span>{selectedPhotos.size} selected</span>
            <button
              onClick={confirmSelection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              <Download className="h-4 w-4 inline-block mr-2" />
              Add Photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
