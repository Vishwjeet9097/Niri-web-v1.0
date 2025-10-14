import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { storageService } from "@/services/storage.service";
import { apiV2 } from "@/services/ApiService";
import { config } from "@/config/environment";
import { notificationService } from "@/services/NotificationBus";
import { transformFormDataForSubmission, validateFormData, getFormDataSummary } from "@/utils/formDataTransformer";
import { UnifiedReviewPage } from "../../dataSubmission/components/UnifiedReviewPage";
import { useAuth } from "@/features/auth/AuthProvider";

const PREVIEW_FLAG_KEY = "submission_has_previewed";

export const PreviewPage = () => {
  const navigate = useNavigate();
  const { formData, clearFormData, isResubmit } = useFormPersistence();
  const { user } = useAuth();
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState('');
  
  // Check if we're in edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);

  // Check for edit mode on mount
  useEffect(() => {
    const editingSubmissionId = localStorage.getItem('editing_submission_id');
    const isEditModeFlag = localStorage.getItem('is_edit_mode') === 'true';
    
    if (editingSubmissionId && isEditModeFlag) {
      setIsEditMode(true);
      setEditingSubmissionId(editingSubmissionId);
    }
    
    storageService.set(PREVIEW_FLAG_KEY, true);
    setHasPreviewed(true);
  }, []); // Empty dependency array to run only once

  // Final submit handler with confirmation modal
  const handleFinalSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    
    if (!formData) {
      notificationService.error("No form data found. Please go back and fill the form.");
      return;
    }

    // Validate form data before submission
    const validationResult = validateFormData(formData);
    if (!validationResult.isValid) {
      notificationService.error(`Please fix the following errors: ${validationResult.missingSections.join(", ")}`);
      return;
    }
    
    setShowConfirmModal(true);
  };

  // Actual submission logic
  const performSubmission = async () => {
    if (!formData) return;

    try {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    
      // Transform form data for API submission
      const transformedData = transformFormDataForSubmission(formData);
      
      let response;
      
      if (isEditMode && editingSubmissionId) {
        // Edit mode - use resubmit API
        response = await apiV2.post(`http://localhost:3000/submission/resubmit/${editingSubmissionId}`, transformedData);
      } else if (isResubmit) {
        // Resubmit mode - use resubmit API with submission ID from localStorage
        const editingSubmissionId = localStorage.getItem('editing_submission_id');
        if (editingSubmissionId) {
          response = await apiV2.post(`http://localhost:3000/submission/resubmit/${editingSubmissionId}`, transformedData);
        } else {
          response = await apiV2.post(`http://localhost:3000/submission`, transformedData);
        }
      } else {
        // Normal mode - create new submission
        response = await apiV2.post(`http://localhost:3000/submission`, transformedData);
      }
      
      console.log("✅ Submission successful:", response);

      // Clear form data from localStorage
      clearFormData();
      localStorage.removeItem("editing_submission_id");
      localStorage.removeItem("is_edit_mode");

      // Show success message
      const successMessage = isEditMode 
        ? "Form resubmitted successfully! Your changes have been sent for review."
        : isResubmit 
        ? "Form resubmitted successfully! Your updated submission has been sent for review."
        : "Form submitted successfully! Your submission has been sent for review.";
      
      setSubmissionMessage(successMessage);
      setShowSuccessModal(true);
      
      // Redirect after a delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);

    } catch (error: any) {
      console.error("❌ Submission failed:", error);
      notificationService.error(
        error.response?.data?.message || 
        "Failed to submit form. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a mock submission object for UnifiedReviewPage
  const mockSubmission = formData ? {
    id: "preview-submission",
    submissionId: "PREVIEW-001",
    stateUt: (formData as any).stateUt || "Preview State",
    submittedBy: "current-user",
    rejectionCount: 0,
    formData: formData,
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
      stateUt: user?.state || (formData as any).stateUt || "Preview State",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    finalScore: null
  } : null;

  if (!formData || !mockSubmission) {
  return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Form Data Found</h2>
          <p className="text-muted-foreground mb-4">Please go back and fill the form first.</p>
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
        onFinalSubmit={() => handleFinalSubmit()}
        isSubmitting={isSubmitting}
        isResubmit={isEditMode ? true : isResubmit}
        isEditMode={isEditMode}
      />

      {/* Confirmation Modal */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEditMode ? "Resubmit Form?" : isResubmit ? "Resubmit Form?" : "Submit Form?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode 
                ? "Are you sure you want to resubmit this form? Your changes will be sent for review."
                : isResubmit 
                ? "Are you sure you want to resubmit this form? Your changes will be sent for review."
                : "Are you sure you want to submit this form? Once submitted, you cannot make changes."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSubmission}>
              {isEditMode ? "Resubmit" : isResubmit ? "Resubmit" : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              {isResubmit ? "Form Resubmitted!" : "Form Submitted!"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {submissionMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};