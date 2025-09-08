import React, { useEffect, useState } from 'react';
import { X, Search, Image as ImageIcon, Folder, Check, Download } from 'lucide-react';
import { googlePhotosService, GooglePhoto, GooglePhotosAlbum } from '../services/googlePhotos';
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
  const [albums, setAlbums] = useState<GooglePhotosAlbum[]>([]);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [currentAlbum, setCurrentAlbum] = useState<GooglePhotosAlbum | null>(null);
  const [view, setView] = useState<'albums' | 'photos'>('albums');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const init = async () => {
      await googleAuthService.initialize();
      if (!googleAuthService.isSignedIn()) {
        await googleAuthService.signIn();
      }
      loadAlbums();
    };
    init();
  }, []);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const { albums } = await googlePhotosService.getAlbums();
      setAlbums(albums);
      setView('albums');
    } catch (err) {
      console.error(err);
      alert('Failed to load albums. Make sure you granted Photos access.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotosFromAlbum = async (album: GooglePhotosAlbum) => {
    setIsLoading(true);
    setCurrentAlbum(album);
    setView('photos');
    try {
      const { photos, nextPageToken } = await googlePhotosService.getPhotosFromAlbum(album.id);
      setPhotos(photos);
      setNextPageToken(nextPageToken);
    } catch (err) {
      console.error(err);
      alert('Failed to load photos from album.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllPhotos = async () => {
    setIsLoading(true);
    setCurrentAlbum(null);
    setView('photos');
    try {
      const { photos, nextPageToken } = await googlePhotosService.getAllPhotos();
      setPhotos(photos);
      setNextPageToken(nextPageToken);
    } catch (err) {
      console.error(err);
      alert('Failed to load photos.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePhotos = async () => {
    if (!nextPageToken) return;

    setIsLoading(true);
    try {
      const { photos: more, nextPageToken: token } = currentAlbum
        ? await googlePhotosService.getPhotosFromAlbum(currentAlbum.id, 50, nextPageToken)
        : await googlePhotosService.getAllPhotos(50, nextPageToken);

      setPhotos(prev => [...prev, ...more]);
      setNextPageToken(token);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) newSelected.delete(photoId);
    else if (newSelected.size < maxPhotos) newSelected.add(photoId);
    setSelectedPhotos(newSelected);
  };

  const handleConfirmSelection = async () => {
    if (!selectedPhotos.size) return;
    setIsDownloading(true);
    try {
      const selected = photos.filter(p => selectedPhotos.has(p.id));
      const files: File[] = [];
      for (const photo of selected) {
        try {
          const file = await googlePhotosService.downloadPhoto(photo);
          files.push(file);
        } catch (err) {
          console.error(err);
        }
      }
      if (files.length) onPhotosSelected(files);
      onClose();
    } finally {
      setIsDownloading(false);
    }
  };

  const goBack = () => {
    setView('albums');
    setPhotos([]);
    setCurrentAlbum(null);
    setSelectedPhotos(new Set());
    setNextPageToken(undefined);
  };

  if (!googleAuthService.isSignedIn()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-4">Please sign in with Google to access Photos.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  // --- Render Albums / Photos ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Select from Google Photos</h2>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'albums' ? 'Choose an album or browse all photos' : `${selectedPhotos.size} / ${maxPhotos} selected`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {view === 'albums' && (
          <div className="flex-1 overflow-y-auto p-6">
            <button
              onClick={loadAllPhotos}
              className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 mb-6 text-center"
            >
              <ImageIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              Browse All Photos
            </button>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                Loading albums...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.map(album => (
                  <div key={album.id} onClick={() => loadPhotosFromAlbum(album)} className="cursor-pointer group">
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2 group-hover:shadow-md transition-shadow">
                      {album.coverPhotoBaseUrl ? (
                        <img src={`${album.coverPhotoBaseUrl}=w300-h300-c`} alt={album.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <Folder className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">{album.title}</h3>
                    <p className="text-sm text-gray-500">{album.mediaItemsCount} photos</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'photos' && (
          <>
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <button onClick={goBack} className="text-blue-600 hover:text-blue-700 font-medium">← Back to Albums</button>
                <div className="text-sm text-gray-600">{selectedPhotos.size} of {maxPhotos} selected</div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading && photos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  Loading photos...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {photos
                      .filter(photo => !searchQuery || photo.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(photo => (
                        <div
                          key={photo.id}
                          onClick={() => togglePhotoSelection(photo.id)}
                          className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            selectedPhotos.has(photo.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img src={`${photo.baseUrl}=w300-h300-c`} alt={photo.filename} className="w-full h-full object-cover" />
                          {selectedPhotos.has(photo.id) && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          {selectedPhotos.size >= maxPhotos && !selectedPhotos.has(photo.id) && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-medium">Max reached</div>
                          )}
                        </div>
                      ))}
                  </div>

                  {nextPageToken && (
                    <div className="text-center mt-6">
                      <button onClick={loadMorePhotos} disabled={isLoading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg">
                        {isLoading ? 'Loading...' : 'Load More Photos'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedPhotos.size > 0 && (
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedPhotos.size} photo{selectedPhotos.size > 1 ? 's' : ''} selected</span>
                <button onClick={handleConfirmSelection} disabled={isDownloading} className="inline-flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg">
                  {isDownloading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" /> Add Selected Photos
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GooglePhotoPicker;
