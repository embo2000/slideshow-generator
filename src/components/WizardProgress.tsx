import React from 'react';
import { Check, ChevronRight } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  completedSteps: boolean[];
  onStepClick?: (stepIndex: number) => void;
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  completedSteps,
  onStepClick
}) => {
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-6 overflow-x-auto">
        <div className="flex items-center justify-between min-w-max">
          {stepTitles.map((title, index) => (
            <React.Fragment key={index}>
              <div 
                className={`flex items-center ${onStepClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => onStepClick?.(index)}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  index < currentStep 
                    ? 'bg-teal-500 border-teal-500 text-white' 
                    : index === currentStep
                    ? 'bg-cyan-500 border-cyan-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <div className={`text-xs font-medium max-w-20 ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {title}
                  </div>
                </div>
              </div>
              {index < totalSteps - 1 && (
                <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
              )}
            </React.Fragment>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-teal-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardProgress;