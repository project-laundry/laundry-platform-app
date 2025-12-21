import { Check } from 'lucide-react';

interface CleanerFlowProgressProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}

const steps = [
  { number: 1, label: 'Forretning' },
  { number: 2, label: 'Tjenester' },
  { number: 3, label: 'Utstyr' },
  { number: 4, label: 'Profil' },
  { number: 5, label: 'Bekreftelse' }
];

export function CleanerFlowProgress({ currentStep }: CleanerFlowProgressProps) {
  return (
    <div className="flex items-center justify-center mb-12">
      <div className="flex items-center space-x-2 sm:space-x-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex items-center">
              {/* Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step.number < currentStep
                    ? 'bg-teal-600 text-white'
                    : step.number === currentStep
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {step.number < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>

              {/* Label - hidden on mobile */}
              <span
                className={`ml-2 hidden sm:inline text-sm font-medium ${
                  step.number <= currentStep ? 'text-teal-600' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Progress line - not after last step */}
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mx-1 sm:mx-3 transition-all ${
                  step.number < currentStep ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
