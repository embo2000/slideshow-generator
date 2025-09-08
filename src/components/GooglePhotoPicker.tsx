import React, { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Folder, Check, Download, ArrowLeft } from 'lucide-react';
import { googlePhotosService, GooglePhoto, GoogleAlbum } from '../services/googlePhotos';
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
  const [albums, setAlbums] = useState<GoogleAlbum[]>([]);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<GooglePhoto[]>([]);
  const [currentAlbum, setCurrentAlbum] = useState<GoogleAlbum | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [view, setView] = useState<'albums' | 'photos'>('albums');

  useEffect(() => {
    if (googleAuthService.isSignedIn()) {
      loadAlbums();
    }
  }, []);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const albumList = await googlePhotosService.getAlbums();
      setAlbums(albumList);
    } catch (error) {
      console.error('Failed to load albums:', error);
      alert('Failed to load Google Photos albums. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotos = async (albumId?: string, pageToken?: string) => {
    setIsLoading(true);
    try {
      const result = await googlePhotosService.getPhotos(albumId, pageToken);
      if (pageToken) {
        setPhotos(prev => [...prev, ...result.photos]);
      } else {
        setPhotos(result.photos);
      }
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error('Failed to load photos:', error);
      alert('Failed to load photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlbumSelect = (album: GoogleAlbum | null) => {
    setCurrentAlbum(album);
    setPhotos([]);
    setNextPageToken(undefined);
    setView('photos');
    loadPhotos(album?.id);
  };

  const handlePhotoToggle = (photo: GooglePhoto) => {
    setSelectedPhotos(prev => {
      const isSelected = prev.some(p => p.id === photo.id);
      if (isSelected) {
        return prev.filter(p => p.id !== photo.id);
      } else if (prev.length < maxPhotos) {
        return [...prev, photo];
      }
      return prev;
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const searchResults = await googlePhotosService.searchPhotos(searchQuery);
      setPhotos(searchResults);
      setCurrentAlbum(null);
      setView('photos');
    } catch (error) {
      console.error('Failed to search photos:', error);
      alert('Failed to search photos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSelected = async () => {
    if (selectedPhotos.length === 0) return;

    setIsDownloading(true);
    try {
      const files = await Promise.all(
        selectedPhotos.map(photo => googlePhotosService.downloadPhoto(photo))
      );
      onPhotosSelected(files);
      onClose();
    } catch (error) {
      console.error('Failed to download photos:', error);
      alert('Failed to download selected photos. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const loadMorePhotos = () => {
    if (nextPageToken) {
      loadPhotos(currentAlbum?.id, nextPageToken);
    }
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
          <div className="flex items-center space-x-3">
            {view === 'photos' && (
              <button
                onClick={() => setView('albums')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {view === 'albums' ? 'Select from Google Photos' : (currentAlbum?.title || 'All Photos')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedPhotos.length}/{maxPhotos} photos selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {view === 'albums' && (
          <div className="p-6">
            <div className="flex space-x-2 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                Search
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                onClick={() => handleAlbumSelect(null)}
                className="aspect-square bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg cursor-pointer hover:shadow-lg transition-shadow flex flex-col items-center justify-center text-white p-4"
              >
                <ImageIcon className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium text-center">All Photos</span>
              </div>
              
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => handleAlbumSelect(album)}
                  className="aspect-square bg-gray-200 rounded-lg cursor-pointer hover:shadow-lg transition-shadow overflow-hidden relative group"
                >
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
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-white text-sm font-medium truncate">{album.title}</h3>
                    <p className="text-white text-xs opacity-80">{album.mediaItemsCount} photos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'photos' && (
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && photos.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotos.some(p => p.id === photo.id);
                    return (
                      <div
                        key={photo.id}
                        onClick={() => handlePhotoToggle(photo)}
                        className={`aspect-square rounded-lg cursor-pointer overflow-hidden relative group ${
                          isSelected ? 'ring-4 ring-blue-500' : 'hover:ring-2 hover:ring-gray-300'
                        }`}
                      >
                        <img
                          src={googlePhotosService.getThumbnailUrl(photo, 200)}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                            <div className="bg-blue-500 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {nextPageToken && (
                  <div className="text-center">
                    <button
                      onClick={loadMorePhotos}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === 'photos' && selectedPhotos.length > 0 && (
          <div className="border-t p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleAddSelected}
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