import React from 'react';

interface WizardStepWrapperProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const WizardStepWrapper: React.FC<WizardStepWrapperProps> = ({
  title,
  description,
  children
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {children}
      </div>
    </div>
  );
};

export default WizardStepWrapper;