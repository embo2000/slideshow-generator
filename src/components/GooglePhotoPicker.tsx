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

  const handleInsufficientScope = async () => {
    // Request a fresh token with full scopes
    try {
      await googleAuthService.signIn();
    } catch (err) {
      console.error('Failed to refresh token:', err);
      alert('Failed to authorize Google Photos. Please try signing in again.');
      throw err;
    }
  };

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const albumsData = await googlePhotosService.getAlbums();
      setAlbums(albumsData);
    } catch (error: any) {
      if (error.message.includes('403')) {
        // Token might be missing scopes, refresh
        await handleInsufficientScope();
        return loadAlbums(); // Retry
      }
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
      const { photos: photosData, nextPageToken: token } =
        await googlePhotosService.getPhotosFromAlbum(album.id);
      setPhotos(photosData);
      setNextPageToken(token);
    } catch (error: any) {
      if (error.message.includes('403')) {
        await handleInsufficientScope();
        return loadPhotosFromAlbum(album);
      }
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
      const { photos: photosData, nextPageToken: token } =
        await googlePhotosService.getAllPhotos();
      setPhotos(photosData);
      setNextPageToken(token);
    } catch (error: any) {
      if (error.message.includes('403')) {
        await handleInsufficientScope();
        return loadAllPhotos();
      }
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
    } catch (error: any) {
      if (error.message.includes('403')) {
        await handleInsufficientScope();
        return loadMorePhotos();
      }
      console.error('Failed to load more photos:', error);
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
    if (selectedPhotos.size === 0) return;

    setIsDownloading(true);
    try {
      const selectedPhotoObjects = photos.filter(photo => selectedPhotos.has(photo.id));
      const downloadedFiles: File[] = [];

      for (const photo of selectedPhotoObjects) {
        try {
          const file = await googlePhotosService.downloadPhoto(photo);
          downloadedFiles.push(file);
        } catch (err) {
          console.error(`Failed to download photo ${photo.filename}:`, err);
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
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-4">
            Please sign in with your Google account to access Google Photos.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    // ...keep your existing UI rendering here (albums grid, photos grid, selection UI)
    <div>{/* Your current JSX stays unchanged */}</div>
  );
};

export default GooglePhotoPicker;
