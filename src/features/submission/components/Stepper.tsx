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
    <div className="w-full bg-card rounded-lg p-6 mb-6 border border-[#DDD]">
      <div className="flex items-center justify-between relative">


        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = step.completed;
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          const isClickable = isPast || isCurrent;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center justify-start flex-1 relative"
              onClick={() => isClickable && onStepClick?.(stepNumber)}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full border-2 text-sm font-medium',
                  {
                    'border-green-600 text-green-600': isCurrent || isCompleted,
                    'border-gray-300 text-gray-400': !isCurrent && !isCompleted,
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
              {index < steps.length - 1 && (
                <div className={cn(`h-0.5 bg-border z-10 bg-[#C6C6C6] w-40 absolute top-4 -right-20`, {
                    'bg-[#C6C6C6]': isCurrent,
                    'bg-[#3C9718]': isCompleted,
                    'bg-[#C6C6C6]': !isCurrent && !isCompleted,
                  } )}></div>
              )}
              {/* Progress line */}
              {/* <div className="absolute top-4 left-0 right-0 h-0.5 bg-border z-10">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 60}%` }}
                />
              </div> */}
            </div>
          );
        })}
      </div>
    </div>
  );
};
