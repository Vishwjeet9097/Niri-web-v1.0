import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubmissionStep } from "../types";

interface StepperProps {
  steps: SubmissionStep[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

export const Stepper = ({ steps, currentStep, onStepClick }: StepperProps) => {
  return (
    <div className="w-full mb-6 bg-white rounded-lg shadow-sm border p-4">
      {/* Stepper Nav */}
      <ul className="relative flex flex-row gap-x-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          // Auto-complete previous steps when moving to next step
          const isCompleted = step.completed || stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          // Allow clicking on any step (forward or backward)
          const isClickable = !!onStepClick;

          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-x-2 shrink basis-0 flex-1 group",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStepClick?.(stepNumber)}
            >
              <span className="min-w-7 min-h-7 group inline-flex items-center text-xs align-middle">
                <span
                  className={cn(
                    "size-7 flex justify-center items-center shrink-0 font-medium rounded-full transition-colors",
                    {
                      "bg-gray-100 text-gray-800 group-focus:bg-gray-200":
                        !isCurrent && !isCompleted,
                      "bg-primary text-primary-foreground": isCurrent,
                      "bg-green-500 text-white group-focus:bg-green-600":
                        isCompleted,
                      "cursor-pointer hover:bg-gray-200": isClickable,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="shrink-0 size-3" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "ms-2 text-sm font-medium text-gray-800",
                    isClickable && "hover:text-primary transition-colors"
                  )}
                >
                  {step.title}
                </span>
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-full h-px flex-1 bg-gray-200 group-last:hidden transition-colors",
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
