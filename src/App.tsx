import React, { useState, useEffect } from 'react';
import { Camera, Save } from 'lucide-react';
import WizardProgress from './components/WizardProgress';
import WizardNavigation from './components/WizardNavigation';
import ClassUploadStep from './components/ClassUploadStep';
import TransitionStep from './components/TransitionStep';
import BackgroundStep from './components/BackgroundStep';
import MusicStep from './components/MusicStep';
import PreviewStep from './components/PreviewStep';
import VideoGenerator from './components/VideoGenerator';
import SettingsModal from './components/SettingsModal';
import GoogleAuthButton from './components/GoogleAuthButton';
import SlideshowManager from './components/SlideshowManager';
import { googleAuthService, GoogleUser } from './services/googleAuth';
import { googleDriveService } from './services/googleDrive';
import { ClassData, MusicTrack, BackgroundImage, TransitionType } from './types';

const TRANSITION_TYPES: TransitionType[] = [
  { id: 'fade', name: 'Fade', description: 'Smooth fade between images' },
  { id: 'slide', name: 'Slide', description: 'Slide images from side to side' },
  { id: 'zoom', name: 'Zoom', description: 'Zoom in/out effect' },
  { id: 'flip', name: 'Flip', description: '3D flip transition' },
  { id: 'dissolve', name: 'Dissolve', description: 'Pixelated dissolve effect' }
];

const DEFAULT_CLASSES = [
  'Image Group 1',
  'Image Group 2', 
  'Image Group 3',
  'Image Group 4',
  'Image Group 5'
];

const MUSIC_TRACKS: MusicTrack[] = [];

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
  const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);
  const [showSlideshowManager, setShowSlideshowManager] = useState(false);
  const [slideDuration, setSlideDuration] = useState(3); // Default 3 seconds per slide
  const [slideshowName, setSlideshowName] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  });

  // Load groups settings when user signs in
  useEffect(() => {
    const loadUserGroupsSettings = async () => {
      if (currentUser && googleAuthService.isSignedIn()) {
        try {
          const savedClasses = await googleDriveService.loadGroupsSettings();
          if (savedClasses && savedClasses.length > 0) {
            setClasses(savedClasses);
            // Initialize classData for new groups
            const newClassData: ClassData = {};
            savedClasses.forEach(className => {
              newClassData[className] = classData[className] || [];
            });
            setClassData(newClassData);
          }
        } catch (error) {
          console.error('Failed to load groups settings:', error);
        }
      }
    };

    loadUserGroupsSettings();
  }, [currentUser]);

  // Initialize weekly music selection
  useEffect(() => {
    // No default music selection since we removed sample tracks
    setWeeklyMusic(null);
    setSelectedMusic(null);
  }, []);

  const updateClassPhotos = (className: string, photos: File[]) => {
    setClassData(prev => ({
      ...prev,
      [className]: photos
    }));
  };

const getTotalPhotos = () => {
  return Object.values(classData).reduce((total, photos) => 
    total + (photos && Array.isArray(photos) ? photos.length : 0), 0
  );
};

  const getClassesWithPhotos = () => {
    return classes.filter(groupName => (classData[groupName] ?? []).length > 0);
  };

  // Calculate total steps: image groups + transitions + background + music + preview
  const totalSteps = classes.length + 4;
  
  // Generate step titles
  const getStepTitles = () => {
    const groupTitles = classes.map((groupName, index) => `${groupName}`);
    return [...groupTitles, 'Transitions', 'Background', 'Music', 'Preview'];
  };

  const getCompletedSteps = () => {
    const completed = new Array(totalSteps).fill(false);
    
    // Mark image group steps as completed if they have photos
    classes.forEach((groupName, index) => {
      if ((classData[groupName] ?? []).length> 0) {
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
      // For image group steps, allow proceeding even without photos (optional)
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

const handleLoadSlideshow = (data: {
  classData?: ClassData;
  selectedMusic?: MusicTrack | null;
  backgroundImage?: BackgroundImage | null;
  selectedTransition?: TransitionType;
  classes?: string[];
  slideDuration?: number;
  slideshowName?: string;
}) => {
  const slideshowClasses = Array.isArray(data.classes) ? data.classes : DEFAULT_CLASSES;

  console.log('slideshowClasses:', slideshowClasses);
  
  // Normalize classData first
  const normalizedClassData = normalizeLoadedClassData(data.classData);

  // Ensure every class has an array (even if missing in loaded data)
  slideshowClasses.forEach(className => {
    if (!normalizedClassData[className]) normalizedClassData[className] = [];
  });

  setClassData(normalizedClassData);
  setSelectedMusic(data.selectedMusic ?? null);
  setBackgroundImage(data.backgroundImage ?? null);
  setSelectedTransition(data.selectedTransition ?? TRANSITION_TYPES[0]);
  setSlideDuration(data.slideDuration ?? 3);
  setSlideshowName(data.slideshowName ?? (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  })());
  setClasses(slideshowClasses);
  setCurrentStep(0);
};


const normalizeLoadedClassData = (loaded: any) => {
  const normalized: ClassData = {};
  Object.entries(loaded || {}).forEach(([className, images]) => {
    normalized[className] = Array.isArray(images)
      ? images.map((img: string | File) => {
          if (typeof img === 'string') {
            // Check if the string already has a data URL prefix
            if (img.startsWith('data:image/')) return { url: img };

            // Optionally detect image type from first few bytes
            let type = 'jpeg';
            if (img.startsWith('iVBOR')) type = 'png'; // PNG signature in Base64
            return { url: `data:image/${type};base64,${img}` };
          } else {
            return img;
          }
        })
      : [];
  });
  return normalized;
};
  
  const handleClassesUpdate = async (newClasses: string[]) => {
    // Update class names and migrate existing photo data
    const newClassData: ClassData = {};   
    
    newClasses.forEach((newClassName, index) => {
      const oldClassName = classes[index];
      if (oldClassName && classData[oldClassName]) {
        // Migrate photos from old class name to new class name
        newClassData[newClassName] = classData[oldClassName];
      }
    });
    
    setClasses(newClasses);
    setClassData(newClassData);

    // Save groups settings to Google Drive if user is signed in
    if (currentUser && googleAuthService.isSignedIn()) {
      try {
        await googleDriveService.saveGroupsSettings(newClasses);
      } catch (error) {
        console.error('Failed to save groups settings:', error);
        // Don't show error to user as this is a background operation
      }
    }
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
      // Image group upload steps
      const groupName = classes[currentStep];
      return (
        <ClassUploadStep
          className={groupName}
          photos={classData[groupName] || []}
          onPhotosUpdate={(photos) => updateClassPhotos(groupName, photos)}
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
          slideDuration={slideDuration}
          onSlideDurationChange={setSlideDuration}
          onGenerate={generateVideo}
          onEdit={handleEditStep}
          slideshowName={slideshowName}
          onSlideshowNameChange={setSlideshowName}
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
              className="text-sm text-gray-600 hover:text-gray-900 underline mr-4"
            >
              Manage Groups
            </button>
            
            <div className="flex items-center space-x-4">
              {currentUser && (
                <button
                  onClick={() => setShowSlideshowManager(true)}
                  className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4 mr-1" />
                  My Slideshows
                </button>
              )}
              <GoogleAuthButton onAuthChange={setCurrentUser} />
            </div>
          </div>
        </div>
      </header>

      {/* Wizard Progress */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepTitles={getStepTitles()}
        completedSteps={getCompletedSteps()}
        onStepClick={setCurrentStep}
      />

      {/* Main Content */}
      <main className="min-h-0">
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
          onUpdateClasses={handleClassesUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showSlideshowManager && (
        <SlideshowManager
          currentSlideshow={{
            classData,
            selectedMusic,
            backgroundImage,
            selectedTransition,
            classes,
            slideDuration,
            slideshowName,
          }}
          onLoadSlideshow={handleLoadSlideshow}
          onClose={() => setShowSlideshowManager(false)}
        />
      )}

      {showVideoGenerator && (
        <VideoGenerator
          classData={classData}
          selectedMusic={selectedMusic}
          backgroundImage={backgroundImage}
          selectedTransition={selectedTransition}
          slideDuration={slideDuration}
          slideshowName={slideshowName}
          onClose={() => setShowVideoGenerator(false)}
        />
      )}
    </div>
  );
}

export default App;