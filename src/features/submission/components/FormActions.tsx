import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onSaveDraft?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  nextLabel?: string;
  showSaveDraft?: boolean;
  isNextDisabled?: boolean;
}

export const FormActions = ({
  onPrevious,
  onNext,
  onSaveDraft,
  isFirstStep = false,
  isLastStep = false,
  nextLabel = "Next",
  showSaveDraft = true,
  isNextDisabled = false,
}: FormActionsProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
      <div className="w-full sm:w-auto">
        {!isFirstStep && onPrevious && (
          <Button variant="outline" onClick={onPrevious} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        )}
      </div>

      <div className="flex gap-3 w-full sm:w-auto">
        {/* {showSaveDraft && onSaveDraft && (
          <Button variant="outline" onClick={onSaveDraft} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        )} */}
        {onNext && (
          <Button onClick={onNext} disabled={isNextDisabled} className="w-full sm:w-auto">
            {nextLabel}
            {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        )}
      </div>
    </div>
  );
};
