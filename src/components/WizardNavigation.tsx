import React from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGenerate?: () => void;
  isLastStep?: boolean;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  currentStep,
  totalSteps,
  canProceed,
  onPrevious,
  onNext,
  onGenerate,
  isLastStep = false
}) => {
  return (
    <div className="bg-white border-t shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>
          
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {totalSteps}
          </div>
          
          {isLastStep ? (
            <button
              onClick={onGenerate}
              disabled={!canProceed}
              className="inline-flex items-center px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <Play className="h-4 w-4 mr-2" />
              Generate Video
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canProceed}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardNavigation;