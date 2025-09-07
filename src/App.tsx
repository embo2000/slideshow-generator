import React, { useState, useEffect } from 'react';
import { Settings, Play, Download, Music, Camera, Plus, X, Edit } from 'lucide-react';
import ClassCard from './components/ClassCard';
import BackgroundSelector from './components/BackgroundSelector';
import SettingsModal from './components/SettingsModal';
import VideoGenerator from './components/VideoGenerator';
import MusicSelector from './components/MusicSelector';
import { ClassData, MusicTrack, BackgroundImage, TransitionType } from './types';

const TRANSITION_TYPES: TransitionType[] = [
  { id: 'fade', name: 'Fade', description: 'Smooth fade between images' },
  { id: 'slide', name: 'Slide', description: 'Slide images from side to side' },
  { id: 'zoom', name: 'Zoom', description: 'Zoom in/out effect' },
  { id: 'flip', name: 'Flip', description: '3D flip transition' },
  { id: 'dissolve', name: 'Dissolve', description: 'Pixelated dissolve effect' }
];

const DEFAULT_CLASSES = [
  'Little Dragons (3-5 years)',
  'Young Warriors (6-8 years)', 
  'Junior Karate (9-12 years)',
  'Teen Karate (13-17 years)',
  'Adult Beginners',
  'Intermediate Adults',
  'Advanced Adults',
  'Competition Team',
  'Black Belt Class',
  'Instructor Training'
];

const MUSIC_TRACKS: MusicTrack[] = [
  { id: '1', name: 'Energetic Workout', url: '/music/energetic-workout.mp3', duration: 45 },
  { id: '2', name: 'Motivational Beat', url: '/music/motivational-beat.mp3', duration: 38 },
  { id: '3', name: 'Uplifting Rhythm', url: '/music/uplifting-rhythm.mp3', duration: 42 },
  { id: '4', name: 'Dynamic Flow', url: '/music/dynamic-flow.mp3', duration: 35 },
  { id: '5', name: 'Power Training', url: '/music/power-training.mp3', duration: 50 }
];

function App() {
  const [classes, setClasses] = useState<string[]>(DEFAULT_CLASSES);
  const [classData, setClassData] = useState<ClassData>({});
  const [showSettings, setShowSettings] = useState(false);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [weeklyMusic, setWeeklyMusic] = useState<MusicTrack | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<TransitionType>(TRANSITION_TYPES[0]);

  // Initialize weekly music selection
  useEffect(() => {
    const getWeekOfYear = () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      return Math.floor(diff / oneDay / 7);
    };

    const weekNumber = getWeekOfYear();
    const musicIndex = weekNumber % MUSIC_TRACKS.length;
    const randomTrack = MUSIC_TRACKS[musicIndex];
    setWeeklyMusic(randomTrack);
    setSelectedMusic(randomTrack);
  }, []);

  const updateClassPhotos = (className: string, photos: File[]) => {
    setClassData(prev => ({
      ...prev,
      [className]: photos
    }));
  };

  const getTotalPhotos = () => {
    return Object.values(classData).reduce((total, photos) => total + photos.length, 0);
  };

  const hasPhotos = getTotalPhotos() > 0;

  const generateVideo = () => {
    if (!hasPhotos) return;
    setShowVideoGenerator(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Slideshow Generator</h1>
                <p className="text-sm text-gray-500">Create beautiful photo slideshows</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {hasPhotos && (
                <button
                  onClick={generateVideo}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Generate Video
                </button>
              )}
              
              <button
                onClick={() => setShowSettings(true)}
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Bar */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{classes.length}</div>
              <div className="text-sm text-gray-500">Total Classes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{getTotalPhotos()}</div>
              <div className="text-sm text-gray-500">Photos Uploaded</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Music className="h-5 w-5 text-orange-600" />
                <div className="text-sm font-medium text-gray-700">
                  {weeklyMusic?.name || 'No music selected'}
                </div>
              </div>
              <div className="text-sm text-gray-500">This Week's Music</div>
            </div>
          </div>
        </div>

        {/* Music Selector */}
        <MusicSelector
          tracks={MUSIC_TRACKS}
          selectedTrack={selectedMusic}
          weeklyTrack={weeklyMusic}
          onSelectTrack={setSelectedMusic}
        />

        {/* Background Image Selector */}
        <BackgroundSelector
          backgroundImage={backgroundImage}
          onBackgroundImageUpdate={setBackgroundImage}
        />

        {/* Classes Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {classes.map((className) => (
            <ClassCard
              key={className}
              className={className}
              photos={classData[className] || []}
              onPhotosUpdate={(photos) => updateClassPhotos(className, photos)}
            />
          ))}
        </div>

        {/* Empty State */}
        {classes.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes configured</h3>
            <p className="text-gray-500 mb-6">Add classes in settings to get started</p>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Classes
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          classes={classes}
          onUpdateClasses={setClasses}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showVideoGenerator && (
        <VideoGenerator
          classData={classData}
          selectedMusic={selectedMusic}
          backgroundImage={backgroundImage}
          selectedTransition={selectedTransition}
          onClose={() => setShowVideoGenerator(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          classes={classes}
          onUpdateClasses={setClasses}
          selectedTransition={selectedTransition}
          transitionTypes={TRANSITION_TYPES}
          onTransitionUpdate={setSelectedTransition}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;