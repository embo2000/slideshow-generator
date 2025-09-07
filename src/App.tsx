import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import WizardProgress from './components/WizardProgress';
import WizardNavigation from './components/WizardNavigation';
import ClassUploadStep from './components/ClassUploadStep';
import TransitionStep from './components/TransitionStep';
import BackgroundStep from './components/BackgroundStep';
import MusicStep from './components/MusicStep';
import PreviewStep from './components/PreviewStep';
import VideoGenerator from './components/VideoGenerator';
import SettingsModal from './components/SettingsModal';
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
  'Adult Beginners'
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
  const [currentStep, setCurrentStep] = useState(0);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  const getClassesWithPhotos = () => {
    return classes.filter(className => (classData[className] || []).length > 0);
  };

  // Calculate total steps: classes + transitions + background + music + preview
  const totalSteps = classes.length + 4;
  
  // Generate step titles
  const getStepTitles = () => {
    const classTitles = classes.map((className, index) => `${className.split(' ')[0]} ${className.split(' ')[1] || 'Class'}`);
    return [...classTitles, 'Transitions', 'Background', 'Music', 'Preview'];
  };

  const getCompletedSteps = () => {
    const completed = new Array(totalSteps).fill(false);
    
    // Mark class steps as completed if they have photos
    classes.forEach((className, index) => {
      if ((classData[className] || []).length > 0) {
        completed[index] = true;
      }
    });
    
    // Mark other steps as completed
    completed[classes.length] = true; // Transitions (always has default)
    completed[classes.length + 1] = true; // Background (optional)
    completed[classes.length + 2] = selectedMusic !== null; // Music
    completed[classes.length + 3] = getTotalPhotos() > 0; // Preview
    
    return completed;
  };

  const canProceedFromCurrentStep = () => {
    if (currentStep < classes.length) {
      // For class steps, allow proceeding even without photos (optional)
      return true;
    } else if (currentStep === classes.length) {
      // Transitions step - always can proceed (has default)
      return true;
    } else if (currentStep === classes.length + 1) {
      // Background step - always can proceed (optional)
      return true;
    } else if (currentStep === classes.length + 2) {
      // Music step - always can proceed (optional)
      return true;
    } else if (currentStep === classes.length + 3) {
      // Preview step - need at least one photo
      return getTotalPhotos() > 0;
    }
    return false;
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEditStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const generateVideo = () => {
    if (getTotalPhotos() === 0) return;
    setShowVideoGenerator(true);
  };

  const renderCurrentStep = () => {
    if (currentStep < classes.length) {
      // Class upload steps
      const className = classes[currentStep];
      return (
        <ClassUploadStep
          className={className}
          photos={classData[className] || []}
          onPhotosUpdate={(photos) => updateClassPhotos(className, photos)}
          stepNumber={currentStep + 1}
          totalClasses={classes.length}
        />
      );
    } else if (currentStep === classes.length) {
      // Transitions step
      return (
        <TransitionStep
          selectedTransition={selectedTransition}
          transitionTypes={TRANSITION_TYPES}
          onTransitionUpdate={setSelectedTransition}
        />
      );
    } else if (currentStep === classes.length + 1) {
      // Background step
      return (
        <BackgroundStep
          backgroundImage={backgroundImage}
          onBackgroundImageUpdate={setBackgroundImage}
        />
      );
    } else if (currentStep === classes.length + 2) {
      // Music step
      return (
        <MusicStep
          tracks={MUSIC_TRACKS}
          selectedTrack={selectedMusic}
          weeklyTrack={weeklyMusic}
          onSelectTrack={setSelectedMusic}
        />
      );
    } else if (currentStep === classes.length + 3) {
      // Preview step
      return (
        <PreviewStep
          classData={classData}
          selectedMusic={selectedMusic}
          backgroundImage={backgroundImage}
          selectedTransition={selectedTransition}
          onGenerate={generateVideo}
          onEdit={handleEditStep}
        />
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Camera className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Slideshow Generator</h1>
                <p className="text-sm text-gray-500">Create beautiful photo slideshows step by step</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(true)}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Manage Classes
            </button>
          </div>
        </div>
      </header>

      {/* Wizard Progress */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepTitles={getStepTitles()}
        completedSteps={getCompletedSteps()}
      />

      {/* Main Content */}
      <main className="min-h-[calc(100vh-200px)]">
        {renderCurrentStep()}
      </main>

      {/* Navigation */}
      <WizardNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        canProceed={canProceedFromCurrentStep()}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onGenerate={generateVideo}
        isLastStep={currentStep === totalSteps - 1}
      />

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
    </div>
  );
}

export default App;