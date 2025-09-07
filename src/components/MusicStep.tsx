import React, { useState } from 'react';
import { Music, Play, Pause, Volume2, Star } from 'lucide-react';
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

  const togglePlay = (track: MusicTrack) => {
    if (playingTrack === track.id) {
      if (audioRefs[track.id]) {
        audioRefs[track.id].pause();
        audioRefs[track.id].currentTime = 0;
      }
      setPlayingTrack(null);
    } else {
      setPlayingTrack(null);
      Object.entries(audioRefs).forEach(([id, audio]) => {
        if (id !== track.id) {
          audio.pause();
          audio.currentTime = 0;
        }
      });

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
                  <div>
                    <h3 className="font-semibold text-gray-900">{track.name}</h3>
                    {weeklyTrack?.id === track.id && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="h-3 w-3 text-orange-500 fill-current" />
                        <span className="text-xs text-orange-600 font-medium">Recommended</span>
                      </div>
                    )}
                  </div>
                </div>
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
              
              {selectedTrack?.id === track.id && (
                <div className="mt-3 text-sm font-medium text-orange-600">
                  ✓ Selected
                </div>
              )}
            </div>
          ))}
        </div>
        
        {selectedTrack && (
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-orange-800 font-medium">
              Selected: {selectedTrack.name}
              {weeklyTrack?.id === selectedTrack.id && ' (Recommended this week)'}
            </p>
          </div>
        )}
      </div>
    </WizardStepWrapper>
  );
};

export default MusicStep;