'use client';

interface TutorialBannerProps {
  show: boolean;
  currentStep: number;
  totalSteps: number;
  stepText: string;
  onSkip: () => void;
  onNext: () => void;
}

export function TutorialBanner({
  show,
  currentStep,
  totalSteps,
  stepText,
  onSkip,
  onNext,
}: TutorialBannerProps) {
  if (!show) return null;

  return (
    <div className="p-4 rounded-xl bg-blue-900/40 border border-blue-700 text-sm text-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="space-y-1">
        <p className="font-semibold text-blue-50">Quick start</p>
        <p>{stepText}</p>
        <p className="text-xs text-blue-200">Step {currentStep + 1} of {totalSteps}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSkip}
          className="self-start md:self-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs uppercase tracking-wide"
        >
          Skip
        </button>
        <button
          onClick={onNext}
          className="self-start md:self-center px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-white text-xs uppercase tracking-wide"
        >
          {currentStep < totalSteps - 1 ? 'Next' : 'Done'}
        </button>
      </div>
    </div>
  );
}
