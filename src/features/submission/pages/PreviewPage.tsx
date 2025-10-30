import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
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
import { SectionCard } from "../components/SectionCard";
import { transformFormDataForSubmission, getFormDataSummary } from "@/utils/formDataTransformer";
import { Label } from "@/components/ui/label";
import { UnifiedReviewPage } from "../../dataSubmission/components/UnifiedReviewPage";
import { useAuth } from "@/features/auth/AuthProvider";
import { appendFilesRecursively } from "@/utils/appendFilesRecursively";
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

    // Validation removed - allow submission without validation
    setShowConfirmModal(true);
  };

  // Actual submission logic
const performSubmission = async () => {
  if (!formData) return;

  try {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    const transformedData = transformFormDataForSubmission(formData, "SUBMITTED_TO_STATE");
    const multipartData = new FormData();
    multipartData.append("submission", JSON.stringify(transformedData));

    appendFilesRecursively(multipartData, formData);

    console.group("🧾 FormData entries being sent:");
    for (const [key, val] of multipartData.entries()) {
      console.log("➡️", key, val instanceof File ? val.name : val);
    }
    console.groupEnd();

    // Resolve token from multiple sources (new and legacy)
    const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
    const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
    const tokenFromNewKey = tokenData?.value?.accessToken;
    const tokenFromLegacyKey = localStorage.getItem("access_token") || undefined;
    const token = tokenFromNewKey || tokenFromLegacyKey || "";
    let response;

    if (isEditMode && editingSubmissionId) {
      response = await axios.post(
        `${config.apiBaseUrl}/submission/resubmit/${editingSubmissionId}`,
        multipartData,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
      );
    } else {
      response = await axios.post(`${config.apiBaseUrl}/submission`, multipartData, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
    }

    console.log("✅ Submission successful:", response);
    clearFormData();
    localStorage.removeItem("editing_submission_id");
    localStorage.removeItem("is_edit_mode");

    const successMessage = isEditMode
      ? "Form resubmitted successfully!"
      : "Form submitted successfully!";
    setSubmissionMessage(successMessage);
    setShowSuccessModal(true);

    setTimeout(() => navigate("/dashboard"), 3000);
  } catch (error: unknown) {
    console.error("❌ Submission failed:", error);
    const err = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage =
      err?.response?.data?.message || err?.message || "Failed to submit form.";
    notificationService.error(errorMessage, "Submission Error");
  } finally {
    setIsSubmitting(false);
  }
};
  // Create a mock submission object for UnifiedReviewPage
  const mockSubmission = formData ? {
    id: "preview-submission",
    submissionId: "PREVIEW-001",
    stateUt: (formData as Record<string, unknown>).stateUt as string || "Preview State",
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
      stateUt: user?.state || (formData as Record<string, unknown>).stateUt as string || "Preview State",
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