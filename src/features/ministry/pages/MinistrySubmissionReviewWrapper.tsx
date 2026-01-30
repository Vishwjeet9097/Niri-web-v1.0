/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  RefreshCw,
  Edit3,
  Check,
  X,
  Clock,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { DynamicFormBuilder } from "../components/FormBuilder";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { getDropdownOptions } from "../constants/dropdownMappings";
import {
  getMinistrySubmissionDetailsForReview,
  getMinistrySubmissionDetailsConsolidated,
  getMinistryPreviewData,
  getMinistryProgressBarData,
  getMospiMinistrySubmissionDetails,
  updateMinistryIndicatorStatus,
  updateMinistryIndicatorData,
  updateSubmissionIndicatorStatus,
  getMinistrySubmissionIndicatorComments,
  deleteMinistrySubmissionFile,
} from "@/services/ministry.service";
import { transformApiResponseToFormData } from "../utils/formDataTransformer";
import { extractSubmissionId } from "../utils/submissionIdExtractor";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MINISTRY_SUBMISSION_STEPS } from "../constants/steps";
import type { AssignedIndicator } from "../components/FormBuilder/types";
import { useAuth } from "@/features/auth/AuthProvider";
import { MinistryApproverActionButtons } from "../components/actionButtons/MinistryApproverActionButtons";
import { MospiReviewerActionButtons } from "../components/actionButtons/MospiReviewerActionButtons";
import { MospiApproverActionButtons } from "../components/actionButtons/MospiApproverActionButtons";
import { useEditableSectionStore } from "@/utils/EditableSection";
import { useMinistryValidation } from "../hooks/useMinistryValidation";
import { validateSection } from "../utils/validation";
import { MinistryCommentDialog } from "../components/modals/MinistryCommentDialog";
import { TimelineModal } from "@/features/dataSubmission/components/modals/TimelineModal";
import { workflowService } from "@/services/workflow.service";
import { IndicatorScoreToggle } from "@/components/IndicatorScoreToggle";
import { IndicatorScoreDisplay } from "@/components/IndicatorScoreDisplay";
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

interface MinistrySubmissionReviewWrapperProps {
  submission: any; // The submission object from the review page
  userId?: string; // Optional: user ID to fetch data for
  useConsolidatedApi?: boolean; // If true, use consolidated API with submissionId instead of userId
  submissionId?: string; // Submission ID for consolidated API
  consolidatedFormStatus?: string | null; // Consolidated form status (for freeze logic when viewing individual submissions)
}

export function MinistrySubmissionReviewWrapper({
  submission,
  userId,
  useConsolidatedApi = false,
  submissionId: propSubmissionId,
  consolidatedFormStatus: propConsolidatedFormStatus,
}: MinistrySubmissionReviewWrapperProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedIndicators, setAssignedIndicators] = useState<
    AssignedIndicator[]
  >([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(
    submission?.id || null,
  );

  // Edit mode state management
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();
  const [editingSections, setEditingSections] = useState<Set<string>>(
    new Set(),
  );
  const [originalFormDataSnapshots, setOriginalFormDataSnapshots] = useState<
    Record<string, any>
  >({});
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  // Store pending file deletions to execute on Save
  const [pendingFileDeletions, setPendingFileDeletions] = useState<
    Array<{
      action: "by-submission-indicator" | "by-primary-id";
      submissionIndicatorId?: string;
      primaryId?: string;
    }>
  >([]);

  // Validation hook for edit mode
  const {
    validationErrors,
    validateFieldOnChange,
    clearFieldError,
    getFieldErrorMemoized,
    setValidationErrorsForSection,
    clearValidationErrorsForSection,
  } = useMinistryValidation({
    formData,
    assignedIndicators,
  });
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveSectionId, setPendingSaveSectionId] = useState<
    string | null
  >(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [pendingAcceptSectionId, setPendingAcceptSectionId] = useState<
    string | null
  >(null);

  // Timeline state management
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [timelineComments, setTimelineComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [sectionTitleMap, setSectionTitleMap] = useState<
    Record<string, string>
  >({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>(
    {},
  );
  const [selectedSectionForComment, setSelectedSectionForComment] = useState<{
    submissionIndicatorId: string;
    sectionTitle: string;
    sectionId?: string;
    isSendBack?: boolean;
  } | null>(null);
  const [submittingIndicatorId, setSubmittingIndicatorId] = useState<
    string | null
  >(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [pendingSendBackAction, setPendingSendBackAction] = useState<{
    submissionIndicatorId: string;
    sectionId: string;
  } | null>(null);
  /** Form status from progress API when in preview (no submission). Used to freeze indicator status and progress until form is returned from MOSPI. */
  const [formStatusFromProgress, setFormStatusFromProgress] = useState<
    string | null
  >(null);

  // Handler to execute after comment is saved for send back action (MOSPI Approver)
  const handleSendBackAfterComment = async () => {
    if (!pendingSendBackAction) {
      return;
    }

    try {
      setSubmittingIndicatorId(pendingSendBackAction.submissionIndicatorId);
      console.log("📤 Sending back indicator after comment:", {
        submissionIndicatorId: pendingSendBackAction.submissionIndicatorId,
        sectionId: pendingSendBackAction.sectionId,
        status: "RETURNED_FROM_MOSPI_APPROVER_DRAFT",
      });

      await updateMinistryIndicatorStatus(
        pendingSendBackAction.submissionIndicatorId,
        "RETURNED_FROM_MOSPI_APPROVER_DRAFT",
      );

      toast({
        title: "Success",
        description: `Indicator ${pendingSendBackAction.sectionId} sent back successfully`,
      });

      // Dispatch custom event to notify parent component to reload form statistics
      window.dispatchEvent(
        new CustomEvent("ministry-indicator-status-updated", {
          detail: {
            sectionId: pendingSendBackAction.sectionId,
            status: "RETURNED_FROM_MOSPI_APPROVER_DRAFT",
          },
        }),
      );

      // Reload data to reflect the change
      setReloadTrigger((prev) => prev + 1);

      // Close dialog and reset state after successful send back
      setCommentDialogOpen(false);
      setSelectedSectionForComment(null);
    } catch (error: any) {
      console.error("❌ Error sending back indicator:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to send back indicator",
        variant: "destructive",
      });
      throw error; // Re-throw to let the dialog handle it
    } finally {
      setSubmittingIndicatorId(null);
      setPendingSendBackAction(null);
    }
  };
  // Load submission data with forReview=true
  useEffect(() => {
    loadSubmissionData();
  }, [
    submission?.id,
    userId,
    useConsolidatedApi,
    propSubmissionId,
    reloadTrigger,
  ]);

  const loadSubmissionData = async () => {
    try {
      setLoading(true);

      let response;

      //This condition is added by Harsh to check if the useConsolidatedApi is true and if it is true then use the consolidated API
      // Used for mospi reviewer and approver to review the submission
      // Use consolidated API if coming from MOSPI dashboard

      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string | null | undefined): boolean => {
        if (!str) return false;
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Define targetSubmissionId in outer scope so it's accessible later
      // Only use submissionId if it's a valid UUID (not a submission ID string like "SUB-2026-141817")
      const rawSubmissionId =
        submission?.id || submission?.submissionId || propSubmissionId;
      const targetSubmissionId =
        rawSubmissionId && isValidUUID(rawSubmissionId)
          ? rawSubmissionId
          : undefined;
      const targetUserId = userId || submission?.user?.id;

      if (useConsolidatedApi && useConsolidatedApi === true) {
        if (!targetSubmissionId) {
          console.error(
            "No valid UUID submission ID available for consolidated API",
          );
          toast({
            title: "Error",
            description:
              "A valid submission ID (UUID) is required to load submission data.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log(
          "📋 Loading consolidated submission data for review, submissionId:",
          targetSubmissionId,
        );
        response =
          await getMinistrySubmissionDetailsConsolidated(targetSubmissionId);
      } else {
        // Use existing API with userId
        // Only pass submissionId if it's a valid UUID, otherwise use only userId

        if (!targetSubmissionId && !targetUserId) {
          console.error("No submission ID or user ID available for review");
          toast({
            title: "Error",
            description:
              "Submission ID or User ID is required to load submission data.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // If we have a non-UUID submissionId (like "SUB-2026-141817"), ignore it and use only userId
        // For preview mode (when we only have userId and no valid UUID), use the preview API
        if (!targetSubmissionId && targetUserId) {
          console.log(
            "📋 Loading preview data using preview API, userId:",
            targetUserId,
          );
          response = await getMinistryPreviewData(targetUserId);
        } else {
          // Use the regular review API when we have a valid UUID submissionId
          console.log(
            "📋 Loading submission data for review, submissionId:",
            targetSubmissionId || "none (using userId)",
            "userId:",
            targetUserId,
          );
          response = await getMinistrySubmissionDetailsForReview(
            targetSubmissionId || undefined,
            targetUserId,
          );
        }
      }

      if (
        response?.status &&
        response?.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        console.log(
          "✅ Loaded submission indicators for review:",
          response.data.length,
        );
        console.log(
          "📋 Assigned indicators structure:",
          JSON.stringify(response.data, null, 2),
        );
        setAssignedIndicators(response.data);

        const initialFormData = transformApiResponseToFormData(
          response.data,
          {},
        );
        console.log("📋 Transformed formData:", Object.keys(initialFormData));
        // Log subsection entries for debugging
        Object.keys(initialFormData).forEach((sectionKey) => {
          const sectionData = initialFormData[sectionKey];
          if (sectionData && typeof sectionData === "object") {
            Object.keys(sectionData).forEach((key) => {
              if (Array.isArray(sectionData[key])) {
                console.log(
                  `📋 Section ${sectionKey}.${key}: ${sectionData[key].length} entries`,
                  sectionData[key],
                );
              }
            });
          }
        });
        // Merge with existing formData to preserve optimistic updates
        setFormData((prevFormData) => {
          const mergedFormData = { ...prevFormData };
          // Merge each section's data - server data takes precedence (it's the source of truth)
          Object.keys(initialFormData).forEach((key) => {
            if (
              prevFormData[key] &&
              typeof prevFormData[key] === "object" &&
              !Array.isArray(prevFormData[key])
            ) {
              // Merge section data, prioritizing server data (it's the source of truth after reload)
              mergedFormData[key] = {
                ...prevFormData[key],
                ...initialFormData[key],
              };
            } else {
              // If section doesn't exist in prevFormData, use the new data
              mergedFormData[key] = initialFormData[key];
            }
          });
          console.log(
            "📋 Merged formData after reload. Section keys:",
            Object.keys(mergedFormData),
          );
          return mergedFormData;
        });

        // Extract submission ID - prioritize from response, then from submission object
        if (useConsolidatedApi) {
          // For consolidated API, use the submissionId from response or prop
          const extractedId =
            response.submissionId || propSubmissionId || submission?.id;
          if (extractedId) {
            setSubmissionId(extractedId);
          }
        } else {
          let extractedId = response.submissionId || targetSubmissionId;
          if (!extractedId && targetUserId) {
            extractedId = await extractSubmissionId(
              response,
              targetUserId,
              toast,
            );
          }
          if (extractedId) {
            setSubmissionId(extractedId);
          } else if (submission?.id) {
            setSubmissionId(submission.id);
          }
        }
        // Fetch consolidated form status (from progress API) so we can freeze indicator statuses
        // when consolidated form is with MOSPI. This applies to both preview and individual submissions.
        // For individual submissions (especially from nodal officers), we need to find the ministry user
        // who consolidated the form to check if it's with MOSPI.
        // Consolidated form belongs to ministry approver. For progress/freeze we need ministry approver's form status.
        // When MINISTRY_APPROVER views any submission (own or nodal), use current user id so we get consolidated form status.
        // When NODAL_OFFICER views their submission, use submission.userId (form owner = ministry approver).
        let userIdForProgress =
          user?.role === "MINISTRY_APPROVER"
            ? user?.id
            : (targetUserId || (user?.role === "NODAL_OFFICER" && submission?.userId ? submission.userId : null));
        
        // Fallback for nodal: submission.userId is the form owner (ministry approver).
        if (!userIdForProgress && user?.role === "NODAL_OFFICER" && submission?.userId) {
          userIdForProgress = submission.userId;
        }
        // Fallback: try ministryUserId / user.ministryUserId from submission or response if present
        if (!userIdForProgress && user?.role === "NODAL_OFFICER") {
          userIdForProgress = (submission as any)?.ministryUserId ||
                              (submission as any)?.user?.ministryUserId ||
                              (response as any)?.ministryUserId ||
                              (response as any)?.data?.ministryUserId ||
                              (response as any)?.data?.user?.ministryUserId ||
                              null;
        }
        
        console.log("[MinistrySubmissionReviewWrapper] Freeze: userIdForProgress resolution:", {
          targetUserId,
          userRole: user?.role,
          submissionUserId: submission?.userId,
          submissionUserRole: submission?.user?.role,
          userIdForProgress,
          propConsolidatedFormStatus,
        });
        
        if (userIdForProgress) {
          getMinistryProgressBarData(userIdForProgress)
            .then((r: any) => {
              const d = r?.data ?? r;
              const formStatus = d?.formStatus ?? null;
              console.log("[MinistrySubmissionReviewWrapper] Progress API result:", { userIdForProgress, formStatus, rawKeys: d ? Object.keys(d) : [] });
              setFormStatusFromProgress(formStatus);
            })
            .catch((err) => {
              console.warn("[MinistrySubmissionReviewWrapper] Progress API failed:", userIdForProgress, err);
            });
        } else if (!userIdForProgress && user?.role === "NODAL_OFFICER" && user?.ministryId) {
          // Fallback for nodal officer: If we have propConsolidatedFormStatus from parent, use it
          // Otherwise, we can't get ministry user ID easily, so we can't check consolidated form status
          // The parent component should have tried to find it, but if it couldn't, we'll rely on propConsolidatedFormStatus
          if (propConsolidatedFormStatus) {
            // Parent found consolidated form status, we'll use it in formStatusForFreeze
            setFormStatusFromProgress(null); // Don't set it here, use propConsolidatedFormStatus directly
          } else {
            setFormStatusFromProgress(null);
          }
        } else {
          setFormStatusFromProgress(null);
        }
      } else {
        console.warn("No indicators found for review");
        toast({
          title: "No Data",
          description: "No submission data found for review.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error loading submission data for review:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to load submission data for review.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Extract categories from assignedIndicators and sort them according to MINISTRY_SUBMISSION_STEPS order
  const categories = useMemo(() => {
    const categoryMap = new Map<string, AssignedIndicator>();

    assignedIndicators.forEach((indicator) => {
      const categoryName = Object.keys(indicator)[0];
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, indicator);
      }
    });

    // Sort categories according to the order defined in MINISTRY_SUBMISSION_STEPS
    // Filter out the review-submit step and get only category steps
    const categorySteps = MINISTRY_SUBMISSION_STEPS.filter(
      (step) => step.key !== "review-submit",
    );

    // Create ordered categories list based on MINISTRY_SUBMISSION_STEPS order
    const orderedCategories: AssignedIndicator[] = [];
    categorySteps.forEach((step) => {
      const categoryIndicator = categoryMap.get(step.title);
      if (categoryIndicator) {
        orderedCategories.push(categoryIndicator);
      }
    });

    // Add any categories that exist in the data but not in MINISTRY_SUBMISSION_STEPS (fallback)
    categoryMap.forEach((indicator, categoryName) => {
      const exists = orderedCategories.some(
        (cat) => Object.keys(cat)[0] === categoryName,
      );
      if (!exists) {
        orderedCategories.push(indicator);
      }
    });

    console.log(
      "📋 Extracted categories (ordered):",
      orderedCategories.map((cat) => Object.keys(cat)[0]),
    );
    return orderedCategories;
  }, [assignedIndicators]);

  // When form is with MOSPI, freeze indicator status and progress only for MINISTRY_APPROVER (preview/review).
  // Do NOT freeze for MOSPI_APPROVER / MOSPI_REVIEWER so their Accept and Send Back actions work with real statuses.
  // For individual submissions (especially from nodal officers), prioritize:
  // 1) propConsolidatedFormStatus (from parent checking submissions list)
  // 2) formStatusFromProgress (from progress API)
  // 3) submission status
  // This ensures we freeze when consolidated form is with MOSPI, even if individual submission has a different status.
  const formStatusForFreeze =
    propConsolidatedFormStatus ??
    formStatusFromProgress ??
    submission?.status ??
    submission?.formStatus;
  
  // Freeze for both MINISTRY_APPROVER and NODAL_OFFICER when consolidated form is with MOSPI
  const isFormWithMospiForFreeze =
    (user?.role === "MINISTRY_APPROVER" || user?.role === "NODAL_OFFICER") &&
    [
      "SUBMITTED_TO_MOSPI_REVIEWER",
      "SUBMITTED_TO_MOSPI_APPROVER",
      "ACCEPTED_BY_MOSPI",
    ].includes((formStatusForFreeze || "").toUpperCase());

  // Debug: log freeze decision when any of the inputs change (helps trace why nodal forms don't freeze)
  if (user?.role === "MINISTRY_APPROVER" || user?.role === "NODAL_OFFICER") {
    console.log("[MinistrySubmissionReviewWrapper] Freeze decision:", {
      userRole: user?.role,
      propConsolidatedFormStatus,
      formStatusFromProgress,
      submissionStatus: submission?.status ?? submission?.formStatus,
      formStatusForFreeze,
      isFormWithMospiForFreeze,
    });
  }

  // Calculate progress for each category
  const getCategoryProgress = (categoryIndicator: AssignedIndicator) => {
    const categoryName = Object.keys(categoryIndicator)[0];
    const sections = categoryIndicator[categoryName];

    if (!Array.isArray(sections)) {
      return { completed: 0, total: 0, progress: 0 };
    }

    const total = sections.length;
    if (isFormWithMospiForFreeze) {
      return { completed: total, total, progress: 100 };
    }

    let completed = 0;
    sections.forEach((sectionObj: any) => {
      const sectionName = Object.keys(sectionObj)[0];
      const section = sectionObj[sectionName];
      const sectionKey = `section${section.sNo.replace(".", "_")}`;

      if (
        formData[sectionKey] &&
        Object.keys(formData[sectionKey]).length > 0
      ) {
        completed++;
      }
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, progress };
  };

  // Default to first category and update when categories change
  const [activeCategory, setActiveCategory] = useState<string>("");

  // State for indicator score toggle (per indicator) - for MOSPI approver
  const [indicatorScoreToggleState, setIndicatorScoreToggleState] = useState<
    Record<string, "score" | "updatedScore">
  >({});

  // Update activeCategory when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      const firstCategoryName = Object.keys(categories[0])[0];
      setActiveCategory(firstCategoryName);
    }
  }, [categories, activeCategory]);

  // Helper function to check if NODAL_OFFICER can edit section
  const canNodalOfficerEdit = (sectionId: string): boolean => {
    if (user?.role !== "NODAL_OFFICER") {
      return false;
    }

    const sectionStatus = getSectionStatus(sectionId);
    if (!sectionStatus) return false;

    const upperStatus = sectionStatus.toUpperCase();
    // NODAL_OFFICER can edit when status is RETURNED_FROM_MINISTRY (sent back by ministry)
    return upperStatus === "RETURNED_FROM_MINISTRY";
  };

  // Handle edit start
  const handleEditStart = (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Starting edit for section:",
      sectionId,
    );

    // Check if section is accepted - if so, prevent editing (unless NODAL_OFFICER editing sent back section)
    if (isSectionAccepted(sectionId) && !canNodalOfficerEdit(sectionId)) {
      toast({
        title: "Cannot Edit",
        description: `Section ${sectionId} has been accepted and cannot be edited.`,
        variant: "destructive",
      });
      return;
    }

    // For NODAL_OFFICER, allow editing only if status is RETURNED_FROM_MINISTRY
    if (user?.role === "NODAL_OFFICER" && !canNodalOfficerEdit(sectionId)) {
      toast({
        title: "Cannot Edit",
        description: `Section ${sectionId} cannot be edited. Only sections sent back by Ministry Approver can be edited.`,
        variant: "destructive",
      });
      return;
    }

    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Store original form data snapshot
    const originalData = formData[sectionKey]
      ? JSON.parse(JSON.stringify(formData[sectionKey]))
      : {};
    setOriginalFormDataSnapshots((prev) => ({
      ...prev,
      [sectionId]: originalData,
    }));

    // Enable edit mode
    setEditable(sectionId, true);
    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      console.log(
        "[MinistrySubmissionReviewWrapper] Updated editingSections:",
        Array.from(newSet),
      );
      return newSet;
    });

    console.log(
      "[MinistrySubmissionReviewWrapper] Edit mode enabled for section:",
      sectionId,
    );
    console.log(
      "[MinistrySubmissionReviewWrapper] Current editingSections:",
      Array.from(editingSections),
    );
  };

  // Handle edit cancel
  const handleEditCancel = (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Cancelling edit for section:",
      sectionId,
    );
    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Restore original form data
    const originalData = originalFormDataSnapshots[sectionId];
    if (originalData) {
      setFormData((prev) => ({
        ...prev,
        [sectionKey]: originalData,
      }));
    }

    // Clear edit mode
    setEditable(sectionId, false);
    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });

    // Clear snapshot
    setOriginalFormDataSnapshots((prev) => {
      const newSnapshots = { ...prev };
      delete newSnapshots[sectionId];
      return newSnapshots;
    });
  };

  // Perform the actual save operation
  const performSave = async (
    sectionId: string,
    submissionIndicatorId: string,
    currentSection: any,
    sectionData: any,
    sectionKey: string,
  ) => {
    // Set saving state
    setSavingSections((prev) => new Set(prev).add(sectionId));

    try {
      // Determine status based on user role and current section status
      let statusToSet = "SUBMITTED_TO_MINISTRY"; // Default status
      const sectionStatus = getSectionStatus(sectionId);

      // If NODAL_OFFICER is saving a section that was RETURNED_FROM_MINISTRY, set status to RESUBMITTED
      if (
        user?.role === "NODAL_OFFICER" &&
        sectionStatus?.toUpperCase() === "RETURNED_FROM_MINISTRY"
      ) {
        statusToSet = "RESUBMITTED";
        console.log(
          "[MinistrySubmissionReviewWrapper] NODAL_OFFICER resubmitting sent back section:",
          sectionId,
        );
      }

      // Execute all pending file deletions before saving
      // This ensures all deletions made during editing are executed when Save is clicked
      if (pendingFileDeletions.length > 0) {
        console.log(
          `[MinistrySubmissionReviewWrapper] Executing ${pendingFileDeletions.length} pending file deletions before save`,
        );
        // Execute all pending deletions
        const deletionPromises = pendingFileDeletions.map((deletion) =>
          deleteMinistrySubmissionFile(deletion).catch((error) => {
            console.error(
              "[MinistrySubmissionReviewWrapper] Error deleting file:",
              error,
            );
            // Continue with other deletions even if one fails
            return null;
          }),
        );
        await Promise.all(deletionPromises);
        // Clear all pending deletions after execution
        setPendingFileDeletions([]);
      }

      // Call update API to save data
      const updateResponse = await updateMinistryIndicatorData(
        submissionIndicatorId,
        sectionData,
        currentSection,
        submissionId || undefined,
        statusToSet,
      );

      console.log(
        "[MinistrySubmissionReviewWrapper] Update response:",
        updateResponse,
      );

      // If status is RESUBMITTED, also update the indicator status explicitly
      if (statusToSet === "RESUBMITTED") {
        console.log(
          "[MinistrySubmissionReviewWrapper] Updating indicator status to RESUBMITTED",
        );
        await updateSubmissionIndicatorStatus(
          submissionIndicatorId,
          "RESUBMITTED",
        );

        // Reload submission data to reflect the updated RESUBMITTED status
        console.log(
          "[MinistrySubmissionReviewWrapper] Reloading data after resubmission",
        );
        await loadSubmissionData();
      }

      // Update local formData immediately with the saved data (optimistic update)
      // Only update if not RESUBMITTED (since we reload data for RESUBMITTED)
      if (statusToSet !== "RESUBMITTED") {
        setFormData((prevFormData) => {
          const updatedFormData = { ...prevFormData };
          updatedFormData[sectionKey] = {
            ...(prevFormData[sectionKey] || {}),
            ...sectionData,
          };
          return { ...updatedFormData };
        });
      }

      // Clear edit mode
      setEditable(sectionId, false);
      setEditingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });

      // Clear snapshot
      setOriginalFormDataSnapshots((prev) => {
        const newSnapshots = { ...prev };
        delete newSnapshots[sectionId];
        return newSnapshots;
      });

      // Clear validation errors for this section after successful save
      clearValidationErrorsForSection(sectionKey);

      toast({
        title: "Success",
        description:
          statusToSet === "RESUBMITTED"
            ? `Section ${sectionId} resubmitted successfully`
            : `Section ${sectionId} updated successfully`,
      });
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast({
        title: "Error",
        description: error?.message || `Failed to save section ${sectionId}`,
        variant: "destructive",
      });
    } finally {
      setSavingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  // Handle save
  const handleSave = async (sectionId: string) => {
    console.log("[MinistrySubmissionReviewWrapper] Saving section:", sectionId);
    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Find the indicator and section data
    let submissionIndicatorId: string | null = null;
    let currentSection: any = null;

    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            submissionIndicatorId = (section as any).submissionIndicatorId;
            currentSection = section;
            break;
          }
        }
      }

      if (submissionIndicatorId) break;
    }

    if (!submissionIndicatorId || !currentSection) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      return;
    }

    // Get section data
    const sectionData = formData[sectionKey] || {};

    // Validate section before saving
    const sectionErrors = validateSection(currentSection, sectionKey, formData);

    // Check if there are any validation errors for this section
    const hasErrors = Object.keys(sectionErrors).length > 0;

    if (hasErrors) {
      // Set validation errors
      setValidationErrorsForSection(sectionErrors);

      toast({
        title: "Validation Error",
        description: `Please fix the errors in section ${sectionId} before saving.`,
        variant: "destructive",
      });

      // Scroll to first error field
      const firstErrorPath = Object.keys(sectionErrors)[0];
      const errorElement = document.querySelector(
        `[data-field-path="${firstErrorPath}"]`,
      );
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      return;
    }

    // Clear any existing validation errors for this section
    clearValidationErrorsForSection(sectionKey);

    // Check if this is a NODAL_OFFICER saving a RETURNED_FROM_MINISTRY section
    // If so, show confirmation dialog
    const sectionStatus = getSectionStatus(sectionId);
    if (
      user?.role === "NODAL_OFFICER" &&
      sectionStatus?.toUpperCase() === "RETURNED_FROM_MINISTRY"
    ) {
      // Show confirmation dialog
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    // Proceed with save directly if not a resubmission
    await performSave(
      sectionId,
      submissionIndicatorId,
      currentSection,
      sectionData,
      sectionKey,
    );
  };

  // Handle confirm save from dialog
  const handleConfirmSave = async () => {
    if (!pendingSaveSectionId) return;

    const sectionId = pendingSaveSectionId;
    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Find the indicator and section data
    let submissionIndicatorId: string | null = null;
    let currentSection: any = null;

    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            submissionIndicatorId = (section as any).submissionIndicatorId;
            currentSection = section;
            break;
          }
        }
      }

      if (submissionIndicatorId) break;
    }

    if (!submissionIndicatorId || !currentSection) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      setShowSaveDialog(false);
      setPendingSaveSectionId(null);
      return;
    }

    // Get section data
    const sectionData = formData[sectionKey] || {};

    // Close dialog
    setShowSaveDialog(false);
    setPendingSaveSectionId(null);

    // Perform save
    await performSave(
      sectionId,
      submissionIndicatorId,
      currentSection,
      sectionData,
      sectionKey,
    );
  };

  // Handle cancel save dialog
  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSaveSectionId(null);
  };

  // Helper function to get section status from assignedIndicators. When form is with MOSPI, indicator status does not change until form is returned from MOSPI. Use "ACCEPTED" (not "ACCEPTED_BY_MOSPI") so Preview shows "Accepted" like the review submission form.
  const getSectionStatus = (sectionId: string): string | null => {
    if (isFormWithMospiForFreeze) {
      console.log("[MinistrySubmissionReviewWrapper] getSectionStatus: returning ACCEPTED (frozen) for", sectionId);
      return "ACCEPTED";
    }
    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            return (section as any).status || null;
          }
        }
      }
    }
    return null;
  };

  // Helper function to get assignedTo from section
  const getSectionAssignedTo = (sectionId: string): string | null => {
    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            return (section as any).assignedTo || null;
          }
        }
      }
    }
    return null;
  };

  // Memoized check if indicator 3.3 can be accepted (linkedIndicatorData must match Total Budgeted capital allocation)
  const canAcceptIndicator3_3 = useMemo((): boolean => {
    // Only check for MINISTRY_APPROVER role
    if (user?.role !== "MINISTRY_APPROVER") {
      return true; // Allow for other roles
    }

    if (!formData || !assignedIndicators.length) {
      return false; // Can't validate without data
    }

    const section3_3Data = formData.section3_3;
    if (!section3_3Data) {
      return false; // Can't validate if section doesn't exist
    }

    // Find indicator 3.3 section in assignedIndicators to get linkedIndicatorData
    let linkedIndicatorDataValue: any = null;
    let BUDGETED_CAPITAL_ALLOCATION_FIELD_ID: string | null = null;

    for (const indicatorObj of assignedIndicators) {
      const indicatorName = Object.keys(indicatorObj)[0];
      if (
        indicatorName === "PPP Development" ||
        indicatorName.toLowerCase().includes("ppp development")
      ) {
        const sections = indicatorObj[indicatorName];
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          if (section.sNo === "3.3") {
            // Get linkedIndicatorData from section
            const linkedData = (section as any).linkedIndicatorData;
            console.log(
              "[MinistryValidation] Raw linkedIndicatorData for 3.3:",
              linkedData,
              "Type:",
              typeof linkedData,
              "Is object:",
              typeof linkedData === 'object' && linkedData !== null
            );
            
            if (linkedData !== undefined && linkedData !== null) {
              // linkedIndicatorData might be an object with a 'data' property
              if (typeof linkedData === 'object' && !Array.isArray(linkedData) && linkedData.data !== undefined) {
                linkedIndicatorDataValue = linkedData.data;
                console.log(
                  "[MinistryValidation] Found linkedIndicatorData.data for 3.3:",
                  linkedIndicatorDataValue,
                  "Full linkedIndicatorData:",
                  linkedData
                );
              } else {
                // linkedIndicatorData might be a direct value
                linkedIndicatorDataValue = linkedData;
                console.log(
                  "[MinistryValidation] Found linkedIndicatorData (direct value) for 3.3:",
                  linkedIndicatorDataValue
                );
              }
            } else {
              console.warn(
                "[MinistryValidation] linkedIndicatorData is null or undefined for 3.3"
              );
            }

            // Find "Total Budgeted capital allocation" field ID
            if (section.inputs && Array.isArray(section.inputs)) {
              for (const input of section.inputs) {
                const label = input.label?.toLowerCase() || "";
                if (
                  label.includes("total budgeted capital allocation") ||
                  (label.includes("budgeted") &&
                    label.includes("capital") &&
                    label.includes("allocation")) ||
                  (label.includes("total") &&
                    label.includes("budgeted") &&
                    label.includes("capital"))
                ) {
                  BUDGETED_CAPITAL_ALLOCATION_FIELD_ID = input.id;
                  console.log(
                    "[MinistryValidation] Found 3.3 Budgeted Capital Allocation field:",
                    input.id,
                    input.label
                  );
                  break;
                }
              }
            }
            break;
          }
        }
        // Continue searching even if one is found, to ensure we get both
        if (linkedIndicatorDataValue !== null && BUDGETED_CAPITAL_ALLOCATION_FIELD_ID) {
          break;
        }
      }
    }

    // Check if we have both linkedIndicatorData and the field ID
    if (linkedIndicatorDataValue === null) {
      console.warn(
        "[MinistryValidation] Indicator 3.3 accept check: linkedIndicatorData not found"
      );
      return false; // Disable accept if linkedIndicatorData is not found
    }

    if (!BUDGETED_CAPITAL_ALLOCATION_FIELD_ID) {
      console.warn(
        "[MinistryValidation] Indicator 3.3 accept check: Total Budgeted capital allocation field not found"
      );
      return false; // Disable accept if field is not found
    }

    // Get the value entered in the "Total Budgeted capital allocation" input field
    const budgetedCapitalAllocationValue =
      section3_3Data[BUDGETED_CAPITAL_ALLOCATION_FIELD_ID] || "";

    console.log(
      "[MinistryValidation] Indicator 3.3 accept check - Comparing values:",
      {
        linkedIndicatorDataValue,
        BUDGETED_CAPITAL_ALLOCATION_FIELD_ID,
        budgetedCapitalAllocationValue,
      }
    );

    // If input field is empty, disable accept
    if (!budgetedCapitalAllocationValue || String(budgetedCapitalAllocationValue).trim() === "") {
      console.log(
        "[MinistryValidation] Indicator 3.3 accept check: Total Budgeted capital allocation value is empty - DISABLING Accept"
      );
      return false; // Disable accept if input is empty
    }

    // Normalize both values by removing currency symbols and whitespace, then compare as numbers
    const linkedValueStr = String(linkedIndicatorDataValue).trim().replace(/[₹,]/g, "");
    const budgetedValueStr = String(budgetedCapitalAllocationValue).trim().replace(/[₹,]/g, "");

    const linkedValueNum = parseFloat(linkedValueStr);
    const budgetedValueNum = parseFloat(budgetedValueStr);

    // Check if both are valid numbers
    if (isNaN(linkedValueNum) || isNaN(budgetedValueNum)) {
      console.log(
        "[MinistryValidation] Indicator 3.3 accept check: Invalid numbers - DISABLING Accept",
        {
          linkedValueStr,
          budgetedValueStr,
          linkedValueNum,
          budgetedValueNum,
        }
      );
      return false; // Disable accept if values are not valid numbers
    }

    // Compare: if linkedIndicatorData equals input value → enable Accept, otherwise disable
    // Use a small epsilon for floating point comparison to handle precision issues
    const epsilon = 0.01;
    const difference = Math.abs(linkedValueNum - budgetedValueNum);
    const valuesMatch = difference < epsilon;
    
    console.log(
      "[MinistryValidation] Indicator 3.3 accept check - Final comparison:",
      {
        linkedIndicatorDataValue: linkedIndicatorDataValue,
        linkedValueNum: linkedValueNum,
        budgetedCapitalAllocationValue: budgetedCapitalAllocationValue,
        budgetedValueNum: budgetedValueNum,
        difference: difference,
        epsilon: epsilon,
        valuesMatch: valuesMatch,
        result: valuesMatch ? "✅ ENABLING Accept" : "❌ DISABLING Accept",
      }
    );

    // Return true if values match (enable Accept), false if they don't match (disable Accept)
    return valuesMatch;
  }, [formData, assignedIndicators, user?.role]);

  // Helper function to check if section is accepted
  const isSectionAccepted = (sectionId: string): boolean => {
    const status = getSectionStatus(sectionId);
    if (!status) return false;
    const upperStatus = status.toUpperCase();
    return (
      upperStatus === "ACCEPTED_BY_MINISTRY" ||
      upperStatus === "ACCEPTED_BY_MOSPI" ||
      upperStatus === "ACCEPTED"
    );
  };

  // Helper function to get submissionIndicatorId from sectionId
  const getSubmissionIndicatorId = useCallback(
    (sectionId: string): string | null => {
      for (const categoryIndicator of assignedIndicators) {
        const categoryName = Object.keys(categoryIndicator)[0];
        const sections = categoryIndicator[categoryName];

        if (Array.isArray(sections)) {
          for (const sectionObj of sections) {
            const sectionName = Object.keys(sectionObj)[0];
            const section = sectionObj[sectionName];

            if (section.sNo === sectionId) {
              return (section as any).submissionIndicatorId || null;
            }
          }
        }
      }
      return null;
    },
    [assignedIndicators],
  );

  // Helper function to get section title from sectionId
  const getSectionTitle = (sectionId: string): string => {
    // Check if we have it cached
    if (sectionTitleMap[sectionId]) {
      return sectionTitleMap[sectionId];
    }

    // Try to find it from assignedIndicators
    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            const title = `${sectionId} - ${sectionName}`;
            setSectionTitleMap((prev) => ({ ...prev, [sectionId]: title }));
            return title;
          }
        }
      }
    }
    return sectionId;
  };

  // Helper function to format ministry comments for TimelineModal
  const formatCommentsForTimeline = (
    comments: any[],
    sectionId: string,
  ): any[] => {
    return comments.map((comment) => {
      const commentRole = comment.user?.role || "UNKNOWN";
      return {
        role: commentRole,
        userRole: commentRole, // Add userRole for compatibility with getCommentVisibility
        text: comment.text || "",
        type: "comment",
        userId: comment.userId || "",
        sectionId: sectionId,
        timestamp:
          comment.createdAt || comment.timestamp || new Date().toISOString(),
        userName: comment.user
          ? `${comment.user.firstName || ""} ${
              comment.user.lastName || ""
            }`.trim() || comment.user.email
          : undefined,
      };
    });
  };

  // Function to fetch comments for a section
  const fetchCommentsForSection = async (sectionId: string) => {
    const submissionIndicatorId = getSubmissionIndicatorId(sectionId);
    if (!submissionIndicatorId) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingComments(true);
      const response = await getMinistrySubmissionIndicatorComments(
        submissionIndicatorId,
      );

      console.log(
        "[MinistrySubmissionReviewWrapper] Comments API response:",
        response,
      );
      console.log(
        "[MinistrySubmissionReviewWrapper] Response status:",
        response?.status,
      );
      console.log(
        "[MinistrySubmissionReviewWrapper] Response data:",
        response?.data,
      );
      console.log(
        "[MinistrySubmissionReviewWrapper] Is data array?",
        Array.isArray(response?.data),
      );

      // Handle both response formats:
      // 1. Direct array: [{...}, {...}]
      // 2. Wrapped format: { status: true, data: [{...}, {...}] }
      let commentsArray: any[] = [];

      if (Array.isArray(response)) {
        // Response is directly an array
        commentsArray = response;
      } else if (response?.status && Array.isArray(response.data)) {
        // Response is wrapped in status/data structure
        commentsArray = response.data;
      } else if (Array.isArray(response?.data)) {
        // Response has data property that is an array
        commentsArray = response.data;
      }

      if (commentsArray.length > 0) {
        const formattedComments = formatCommentsForTimeline(
          commentsArray,
          sectionId,
        );
        console.log(
          "[MinistrySubmissionReviewWrapper] Formatted comments:",
          formattedComments,
        );

        // Filter comments based on user role visibility
        const currentUserRole = user?.role as any;
        console.log(
          "[MinistrySubmissionReviewWrapper] Filtering comments. User role:",
          currentUserRole,
          "Total formatted comments:",
          formattedComments.length,
        );

        const visibleComments = formattedComments.filter((comment: any) => {
          try {
            // Create a comment object compatible with getCommentVisibility
            const reviewComment = {
              ...comment,
              userRole: comment.userRole || comment.role,
            };
            const isVisible = workflowService.getCommentVisibility(
              reviewComment,
              currentUserRole,
            );
            console.log(
              "[MinistrySubmissionReviewWrapper] Comment visibility check:",
              {
                commentRole: reviewComment.userRole,
                userRole: currentUserRole,
                isVisible,
              },
            );
            return isVisible;
          } catch (error) {
            console.error(
              "[MinistrySubmissionReviewWrapper] Error checking comment visibility:",
              error,
              comment,
            );
            // If there's an error, don't show the comment
            return false;
          }
        });

        console.log(
          "[MinistrySubmissionReviewWrapper] Visible comments after filtering:",
          visibleComments.length,
          "out of",
          formattedComments.length,
          "User role:",
          currentUserRole,
        );
        setTimelineComments(visibleComments);
      } else {
        console.warn(
          "[MinistrySubmissionReviewWrapper] No comments found in response:",
          response,
        );
        // Still set empty array so modal can show "No comments" message
        setTimelineComments([]);
      }
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch comments. Please try again.",
        variant: "destructive",
      });
      setTimelineComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  // Handle opening timeline
  const handleOpenTimeline = async (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Opening timeline for section:",
      sectionId,
    );
    // Clear previous comments and set loading state
    setTimelineComments([]);
    setLoadingComments(true);
    // Set timeline section first to ensure modal opens
    setTimelineSection(sectionId);
    // Fetch comments asynchronously
    try {
      await fetchCommentsForSection(sectionId);
    } catch (error) {
      console.error(
        "[MinistrySubmissionReviewWrapper] Error in handleOpenTimeline:",
        error,
      );
      // Even if there's an error, keep the modal open with empty comments
      setTimelineComments([]);
      setLoadingComments(false);
    }
  };

  // Handle closing timeline
  const handleCloseTimeline = () => {
    setTimelineSection(null);
    setTimelineComments([]);
    setLoadingComments(false);
  };

  // Handler for pending file deletions (called when user clicks 'x' in edit mode)
  const handlePendingDeletion = useCallback(
    (deletionInfo: {
      action: "by-submission-indicator" | "by-primary-id";
      submissionIndicatorId?: string;
      primaryId?: string;
    }) => {
      console.log(
        "[MinistrySubmissionReviewWrapper] Pending deletion added:",
        deletionInfo,
      );
      setPendingFileDeletions((prev) => [...prev, deletionInfo]);
    },
    [],
  );

  // Get comment count for a section
  const getCommentCount = useCallback(
    async (sectionId: string): Promise<number> => {
      const submissionIndicatorId = getSubmissionIndicatorId(sectionId);
      if (!submissionIndicatorId) return 0;

      try {
        const response = await getMinistrySubmissionIndicatorComments(
          submissionIndicatorId,
        );

        // Handle both response formats:
        // 1. Direct array: [{...}, {...}]
        // 2. Wrapped format: { status: true, data: [{...}, {...}] }
        let commentsArray: any[] = [];

        if (Array.isArray(response)) {
          commentsArray = response;
        } else if (response?.status && Array.isArray(response.data)) {
          commentsArray = response.data;
        } else if (Array.isArray(response?.data)) {
          commentsArray = response.data;
        }

        if (commentsArray.length > 0) {
          // Format comments similar to formatCommentsForTimeline
          const formattedComments = commentsArray.map((comment) => {
            const commentRole = comment.user?.role || "UNKNOWN";
            return {
              role: commentRole,
              userRole: commentRole,
              text: comment.text || "",
              type: "comment",
              userId: comment.userId || "",
              sectionId: sectionId,
              timestamp:
                comment.createdAt ||
                comment.timestamp ||
                new Date().toISOString(),
            };
          });

          // Filter comments based on user role visibility
          const currentUserRole = user?.role as any;
          const visibleComments = formattedComments.filter((comment: any) => {
            try {
              const reviewComment = {
                ...comment,
                userRole: comment.userRole || comment.role,
              };
              return workflowService.getCommentVisibility(
                reviewComment,
                currentUserRole,
              );
            } catch (error) {
              console.error(
                "[MinistrySubmissionReviewWrapper] Error checking comment visibility in count:",
                error,
              );
              return false;
            }
          });

          const count = visibleComments.length;
          setCommentCounts((prev) => ({ ...prev, [sectionId]: count }));
          return count;
        }

        setCommentCounts((prev) => ({ ...prev, [sectionId]: 0 }));
        return 0;
      } catch (error) {
        console.error("Error fetching comment count:", error);
        setCommentCounts((prev) => ({ ...prev, [sectionId]: 0 }));
        return 0;
      }
    },
    [getSubmissionIndicatorId, user?.role],
  );

  // Fetch comment counts for all sections when data loads
  useEffect(() => {
    if (assignedIndicators.length > 0) {
      const fetchAllCommentCounts = async () => {
        const sectionIds: string[] = [];
        for (const categoryIndicator of assignedIndicators) {
          const categoryName = Object.keys(categoryIndicator)[0];
          const sections = categoryIndicator[categoryName];
          if (Array.isArray(sections)) {
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              const section = sectionObj[sectionName];
              if (section.sNo) {
                sectionIds.push(section.sNo);
              }
            }
          }
        }

        // Fetch counts for all sections in parallel
        const countPromises = sectionIds.map((sectionId) =>
          getCommentCount(sectionId).catch(() => 0),
        );
        await Promise.all(countPromises);
      };

      fetchAllCommentCounts();
    }
  }, [assignedIndicators, getCommentCount]);

  // Handle accept action - shows confirmation dialog
  const handleAccept = (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Accept clicked for section:",
      sectionId,
    );
    setPendingAcceptSectionId(sectionId);
    setShowAcceptDialog(true);
  };

  // Handle confirm accept action
  const handleConfirmAccept = async () => {
    if (!pendingAcceptSectionId) {
      return;
    }

    const sectionId = pendingAcceptSectionId;
    console.log(
      "[MinistrySubmissionReviewWrapper] Confirming accept for section:",
      sectionId,
    );

    // Find the indicator and section data to get submissionIndicatorId
    let submissionIndicatorId: string | null = null;
    let currentSection: any = null;

    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            submissionIndicatorId = (section as any).submissionIndicatorId;
            currentSection = section;
            break;
          }
        }
      }

      if (submissionIndicatorId) break;
    }

    if (!submissionIndicatorId) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      setShowAcceptDialog(false);
      setPendingAcceptSectionId(null);
      return;
    }

    try {
      // Call API to update status to ACCEPTED_BY_MINISTRY
      const response = await updateSubmissionIndicatorStatus(
        submissionIndicatorId,
        "ACCEPTED_BY_MINISTRY",
      );

      console.log(
        "[MinistrySubmissionReviewWrapper] Accept response:",
        response,
      );

      toast({
        title: "Success",
        description: `Section ${sectionId} accepted successfully`,
      });

      // Close dialog and reset state
      setShowAcceptDialog(false);
      setPendingAcceptSectionId(null);

      // Reload submission data to reflect the updated status
      await loadSubmissionData();
    } catch (error: any) {
      console.error("Error accepting section:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          `Failed to accept section ${sectionId}`,
        variant: "destructive",
      });
      setShowAcceptDialog(false);
      setPendingAcceptSectionId(null);
    }
  };

  // Handle cancel accept action
  const handleCancelAccept = () => {
    setShowAcceptDialog(false);
    setPendingAcceptSectionId(null);
  };

  // Handle send back action - opens comment dialog
  const handleSendBack = (sectionId: string, sectionName: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Send Back clicked for section:",
      sectionId,
    );

    // Find the submissionIndicatorId for this section
    let submissionIndicatorId: string | null = null;

    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionNameKey = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionNameKey];

          if (section.sNo === sectionId) {
            submissionIndicatorId = (section as any).submissionIndicatorId;
            break;
          }
        }
      }

      if (submissionIndicatorId) break;
    }

    if (!submissionIndicatorId) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      return;
    }

    // Set pending send back action for MOSPI Approver
    setPendingSendBackAction({
      submissionIndicatorId,
      sectionId,
    });

    // Set the selected section and open the comment dialog (for send back)
    setSelectedSectionForComment({
      submissionIndicatorId,
      sectionTitle: sectionName || sectionId,
      sectionId,
      isSendBack: true,
    });
    setCommentDialogOpen(true);
  };

  // Handle accept for MOSPI Approver
  const handleAcceptMospiApprover = async (
    submissionIndicatorId: string,
    sectionId: string,
  ) => {
    try {
      setSubmittingIndicatorId(submissionIndicatorId);
      console.log("📤 Accepting indicator for MOSPI Approver:", {
        submissionIndicatorId,
        sectionId,
        status: "ACCEPTED_BY_MOSPI",
      });

      await updateMinistryIndicatorStatus(
        submissionIndicatorId,
        "ACCEPTED_BY_MOSPI",
      );

      toast({
        title: "Success",
        description: `Indicator ${sectionId} accepted successfully`,
      });

      // Dispatch custom event to notify parent component to reload form statistics
      window.dispatchEvent(
        new CustomEvent("ministry-indicator-status-updated", {
          detail: {
            sectionId,
            status: "ACCEPTED_BY_MOSPI",
          },
        }),
      );

      // Reload data to reflect the change
      setReloadTrigger((prev) => prev + 1);
    } catch (error: any) {
      console.error("❌ Error accepting indicator:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to accept indicator",
        variant: "destructive",
      });
    } finally {
      setSubmittingIndicatorId(null);
    }
  };

  // Handle send back after comment is saved
  const handleSendBackAfterCommentMinistry = async (sectionId: string) => {
    if (!selectedSectionForComment?.submissionIndicatorId) {
      toast({
        title: "Error",
        description: "No section selected for send back",
        variant: "destructive",
      });
      return;
    }

    const { submissionIndicatorId, sectionTitle } = selectedSectionForComment;

    try {
      console.log(
        "[MinistrySubmissionReviewWrapper] Sending back section after comment:",
        {
          submissionIndicatorId,
          sectionId,
        },
      );

      // Update status to RETURNED_FROM_MINISTRY
      const response = await updateSubmissionIndicatorStatus(
        submissionIndicatorId,
        "RETURNED_FROM_MINISTRY",
      );

      console.log(
        "[MinistrySubmissionReviewWrapper] Send back response:",
        response,
      );

      toast({
        title: "Success",
        description: `Section ${sectionTitle} has been sent back to the Nodal Officer successfully`,
      });

      // Reload submission data to reflect the updated status
      await loadSubmissionData();

      // Close dialog and reset state
      setCommentDialogOpen(false);
      setSelectedSectionForComment(null);
    } catch (error: any) {
      console.error("Error sending back section:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          `Failed to send back section ${sectionTitle}`,
        variant: "destructive",
      });
      throw error; // Re-throw to let the dialog handle it
    }
  };

  // Handle form data change (only when in edit mode)
  const handleFormDataChange = (path: string, value: any) => {
    // Only allow changes when section is in edit mode
    const sectionId = path
      .split(".")[0]
      .replace("section", "")
      .replace("_", ".");
    if (editingSections.has(sectionId)) {
      setFormData((prev) => {
        const newData = { ...prev };
        const keys = path.split(".");
        let current: any = newData;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        // If value is a function, call it with the current value (for array updates)
        const finalKey = keys[keys.length - 1];
        if (typeof value === "function") {
          const currentValue = current[finalKey];
          current[finalKey] = value(currentValue);
        } else {
          current[finalKey] = value;
        }

        return newData;
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p className="text-muted-foreground">Loading submission data...</p>
      </div>
    );
  }

  if (assignedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          No indicators found for this submission
        </p>
      </div>
    );
  }

  // Category descriptions
  const categoryDescriptions: Record<string, string> = {
    "Infra Financing":
      "Data related to infrastructure financing and budget allocation",
    "Infra Development": "Infrastructure development and planning data",
    "PPP Development": "PPP policy, proposals and project pipeline status",
    "Infra Enablers": "Infrastructure enablers and support systems",
  };

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        {/* Category Tabs - matching state components style */}
        {categories.length > 0 && (
          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="w-full"
          >
            <TabsList className="mb-6 bg-transparent border-0 rounded-none p-0 h-auto gap-2 flex flex-row overflow-x-auto pb-2 w-auto">
              {categories.map((categoryIndicator) => {
                const categoryName = Object.keys(categoryIndicator)[0];
                return (
                  <TabsTrigger
                    key={categoryName}
                    value={categoryName}
                    className="!w-auto bg-white text-gray-600 border border-gray-300 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 hover:border-gray-400 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:hover:bg-primary/90 whitespace-nowrap h-8 flex-shrink-0"
                  >
                    {categoryName}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Category Content */}
            {categories.map((categoryIndicator) => {
              const categoryName = Object.keys(categoryIndicator)[0];
              const categoryProgress = getCategoryProgress(categoryIndicator);

              return (
                <TabsContent key={categoryName} value={categoryName}>
                  <div>
                    {/* ProgressHeader for current category */}
                    <ProgressHeader
                      title={categoryName}
                      description={categoryDescriptions[categoryName] || ""}
                      points={250}
                      completed={categoryProgress.completed}
                      total={categoryProgress.total}
                      progress={categoryProgress.progress}
                    />

                    {/* DynamicFormBuilder for current category - REVIEW MODE with EDIT support */}
                    <div className="mt-4 sm:mt-6">
                      <DynamicFormBuilder
                        indicators={[categoryIndicator]}
                        formData={formData}
                        onChange={handleFormDataChange}
                        mode="review" // Keep in review mode, but allow section-specific editing
                        disabled={false} // Don't globally disable - let form builder handle per-section
                        submissionId={submissionId || undefined}
                        getFieldError={getFieldErrorMemoized} // Use validation hook for field errors
                        getDropdownOptions={getDropdownOptions}
                        // No submit handlers needed in review mode
                        isIndicatorSubmitted={() => true} // All indicators shown as submitted in review
                        submittingIndicator={null}
                        validationErrors={validationErrors} // Pass validation errors
                        onValidateField={validateFieldOnChange} // Enable validation in edit mode
                        onClearFieldError={clearFieldError} // Enable error clearing
                        onPendingDeletion={handlePendingDeletion} // Handle pending file deletions
                        renderScoreDisplay={(indicatorCode) => {
                          // Show score display only for MOSPI_APPROVER
                          if (user?.role === "MOSPI_APPROVER" && submissionId) {
                            const toggleState =
                              indicatorScoreToggleState[indicatorCode] ||
                              "score";
                            return (
                              <IndicatorScoreDisplay
                                submissionId={submissionId}
                                indicatorCode={indicatorCode}
                                toggleState={toggleState}
                                submissionType="ministry"
                              />
                            );
                          }
                          return null;
                        }}
                        renderSectionActionButtons={(
                          sectionId,
                          sectionName,
                          indicatorCode,
                        ) => {
                          // Find the section object to get submissionIndicatorId
                          let sectionSubmissionIndicatorId: string | null =
                            null;

                          // Search through assignedIndicators to find the section
                          for (const indicatorObj of assignedIndicators) {
                            const categoryName = Object.keys(indicatorObj)[0];
                            const sections = indicatorObj[categoryName];
                            if (Array.isArray(sections)) {
                              for (const sectionObject of sections) {
                                const sectionKey =
                                  Object.keys(sectionObject)[0];
                                const section = sectionObject[
                                  sectionKey
                                ] as any; // Type assertion to access submissionIndicatorId
                                if (section.sNo === indicatorCode) {
                                  sectionSubmissionIndicatorId =
                                    section.submissionIndicatorId || null;
                                  break;
                                }
                              }
                              if (sectionSubmissionIndicatorId) break;
                            }
                          }

                          // Render role-based action buttons for each section
                          if (user?.role === "MINISTRY_APPROVER") {
                            const formStatus =
                              submission?.status ||
                              submission?.formStatus ||
                              undefined;
                            const upperFormStatus = (
                              formStatus || ""
                            ).toUpperCase();
                            const isFormWithMospi = [
                              "SUBMITTED_TO_MOSPI_REVIEWER",
                              "SUBMITTED_TO_MOSPI_APPROVER",
                            ].includes(upperFormStatus);

                            // When form is with MOSPI, show Accepted + Timeline only. Actions on indicators
                            // (Edit, Send Back, Accept) reflect only after the whole form is returned from MOSPI.
                            if (isFormWithMospi) {
                              return (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                                    disabled
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Accepted
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenTimeline(sectionId)
                                    }
                                    className="flex items-center gap-1 h-7 px-2 text-xs"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Timeline ({commentCounts[sectionId] || 0})
                                  </Button>
                                </div>
                              );
                            }

                            const isSectionEditing =
                              editingSections.has(sectionId);
                            const isSaving = savingSections.has(sectionId);
                            const isAccepted = isSectionAccepted(sectionId);
                            const sectionStatus = getSectionStatus(sectionId);
                            const isSentBack =
                              sectionStatus?.toUpperCase() ===
                              "RETURNED_FROM_MINISTRY";
                            const isResubmitted =
                              sectionStatus?.toUpperCase() === "RESUBMITTED";

                            // Check if indicator was returned from MOSPI Approver
                            const isReturnedFromMospi =
                              sectionStatus?.toUpperCase() ===
                              "RETURNED_FROM_MOSPI_APPROVER";

                            // Check if indicator was accepted by MOSPI
                            const isAcceptedByMospi =
                              sectionStatus?.toUpperCase() ===
                              "ACCEPTED_BY_MOSPI";

                            // Get assignedTo for this section
                            const sectionAssignedTo =
                              getSectionAssignedTo(sectionId);
                            const submissionUserId = submission?.user?.id;

                            // Check if indicator was originally assigned to Nodal Officer
                            // If assignedTo !== submission.userId, it means it was assigned to a Nodal Officer
                            const isAssignedToNodalOfficer =
                              sectionAssignedTo &&
                              submissionUserId &&
                              sectionAssignedTo !== submissionUserId;

                            // Show Send Back button if indicator was originally assigned to a Nodal Officer
                            // BUT NOT if it's already RESUBMITTED (Nodal already resubmitted after Ministry sent it back)
                            // (assignedTo !== submission.userId means it was assigned to a Nodal Officer)
                            const shouldShowSendBackToNodal =
                              isAssignedToNodalOfficer && !isResubmitted;

                            console.log(
                              "[MinistrySubmissionReviewWrapper] Rendering action buttons for MINISTRY_APPROVER:",
                              {
                                sectionId,
                                sectionName,
                                indicatorCode,
                                userId: user?.id,
                                isSectionEditing,
                                isSaving,
                                isAccepted,
                                isSentBack,
                                isResubmitted,
                                sectionStatus,
                                isReturnedFromMospi,
                                isAcceptedByMospi,
                                sectionAssignedTo,
                                submissionUserId,
                                isAssignedToNodalOfficer,
                                shouldShowSendBackToNodal,
                                editingSectionsArray:
                                  Array.from(editingSections),
                                hasOnSave: isSectionEditing,
                                hasOnCancel: isSectionEditing,
                                hasOnEdit: !isSectionEditing,
                              },
                            );

                            // For RESUBMITTED status, show custom buttons with Resubmitted badge
                            if (isResubmitted) {
                              return (
                                <div className="flex items-center gap-2">
                                  {isSectionEditing ? (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-1"
                                        onClick={() => handleSave(sectionId)}
                                        disabled={isSaving}
                                      >
                                        <Check className="w-4 h-4" />
                                        {isSaving ? "Saving..." : "Save"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-1"
                                        onClick={() =>
                                          handleEditCancel(sectionId)
                                        }
                                        disabled={isSaving}
                                      >
                                        <X className="w-4 h-4" />
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-1"
                                      onClick={() => handleEditStart(sectionId)}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      Edit
                                    </Button>
                                  )}
                                  {/* Resubmitted badge - matches STATE level styling */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
                                    disabled
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Resubmitted
                                  </Button>
                                  {/* Send Back button - NOT shown for RESUBMITTED status */}
                                  {/* If Nodal resubmitted after Ministry sent it back, don't show Send Back */}
                                  {/* Accept button - only show when not editing and not already accepted */}
                                  {!isSectionEditing &&
                                    !isAccepted &&
                                    !isAcceptedByMospi && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => handleAccept(sectionId)}
                                        disabled={
                                          sectionId === "3.3" && !canAcceptIndicator3_3
                                        }
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Accept
                                      </Button>
                                    )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenTimeline(sectionId)
                                    }
                                    className="flex items-center gap-1 h-7 px-2 text-xs"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Timeline ({commentCounts[sectionId] || 0})
                                  </Button>
                                </div>
                              );
                            }

                            // formStatus already defined at top of MINISTRY_APPROVER block
                            return (
                              <MinistryApproverActionButtons
                                key={`${sectionId}-${
                                  isSectionEditing ? "editing" : "viewing"
                                }`} // Force re-render when edit state changes
                                sectionId={sectionId}
                                onEdit={
                                  !isSectionEditing &&
                                  !isAccepted &&
                                  !isSentBack
                                    ? () => handleEditStart(sectionId)
                                    : undefined
                                }
                                onSave={
                                  isSectionEditing
                                    ? () => handleSave(sectionId)
                                    : undefined
                                }
                                onCancel={
                                  isSectionEditing
                                    ? () => handleEditCancel(sectionId)
                                    : undefined
                                }
                                onAccept={
                                  !isSectionEditing &&
                                  !isAccepted &&
                                  !isSentBack
                                    ? () => handleAccept(sectionId)
                                    : undefined
                                }
                                disabled={false}
                                acceptDisabled={
                                  sectionId === "3.3" && !canAcceptIndicator3_3
                                }
                                onSendBack={
                                  !isSectionEditing &&
                                  !isAccepted &&
                                  !isSentBack &&
                                  !isResubmitted &&
                                  (submission?.user?.role === "NODAL_OFFICER" ||
                                    shouldShowSendBackToNodal)
                                    ? () =>
                                        handleSendBack(sectionId, sectionName)
                                    : undefined
                                }
                                onTimeline={() => handleOpenTimeline(sectionId)}
                                timelineCount={commentCounts[sectionId] || 0}
                                isAccepted={isAccepted}
                                isSentBack={isSentBack}
                                isReturnedFromMospi={isReturnedFromMospi}
                                isAcceptedByMospi={isAcceptedByMospi}
                                formStatus={formStatus}
                                isSaving={isSaving}
                              />
                            );
                          }
                          if (user?.role === "MOSPI_REVIEWER") {
                            return (
                              <MospiReviewerActionButtons
                                sectionId={sectionId}
                                onAddComment={() => {
                                  if (sectionSubmissionIndicatorId) {
                                    setSelectedSectionForComment({
                                      submissionIndicatorId:
                                        sectionSubmissionIndicatorId,
                                      sectionTitle: sectionName || sectionId,
                                    });
                                    setCommentDialogOpen(true);
                                  } else {
                                    toast({
                                      title: "Error",
                                      description:
                                        "Submission indicator ID not found for this section",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                onTimeline={() => handleOpenTimeline(sectionId)}
                                timelineCount={commentCounts[sectionId] || 0}
                              />
                            );
                          }
                          if (user?.role === "MOSPI_APPROVER") {
                            const sectionStatus = getSectionStatus(sectionId);
                            const isAccepted =
                              sectionStatus === "ACCEPTED_BY_MOSPI";
                            // Get form/submission level status
                            const formStatus =
                              submission?.status ||
                              submission?.formStatus ||
                              undefined;

                            // Determine original MOSPI status - preserve the status that indicates MOSPI Approver's decision
                            // This preserves the original state even if Ministry edits change the status
                            // If form is RETURNED_FROM_MOSPI_APPROVER, check if current status indicates it was sent back or accepted
                            const upperSectionStatus =
                              sectionStatus?.toUpperCase() || "";
                            let originalMospiStatus: string | undefined =
                              undefined;

                            // If current status indicates it was sent back or accepted, use that as original status
                            // This works as long as the status still contains the MOSPI decision information
                            // If status was completely changed by Ministry edits, we'll fall back to current status check
                            if (
                              upperSectionStatus.includes(
                                "RETURNED_FROM_MOSPI_APPROVER",
                              ) ||
                              upperSectionStatus.includes(
                                "RETURNED_FROM_MOSPI",
                              ) ||
                              upperSectionStatus ===
                                "RETURNED_FROM_MOSPI_APPROVER_DRAFT"
                            ) {
                              originalMospiStatus = sectionStatus; // Preserve the sent back status
                            } else if (
                              upperSectionStatus.includes(
                                "ACCEPTED_BY_MOSPI",
                              ) ||
                              upperSectionStatus ===
                                "ACCEPTED_BY_MOSPI_APPROVER_DRAFT"
                            ) {
                              originalMospiStatus = sectionStatus; // Preserve the accepted status
                            }
                            // If status doesn't clearly indicate MOSPI decision, originalMospiStatus remains undefined
                            // and component will use current status check as fallback

                            const toggleState =
                              indicatorScoreToggleState[indicatorCode] ||
                              "score";

                            return (
                              <div className="flex items-center gap-2">
                                {/* Indicator Score Toggle for MOSPI_APPROVER */}
                                {submissionId && (
                                  <IndicatorScoreToggle
                                    submissionId={submissionId}
                                    indicatorCode={indicatorCode}
                                    controlledToggleState={toggleState}
                                    onToggleChange={(newState) => {
                                      setIndicatorScoreToggleState((prev) => ({
                                        ...prev,
                                        [indicatorCode]: newState,
                                      }));
                                    }}
                                    submissionType="ministry"
                                    showLabel={false}
                                    size="sm"
                                    variant="outline"
                                    mospiStatus={sectionStatus || undefined}
                                  />
                                )}
                                <MospiApproverActionButtons
                                  sectionId={sectionId}
                                  sectionTitle={sectionName || sectionId}
                                  status={sectionStatus || undefined}
                                  formStatus={formStatus}
                                  originalMospiStatus={originalMospiStatus}
                                  onAccept={() => {
                                    // Handle accept action
                                    if (sectionSubmissionIndicatorId) {
                                      handleAcceptMospiApprover(
                                        sectionSubmissionIndicatorId,
                                        sectionId,
                                      );
                                    } else {
                                      toast({
                                        title: "Error",
                                        description:
                                          "Submission indicator ID not found",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  onSendBack={() => {
                                    handleSendBack(sectionId, sectionName);
                                  }}
                                  onTimeline={() =>
                                    handleOpenTimeline(sectionId)
                                  }
                                  timelineCount={commentCounts[sectionId] || 0}
                                  isAccepted={isAccepted}
                                />
                              </div>
                            );
                          }
                          if (user?.role === "NODAL_OFFICER") {
                            const isSectionEditing =
                              editingSections.has(sectionId);
                            const isSaving = savingSections.has(sectionId);
                            const sectionStatus = getSectionStatus(sectionId);
                            const isSentBack =
                              sectionStatus?.toUpperCase() ===
                              "RETURNED_FROM_MINISTRY";
                            const isResubmitted =
                              sectionStatus?.toUpperCase() === "RESUBMITTED";
                            const isAccepted = isSectionAccepted(sectionId);
                            const canEdit = canNodalOfficerEdit(sectionId);

                            // Show Accepted badge if section is accepted
                            if (isAccepted) {
                              return (
                                <div className="flex items-center gap-2">
                                  {/* Accepted badge - matches MINISTRY_APPROVER styling */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                                    disabled
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Accepted
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenTimeline(sectionId)
                                    }
                                    className="flex items-center gap-1 h-7 px-2 text-xs"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Timeline ({commentCounts[sectionId] || 0})
                                  </Button>
                                </div>
                              );
                            }

                            // Only show buttons if section is sent back (RETURNED_FROM_MINISTRY) or resubmitted (RESUBMITTED)
                            if (!isSentBack && !isResubmitted) {
                              return null;
                            }

                            // For RESUBMITTED status, show only Resubmitted badge + Timeline (no Edit button)
                            if (isResubmitted) {
                              return (
                                <div className="flex items-center gap-2">
                                  {/* Resubmitted badge - matches STATE level styling */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
                                    disabled
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Resubmitted
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenTimeline(sectionId)
                                    }
                                    className="flex items-center gap-1 h-7 px-2 text-xs"
                                  >
                                    <Clock className="w-3 h-3" />
                                    Timeline ({commentCounts[sectionId] || 0})
                                  </Button>
                                </div>
                              );
                            }

                            // For RETURNED_FROM_MINISTRY status, show Edit button + Sent Back badge + Timeline
                            return (
                              <div className="flex items-center gap-2">
                                {isSectionEditing ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-1"
                                      onClick={() => handleSave(sectionId)}
                                      disabled={isSaving}
                                    >
                                      <Check className="w-4 h-4" />
                                      {isSaving ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-1"
                                      onClick={() =>
                                        handleEditCancel(sectionId)
                                      }
                                      disabled={isSaving}
                                    >
                                      <X className="w-4 h-4" />
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1"
                                    onClick={() => handleEditStart(sectionId)}
                                    disabled={!canEdit}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Edit
                                  </Button>
                                )}
                                {/* Sent Back badge - matches STATE level styling */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
                                  disabled
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  Sent Back
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenTimeline(sectionId)}
                                  className="flex items-center gap-1 h-7 px-2 text-xs"
                                >
                                  <Clock className="w-3 h-3" />
                                  Timeline ({commentCounts[sectionId] || 0})
                                </Button>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {categories.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No category data available for review.</p>
          </div>
        )}
      </div>

      {/* Comment Dialog - Used for both regular comments and send back */}
      <MinistryCommentDialog
        isOpen={commentDialogOpen}
        onClose={() => {
          setCommentDialogOpen(false);
          setSelectedSectionForComment(null);
          // Clear pending send back action if dialog is closed without saving
          if (pendingSendBackAction) {
            setPendingSendBackAction(null);
          }
        }}
        onSuccess={() => {
          // Handle MOSPI Approver send back via onSuccess (when onSendBack is not provided)
          // This is for backward compatibility with the existing flow
          if (pendingSendBackAction && !selectedSectionForComment?.isSendBack) {
            // Small delay to ensure comment is saved before status update
            setTimeout(() => {
              handleSendBackAfterComment();
            }, 300);
          } else if (
            !pendingSendBackAction &&
            !selectedSectionForComment?.isSendBack
          ) {
            // Regular comment (not send back)
            console.log("Comment added successfully");
            // Refresh comment count for the section (fire and forget)
            if (selectedSectionForComment?.sectionId) {
              getCommentCount(selectedSectionForComment.sectionId).catch(
                (error) => {
                  console.error("Error refreshing comment count:", error);
                },
              );
            }
          }
        }}
        onSendBack={
          selectedSectionForComment?.isSendBack &&
          selectedSectionForComment?.sectionId
            ? async (sectionId: string) => {
                // Determine which handler to use based on user role
                if (user?.role === "MINISTRY_APPROVER") {
                  // Clear pending send back action before executing (not needed for MINISTRY handler)
                  setPendingSendBackAction(null);
                  // Call MINISTRY_APPROVER send back handler
                  await handleSendBackAfterCommentMinistry(sectionId);
                } else if (user?.role === "MOSPI_APPROVER") {
                  // For MOSPI_APPROVER, use the pending action handler
                  // Don't clear pendingSendBackAction here - handleSendBackAfterComment needs it
                  await handleSendBackAfterComment();
                } else {
                  // Fallback: try MINISTRY handler
                  setPendingSendBackAction(null);
                  await handleSendBackAfterCommentMinistry(sectionId);
                }
              }
            : undefined
        }
        sectionTitle={selectedSectionForComment?.sectionTitle}
        submissionIndicatorId={
          selectedSectionForComment?.submissionIndicatorId || ""
        }
        sectionId={selectedSectionForComment?.sectionId}
      />

      {/* Confirmation Dialog for NODAL_OFFICER Save */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save this indicator? This will resubmit
              it to the Ministry Approver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for MINISTRY_APPROVER Accept */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Accept</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this section? Now it is moved to
              the Reviewer. No further action can be taken after accept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>
              Confirm & Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Timeline Modal */}
      {timelineSection && (
        <TimelineModal
          isOpen={timelineSection !== null}
          onClose={handleCloseTimeline}
          sectionId={timelineSection}
          sectionTitle={getSectionTitle(timelineSection)}
          comments={timelineComments}
          isLoading={loadingComments}
          key={`timeline-${timelineSection}-${timelineComments.length}`}
        />
      )}
    </div>
  );
}
