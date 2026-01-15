import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MinistryStep } from "../types";

interface MinistryStepperProps {
  steps: MinistryStep[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export const MinistryStepper = ({ steps, currentStep, onStepClick }: MinistryStepperProps) => {
  return (
    <div className="w-full mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border p-3 sm:p-4">
      {/* Stepper Nav */}
      <ul className="relative flex flex-row gap-x-1 sm:gap-x-2 overflow-x-auto">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          // A step shows as completed (green tick) only if:
          // 1. It's actually completed (all sections have data filled) AND
          // 2. It's a past step (user has visited and moved past it)
          // Current step should show as blue (active), not green (completed)
          // Future steps should never show as completed
          const isCompleted = step.completed && isPast;
          // Allow clicking on any step (forward or backward)
          const isClickable = !!onStepClick;

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-x-1 sm:gap-x-2 shrink-0 sm:shrink basis-auto sm:basis-0 flex-1 group min-w-0",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStepClick?.(stepNumber)}
            >
              <span className="min-w-6 min-h-6 sm:min-w-7 sm:min-h-7 group inline-flex items-center text-xs align-middle">
                <span
                  className={cn(
                    "size-6 sm:size-7 flex justify-center items-center shrink-0 font-medium rounded-full transition-colors text-xs sm:text-sm",
                    {
                      "bg-gray-100 text-gray-800 group-focus:bg-gray-200":
                        !isCurrent && !isCompleted,
                      "bg-blue-600 text-white": isCurrent,
                      "bg-green-500 text-white group-focus:bg-green-600":
                        isCompleted,
                      "cursor-pointer hover:bg-gray-200": isClickable,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="shrink-0 size-2.5 sm:size-3" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "ms-1 sm:ms-2 text-xs sm:text-sm font-medium text-gray-800 truncate",
                    isClickable && "hover:text-blue-600 transition-colors"
                  )}
                >
                  {step.title}
                </span>
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-full h-px flex-1 bg-gray-200 group-last:hidden transition-colors hidden sm:block",
                    {
                      "bg-gray-200": !isCompleted && stepNumber >= currentStep,
                      "bg-green-600": isCompleted || stepNumber < currentStep,
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

