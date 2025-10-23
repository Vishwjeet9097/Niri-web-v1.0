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
    <div className="w-full mb-6">
      {/* Stepper Nav */}
      <ul className="relative flex flex-row gap-x-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = step.completed;
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          const isClickable = isPast || isCurrent;

          return (
            <li
              key={step.id}
              className="flex items-center gap-x-2 shrink basis-0 flex-1 group"
              onClick={() => isClickable && onStepClick?.(stepNumber)}
            >
              <span className="min-w-7 min-h-7 group inline-flex items-center text-xs align-middle">
                <span
                  className={cn(
                    'size-7 flex justify-center items-center shrink-0 font-medium rounded-full transition-colors',
                    {
                      'bg-gray-100 text-gray-800 group-focus:bg-gray-200': !isCurrent && !isCompleted,
                      'bg-blue-600 text-white': isCurrent,
                      'bg-teal-500 text-white group-focus:bg-teal-600': isCompleted,
                      'cursor-pointer hover:bg-gray-200': isClickable,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="shrink-0 size-3" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </span>
                <span className="ms-2 text-sm font-medium text-gray-800">
                  {step.title}
                </span>
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-full h-px flex-1 bg-gray-200 group-last:hidden transition-colors',
                    {
                      'bg-gray-200': !isCompleted,
                      'bg-teal-600': isCompleted,
                    }
                  )}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
