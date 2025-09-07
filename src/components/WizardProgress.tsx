import React from 'react';
import { Check, ChevronRight } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
  completedSteps: boolean[];
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  completedSteps
}) => {
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          {stepTitles.map((title, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  index < currentStep 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : index === currentStep
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}>
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="ml-3">
                  <div className={`text-sm font-medium ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {title}
                  </div>
                  <div className="text-xs text-gray-500">
                    Step {index + 1} of {totalSteps}
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
              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardProgress;