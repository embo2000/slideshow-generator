import React, { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Folder, Check, Download } from 'lucide-react';
import { googlePhotosService, GooglePhoto, GooglePhotosAlbum } from '../services/googlePhotos';
import { googleAuthService } from '../services/googleAuth';

interface GooglePhotoPickerProps {
  onPhotosSelected: (photos: File[]) => void;
  onClose: () => void;
  maxPhotos?: number;
}

const GooglePhotoPicker: React.FC<GooglePhotoPickerProps> = ({ onPhotosSelected, onClose, maxPhotos = 5 }) => {
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
    if (googleAuthService.isSignedIn()) loadAlbums();
  }, []);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const data = await googlePhotosService.getAlbums();
      setAlbums(data);
    } catch (error) {
      console.error(error);
      alert('Failed to load albums.');
    } finally { setIsLoading(false); }
  };

  const loadPhotosFromAlbum = async (album: GooglePhotosAlbum) => {
    setIsLoading(true);
    setCurrentAlbum(album);
    setView('photos');
    try {
      const { photos, nextPageToken } = await googlePhotosService.getPhotosFromAlbum(album.id);
      setPhotos(photos);
      setNextPageToken(nextPageToken);
    } catch (error) {
      console.error(error);
      alert('Failed to load photos from album.');
    } finally { setIsLoading(false); }
  };

  const loadAllPhotos = async () => {
    setIsLoading(true);
    setCurrentAlbum(null);
    setView('photos');
    try {
      const { photos, nextPageToken } = await googlePhotosService.getAllPhotos();
      setPhotos(photos);
      setNextPageToken(nextPageToken);
    } catch (error) {
      console.error(error);
      alert('Failed to load all photos.');
    } finally { setIsLoading(false); }
  };

  const loadMorePhotos = async () => {
    if (!nextPageToken) return;
    setIsLoading(true);
    try {
      const result = currentAlbum
        ? await googlePhotosService.getPhotosFromAlbum(currentAlbum.id, nextPageToken)
        : await googlePhotosService.getAllPhotos(nextPageToken);
      setPhotos(prev => [...prev, ...result.photos]);
      setNextPageToken(result.nextPageToken);
    } catch (error) {
      console.error(error);
    } finally { setIsLoading(false); }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSet = new Set(selectedPhotos);
    if (newSet.has(photoId)) newSet.delete(photoId);
    else if (newSet.size < maxPhotos) newSet.add(photoId);
    setSelectedPhotos(newSet);
  };

  const handleConfirmSelection = async () => {
    if (!selectedPhotos.size) return;
    setIsDownloading(true);
    try {
      const files: File[] = [];
      for (const photo of photos.filter(p => selectedPhotos.has(p.id))) {
        try { files.push(await googlePhotosService.downloadPhoto(photo)); }
        catch (err) { console.error(err); }
      }
      if (files.length) { onPhotosSelected(files); onClose(); }
      else alert('No photos downloaded.');
    } finally { setIsDownloading(false); }
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
          <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400"/>
          <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-gray-600 mb-4">Please sign in with Google to access Photos.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">Select from Google Photos</h2>
            <p className="text-sm text-gray-500 mt-1">
              {view === 'albums' ? 'Choose an album or browse all photos' :
                currentAlbum ? `${currentAlbum.title} - ${selectedPhotos.size}/${maxPhotos} selected` :
                `All Photos - ${selectedPhotos.size}/${maxPhotos} selected`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500"/></button>
        </div>

        {view === 'albums' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <button onClick={loadAllPhotos} className="w-full p-4 border-2 border-dashed border-blue-300 rounded-lg mb-6 hover:border-blue-400 hover:bg-blue-50">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 text-blue-500"/>
              <span className="text-blue-700 font-medium">Browse All Photos</span>
            </button>
            {isLoading ? (
              <div className="text-center py-8">Loading albums...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {albums.map(album => (
                  <div key={album.id} onClick={() => loadPhotosFromAlbum(album)} className="cursor-pointer group">
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2 group-hover:shadow-md">
                      {album.coverPhotoBaseUrl ? (
                        <img src={`${album.coverPhotoBaseUrl}=w300-h300-c`} alt={album.title} className="w-full h-full object-cover"/>
                      ) : <Folder className="h-12 w-12 text-gray-400 m-auto"/>}
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">{album.title}</h3>
                    <p className="text-sm text-gray-500">{album.mediaItemsCount} photos</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between mb-4">
              <button onClick={goBack} className="text-blue-600 hover:text-blue-700 font-medium">← Back to Albums</button>
              <div>{selectedPhotos.size} / {maxPhotos} selected</div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {photos.filter(photo => photo.filename.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery).map(photo => (
                  <div key={photo.id} onClick={() => togglePhotoSelection(photo.id)} className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 ${selectedPhotos.has(photo.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}>
                    <img src={`${photo.baseUrl}=w300-h300-c`} alt={photo.filename} className="w-full h-full object-cover"/>
                    {selectedPhotos.has(photo.id) && <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1"><Check className="h-3 w-3"/></div>}
                    {selectedPhotos.size >= maxPhotos && !selectedPhotos.has(photo.id) && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-medium">Max reached</div>}
                  </div>
                ))}
              </div>
              {nextPageToken && <button onClick={loadMorePhotos} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg">{isLoading ? 'Loading...' : 'Load More Photos'}</button>}
            </div>

            {selectedPhotos.size > 0 && (
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <span>{selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected</span>
                <button onClick={handleConfirmSelection} disabled={isDownloading} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
                  {isDownloading ? 'Downloading...' : <><Download className="h-4 w-4 mr-2 inline"/>Add Selected Photos</>}
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
