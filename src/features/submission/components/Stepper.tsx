import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubmissionStep } from '../types';

interface StepperProps {
  steps: SubmissionStep[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export const Stepper = ({ steps, currentStep, onStepClick }: StepperProps) => {
  return (
    <div className="w-full bg-card rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = step.completed;
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          const isClickable = isPast || isCurrent;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center flex-1 relative"
              onClick={() => isClickable && onStepClick?.(stepNumber)}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 bg-card border-2',
                  {
                    'border-primary bg-primary text-primary-foreground': isCurrent || isCompleted,
                    'border-border text-muted-foreground': !isCurrent && !isCompleted,
                    'cursor-pointer hover:border-primary/50': isClickable,
                  }
                )}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
              </div>

              {/* Step label */}
              <div className="mt-2 text-center max-w-[120px]">
                <div
                  className={cn('text-xs font-medium', {
                    'text-primary': isCurrent,
                    'text-foreground': isCompleted,
                    'text-muted-foreground': !isCurrent && !isCompleted,
                  })}
                >
                  {step.title}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
