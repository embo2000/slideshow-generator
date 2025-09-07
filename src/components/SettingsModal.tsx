import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';

interface SettingsModalProps {
  classes: string[];
  onUpdateClasses: (groups: string[]) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  classes,
  onUpdateClasses,
  onClose 
}) => {
  const [localGroups, setLocalGroups] = useState<string[]>([...classes]);
  const [newGroupName, setNewGroupName] = useState('');

  const handleAddGroup = () => {
    if (newGroupName.trim() && !localGroups.includes(newGroupName.trim())) {
      setLocalGroups([...localGroups, newGroupName.trim()]);
      setNewGroupName('');
    }
  };

  const handleRemoveGroup = (index: number) => {
    setLocalGroups(localGroups.filter((_, i) => i !== index));
  };

  const handleUpdateGroup = (index: number, newName: string) => {
    const updated = [...localGroups];
    updated[index] = newName;
    setLocalGroups(updated);
  };

  const handleSave = () => {
    onUpdateClasses(localGroups);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGroup();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Image Group Management</h2>
            <p className="text-sm text-gray-500 mt-1">Add and organize your image groups</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add New Image Group
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter group name..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
                <button
                  onClick={handleAddGroup}
                  disabled={!newGroupName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Image Groups ({localGroups.length})
              </label>
              <div className="space-y-2">
                {localGroups.map((groupName, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg group">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => handleUpdateGroup(index, e.target.value)}
                      className="flex-1 px-2 py-1 bg-transparent border-none focus:bg-white focus:border focus:border-gray-300 rounded outline-none transition-colors"
                    />
                    <button
                      onClick={() => handleRemoveGroup(index)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                {localGroups.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No image groups configured. Add your first group above.
                  </div>
                )}
              </div>
            </div>
          </div>
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