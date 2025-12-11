import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { storageService } from "@/services/storage.service";
import { UnifiedReviewPage } from "../../dataSubmission/components/UnifiedReviewPage";
import { useAuth } from "@/features/auth/AuthProvider";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { filterSectionFormDataByIndicators } from "@/utils/indicatorUtils";
const PREVIEW_FLAG_KEY = "submission_has_previewed";

export const PreviewPage = () => {
  const navigate = useNavigate();
  const { formData, isResubmit } = useFormPersistence();
  const { user } = useAuth();
  const {
    availableIndicators,
    isStateApprover,
    assignedIndicators,
    isNodalOfficer,
  } = useIndicatorAccess();
  const [hasPreviewed, setHasPreviewed] = useState(false);

  // Check if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(
    null
  );

  // Check for edit mode on mount
  useEffect(() => {
    const editingSubmissionId = localStorage.getItem("editing_submission_id");
    const isEditModeFlag = localStorage.getItem("is_edit_mode") === "true";

    if (editingSubmissionId && isEditModeFlag) {
      setIsEditMode(true);
      setEditingSubmissionId(editingSubmissionId);
    }

    storageService.set(PREVIEW_FLAG_KEY, true);
    setHasPreviewed(true);
  }, []); // Empty dependency array to run only once

  // Filter formData based on assigned indicators for nodal officers
  const filteredFormData = useMemo(() => {
    if (!formData) return null;

    // For nodal officers, filter formData to only include assigned indicators
    if (isNodalOfficer && assignedIndicators && assignedIndicators.length > 0) {
      return filterSectionFormDataByIndicators(formData, assignedIndicators);
    }

    // For state approvers, filter formData to only include available indicators
    if (
      isStateApprover &&
      availableIndicators &&
      availableIndicators.length > 0
    ) {
      return filterSectionFormDataByIndicators(formData, availableIndicators);
    }

    // For other roles, return formData as-is
    return formData;
  }, [
    formData,
    isNodalOfficer,
    assignedIndicators,
    isStateApprover,
    availableIndicators,
  ]);

  // Create a mock submission object for UnifiedReviewPage
  const mockSubmission = filteredFormData
    ? {
        id: "preview-submission",
        submissionId: "PREVIEW-001",
        stateUt:
          ((filteredFormData as Record<string, unknown>).stateUt as string) ||
          "Preview State",
        submittedBy: "current-user",
        rejectionCount: 0,
        formData: filteredFormData,
        reviewComments: [],
        attachedFiles: [],
        status: isResubmit ? "RETURNED_FROM_STATE" : "PREVIEW",
        currentOwnerRole: "NODAL_OFFICER",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: user?.id || "current-user",
          email: user?.email || "preview@example.com",
          firstName: user?.firstName || "Preview",
          lastName: user?.lastName || "User",
          contactNumber: user?.contactNumber || null,
          role: user?.role || "NODAL_OFFICER",
          stateUt:
            user?.state ||
            ((filteredFormData as Record<string, unknown>).stateUt as string) ||
            "Preview State",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        finalScore: null,
      }
    : null;

  if (!filteredFormData || !mockSubmission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Form Data Found</h2>
          <p className="text-muted-foreground mb-4">
            Please go back and fill the form first.
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Use UnifiedReviewPage for preview */}
      <UnifiedReviewPage
        isPreview={true}
        isMospiApprover={false}
        submission={mockSubmission}
        isResubmit={isEditMode ? true : isResubmit}
        isEditMode={isEditMode}
        onFinalSubmit={() => { /* empty */ }}
      />
    </>
  );
};
