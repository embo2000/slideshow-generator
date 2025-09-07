import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { BackgroundImage } from '../types';

interface BackgroundSelectorProps {
  backgroundImage: BackgroundImage | null;
  onBackgroundImageUpdate: (image: BackgroundImage | null) => void;
}

const BackgroundSelector: React.FC<BackgroundSelectorProps> = ({
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
    <div className="mb-8 bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <ImageIcon className="h-5 w-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-900">Background Image</h2>
      </div>
      
      {backgroundImage ? (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={backgroundImage.url}
              alt="Background"
              className="w-full h-32 object-cover rounded-lg border"
            />
            <button
              onClick={removeBackgroundImage}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            This background image will be used behind all photos in your slideshow
          </p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBackgroundImageUpload}
            className="hidden"
          />
          
          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">Add Background Image</h3>
          <p className="text-xs text-gray-500 mb-4">
            Upload an image to enhance your slideshow background
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Image
          </button>
        </div>
      )}
    </div>
  );
};

export default BackgroundSelector;