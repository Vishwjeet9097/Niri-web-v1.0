import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  nextLabel = 'Next',
  showSaveDraft = true,
  isNextDisabled = false,
}: FormActionsProps) => {
  return (
    <div className="flex items-center justify-between ">
      <div>
        {!isFirstStep && onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        )}
      </div>

      <div className="flex gap-3">
        {showSaveDraft && onSaveDraft && (
          <Button variant="outline" onClick={onSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        )}
        {onNext && (
          <Button onClick={onNext} disabled={false}>
            {/* disabled={isNextDisabled} // Commented out validation */}
            {nextLabel}
            {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        )}
      </div>
    </div>
  );
};
