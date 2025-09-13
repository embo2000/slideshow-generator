import React, { useState, useRef } from 'react';
import { Music, Play, Pause, Volume2, Star, Upload, Link, X, Plus } from 'lucide-react';
import { MusicTrack } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface MusicStepProps {
  tracks: MusicTrack[];
  selectedTrack: MusicTrack | null;
  weeklyTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack) => void;
}

const MusicStep: React.FC<MusicStepProps> = ({
  tracks,
  selectedTrack,
  weeklyTrack,
  onSelectTrack
}) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRefs] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [customTracks, setCustomTracks] = useState<MusicTrack[]>([]);
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioName, setAudioName] = useState('');
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
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      
      audio.addEventListener('loadedmetadata', () => {
        const newTrack: MusicTrack = {
          id: `custom-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
          url: url,
          duration: Math.round(audio.duration),
          isCustom: true,
          file: file
        };
        
        setCustomTracks(prev => [...prev, newTrack]);
        onSelectTrack(newTrack);
        setShowAddOptions(false);
      });
      
      audio.addEventListener('error', () => {
        alert('Failed to load audio file. Please try a different file.');
        URL.revokeObjectURL(url);
      });
    } else {
      alert('Please select a valid audio file (MP3, WAV, OGG, etc.)');
    }
  };
  return (
    <WizardStepWrapper
      title="Select Background Music"
      description="Choose music to accompany your slideshow"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedTrack?.id === track.id
                  ? 'border-orange-500 bg-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onSelectTrack(track)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    selectedTrack?.id === track.id
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Music className="h-5 w-5" />
                  </div>
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
    setCustomTracks(prev => prev.filter(t => t.id !== trackId));
    
    // If this was the selected track, clear selection
    if (selectedTrack?.id === trackId) {
      onSelectTrack(tracks[0] || null);
    }
  };
                  <div>
                    <h3 className="font-semibold text-gray-900">{track.name}</h3>
                    {weeklyTrack?.id === track.id && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="h-3 w-3 text-orange-500 fill-current" />
                        <span className="text-xs text-orange-600 font-medium">Recommended</span>
                      </div>
        {/* Add Custom Audio Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Custom Audio</h3>
            <button
              onClick={() => setShowAddOptions(!showAddOptions)}
              className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
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
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
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
                    )}
                  </div>
          {allTracks.map((track) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay(track);
                  }}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  {playingTrack === track.id ? (
                    <Pause className="h-5 w-5 text-orange-600" />
                  ) : (
                    <Play className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Volume2 className="h-4 w-4" />
                <span>{track.duration}s</span>
              </div>
              
                    {track.isCustom ? (
                      <span className="text-xs text-blue-600 font-medium">Custom Audio</span>
                    ) : weeklyTrack?.id === track.id && (
                <div className="mt-3 text-sm font-medium text-orange-600">
                  ✓ Selected
                </div>
              )}
            </div>
          ))}
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
                      <Pause className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Play className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                  {track.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomTrack(track.id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

  const handleUrlAdd = () => {
    if (!audioUrl.trim() || !audioName.trim()) {
      alert('Please enter both a name and URL for the audio');
                <span>{track.duration ? `${track.duration}s` : 'Loading...'}</span>
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
      
      setCustomTracks(prev => [...prev, newTrack]);
      onSelectTrack(newTrack);
              {selectedTrack.isCustom 
                ? ' (Custom Audio)' 
                : weeklyTrack?.id === selectedTrack.id && ' (Recommended this week)'
              }
      setAudioName('');
      setShowAddOptions(false);
    });
    
    audio.addEventListener('error', () => {
      alert('Failed to load audio from URL. Please check the URL and try again.');
    });
  };
export default MusicStep;