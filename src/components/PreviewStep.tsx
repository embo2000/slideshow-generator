import React, { useEffect, useState } from 'react';
import { Play, Edit, Music, Image as ImageIcon, Zap, Camera, Clock } from 'lucide-react';
import { ClassData, MusicTrack, BackgroundOption, TransitionType } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface PreviewStepProps {
  classData: ClassData;
  selectedMusic: MusicTrack | null;
  backgroundOption: BackgroundOption;
  selectedTransition: TransitionType;
  slideDuration: number;
  onSlideDurationChange: (duration: number) => void;
  onGenerate: () => void;
  onEdit: (step: number) => void;
  slideshowName: string;
  onSlideshowNameChange: (name: string) => void;
  onAutoSave?: () => Promise<void>;
  classes: string[];
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  classData,
  selectedMusic,
  backgroundOption,
  selectedTransition,
  slideDuration,
  onSlideDurationChange,
  onGenerate,
  onEdit,
  slideshowName,
  onSlideshowNameChange,
  onAutoSave,
  classes
}) => {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const getTotalPhotos = () => {
    return Object.values(classData).reduce((total, photos) => total + photos.length, 0);
  };

  const getClassesWithPhotos = () => {
    return Object.entries(classData).filter(([_, photos]) => photos.length > 0);
  };

  const getTotalDuration = () => {
    return Math.round((getTotalPhotos() * slideDuration) / 60 * 10) / 10; // Convert to minutes, round to 1 decimal
  };

  // Auto-save when slideshow name changes (with debouncing)
  useEffect(() => {
    // Don't auto-save if no slideshow name, no photos, or already saving
    if (!slideshowName.trim() || getTotalPhotos() === 0 || isAutoSaving) {
      return;
    }

    const performAutoSave = async () => {
      if (!onAutoSave) return;
      
      setIsAutoSaving(true);
      setAutoSaveStatus('saving');
      
      try {
        await onAutoSave();
        setAutoSaveStatus('saved');
        console.log('Auto-save completed successfully');
        // Reset status after 3 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      } catch (error) {
        console.error('Auto-save failed:', error);
        setAutoSaveStatus('error');
        // Reset status after 5 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 5000);
      } finally {
        setIsAutoSaving(false);
      }
    };

    // Debounce auto-save - only trigger after user stops typing for 3 seconds
    const timeoutId = setTimeout(performAutoSave, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [slideshowName]); // Only depend on slideshowName to avoid infinite loops

  return (
    <WizardStepWrapper
      title="Review Your Slideshow"
      description="Review all your settings before generating the final video"
    >
      <div className="space-y-8">
        {/* Slideshow Name Input */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Slideshow Name</h3>
              <p className="text-sm text-gray-600">Give your slideshow a memorable name</p>
            </div>
            {/* Auto-save status indicator */}
            {autoSaveStatus !== 'idle' && (
              <div className="flex items-center space-x-2">
                {autoSaveStatus === 'saving' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-600">Auto-saving...</span>
                  </>
                )}
                {autoSaveStatus === 'saved' && (
                  <>
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm text-green-600">Auto-saved</span>
                  </>
                )}
                {autoSaveStatus === 'error' && (
                  <>
                    <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm text-red-600">Save failed</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="max-w-md">
            <input
              type="text"
              value={slideshowName}
              onChange={(e) => onSlideshowNameChange(e.target.value)}
              placeholder="Enter slideshow name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-medium"
            />
            <p className="text-sm text-gray-500 mt-2">
              This name will be used when saving your slideshow and for the video file
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <div className="flex items-center space-x-2 mb-2">
              <Camera className="h-5 w-5 text-cyan-600" />
              <span className="font-medium text-cyan-900">Photos</span>
            </div>
            <div className="text-2xl font-bold text-cyan-600">{getTotalPhotos()}</div>
            <div className="text-sm text-cyan-700">{getClassesWithPhotos().length} groups</div>
          </div>

          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <div className="flex items-center space-x-2 mb-2">
              <Music className="h-5 w-5 text-teal-600" />
              <span className="font-medium text-teal-900">Music</span>
            </div>
            <div className="text-sm font-semibold text-teal-600">
              {selectedMusic?.name || 'No music'}
            </div>
            <div className="text-sm text-teal-700">
              {selectedMusic ? `${selectedMusic.duration}s` : 'Silent'}
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <div className="flex items-center space-x-2 mb-2">
              <ImageIcon className="h-5 w-5 text-emerald-600" />
              <span className="font-medium text-emerald-900">Background</span>
            </div>
            <div className="text-sm font-semibold text-emerald-600">
              {backgroundOption.type === 'image' ? 'Custom Image' : 
               backgroundOption.type === 'color' ? 'Solid Color' : 'Default Gradient'}
            </div>
          </div>

          <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-cyan-600" />
              <span className="font-medium text-cyan-900">Transitions</span>
            </div>
            <div className="text-sm font-semibold text-cyan-600">
              {selectedTransition.name}
            </div>
          </div>

          <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-teal-600" />
              <span className="font-medium text-teal-900">Duration</span>
            </div>
            <div className="text-sm font-semibold text-teal-600">
              {slideDuration}s per slide
            </div>
            <div className="text-sm text-teal-700">
              ~{getTotalDuration()} min total
            </div>
          </div>
        </div>

        {/* Slide Duration Setting */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Slide Duration</h3>
              <p className="text-sm text-gray-600">How long each photo is displayed</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="flex-1">
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={slideDuration}
                onChange={(e) => onSlideDurationChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1s</span>
                <span>3s</span>
                <span>5s</span>
                <span>10s</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{slideDuration}s</div>
              <div className="text-sm text-gray-500">per slide</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total slideshow duration:</span>
              <span className="font-medium text-gray-900">~{getTotalDuration()} minutes</span>
            </div>
          </div>
        </div>

        {/* Class Photos Preview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos by Image Group</h3>
          <div className="space-y-4">
            {getClassesWithPhotos().map(([groupName, photos], groupIndex) => (
              <div key={groupName} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{groupName}</h4>
                  <button
                    onClick={() => onEdit(groupIndex)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {photos.map((photo, index) => (
                    <img
                      key={index}
                      src={URL.createObjectURL(photo)}
                      alt={`${groupName} photo ${index + 1}`}
                      className="w-full aspect-square object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Preview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Music Selection</h4>
              <button
                onClick={() => onEdit(classes.length + 2)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {selectedMusic?.name || 'No music selected'}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Background</h4>
              <button
                onClick={() => onEdit(classes.length + 1)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {backgroundOption.type === 'image' && backgroundOption.image
                ? `Custom image (${Math.round((backgroundOption.image.opacity || 0.8) * 100)}% opacity)`
                : backgroundOption.type === 'color' && backgroundOption.color
                ? `Solid color ${backgroundOption.color.color} (${Math.round((backgroundOption.color.opacity || 0.8) * 100)}% opacity)`
                : 'Default gradient background'}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Transitions</h4>
              <button
                onClick={() => onEdit(classes.length)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-600">{selectedTransition.name}</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Slide Duration</h4>
            </div>
            <p className="text-sm text-gray-600">{slideDuration} seconds per slide</p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center pt-4">
          <button
            onClick={onGenerate}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg transform hover:scale-105"
          >
            <Play className="h-6 w-6 mr-3" />
            Generate Slideshow Video
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This will create a high-quality 1080p video (~{getTotalDuration()} minutes) with all your selected settings
          </p>
        </div>
      </div>
    </WizardStepWrapper>
  );
};

export default PreviewStep;