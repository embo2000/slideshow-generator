import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { BackgroundImage } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface BackgroundStepProps {
  backgroundImage: BackgroundImage | null;
  onBackgroundImageUpdate: (image: BackgroundImage | null) => void;
}

const BackgroundStep: React.FC<BackgroundStepProps> = ({
  backgroundImage,
  onBackgroundImageUpdate
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      onBackgroundImageUpdate({ file, url });
    }
  };

  const removeBackgroundImage = () => {
    if (backgroundImage) {
      URL.revokeObjectURL(backgroundImage.url);
      onBackgroundImageUpdate(null);
    }
  };

  return (
    <WizardStepWrapper
      title="Choose Background Image"
      description="Add a custom background image for your slideshow (optional)"
    >
      <div className="space-y-6">
        {backgroundImage ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={backgroundImage.url}
                alt="Background"
                className="w-full h-64 object-cover rounded-lg border shadow-sm"
              />
              <button
                onClick={removeBackgroundImage}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">
                ✓ Background image selected
              </p>
              <p className="text-sm text-green-600 mt-1">
                This image will appear behind all photos in your slideshow
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBackgroundImageUpload}
                className="hidden"
              />
              
              <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Add Background Image</h3>
              <p className="text-gray-500 mb-6">
                Choose an image to enhance your slideshow background
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Upload className="h-5 w-5 mr-2" />
                Choose Image
              </button>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Optional:</strong> You can skip this step to use the default gradient background
              </p>
            </div>
          </div>
        )}
      </div>
    </WizardStepWrapper>
  );
};

export default BackgroundStep;