import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, Palette, FolderOpen } from 'lucide-react';
import { BackgroundOption } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface BackgroundStepProps {
  backgroundOption: BackgroundOption;
  onBackgroundOptionUpdate: (option: BackgroundOption) => void;
  existingBackgroundImages?: Array<{
    id: string;
    name: string;
    url: string;
    createdTime: string;
  }>;
  onLoadExistingImage?: (imageData: { id: string; url: string; name: string }) => void;
}

const BackgroundStep: React.FC<BackgroundStepProps> = ({
  backgroundOption,
  onBackgroundOptionUpdate,
  existingBackgroundImages = [],
  onLoadExistingImage
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      onBackgroundOptionUpdate({
        type: 'image',
        image: { file, url, opacity: 0.8 }
      });
    }
  };

  const handleImageOpacityChange = (opacity: number) => {
    if (backgroundOption.type === 'image' && backgroundOption.image) {
      onBackgroundOptionUpdate({
        ...backgroundOption,
        image: { ...backgroundOption.image, opacity }
      });
    }
  };

  const handleColorChange = (color: string) => {
    onBackgroundOptionUpdate({
      type: 'color',
      color: { color, opacity: backgroundOption.color?.opacity || 0.8 }
    });
  };

  const handleColorOpacityChange = (opacity: number) => {
    if (backgroundOption.type === 'color' && backgroundOption.color) {
      onBackgroundOptionUpdate({
        ...backgroundOption,
        color: { ...backgroundOption.color, opacity }
      });
    }
  };

  const removeBackground = () => {
    if (backgroundOption.type === 'image' && backgroundOption.image) {
      URL.revokeObjectURL(backgroundOption.image.url);
    }
    onBackgroundOptionUpdate({ type: 'none' });
  };

  const setBackgroundType = (type: 'image' | 'color' | 'none') => {
    if (type === 'none') {
      removeBackground();
    } else if (type === 'color') {
      onBackgroundOptionUpdate({
        type: 'color',
        color: { color: '#14b8a6', opacity: 0.8 }
      });
    } else {
      // For image, we'll wait for file upload
      onBackgroundOptionUpdate({ type: 'none' });
    }
  };

  return (
    <WizardStepWrapper
      title="Choose Background"
      description="Add a custom background image or color for your slideshow (optional)"
    >
      <div className="space-y-6">
        {/* Background Type Selection */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setBackgroundType('none')}
            className={`p-4 rounded-lg border-2 transition-all ${
              backgroundOption.type === 'none'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg"></div>
              <span className="text-sm font-medium">Default Gradient</span>
            </div>
          </button>
          
          <button
            onClick={() => setBackgroundType('color')}
            className={`p-4 rounded-lg border-2 transition-all ${
              backgroundOption.type === 'color'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <Palette className="w-12 h-12 mx-auto mb-2 text-gray-600" />
              <span className="text-sm font-medium">Solid Color</span>
            </div>
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 rounded-lg border-2 transition-all ${
              backgroundOption.type === 'image'
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-center">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-600" />
              <span className="text-sm font-medium">Custom Image</span>
            </div>
          </button>
        </div>

        {/* Background Image Section */}
        {backgroundOption.type === 'image' && backgroundOption.image && (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={backgroundOption.image.url}
                alt="Background"
                className="w-full h-64 object-cover rounded-lg border shadow-sm"
                style={{ opacity: backgroundOption.image.opacity || 0.8 }}
              />
              <button
                onClick={removeBackground}
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
            
            {/* Image Opacity Control */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">Background Opacity</h3>
                  <p className="text-sm text-gray-600">Adjust how transparent the background image appears</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={backgroundOption.image.opacity || 0.8}
                    onChange={(e) => handleImageOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${((backgroundOption.image.opacity || 0.8) - 0.1) / 0.9 * 100}%, #e5e7eb ${((backgroundOption.image.opacity || 0.8) - 0.1) / 0.9 * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {Math.round((backgroundOption.image.opacity || 0.8) * 100)}%
                  </div>
                  <div className="text-sm text-gray-500">opacity</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Preview:</strong> Lower opacity makes the background more subtle, 
                  while higher opacity makes it more prominent behind your photos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show existing images when Custom Image is selected but no image is loaded */}
        {backgroundOption.type === 'image' && !backgroundOption.image && existingBackgroundImages.length > 0 && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FolderOpen className="h-8 w-8 text-teal-600 mx-auto mb-2" />
              <h3 className="font-medium text-teal-900 mb-1">Choose from Existing Images</h3>
              <p className="text-sm text-teal-700">
                Select a previously uploaded background image or upload a new one
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {existingBackgroundImages.map((image) => (
                <div
                  key={image.id}
                  className="relative group cursor-pointer border-2 border-gray-200 hover:border-teal-500 rounded-lg overflow-hidden transition-all duration-200"
                  onClick={() => onLoadExistingImage?.(image)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-white rounded-full p-2 shadow-lg">
                        <ImageIcon className="h-5 w-5 text-teal-600" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">{image.name}</p>
                    <p className="text-white text-xs opacity-75">
                      {new Date(image.createdTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center text-sm text-gray-500">
                <span>Or</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload new image section - show when Custom Image selected but no image loaded */}
        {backgroundOption.type === 'image' && !backgroundOption.image && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">Upload New Background Image</h3>
            <p className="text-xs text-gray-500 mb-4">
              Upload a new image to use as your slideshow background
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose New Image
            </button>
          </div>
        )}

        {/* Background Color Section */}
        {backgroundOption.type === 'color' && (
          <div className="space-y-4">
            {/* Color Preview */}
            <div className="relative">
              <div 
                className="w-full h-64 rounded-lg border shadow-sm"
                style={{ 
                  backgroundColor: backgroundOption.color?.color || '#14b8a6',
                  opacity: backgroundOption.color?.opacity || 0.8
                }}
              />
              <button
                onClick={removeBackground}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">
                ✓ Background color selected
              </p>
              <p className="text-sm text-green-600 mt-1">
                This color will appear behind all photos in your slideshow
              </p>
            </div>

            {/* Color Picker */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">Color Selection</h3>
                  <p className="text-sm text-gray-600">Choose your background color</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mb-4">
                <input
                  type="color"
                  value={backgroundOption.color?.color || '#14b8a6'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-16 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={backgroundOption.color?.color || '#14b8a6'}
                    onChange={(e) => handleColorChange(e.target.value)}
                    placeholder="#14b8a6"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Popular Colors */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Popular Colors</p>
                <div className="grid grid-cols-8 gap-2">
                  {[
                    '#14b8a6', '#06b6d4', '#10b981', '#f59e0b',
                    '#8b5cf6', '#ec4899', '#ef4444', '#84cc16',
                    '#6b7280', '#1f2937', '#7c3aed', '#dc2626',
                    '#059669', '#d97706', '#7c2d12', '#374151'
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        backgroundOption.color?.color === color
                          ? 'border-gray-800 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Color Opacity Control */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-gray-900">Background Opacity</h3>
                  <p className="text-sm text-gray-600">Adjust how transparent the background color appears</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex-1">
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={backgroundOption.color?.opacity || 0.8}
                    onChange={(e) => handleColorOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #14b8a6 0%, #14b8a6 ${((backgroundOption.color?.opacity || 0.8) - 0.1) / 0.9 * 100}%, #e5e7eb ${((backgroundOption.color?.opacity || 0.8) - 0.1) / 0.9 * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {Math.round((backgroundOption.color?.opacity || 0.8) * 100)}%
                  </div>
                  <div className="text-sm text-gray-500">opacity</div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Preview:</strong> Lower opacity makes the background more subtle, 
                  while higher opacity makes it more prominent behind your photos.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Default/None State */}
        {backgroundOption.type === 'none' && (
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-teal-800 text-sm">
              <strong>Default gradient background selected.</strong> Choose an image or color above to customize your background.
            </p>
          </div>
        )}

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundImageUpload}
          className="hidden"
        />
      </div>
    </WizardStepWrapper>
  );
};

export default BackgroundStep;