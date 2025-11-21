import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { storageService } from "@/services/storage.service";
import { apiV2 } from "@/services/ApiService";
import { config } from "@/config/environment";
import { notificationService } from "@/services/NotificationBus";
import { SectionCard } from "../components/SectionCard";
import {
  transformFormDataForSubmission,
  getFormDataSummary,
} from "@/utils/formDataTransformer";
import { Label } from "@/components/ui/label";
import { UnifiedReviewPage } from "../../dataSubmission/components/UnifiedReviewPage";
import { useAuth } from "@/features/auth/AuthProvider";
import { appendFilesRecursively } from "@/utils/appendFilesRecursively";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import {
  autoAcceptStateApproverIndicators,
  extractSubmissionId,
} from "@/services/autoAcceptance.service";
import { filterSectionFormDataByIndicators } from "@/utils/indicatorUtils";
const PREVIEW_FLAG_KEY = "submission_has_previewed";

export const PreviewPage = () => {
  const navigate = useNavigate();
  const { formData, clearFormData, isResubmit } = useFormPersistence();
  const { user } = useAuth();
  const { availableIndicators, isStateApprover, assignedIndicators, isNodalOfficer } = useIndicatorAccess();
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");

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
    if (isStateApprover && availableIndicators && availableIndicators.length > 0) {
      return filterSectionFormDataByIndicators(formData, availableIndicators);
    }
    
    // For other roles, return formData as-is
    return formData;
  }, [formData, isNodalOfficer, assignedIndicators, isStateApprover, availableIndicators]);

  // Final submit handler with confirmation modal
  const handleFinalSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();

    if (!formData) {
      notificationService.error(
        "No form data found. Please go back and fill the form."
      );
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

      // Use filtered formData for submission (already filtered in useMemo above)
      const formDataToSubmit = filteredFormData || formData;
      
      const transformedData = transformFormDataForSubmission(
        formDataToSubmit,
        "SUBMITTED_TO_STATE"
      );
      const multipartData = new FormData();
      multipartData.append("submission", JSON.stringify(transformedData));

      appendFilesRecursively(multipartData, formDataToSubmit);

      console.group("🧾 FormData entries being sent:");
      for (const [key, val] of multipartData.entries()) {
        console.log("➡️", key, val instanceof File ? val.name : val);
      }
      console.groupEnd();

      // Resolve token from multiple sources (new and legacy)
      const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
      const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
      const tokenFromNewKey = tokenData?.value?.accessToken;
      const tokenFromLegacyKey =
        localStorage.getItem("access_token") || undefined;
      const token = tokenFromNewKey || tokenFromLegacyKey || "";
      let response;

      if (isEditMode && editingSubmissionId) {
        response = await axios.post(
          `${config.apiBaseUrl}/submission/resubmit/${editingSubmissionId}`,
          multipartData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
      } else {
        response = await axios.post(
          `${config.apiBaseUrl}/submission`,
          multipartData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
      }

      console.log("✅ Submission successful:", response);

      // Get submission ID - use editingSubmissionId if resubmitting, otherwise extract from response
      const submissionId =
        isEditMode && editingSubmissionId
          ? editingSubmissionId
          : extractSubmissionId(response);

      // Auto-accept indicators if STATE_APPROVER submitted their own indicators
      if (isStateApprover && submissionId && availableIndicators.length > 0) {
        console.log(
          "🔄 [PreviewPage] STATE_APPROVER submission detected. Starting auto-acceptance..."
        );
        console.log(
          `📝 [PreviewPage] Submission ID: ${submissionId} (${
            isEditMode ? "resubmit" : "new"
          })`
        );
        try {
          // Use filtered formData for auto-acceptance (already filtered above)
          await autoAcceptStateApproverIndicators(
            submissionId,
            filteredFormData || formData || {},
            availableIndicators
          );
          console.log(
            "✅ [PreviewPage] Auto-acceptance completed successfully"
          );
        } catch (error: unknown) {
          // Log error but don't fail the submission
          console.error(
            "⚠️ [PreviewPage] Auto-acceptance failed, but submission was successful:",
            error
          );
          // Optionally show a warning to the user
          notificationService.warning(
            "Submission successful, but some indicators may need manual acceptance",
            "Auto-acceptance Warning"
          );
        }
      }

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
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit form.";
      notificationService.error(errorMessage, "Submission Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract attached files from original formData (not filtered) for documents tab
  // This ensures all files are visible even if formData is filtered for indicators
  const extractAttachedFiles = (data: any): any[] => {
    if (!data || typeof data !== "object") return [];

    const files: any[] = [];
    const seenPaths = new Set<string>();
    const seenIds = new Set<string>();

    // Check for attachedFiles array
    if (Array.isArray(data.attachedFiles)) {
      data.attachedFiles.forEach((f: any) => {
        if (f?.filePath && !seenPaths.has(f.filePath)) {
          seenPaths.add(f.filePath);
          files.push(f);
        } else if (f?.id && !seenIds.has(f.id) && f?.fileName) {
          // Preview file (no filePath yet)
          seenIds.add(f.id);
          files.push({
            id: f.id,
            fileName: f.fileName,
            originalName: f.originalName ?? f.fileName,
            filePath: undefined, // No filePath in preview mode
            fileSize: f.fileSize,
            mimeType: f.mimeType,
            uploadedBy: f.uploadedBy ?? "Unknown",
            uploadedAt: f.uploadedAt,
          });
        }
      });
    }
    
    // Recursively extract files from nested structure
    const extractRecursive = (obj: any, depth: number = 0) => {
      if (!obj || typeof obj !== "object" || depth > 10) return;
      
      // Check if this is a file object with filePath (uploaded file)
      if (obj.filePath && typeof obj.filePath === "string" && obj.filePath.trim() !== "") {
        if (!seenPaths.has(obj.filePath)) {
          seenPaths.add(obj.filePath);
          files.push({
            id: obj.id ?? obj.filePath,
            fileName: obj.fileName,
            originalName: obj.originalName,
            filePath: obj.filePath,
            fileSize: obj.fileSize,
            mimeType: obj.mimeType,
            uploadedBy: obj.uploadedBy,
            uploadedAt: obj.uploadedAt,
          });
        }
        return;
      }
      
      // Check if this is a preview file (has fileName/id but no filePath)
      if (obj.fileName && obj.id && !seenIds.has(obj.id) && (obj.fileSize || obj.uploadedAt)) {
        seenIds.add(obj.id);
        files.push({
          id: obj.id,
          fileName: obj.fileName,
          originalName: obj.originalName ?? obj.fileName,
          filePath: undefined, // No filePath in preview mode
          fileSize: obj.fileSize,
          mimeType: obj.mimeType,
          uploadedBy: obj.uploadedBy ?? "Unknown",
          uploadedAt: obj.uploadedAt,
        });
        return; // Don't recurse into file metadata objects
      }
      
      // Check for nested file structure (file.filePath or file.file)
      if (obj.file && typeof obj.file === "object" && !(obj.file instanceof File)) {
        // If file object has filePath, use it
        if (obj.file.filePath && typeof obj.file.filePath === "string" && obj.file.filePath.trim() !== "") {
          if (!seenPaths.has(obj.file.filePath)) {
            seenPaths.add(obj.file.filePath);
            files.push({
              id: obj.id ?? obj.file.id ?? obj.file.filePath,
              fileName: obj.fileName ?? obj.file.fileName,
              originalName: obj.originalName ?? obj.file.originalName,
              filePath: obj.file.filePath,
              fileSize: obj.fileSize ?? obj.file.fileSize,
              mimeType: obj.mimeType ?? obj.file.mimeType,
              uploadedBy: obj.uploadedBy ?? obj.file.uploadedBy ?? "Unknown",
              uploadedAt: obj.uploadedAt ?? obj.file.uploadedAt,
            });
          }
          return;
        }
        // If file object is empty but we have fileName/id at parent level, treat as preview file
        else if (obj.fileName && obj.id && !seenIds.has(obj.id) && Object.keys(obj.file).length === 0) {
          seenIds.add(obj.id);
          files.push({
            id: obj.id,
            fileName: obj.fileName,
            originalName: obj.originalName ?? obj.fileName,
            filePath: undefined, // No filePath in preview mode
            fileSize: obj.fileSize,
            mimeType: obj.mimeType,
            uploadedBy: obj.uploadedBy ?? "Unknown",
            uploadedAt: obj.uploadedAt,
          });
          return;
        }
      }
      
      // Recurse into arrays and objects
      if (Array.isArray(obj)) {
        obj.forEach((item) => extractRecursive(item, depth + 1));
      } else {
        // Skip certain keys to avoid infinite recursion
        const skipKeys = ['_metadata', 'status', 'marksObtained', 'proportion', 'percentage'];
        Object.entries(obj).forEach(([key, value]) => {
          if (!skipKeys.includes(key)) {
            extractRecursive(value, depth + 1);
          }
        });
      }
    };
    
    // Extract from all formData (including non-assigned sections for file visibility)
    extractRecursive(data);
    
    return files;
  };

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
        // Extract attached files from original formData (not filtered) so all files are visible
        attachedFiles: extractAttachedFiles(formData),
        // Store original formData for DocumentsTab to extract all files
        originalFormData: formData,
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
              {isEditMode
                ? "Resubmit Form?"
                : isResubmit
                ? "Resubmit Form?"
                : "Submit Form?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode
                ? "Are you sure you want to resubmit this form? Your changes will be sent for review."
                : isResubmit
                ? "Are you sure you want to resubmit this form? Your changes will be sent for review."
                : "Are you sure you want to submit this form? Once submitted, you cannot make changes."}
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
            <AlertDialogDescription>{submissionMessage}</AlertDialogDescription>
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
