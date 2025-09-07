import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, Image, Upload, Zap } from 'lucide-react';
import { BackgroundImage, TransitionType } from '../types';

interface SettingsModalProps {
  classes: string[];
  onUpdateClasses: (classes: string[]) => void;
  backgroundImage: BackgroundImage | null;
  onBackgroundImageUpdate: (image: BackgroundImage | null) => void;
  selectedTransition: TransitionType;
  transitionTypes: TransitionType[];
  onTransitionUpdate: (transition: TransitionType) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  classes, 
  onUpdateClasses, 
  backgroundImage,
  onBackgroundImageUpdate,
  selectedTransition,
  transitionTypes,
  onTransitionUpdate,
  onClose 
}) => {
  const [localClasses, setLocalClasses] = useState<string[]>([...classes]);
  const [newClassName, setNewClassName] = useState('');
  const [activeTab, setActiveTab] = useState<'classes' | 'background' | 'transitions'>('classes');

  const handleAddClass = () => {
    if (newClassName.trim() && !localClasses.includes(newClassName.trim())) {
      setLocalClasses([...localClasses, newClassName.trim()]);
      setNewClassName('');
    }
  };

  const handleRemoveClass = (index: number) => {
    setLocalClasses(localClasses.filter((_, i) => i !== index));
  };

  const handleUpdateClass = (index: number, newName: string) => {
    const updated = [...localClasses];
    updated[index] = newName;
    setLocalClasses(updated);
  };

  const handleSave = () => {
    onUpdateClasses(localClasses);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddClass();
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Slideshow Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'classes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Classes
          </button>
          <button
            onClick={() => setActiveTab('background')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'background'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Background
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'transitions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transitions
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Classes Tab */}
          {activeTab === 'classes' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add New Class
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter class name..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                  <button
                    onClick={handleAddClass}
                    disabled={!newClassName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Classes ({localClasses.length})
                </label>
                <div className="space-y-2">
                  {localClasses.map((className, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg group">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={className}
                        onChange={(e) => handleUpdateClass(index, e.target.value)}
                        className="flex-1 px-2 py-1 bg-transparent border-none focus:bg-white focus:border focus:border-gray-300 rounded outline-none transition-colors"
                      />
                      <button
                        onClick={() => handleRemoveClass(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  {localClasses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No classes configured. Add your first class above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Background Tab */}
          {activeTab === 'background' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Background Image
              </label>
              
              {backgroundImage ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={backgroundImage.url}
                      alt="Background"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <button
                      onClick={removeBackgroundImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Background image will be used behind all photos in the slideshow
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No background image</h3>
                  <p className="text-gray-500 mb-4">
                    Upload a background image to enhance your slideshow
                  </p>
                  <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium cursor-pointer transition-colors">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Transitions Tab */}
          {activeTab === 'transitions' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Transition Effects
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {transitionTypes.map((transition) => (
                  <div
                    key={transition.id}
                    onClick={() => onTransitionUpdate(transition)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedTransition.id === transition.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedTransition.id === transition.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{transition.name}</h3>
                        <p className="text-sm text-gray-500">{transition.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;