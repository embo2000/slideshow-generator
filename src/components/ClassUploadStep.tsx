import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import WizardStepWrapper from './WizardStepWrapper';

interface ClassUploadStepProps {
  className: string;
  photos: File[];
  onPhotosUpdate: (photos: File[]) => void;
  stepNumber: number;
  totalClasses: number;
}

const ClassUploadStep: React.FC<ClassUploadStepProps> = ({
  className,
  photos,
  onPhotosUpdate,
  stepNumber,
  totalClasses
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      const newPhotos = [...photos, ...files].slice(0, 5);
      onPhotosUpdate(newPhotos);
    }
  }, [photos, onPhotosUpdate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newPhotos = [...photos, ...files].slice(0, 5);
      onPhotosUpdate(newPhotos);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosUpdate(newPhotos);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <WizardStepWrapper
      title={`Upload Photos for ${className}`}
      description={`Step ${stepNumber} of ${totalClasses} image groups - Add up to 5 photos for this group`}
    >
      <div className="space-y-6">
        {/* Photo Grid */}
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="relative aspect-square">
              {photos[index] ? (
                <div className="relative group">
                  <img
                    src={URL.createObjectURL(photos[index])}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            <Upload className={`h-12 w-12 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors"
                disabled={photos.length >= 5}
              >
                {photos.length >= 5 ? 'Maximum photos reached' : 'Click to upload photos'}
              </button>
              <p className="text-gray-500 mt-2">
                or drag and drop images here
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {photos.length}/5 photos uploaded
              </p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        {photos.length > 0 && (
          <div className="flex items-center justify-center space-x-2 p-4 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">
              {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded for {className}
            </span>
          </div>
        )}
      </div>
    </WizardStepWrapper>
  );
};

export default ClassUploadStep;