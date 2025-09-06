import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';

interface ClassCardProps {
  className: string;
  photos: File[];
  onPhotosUpdate: (photos: File[]) => void;
}

const ClassCard: React.FC<ClassCardProps> = ({ className, photos, onPhotosUpdate }) => {
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
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{className}</h3>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">{photos.length}/5 photos</div>
            <div className={`h-2 w-16 rounded-full ${
              photos.length === 0 ? 'bg-gray-200' :
              photos.length < 3 ? 'bg-yellow-200' :
              'bg-green-200'
            }`}>
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  photos.length === 0 ? 'bg-gray-400' :
                  photos.length < 3 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${(photos.length / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="relative aspect-square">
              {photos[index] ? (
                <div className="relative group">
                  <img
                    src={URL.createObjectURL(photos[index])}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors duration-200 ${
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
          
          <div className="flex flex-col items-center space-y-2">
            <Upload className={`h-8 w-8 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                disabled={photos.length >= 5}
              >
                {photos.length >= 5 ? 'Maximum photos reached' : 'Click to upload'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                or drag and drop images here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;