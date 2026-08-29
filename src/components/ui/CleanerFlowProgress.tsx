interface CleanerFlowProgressProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}

const STEPS = [1, 2, 3, 4, 5] as const;

export function CleanerFlowProgress({ currentStep }: CleanerFlowProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            n <= currentStep ? 'bg-sea-green' : 'bg-cream-dark'
          }`}
        />
      ))}
    </div>
  );
}
