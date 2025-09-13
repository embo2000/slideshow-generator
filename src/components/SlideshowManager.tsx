import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2, Download, Calendar, Clock } from 'lucide-react';
import { googleDriveService, DriveFile } from '../services/googleDrive';
import { googleAuthService } from '../services/googleAuth';
import { ClassData, MusicTrack, BackgroundImage, TransitionType } from '../types';

interface SlideshowManagerProps {
  currentSlideshow: {
    classData: ClassData;
    selectedMusic: MusicTrack | null;
    backgroundImage: BackgroundImage | null;
    selectedTransition: TransitionType;
    classes: string[];
    slideDuration: number;
    slideshowName: string;
  };
  onLoadSlideshow: (data: {
    classData: ClassData;
    selectedMusic: MusicTrack | null;
    backgroundImage: BackgroundImage | null;
    selectedTransition: TransitionType;
    classes: string[];
    slideDuration: number;
    slideshowName: string;
  }) => void;
  onClose: () => void;
}

const SlideshowManager: React.FC<SlideshowManagerProps> = ({
  currentSlideshow,
  onLoadSlideshow,
  onClose
}) => {
  const [savedSlideshows, setSavedSlideshows] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slideshowName, setSlideshowName] = useState('');
  const [activeTab, setActiveTab] = useState<'save' | 'load'>('save');

  useEffect(() => {
    if (googleAuthService.isSignedIn()) {
      loadSlideshows();
    }
  }, []);

  useEffect(() => {
    // Reload slideshows when switching to load tab
    if (activeTab === 'load' && googleAuthService.isSignedIn()) {
      loadSlideshows();
    }
  }, [activeTab]);

  const loadSlideshows = async () => {
    setIsLoading(true);
    try {
      const slideshows = await googleDriveService.listSlideshows();
      setSavedSlideshows(slideshows);
    } catch (error) {
      console.error('Failed to load slideshows:', error);
      alert('Failed to load saved slideshows');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!slideshowName.trim()) {
      alert('Please enter a name for your slideshow');
      return;
    }

    setIsSaving(true);
    try {
      await googleDriveService.saveSlideshow(
        slideshowName,
        currentSlideshow.classData,
        currentSlideshow.selectedMusic,
        currentSlideshow.backgroundImage,
        currentSlideshow.selectedTransition,
        currentSlideshow.classes,
        currentSlideshow.slideDuration,
        currentSlideshow.slideshowName
      );
      
      alert('Slideshow saved successfully!');
      setSlideshowName('');
      await loadSlideshows();
      // Add a small delay before switching tabs to ensure the file appears
      setTimeout(() => {
        setActiveTab('load');
      }, 500);
    } catch (error) {
      console.error('Failed to save slideshow:', error);
      alert('Failed to save slideshow. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (fileId: string) => {
    setIsLoading(true);
    try {
      const slideshowData = await googleDriveService.loadSlideshow(fileId);
      onLoadSlideshow(slideshowData);
      onClose();
    } catch (error) {
      console.error('Failed to load slideshow:', error);
      alert('Failed to load slideshow. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (fileId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await googleDriveService.deleteSlideshow(fileId);
      await loadSlideshows();
    } catch (error) {
      console.error('Failed to delete slideshow:', error);
      alert('Failed to delete slideshow. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalPhotos = () => {
    return Object.values(currentSlideshow.classData).reduce((total, photos) => total + photos.length, 0);
  };

  if (!googleAuthService.isSignedIn()) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="text-center">
            <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-4">
              Please sign in with your Google account to save and load slideshows.
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Slideshow Manager</h2>
            <p className="text-sm text-gray-500 mt-1">Save and load your slideshows to Google Drive</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('save')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'save'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Save className="h-4 w-4 inline mr-2" />
            Save Current
          </button>
          <button
            onClick={() => setActiveTab('load')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'load'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderOpen className="h-4 w-4 inline mr-2" />
            Load Saved ({savedSlideshows.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'save' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Current Slideshow Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Photos:</span>
                    <span className="ml-2 font-medium">{getTotalPhotos()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Groups:</span>
                    <span className="ml-2 font-medium">{currentSlideshow.classes.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Music:</span>
                    <span className="ml-2 font-medium">{currentSlideshow.selectedMusic?.name || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Transition:</span>
                    <span className="ml-2 font-medium">{currentSlideshow.selectedTransition.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-medium">{currentSlideshow.slideDuration}s/slide</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slideshow Name
                </label>
                <input
                  type="text"
                  value={slideshowName}
                  onChange={(e) => setSlideshowName(e.target.value)}
                  placeholder="Enter a name for your slideshow..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !slideshowName.trim()}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save to Google Drive'}
              </button>
            </div>
          )}

          {activeTab === 'load' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading saved slideshows...</p>
                </div>
              ) : savedSlideshows.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No saved slideshows found</p>
                  <p className="text-sm text-gray-400 mt-1">Save your current slideshow to get started</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {savedSlideshows.map((slideshow) => (
                    <div key={slideshow.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{slideshow.name}</h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Created: {formatDate(slideshow.createdTime)}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Modified: {formatDate(slideshow.modifiedTime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleLoad(slideshow.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDelete(slideshow.id, slideshow.name)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideshowManager;