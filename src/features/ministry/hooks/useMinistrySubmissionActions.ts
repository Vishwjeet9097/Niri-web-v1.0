import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { submitIndicatorToMinistryApprover } from "@/services/ministry.service";
import { validateSection } from "../utils/validation";
import { getCategoryFromSectionId } from "../utils/formDataTransformer";
import type { AssignedIndicator } from "../components/FormBuilder/types";

interface UseMinistrySubmissionActionsProps {
  formData: Record<string, any>;
  submissionId: string | null;
  assignedIndicators: AssignedIndicator[];
  submittedIndicators: Set<string>;
  submittedIndicatorsVersion?: number; // Version number to track Set changes
  setSubmittedIndicators: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSubmittedIndicatorsVersion?: React.Dispatch<React.SetStateAction<number>>; // Optional version setter
  setValidationErrorsForSection: (errors: Record<string, string>) => void;
  clearValidationErrorsForSection: (sectionKey: string) => void;
}

export function useMinistrySubmissionActions({
  formData,
  submissionId,
  assignedIndicators,
  submittedIndicators,
  submittedIndicatorsVersion,
  setSubmittedIndicators,
  setSubmittedIndicatorsVersion,
  setValidationErrorsForSection,
  clearValidationErrorsForSection,
}: UseMinistrySubmissionActionsProps) {
  const { toast } = useToast();
  const [submittingIndicator, setSubmittingIndicator] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pendingIndicator, setPendingIndicator] = useState<{
    code: string;
    title: string;
    sectionKey: string;
    sectionData: Record<string, any>;
    currentSection: any;
    submissionIndicatorId: string;
  } | null>(null);

  // Handle initial submit button click - validate and show modal
  const handleSubmitIndicator = useCallback((indicatorCode: string) => {
    const sectionKey = `section${indicatorCode.replace('.', '_')}`;
    const sectionData = formData[sectionKey];
    
    const currentIndicator = assignedIndicators.find((indicatorObj) => {
      const categoryName = Object.keys(indicatorObj)[0];
      const sections = indicatorObj[categoryName];
      if (Array.isArray(sections)) {
        return sections.some((sectionObj: any) => {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          return section.sNo === indicatorCode;
        });
      }
      return false;
    });

    if (!currentIndicator) {
      toast({
        title: "Error",
        description: `Could not find indicator ${indicatorCode} in form structure.`,
        variant: "destructive",
      });
      return;
    }

    const indicatorName = Object.keys(currentIndicator)[0];
    const sections = currentIndicator[indicatorName];
    let currentSection = null;
    let sectionName: string | null = null;
    let submissionIndicatorId: string | null = null;
    
    if (Array.isArray(sections)) {
      sections.forEach((sectionObj: any) => {
        const name = Object.keys(sectionObj)[0];
        const section = sectionObj[name];
        if (section.sNo === indicatorCode) {
          currentSection = section;
          sectionName = name; // Store the actual section name (e.g., "Capital Utilization")
          submissionIndicatorId = section.submissionIndicatorId || null;
        }
      });
    }

    if (!currentSection) {
      toast({
        title: "Error",
        description: `Could not find section ${indicatorCode} in form structure.`,
        variant: "destructive",
      });
      return;
    }

    if (!submissionIndicatorId) {
      toast({
        title: "Error",
        description: `Could not find submission indicator ID for ${indicatorCode}.`,
        variant: "destructive",
      });
      return;
    }

    // Get indicator title for modal - use sectionName (e.g., "Capital Utilization") instead of just code
    const indicatorTitle = sectionName || currentSection.title || indicatorCode;

    // Validate before showing modal
    console.log("📋 BEFORE VALIDATION - Full Form Data:", JSON.stringify(formData, null, 2));
    console.log("📋 BEFORE VALIDATION - Section Data:", JSON.stringify(sectionData, null, 2));
    
    const sectionErrors = validateSection(currentSection, sectionKey, formData);
    const validationResult = {
      isValid: Object.keys(sectionErrors).length === 0,
      errors: sectionErrors,
    };
    
    console.log("🔍 Validation Result:", {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      errorCount: Object.keys(validationResult.errors).length,
    });
    
    if (!validationResult.isValid) {
      console.log("❌ Validation FAILED - Errors found:", validationResult.errors);
      
      const newErrors: Record<string, string> = {};
      Object.keys(validationResult.errors).forEach((key) => {
        if (key.startsWith(sectionKey)) {
          newErrors[key] = validationResult.errors[key];
        }
      });
      
      console.log("❌ Setting validation errors:", newErrors);
      setValidationErrorsForSection(newErrors);
      
      setTimeout(() => {
        const firstErrorPath = Object.keys(validationResult.errors)[0];
        if (firstErrorPath) {
          const errorElement = document.querySelector(`[data-field-path="${firstErrorPath}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            const generalError = document.querySelector(`[data-indicator-error="${indicatorCode}"]`);
            if (generalError) {
              generalError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }, 50);
      
      return;
    }
    
    console.log("✅ Validation PASSED - Showing confirmation modal");
    clearValidationErrorsForSection(sectionKey);

    // Check submissionId before showing modal
    if (!submissionId || submissionId === "exists") {
      console.error("❌ Submission blocked - Invalid submissionId:", {
        submissionId,
        reason: submissionId === "exists" ? "Using 'exists' placeholder" : "submissionId is null or empty",
      });
      toast({
        title: "Error",
        description: submissionId === "exists" 
          ? "Invalid submission ID. Please refresh the page to get the correct submission ID."
          : "No submission ID available. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Store pending indicator data for modal submission
    setPendingIndicator({
      code: indicatorCode,
      title: indicatorTitle,
      sectionKey,
      sectionData,
      currentSection,
      submissionIndicatorId,
    });
    setShowSubmitDialog(true);
  }, [formData, submissionId, assignedIndicators, setValidationErrorsForSection, clearValidationErrorsForSection, toast]);

  // Handle confirmation modal submit - performs actual API calls
  const handleConfirmSubmit = useCallback(async () => {
    if (!pendingIndicator) return;

    const { code: indicatorCode, sectionKey, sectionData, currentSection, submissionIndicatorId } = pendingIndicator;

    try {
      setSubmittingIndicator(indicatorCode);
      setShowSubmitDialog(false);
      
      console.log("==========================================");
      console.log("📋 SUBMITTING INDICATOR:", indicatorCode);
      console.log("==========================================");
      console.log("📋 Section Data:", JSON.stringify(sectionData, null, 2));
      console.log("📋 Submission Indicator ID:", submissionIndicatorId);
      console.log("📋 Submission ID:", submissionId);

      // All API calls happen here: file uploads + submission
      const response = await submitIndicatorToMinistryApprover(
        submissionIndicatorId,
        sectionData,
        currentSection,
        submissionId || undefined
      );

      console.log("✅ Indicator submission response:", response);

      // Update submitted indicators immediately BEFORE clearing submittingIndicator
      // This ensures the button shows "Submitted" immediately
      setSubmittedIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.add(indicatorCode);
        return newSet;
      });

      // Increment version counter to force re-render
      if (setSubmittedIndicatorsVersion) {
        setSubmittedIndicatorsVersion(prev => prev + 1);
      }

      // Clear submittingIndicator immediately so button updates
      setSubmittingIndicator(null);

      toast({
        title: "Success",
        description: `Indicator ${indicatorCode} submitted successfully.`,
        variant: "default",
      });

      // Clear pending indicator
      setPendingIndicator(null);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit indicator. Please try again.",
        variant: "destructive",
      });
      // Clear submittingIndicator on error too
      setSubmittingIndicator(null);
    }
  }, [pendingIndicator, submissionId, toast, setSubmittedIndicators]);

  // Handle cancel from modal
  const handleCancelSubmit = useCallback(() => {
    setShowSubmitDialog(false);
    setPendingIndicator(null);
  }, []);

  const isIndicatorSubmitted = useCallback((indicatorCode: string): boolean => {
    return submittedIndicators.has(indicatorCode);
  }, [submittedIndicators, submittedIndicatorsVersion]); // Include version to force recreation

  return {
    handleSubmitIndicator,
    handleConfirmSubmit,
    handleCancelSubmit,
    isIndicatorSubmitted,
    submittingIndicator,
    showSubmitDialog,
    setShowSubmitDialog,
    pendingIndicator,
  };
}
