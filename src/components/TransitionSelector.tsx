import React from 'react';
import { Zap } from 'lucide-react';
import { TransitionType } from '../types';

interface TransitionSelectorProps {
  selectedTransition: TransitionType;
  transitionTypes: TransitionType[];
  onTransitionUpdate: (transition: TransitionType) => void;
}

const TransitionSelector: React.FC<TransitionSelectorProps> = ({
  selectedTransition,
  transitionTypes,
  onTransitionUpdate
}) => {
  return (
    <div className="mb-8 bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Zap className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-900">Transition Effects</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {transitionTypes.map((transition) => (
          <div
            key={transition.id}
            onClick={() => onTransitionUpdate(transition)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedTransition.id === transition.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                selectedTransition.id === transition.id
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{transition.name}</h3>
                <p className="text-sm text-gray-500">{transition.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
        <p className="text-sm text-indigo-800">
          <strong>Selected:</strong> {selectedTransition.name} - {selectedTransition.description}
        </p>
      </div>
    </div>
  );
};

export default TransitionSelector;