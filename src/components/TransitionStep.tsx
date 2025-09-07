import React from 'react';
import { Zap } from 'lucide-react';
import { TransitionType } from '../types';
import WizardStepWrapper from './WizardStepWrapper';

interface TransitionStepProps {
  selectedTransition: TransitionType;
  transitionTypes: TransitionType[];
  onTransitionUpdate: (transition: TransitionType) => void;
}

const TransitionStep: React.FC<TransitionStepProps> = ({
  selectedTransition,
  transitionTypes,
  onTransitionUpdate
}) => {
  return (
    <WizardStepWrapper
      title="Choose Transition Effects"
      description="Select how photos will transition between each other in your slideshow"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {transitionTypes.map((transition) => (
          <div
            key={transition.id}
            onClick={() => onTransitionUpdate(transition)}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              selectedTransition.id === transition.id
                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${
                selectedTransition.id === transition.id
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                <Zap className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{transition.name}</h3>
                <p className="text-gray-600">{transition.description}</p>
                {selectedTransition.id === transition.id && (
                  <div className="mt-3 text-sm font-medium text-indigo-600">
                    ✓ Selected
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </WizardStepWrapper>
  );
};

export default TransitionStep;