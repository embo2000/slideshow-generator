import React from 'react';
import { Play, Edit, Music, Image as ImageIcon, Zap, Camera } from 'lucide-react';
import { ClassData, MusicTrack, BackgroundImage, TransitionType } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface PreviewStepProps {
  classData: ClassData;
  selectedMusic: MusicTrack | null;
  backgroundImage: BackgroundImage | null;
  selectedTransition: TransitionType;
  onGenerate: () => void;
  onEdit: (step: number) => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  classData,
  selectedMusic,
  backgroundImage,
  selectedTransition,
  onGenerate,
  onEdit
}) => {
  const getTotalPhotos = () => {
    return Object.values(classData).reduce((total, photos) => total + photos.length, 0);
  };

  const getClassesWithPhotos = () => {
    return Object.entries(classData).filter(([_, photos]) => photos.length > 0);
  };

  return (
    <WizardStepWrapper
      title="Review Your Slideshow"
      description="Review all your settings before generating the final video"
    >
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <Camera className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Photos</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{getTotalPhotos()}</div>
            <div className="text-sm text-blue-700">{getClassesWithPhotos().length} classes</div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center space-x-2 mb-2">
              <Music className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-900">Music</span>
            </div>
            <div className="text-sm font-semibold text-orange-600">
              {selectedMusic?.name || 'No music'}
            </div>
            <div className="text-sm text-orange-700">
              {selectedMusic ? `${selectedMusic.duration}s` : 'Silent'}
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <ImageIcon className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-900">Background</span>
            </div>
            <div className="text-sm font-semibold text-purple-600">
              {backgroundImage ? 'Custom Image' : 'Default Gradient'}
            </div>
          </div>

          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-5 w-5 text-indigo-600" />
              <span className="font-medium text-indigo-900">Transitions</span>
            </div>
            <div className="text-sm font-semibold text-indigo-600">
              {selectedTransition.name}
            </div>
          </div>
        </div>

        {/* Class Photos Preview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos by Class</h3>
          <div className="space-y-4">
            {getClassesWithPhotos().map(([className, photos], classIndex) => (
              <div key={className} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{className}</h4>
                  <button
                    onClick={() => onEdit(classIndex)}
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
                      alt={`${className} photo ${index + 1}`}
                      className="w-full aspect-square object-cover rounded border"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Music Selection</h4>
              <button
                onClick={() => onEdit(getClassesWithPhotos().length + 2)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {selectedMusic?.name || 'No background music'}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Background</h4>
              <button
                onClick={() => onEdit(getClassesWithPhotos().length + 1)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {backgroundImage ? 'Custom background image' : 'Default gradient background'}
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">Transitions</h4>
              <button
                onClick={() => onEdit(getClassesWithPhotos().length)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-gray-600">{selectedTransition.name}</p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="text-center pt-4">
          <button
            onClick={onGenerate}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg transform hover:scale-105"
          >
            <Play className="h-6 w-6 mr-3" />
            Generate Slideshow Video
          </button>
          <p className="text-sm text-gray-500 mt-2">
            This will create a high-quality 1080p video with all your selected settings
          </p>
        </div>
      </div>
    </WizardStepWrapper>
  );
};

export default PreviewStep;