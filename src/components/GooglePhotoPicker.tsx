import React, { useState, useEffect } from 'react';
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
  maxPhotos = 5
}) => {
  const [albums, setAlbums] = useState<GooglePhotosAlbum[]>([]);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [currentAlbum, setCurrentAlbum] = useState<GooglePhotosAlbum | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'albums' | 'photos'>('albums');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  useEffect(() => {
    if (googleAuthService.isSignedIn()) {
      loadAlbums();
    }
  }, []);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const albumsData = await googlePhotosService.getAlbums();
      setAlbums(albumsData);
    } catch (error) {
      console.error('Failed to load albums:', error);
      alert('Failed to load Google Photos albums. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotosFromAlbum = async (album: GooglePhotosAlbum) => {
    setIsLoading(true);
    setCurrentAlbum(album);
    setView('photos');
    try {
      const { photos: photosData, nextPageToken: token } = await googlePhotosService.getPhotosFromAlbum(album.id);
      setPhotos(photosData);
      setNextPageToken(token);
    } catch (error) {
      console.error('Failed to load photos:', error);
      alert('Failed to load photos from album. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllPhotos = async () => {
    setIsLoading(true);
    setCurrentAlbum(null);
    setView('photos');
    try {
      const { photos: photosData, nextPageToken: token } = await googlePhotosService.getAllPhotos();
      setPhotos(photosData);
      setNextPageToken(token);
    } catch (error) {
      console.error('Failed to load photos:', error);
      alert('Failed to load photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePhotos = async () => {
    if (!nextPageToken) return;
    
    setIsLoading(true);
    try {
      const { photos: morePhotos, nextPageToken: token } = currentAlbum
        ? await googlePhotosService.getPhotosFromAlbum(currentAlbum.id, nextPageToken)
        : await googlePhotosService.getAllPhotos(nextPageToken);
      
      setPhotos(prev => [...prev, ...morePhotos]);
      setNextPageToken(token);
    } catch (error) {
      console.error('Failed to load more photos:', error);
    } finally {
      setIsLoading(false);
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

  const handleConfirmSelection = async () => {
    if (selectedPhotos.size === 0) return;
    
    setIsDownloading(true);
    try {
      const selectedPhotoObjects = photos.filter(photo => selectedPhotos.has(photo.id));
      const downloadedFiles: File[] = [];
      
      for (const photo of selectedPhotoObjects) {
        try {
          const file = await googlePhotosService.downloadPhoto(photo);
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
    } catch (error) {
      console.error('Failed to download photos:', error);
      alert('Failed to download photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const goBackToAlbums = () => {
    setView('albums');
    setPhotos([]);
    setCurrentAlbum(null);
    setSelectedPhotos(new Set());
    setNextPageToken(undefined);
  };

  if (!googleAuthService.isSignedIn()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select from Google Photos</h2>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'albums' ? 'Choose an album or browse all photos' : 
               currentAlbum ? `${currentAlbum.title} - ${selectedPhotos.size}/${maxPhotos} selected` :
               `All Photos - ${selectedPhotos.size}/${maxPhotos} selected`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {view === 'albums' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <button
                onClick={loadAllPhotos}
                className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
              >
                <ImageIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <span className="text-blue-700 font-medium">Browse All Photos</span>
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading albums...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.map((album) => (
                  <div
                    key={album.id}
                    onClick={() => loadPhotosFromAlbum(album)}
                    className="cursor-pointer group"
                  >
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2 group-hover:shadow-md transition-shadow">
                      {album.coverPhotoBaseUrl ? (
                        <img
                          src={`${album.coverPhotoBaseUrl}=w300-h300-c`}
                          alt={album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
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
                <button
                  onClick={goBackToAlbums}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← Back to Albums
                </button>
                <div className="text-sm text-gray-600">
                  {selectedPhotos.size} of {maxPhotos} photos selected
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {isLoading && photos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading photos...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {photos
                      .filter(photo => 
                        photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        !searchQuery
                      )
                      .map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => togglePhotoSelection(photo.id)}
                          className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                            selectedPhotos.has(photo.id)
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={`${photo.baseUrl}=w300-h300-c`}
                            alt={photo.filename}
                            className="w-full h-full object-cover"
                          />
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

                  {nextPageToken && (
                    <div className="text-center mt-6">
                      <button
                        onClick={loadMorePhotos}
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                      >
                        {isLoading ? 'Loading...' : 'Load More Photos'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {view === 'photos' && selectedPhotos.size > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
              </span>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default GooglePhotoPicker;