import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { DynamicFormBuilder } from "../components/FormBuilder";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { useFormPersistence } from "@/features/submission/hooks/useFormPersistence";
import { getDropdownOptions } from "../constants/dropdownMappings";
import { getCategoryFromSectionId } from "../utils/formDataTransformer";
import { MinistryStepper } from "../components/Stepper";
import { FormActions } from "@/features/submission/components/FormActions";
import { MinistryReviewSubmitStep } from "./MinistryReviewSubmitStep";
import { MinistryEmptyState } from "../components/MinistryEmptyState";
import { useMinistrySubmission } from "../hooks/useMinistrySubmission";
import { useMinistryFormData } from "../hooks/useMinistryFormData";
import { useMinistryValidation } from "../hooks/useMinistryValidation";
import { useMinistrySteps } from "../hooks/useMinistrySteps";
import { useMinistryAutoCalculation, applyIndicator1_1ToFormData } from "../hooks/useMinistryAutoCalculation";
import { useMinistrySubmissionActions } from "../hooks/useMinistrySubmissionActions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const categoryToStepMap: Record<string, string> = {
  "Infra Financing": "infra-financing",
  "Infra Development": "infra-development",
  "PPP Development": "ppp-development",
  "Infra Enablers": "infra-enablers",
};

export function MinistrySubmissionWrapper() {
  const {
    formData: persistedFormData,
  } = useFormPersistence();

  // Submission management hook
  const {
    submissionId,
    assignedIndicators,
    formData,
    submittedIndicators,
    submittedIndicatorsVersion,
    checking,
    loading,
    noSubmissionFound,
    submissionError,
    allIndicatorsAssigned,
    handleCreateSubmission,
    setFormData,
    setSubmittedIndicators,
    setSubmittedIndicatorsVersion,
    isInitialLoadRef,
    prevFormDataRef,
    updateSectionStatus,
  } = useMinistrySubmission(persistedFormData);

  // Validation hook
  const {
    validationErrors,
    validateFieldOnChange,
    getFieldErrorMemoized,
    setValidationErrorsForSection,
    clearValidationErrorsForSection,
    setValidationErrors,
    clearFieldError,
  } = useMinistryValidation({
    formData,
    assignedIndicators,
  });

  // Apply indicator 1.1 auto-calc on every formData update so it works during edit
  const setFormDataWithAutoCalc = useCallback(
    (arg: React.SetStateAction<Record<string, any>>) => {
      setFormData((prev) => {
        const next = typeof arg === "function" ? (arg as (prev: Record<string, any>) => Record<string, any>)(prev) : arg;
        return applyIndicator1_1ToFormData(next, assignedIndicators);
      });
    },
    [setFormData, assignedIndicators]
  );

  // Form data management hook
  const { handleFieldChange } = useMinistryFormData({
    formData,
    setFormData: setFormDataWithAutoCalc,
    isInitialLoadRef,
    prevFormDataRef,
    clearFieldError,
  });

  // Steps management hook
  const {
    stepsWithProgress,
    currentStep,
    isFirstStep,
    isLastStep,
    isReviewStep,
    currentCategoryIndicator,
    handleStepClick,
    handleNext,
    handlePrevious,
    calculateCategoryProgress,
  } = useMinistrySteps({
    assignedIndicators,
    formData,
  });

  // Auto-calculation hook (validation for 1.1; 2.5 and 3.3 still do value + validation in effect)
  useMinistryAutoCalculation({
    formData,
    setFormData: setFormDataWithAutoCalc,
    assignedIndicators,
    setValidationErrors,
  });

  // Submission actions hook
  const {
    handleSubmitIndicator,
    handleConfirmSubmit,
    handleCancelSubmit,
    handleSaveAsDraft,
    isIndicatorSubmitted,
    submittingIndicator,
    showSubmitDialog,
    setShowSubmitDialog,
    pendingIndicator,
  } = useMinistrySubmissionActions({
    formData,
    submissionId,
    assignedIndicators,
    submittedIndicators,
    submittedIndicatorsVersion,
    setSubmittedIndicators,
    setSubmittedIndicatorsVersion,
    setValidationErrorsForSection,
    clearValidationErrorsForSection,
    updateSectionStatus,
  });

  // Loading states
  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p>Checking your submission status...</p>
      </div>
    );
  }

  if (noSubmissionFound && !submissionId) {
    return (
      <MinistryEmptyState
        onCreateSubmission={handleCreateSubmission}
        error={submissionError || undefined}
        disabled={allIndicatorsAssigned}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p>Loading form...</p>
      </div>
    );
  }

  if (assignedIndicators.length === 0) {
    console.log("⚠️ No indicators - assignedIndicators is empty");
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-muted-foreground">No indicators assigned</p>
      </div>
    );
  }

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        {/* Stepper - acts as tabs */}
        {stepsWithProgress.length > 0 && (
          <MinistryStepper
            steps={stepsWithProgress}
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />
        )}

        {/* Tab Content - Show Review step or current category */}
        {isReviewStep ? (
          <MinistryReviewSubmitStep
            assignedIndicators={assignedIndicators}
            formData={formData}
            submissionId={submissionId}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            onPrevious={handlePrevious}
          />
        ) : currentCategoryIndicator ? (() => {
          const categoryName = Object.keys(currentCategoryIndicator)[0];
          const step = stepsWithProgress.find(
            (s) => s.title === categoryName || categoryToStepMap[categoryName] === s.key
          );
          const categoryProgress = calculateCategoryProgress(currentCategoryIndicator);
          
          return (
            <div>
              {/* ProgressHeader for current category */}
              <ProgressHeader
                title={categoryName}
                description={step?.description || ""}
                points={step?.points || 250}
                completed={categoryProgress.completed}
                total={categoryProgress.total}
                progress={categoryProgress.progress}
              />

              {/* DynamicFormBuilder for current category */}
              <div className="mt-4 sm:mt-6">
                <DynamicFormBuilder
                  indicators={[currentCategoryIndicator]}
                  formData={formData}
                  onChange={handleFieldChange}
                  mode="edit"
                  disabled={false}
                  submissionId={submissionId || undefined}
                  getFieldError={getFieldErrorMemoized}
                  getDropdownOptions={getDropdownOptions}
                  onSectionSubmit={handleSubmitIndicator}
                  onSaveDraft={handleSaveAsDraft}
                  isIndicatorSubmitted={isIndicatorSubmitted}
                  submittingIndicator={submittingIndicator}
                  validationErrors={validationErrors}
                  onValidateField={validateFieldOnChange}
                  onClearFieldError={clearFieldError}
                />
              </div>

              {/* Navigation Buttons */}
              <div className="mt-6 sm:mt-8">
                <FormActions
                  onPrevious={isFirstStep ? undefined : handlePrevious}
                  onNext={handleNext}
                  isFirstStep={isFirstStep}
                  isLastStep={isLastStep}
                  nextLabel={isLastStep ? "Review & Submit" : "Next"}
                  showSaveDraft={false}
                />
              </div>
            </div>
          );
        })() : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No category data available for the selected step.</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Submit */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit indicator{" "}
              <strong>
                {pendingIndicator?.code} - {pendingIndicator?.title}
              </strong>
              ? This will send the data for review. Once submitted, you cannot modify this indicator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={submittingIndicator !== null}
            >
              {submittingIndicator !== null
                ? "Submitting..."
                : "Confirm & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
