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
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  {isCurrent && (
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="url(#grad)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray="100"
                      strokeDashoffset="0"
                    />
                  )}
                  <defs>
                    <linearGradient
                      id="grad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor="#3C9718" />
                      <stop offset="100%" stopColor="#b5e48c" />
                    </linearGradient>
                  </defs>
                </svg>
                <div
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium z-10",
                    {
                      "bg-[#3C9718] text-white": isCompleted, // solid green, white check
                      "bg-white text-green-700": isCurrent && !isCompleted, // white for current
                      "bg-white text-gray-400": !isCurrent && !isCompleted, // gray for future
                      "cursor-pointer": isClickable,
                    }
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : stepNumber}
                </div>
              </div>

              {/* Step label */}
              <div className="mt-2 text-center max-w-[120px]">
                <div
                  className={cn("text-xs font-medium", {
                    "text-[#3C9718]": isCurrent,
                    "text-foreground": isCompleted,
                    "text-muted-foreground": !isCurrent && !isCompleted,
                  })}
                >
                  {step.title}
                </div>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
  <div
    className={cn(
      "h-0.5 w-40 absolute top-6 -right-20 z-0",
      {
        "bg-[#3C9718]": steps[index].completed,
        "bg-[#C6C6C6]": !steps[index].completed,
      }
    )}
  />
)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
