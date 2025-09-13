import React, { useState, useRef } from 'react';
import { Music, Play, Pause, Volume2, Star, Upload, Link, X, Plus } from 'lucide-react';
import { MusicTrack } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface MusicStepProps {
  tracks: MusicTrack[];
  selectedTrack: MusicTrack | null;
  weeklyTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack) => void;
  existingMusicFiles?: Array<{
    id: string;
    name: string;
    url: string;
    createdTime: string;
    size?: string;
  }>;
  onLoadExistingMusic?: (musicData: { id: string; url: string; name: string }) => void;
  customTracks?: MusicTrack[];
  onCustomTracksUpdate?: (tracks: MusicTrack[]) => void;
}

const MusicStep: React.FC<MusicStepProps> = ({
  tracks,
  selectedTrack,
  weeklyTrack,
  onSelectTrack,
  existingMusicFiles = [],
  onLoadExistingMusic,
  customTracks = [],
  onCustomTracksUpdate
}) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRefs] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTracks = [...tracks, ...customTracks];

  const togglePlay = (track: MusicTrack) => {
    if (playingTrack === track.id) {
      // Stop currently playing track
      if (audioRefs[track.id]) {
        audioRefs[track.id].pause();
        audioRefs[track.id].currentTime = 0;
      }
      setPlayingTrack(null);
    } else {
      // Stop all other tracks first
      setPlayingTrack(null);
      Object.entries(audioRefs).forEach(([id, audio]) => {
        if (id !== track.id) {
          audio.pause();
          audio.currentTime = 0;
        }
      });

      // Create or play the selected track
      if (!audioRefs[track.id]) {
        // Create new audio element
        const audio = new Audio(track.url);
        audio.volume = 0.5;
        audio.preload = 'auto';
        
        // Add event listeners
        audio.addEventListener('ended', () => {
          setPlayingTrack(null);
        });
        audio.addEventListener('error', () => {
          console.error('Audio failed to load:', track.url);
          setPlayingTrack(null);
        });
        audio.addEventListener('loadeddata', () => {
          console.log('Audio loaded successfully:', track.name);
          audio.play().catch((error) => {
            console.error('Audio play failed:', error);
            setPlayingTrack(null);
          });
        });
        
        audioRefs[track.id] = audio;
        setPlayingTrack(track.id);
      } else {
        // Play existing audio element
        audioRefs[track.id].play().catch((error) => {
          console.error('Audio play failed:', error);
          setPlayingTrack(null);
        });
        setPlayingTrack(track.id);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      // Show rename dialog
      setPendingFile(file);
      setPendingFileName(file.name.replace(/\.[^/.]+$/, '')); // Remove file extension
      setShowRenameDialog(true);
    } else {
      alert('Please select a valid audio file (MP3, WAV, OGG, etc.)');
    }
    
    // Reset file input
    if (e.target) {
      e.target.value = '';
    }
  };

  const confirmFileUpload = () => {
    if (!pendingFile || !pendingFileName.trim()) return;
    
    const url = URL.createObjectURL(pendingFile);
    const audio = new Audio(url);
    
    audio.addEventListener('loadedmetadata', () => {
      const newTrack: MusicTrack = {
        id: `custom-${Date.now()}`,
        name: pendingFileName.trim(),
        url: url,
        duration: Math.round(audio.duration),
        isCustom: true,
        file: pendingFile
      };
      
      onCustomTracksUpdate?.([...customTracks, newTrack]);
      onSelectTrack(newTrack);
      setShowAddOptions(false);
      setShowRenameDialog(false);
      setPendingFile(null);
      setPendingFileName('');
    });
    
    audio.addEventListener('error', () => {
      alert('Failed to load audio file. Please try a different file.');
      URL.revokeObjectURL(url);
      setShowRenameDialog(false);
      setPendingFile(null);
      setPendingFileName('');
    });
  };

  const cancelFileUpload = () => {
    if (pendingFile) {
      // Clean up if we created an object URL
      setPendingFile(null);
    }
    setPendingFileName('');
    setShowRenameDialog(false);
  };

  const removeCustomTrack = (trackId: string) => {
    const track = customTracks.find(t => t.id === trackId);
    if (track?.file) {
      URL.revokeObjectURL(track.url);
    }
    
    // Stop playing if this track is currently playing
    if (playingTrack === trackId) {
      if (audioRefs[trackId]) {
        audioRefs[trackId].pause();
        audioRefs[trackId].currentTime = 0;
      }
      setPlayingTrack(null);
    }
    
    // Remove from custom tracks
    onCustomTracksUpdate?.(customTracks.filter(t => t.id !== trackId));
    
    // If this was the selected track, clear selection
    if (selectedTrack?.id === trackId) {
      onSelectTrack(tracks[0] || null);
    }
  };

  const handleUrlAdd = () => {
    if (!audioUrl.trim() || !audioName.trim()) {
      alert('Please enter both a name and URL for the audio');
      return;
    }

    const audio = new Audio(audioUrl);
    
    audio.addEventListener('loadedmetadata', () => {
      const newTrack: MusicTrack = {
        id: `custom-url-${Date.now()}`,
        name: audioName,
        url: audioUrl,
        duration: Math.round(audio.duration),
        isCustom: true
      };
      
      onCustomTracksUpdate?.([...customTracks, newTrack]);
      onSelectTrack(newTrack);
      setAudioUrl('');
      setAudioName('');
      setShowAddOptions(false);
    });
    
    audio.addEventListener('error', () => {
      alert('Failed to load audio from URL. Please check the URL and try again.');
    });
  };

  return (
    <WizardStepWrapper
      title="Select Background Music"
      description="Choose music to accompany your slideshow"
    >
      <div className="space-y-6">
        {/* Existing Music Files from Google Drive */}
        {existingMusicFiles.length > 0 && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Music className="h-8 w-8 text-teal-600 mx-auto mb-2" />
              <h3 className="font-medium text-teal-900 mb-1">Choose from Your Music Library</h3>
              <p className="text-sm text-teal-700">
                Select from your previously uploaded music files or add new ones below
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {existingMusicFiles.map((music) => (
                <div
                  key={music.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedTrack?.assetId === music.id
                      ? 'border-teal-500 bg-teal-50 shadow-md'
                      : 'border-gray-200 hover:border-teal-500 bg-white hover:bg-teal-50'
                  }`}
                  onClick={() => onLoadExistingMusic?.(music)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedTrack?.assetId === music.id
                          ? 'bg-teal-200 text-teal-700'
                          : 'bg-teal-100 text-teal-600'
                      }`}>
                        <Music className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{music.name}</h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span>{new Date(music.createdTime).toLocaleDateString()}</span>
                          {music.size && (
                            <>
                              <span>•</span>
                              <span>{Math.round(parseInt(music.size) / 1024)} KB</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Create a temporary track for preview
                          const tempTrack: MusicTrack = {
                            id: `preview-${music.id}`,
                            name: music.name,
                            url: music.url,
                            duration: 0,
                            isCustom: true
                          };
                          togglePlay(tempTrack);
                        }}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                      >
                        {playingTrack === `preview-${music.id}` ? (
                          <Pause className="h-4 w-4 text-teal-600" />
                        ) : (
                          <Play className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedTrack?.assetId === music.id
                        ? 'bg-teal-200 text-teal-800 font-medium'
                        : 'bg-teal-100 text-teal-700'
                    }`}>
                      {selectedTrack?.assetId === music.id ? '✓ Selected' : 'Click to use this music'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center text-sm text-gray-500">
                <span>Or add new music below</span>
              </div>
            </div>
          </div>
        )}

        {/* Current/Custom Tracks - Only show if there are custom tracks */}
        {allTracks.length > 0 && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Music className="h-8 w-8 text-teal-600 mx-auto mb-2" />
              <h3 className="font-medium text-teal-900 mb-1">Your Custom Audio Tracks</h3>
              <p className="text-sm text-teal-700">
                Select from your uploaded custom audio tracks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allTracks.map((track) => (
                <div
                  key={track.id}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedTrack?.id === track.id
                      ? 'border-teal-500 bg-teal-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onSelectTrack(track)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedTrack?.id === track.id
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Music className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{track.name}</h3>
                        <span className="text-xs text-teal-600 font-medium">Custom Audio</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(track);
                        }}
                        className="p-2 hover:bg-white rounded-full transition-colors"
                      >
                        {playingTrack === track.id ? (
                          <Pause className="h-5 w-5 text-teal-600" />
                        ) : (
                          <Play className="h-5 w-5 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeCustomTrack(track.id);
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Volume2 className="h-4 w-4" />
                    <span>{track.duration ? `${track.duration}s` : 'Loading...'}</span>
                  </div>
                  
                  {selectedTrack?.id === track.id && (
                    <div className="mt-3 text-sm font-medium text-teal-600">
                      ✓ Selected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Audio Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={() => setShowAddOptions(!showAddOptions)}
             className="inline-flex items-center px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Audio
            </button>
          </div>

          {showAddOptions && (
            <div className="space-y-4 p-4 bg-white rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Upload Audio File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </button>
                  <p className="text-xs text-gray-500">Supports MP3, WAV, OGG, and other audio formats</p>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Add from URL</label>
                  <input
                    type="text"
                    placeholder="Audio name"
                    value={audioName}
                    onChange={(e) => setAudioName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <input
                    type="url"
                    placeholder="https://example.com/audio.mp3"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    onClick={handleUrlAdd}
                    disabled={!audioUrl.trim() || !audioName.trim()}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Add URL
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddOptions(false)}
                  className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Name Your Audio Track</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Track Name
                  </label>
                  <input
                    type="text"
                    value={pendingFileName}
                    onChange={(e) => setPendingFileName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        confirmFileUpload();
                      } else if (e.key === 'Escape') {
                        cancelFileUpload();
                      }
                    }}
                    placeholder="Enter a name for this track..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelFileUpload}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmFileUpload}
                    disabled={!pendingFileName.trim()}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                  >
                    Add Track
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </WizardStepWrapper>
  );
};

export default MusicStep;