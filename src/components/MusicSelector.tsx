import React, { useState } from 'react';
import { Music, Play, Pause, Volume2, Star } from 'lucide-react';
import { MusicTrack } from '../types';

interface MusicSelectorProps {
  tracks: MusicTrack[];
  selectedTrack: MusicTrack | null;
  weeklyTrack: MusicTrack | null;
  onSelectTrack: (track: MusicTrack) => void;
}

const MusicSelector: React.FC<MusicSelectorProps> = ({
  tracks,
  selectedTrack,
  weeklyTrack,
  onSelectTrack
}) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRefs] = useState<{ [key: string]: HTMLAudioElement }>({});

  const togglePlay = (track: MusicTrack) => {
    if (playingTrack === track.id) {
      // Stop playing
      if (audioRefs[track.id]) {
        audioRefs[track.id].pause();
        audioRefs[track.id].currentTime = 0;
      }
      setPlayingTrack(null);
    } else {
      // Stop other tracks
      setPlayingTrack(null);
      Object.entries(audioRefs).forEach(([id, audio]) => {
        if (id !== track.id) {
          audio.pause();
          audio.currentTime = 0;
        }
      });

      // Create or get audio element
      if (!audioRefs[track.id]) {
        const audio = new Audio(track.url);
        audio.volume = 0.5;
        audio.addEventListener('ended', () => {
          setPlayingTrack(null);
        });
        audio.addEventListener('error', () => {
          setPlayingTrack(null);
        });
        audio.addEventListener('canplaythrough', () => {
          audio.play().catch(() => {
            setPlayingTrack(null);
          });
        });
        audioRefs[track.id] = audio;
        audio.src = track.url;
        audio.load();
      } else {
        audioRefs[track.id].play().catch(() => {
          setPlayingTrack(null);
        });
      }
      
      setPlayingTrack(track.id);
    }
  };

  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Music className="h-5 w-5 text-orange-600" />
        <h2 className="text-lg font-semibold text-gray-900">Background Music</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedTrack?.id === track.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => onSelectTrack(track)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-gray-900">{track.name}</h3>
                {weeklyTrack?.id === track.id && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-orange-500 fill-current" />
                    <span className="text-xs text-orange-600 font-medium">This Week</span>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(track);
                }}
                className="p-1 hover:bg-white rounded-full transition-colors"
              >
                {playingTrack === track.id ? (
                  <Pause className="h-4 w-4 text-blue-600" />
                ) : (
                  <Play className="h-4 w-4 text-gray-600" />
                )}
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Volume2 className="h-3 w-3" />
              <span>{track.duration}s</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Selected:</strong> {selectedTrack?.name || 'No music selected'}
          {weeklyTrack?.id === selectedTrack?.id && ' (Recommended this week)'}
        </p>
      </div>
    </div>
  );
};

export default MusicSelector;