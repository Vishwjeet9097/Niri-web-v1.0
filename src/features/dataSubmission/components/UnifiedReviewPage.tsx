import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Edit3,
  AlertTriangle,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, X } from "lucide-react";
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
import { OverviewTab } from "./tabs/OverviewTab";
import { DataReviewTab } from "./tabs/DataReviewTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { SendBackModal } from "./modals/SendBackModal";
import { ApproveModal } from "./modals/ApproveModal";
import { SendToApproverModal } from "./modals/SendToApproverModal";
import { RejectModal } from "./modals/RejectModal";
import { hasLocalEdits } from "../services/submissionData.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { AuditLog, AuditEntry } from "@/components/AuditLog";
import { generateAuditEntries } from "@/utils/auditUtils";
import { MospiOverviewTab } from "./tabs/MospiOverviewTab";
import { MospiApproverDataReviewTab } from "./tabs/MospiApproverDataReviewTab";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import {
  areAllIndicatorsMospiAccepted,
  hasAnyIndicatorMospiReverted,
  areAllIndicatorsActioned,
} from "@/utils/indicatorStatusUtils";

interface Submission {
  id: string;
  submissionId: string;
  stateUt: string;
  submittedBy: string;
  rejectionCount: number;
  formData: any;
  reviewComments: any[];
  attachedFiles: any[];
  status: string;
  currentOwnerRole: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    contactNumber: string | null;
    role: string;
    stateUt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  finalScore: number | null;
  sections?: any[];
}

interface UnifiedReviewPageProps {
  isPreview?: boolean;
  isMospiApprover?: boolean;
  submission?: Submission | null;
  onFinalSubmit?: () => void;
  isSubmitting?: boolean;
  isResubmit?: boolean;
  isEditMode?: boolean;
}

export const UnifiedReviewPage = ({
  submission: initialSubmission,
  isPreview = false,
  isMospiApprover = false,
  onFinalSubmit,
  isSubmitting = false,
  isResubmit = false,
  isEditMode = false,
}) => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { assignedIndicators, isNodalOfficer } = useIndicatorAccess();

  const [submission, setSubmission] = useState<Submission | null>(
    initialSubmission
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [sendToApproverModalOpen, setSendToApproverModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actualEditMode, setActualEditMode] = useState(isEditMode);
  const [showSendBackConfirmationDialog, setShowSendBackConfirmationDialog] =
    useState(false);
  const [isSendingBack, setIsSendingBack] = useState(false);

  // Get active tab from URL params, default to "overview"
  const activeTab = searchParams.get("tab") || "overview";

  // Handler to update active tab
  const handleTabChange = (value: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("tab", value);
    setSearchParams(newSearchParams, { replace: true });
  };

  // Check for edit mode on mount
  useEffect(() => {
    const isEditModeFlag = localStorage.getItem("is_edit_mode") === "true";
    const editingSubmission = localStorage.getItem("editing_submission");

    if (isEditModeFlag || editingSubmission) {
      setActualEditMode(true);
    }
  }, []);

  // Load submission data from API or use prop
  const loadSubmission = async () => {
    // If submission is provided as prop (for preview), use it
    if (initialSubmission) {
      setSubmission(initialSubmission);
      setLoading(false);
      return;
    }

    if (!id) return;

    try {
      // Don't set loading to true if we're just refreshing after indicator update
      // This prevents the component from disappearing during reload
      const isRefreshing = submission !== null;
      if (!isRefreshing) {
        setLoading(true);
      }
      setError(null);

      const response = await apiService.getSubmission(id);
      // Debug logging removed for performance

      if (response) {
        setSubmission(response as unknown as Submission);
      } else {
        setError("Submission not found");
      }
    } catch (err: any) {
      console.error("❌ Error loading submission:", err);
      setError(err.message || "Failed to load submission");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmission();
  }, [id, initialSubmission]);

  // Listen for indicator status updates to reload submission and update Final Submit button
  useEffect(() => {
    const handleIndicatorStatusUpdate = () => {
      // Reload submission when indicator status is updated
      // Don't reload if we have initialSubmission (preview mode) - just update the state
      if (id && !initialSubmission) {
        // Use a small delay to ensure the backend has processed the update
        setTimeout(() => {
          loadSubmission();
        }, 500);
      } else if (initialSubmission) {
        // For preview mode, just update the submission prop if needed
        // The local state update in the review component should handle the UI update
        console.log(
          "Indicator status updated in preview mode - no reload needed"
        );
      }
    };

    // Listen for custom event when indicator status is updated
    window.addEventListener(
      "niri-indicator-status-updated",
      handleIndicatorStatusUpdate
    );

    return () => {
      window.removeEventListener(
        "niri-indicator-status-updated",
        handleIndicatorStatusUpdate
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initialSubmission]);

  // Listen for submission updates (e.g., when files are saved) to reload submission
  // This ensures DocumentsTab shows updated files without page refresh
  useEffect(() => {
    const handleSubmissionUpdate = (event: CustomEvent) => {
      const { submissionId: eventSubmissionId } = event.detail || {};
      // Only reload if the event is for this submission
      if (id && eventSubmissionId === id && !initialSubmission) {
        console.log("🔄 Submission updated - refreshing to show new files...");
        // Use a small delay to ensure the backend has processed the update
        setTimeout(() => {
          loadSubmission();
        }, 500);
      } else if (initialSubmission && eventSubmissionId === id) {
        // For preview mode, try to refresh if we have an ID
        if (id) {
          setTimeout(() => {
            loadSubmission();
          }, 500);
        }
      }
    };

    // Listen for custom event when submission is updated (e.g., files saved)
    window.addEventListener(
      "niri-submission-updated",
      handleSubmissionUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-submission-updated",
        handleSubmissionUpdate as EventListener
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, initialSubmission]);

  // Memoize the indicator acceptance check to recalculate when submission changes
  // IMPORTANT: These hooks must be called BEFORE any early returns to follow Rules of Hooks
  const allIndicatorsMospiAccepted = useMemo(() => {
    if (!submission) return false;
    return areAllIndicatorsMospiAccepted(submission);
  }, [submission]);

  const hasRevertedIndicators = useMemo(() => {
    if (!submission) return false;
    return hasAnyIndicatorMospiReverted(submission);
  }, [submission]);

  const allIndicatorsActioned = useMemo(() => {
    if (!submission) return false;
    return areAllIndicatorsActioned(submission);
  }, [submission]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            Error Loading Submission
          </h2>
          <p className="text-muted-foreground mb-4">
            {error || "Submission not found"}
          </p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_STATE":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "APPROVED":
        return "bg-green-100 text-green-700 border-green-300";
      case "RETURNED_FROM_STATE":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // Get action buttons based on role and status
  const getActionButtons = () => {
    if (isPreview) {
      return (
        <div className="flex gap-2">
          {actualEditMode && (
            <Button
              variant="outline"
              onClick={() => {
                // Clear edit mode flags and go back
                localStorage.removeItem("editing_submission_id");
                localStorage.removeItem("is_edit_mode");
                navigate("/data-submission/review");
              }}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          )}
          {onFinalSubmit && (
            <Button
              onClick={onFinalSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting
                ? "Submitting..."
                : actualEditMode
                ? "Resubmit"
                : isResubmit
                ? "Resubmit"
                : "Submit"}
            </Button>
          )}
        </div>
      );
    }

    const currentUserRole = user?.role;
    const submissionStatus = submission?.status;
    const currentOwnerRole = submission?.currentOwnerRole;

    // Only show actions if current user is the owner or if STATE_APPROVER is handling RETURNED_FROM_MOSPI
    if (
      currentUserRole !== currentOwnerRole &&
      !(
        currentUserRole === "STATE_APPROVER" &&
        submissionStatus === "RETURNED_FROM_MOSPI"
      )
    ) {
      return null;
    }

    const buttons = [];

    // ############################################### EDIT Button Review Page ################
    // Edit button for NODAL_OFFICER and STATE_APPROVER
    // if ((currentUserRole === "NODAL_OFFICER" && (submissionStatus === "DRAFT" || submissionStatus === "RETURNED_FROM_STATE")) ||
    //     (currentUserRole === "STATE_APPROVER" && (submissionStatus === "SUBMITTED_TO_STATE" || submissionStatus === "RETURNED_FROM_MOSPI"))) {
    //   buttons.push(
    //     <Button
    //       key="edit"
    //       variant="outline"
    //       onClick={async () => {
    //         try {
    // // Debug logging removed for performance

    //           // Fetch fresh submission data from endpoint
    //           const freshSubmissionData = await apiService.getSubmission(submission.id);
    // // Debug logging removed for performance

    //           // Store in localStorage for edit page
    //           localStorage.setItem('editing_submission', JSON.stringify(freshSubmissionData));

    //           // Navigate to edit page
    //           navigate(`/data-submission/edit/${submission.id}`);
    //         } catch (error) {
    //           console.error("❌ Failed to load submission for edit:", error);
    //           notificationService.error("Failed to load submission data", "Edit Error");
    //         }
    //       }}
    //       className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
    //     >
    //       <Edit3 className="w-4 h-4" />
    //       Edit
    //     </Button>
    //   );
    // }
    // ########################################################################Working functionality above for EDIT ###########################

    // Resubmit button for RETURNED_FROM_STATE status - HIDDEN as per requirement
    // User should use Edit button instead
    // if (currentUserRole === "NODAL_OFFICER" && submissionStatus === "RETURNED_FROM_STATE") {
    //   buttons.push(
    //     <Button
    //       key="resubmit"
    //       onClick={() => {
    //         // Navigate to resubmit page or handle resubmit
    //         navigate(`/data-submission/resubmit/${submission.id}`);
    //       }}
    //       className="gap-2 bg-orange-600 hover:bg-orange-700"
    //     >
    //       <CheckCircle className="w-4 h-4" />
    //       Resubmit
    //     </Button>
    //   );
    // }

    // Send Back button
    // if ((currentUserRole === "STATE_APPROVER" && submissionStatus === "SUBMITTED_TO_STATE") ||
    //     (currentUserRole === "MOSPI_APPROVER" && submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER")) {
    //   buttons.push(
    //     <Button
    //       key="send-back"
    //       variant="outline"
    //       onClick={() => setSendBackModalOpen(true)}
    //       className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
    //     >
    //       <Send className="w-4 h-4" />
    //       Send Back
    //     </Button>
    //   );
    // }

    // Approve button
    // if ((currentUserRole === "STATE_APPROVER" && (submissionStatus === "SUBMITTED_TO_STATE" || submissionStatus === "RETURNED_FROM_MOSPI")) ||
    //     (currentUserRole === "MOSPI_APPROVER" && submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER")) {
    //   buttons.push(
    //     <Button
    //       key="approve"
    //       onClick={() => setApproveModalOpen(true)}
    //       className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
    //     >
    //       <CheckCircle className="w-4 h-4" />
    //       Approve
    //     </Button>
    //   );
    // }

    // Send to Approver button
    // Disable if already submitted to MOSPI_APPROVER
    if (
      currentUserRole === "MOSPI_REVIEWER" &&
      submissionStatus === "SUBMITTED_TO_MOSPI_REVIEWER"
    ) {
      buttons.push(
        <Button
          key="send-to-approver"
          variant="outline"
          onClick={() => setSendToApproverModalOpen(true)}
          className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <Send className="w-4 h-4" />
          Send to Approver
        </Button>
      );
    }

    // Hide Send to Approver button if already submitted to MOSPI_APPROVER
    // (Button should not appear when status is SUBMITTED_TO_MOSPI_APPROVER)

    // Final Submit and Send Back buttons for MOSPI_APPROVER
    if (
      currentUserRole === "MOSPI_APPROVER" &&
      submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER"
    ) {
      // Use memoized values to ensure we have the latest data
      const allIndicatorsAccepted = allIndicatorsMospiAccepted;
      const hasReverted = hasRevertedIndicators;
      const allActioned = allIndicatorsActioned;

      // Debug logging for MOSPI_APPROVER
      console.log("🔍 [MOSPI_APPROVER] Button State Check:", {
        allIndicatorsAccepted,
        hasRevertedIndicators: hasReverted,
        allIndicatorsActioned: allActioned,
        submissionId: submission?.id,
        submissionStatus,
        formDataKeys: submission?.formData
          ? Object.keys(submission.formData)
          : [],
        submissionUpdated: submission?.updatedAt,
      });

      // Final Submit button - enabled only if:
      // 1. All 19 indicators have some action (ACCEPTED or REVERTED)
      // 2. All 19 indicators are ACCEPTED
      const canFinalSubmit = allActioned && allIndicatorsAccepted;

      // Send Back button - enabled only if:
      // 1. All 19 indicators have some action (ACCEPTED or REVERTED)
      // 2. At least one indicator is REVERTED
      const canSendBack = allActioned && hasReverted;

      // Send Back button
      buttons.push(
        <Button
          key="send-back"
          variant="outline"
          onClick={() => setShowSendBackConfirmationDialog(true)}
          disabled={!canSendBack || isSendingBack}
          className="gap-2 border-orange-500 text-orange-700 hover:bg-orange-50"
        >
          <RotateCcw className="w-4 h-4" />
          {isSendingBack ? "Sending Back..." : "Send Back"}
        </Button>
      );

      // Final Submit button
      buttons.push(
        <Button
          key="final-submit"
          onClick={() => setApproveModalOpen(true)}
          disabled={!canFinalSubmit || isSubmitting}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <CheckCircle className="w-4 h-4" />
          {isSubmitting ? "Submitting..." : "Final Submit"}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6 border border-[#ddd] bg-[#fff] rounded-lg p-6">
            <div className="">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="gap-2 flex items-center border-none bg-[none] px-0 text-primary hover:bg-[none] mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-[#212121]">
                  {isPreview ? "Preview Submission" : "Review Submission"}
                </h1>
                <p className="text-[#727272]">
                  {submission.submissionId} • {submission.stateUt}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={getStatusBadgeColor(submission.status)}
              >
                {submission.status.replace(/_/g, " ")}
              </Badge>
              {getActionButtons()}
            </div>
          </div>

          {/* Submission Info */}
          <div className="bg-white rounded-lg border border-[#ddd] p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-semibold text-[#212121]">
                  Submitted By
                </p>
                <p className="text-[#727272] text-sm">
                  {submission.user.firstName} {submission.user.lastName}
                </p>
                <p className="text-sm text-[#727272]">
                  {submission.user.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#212121]">
                  Submission Date
                </p>
                <p className="text-[#727272] text-sm">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#212121]">
                  Current Owner
                </p>
                <p className="text-[#727272] text-sm">
                  {submission.currentOwnerRole.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Local Edits Alert */}
          {hasLocalEdits(submission.id) && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This submission has local edits that haven't been saved yet.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2"
                  onClick={() => {
                    // Handle local edits
                  }}
                >
                  View Changes
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className={` w-full mb-6 `}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isMospiApprover && (
              <TabsTrigger value="reviewer-comments">
                MoSPI Reviewer Comments
              </TabsTrigger>
            )}
            <TabsTrigger value="data-review">Data Review</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isMospiApprover ? (
              <MospiOverviewTab submission={submission} />
            ) : (
              <OverviewTab submission={submission} />
            )}
          </TabsContent>

          {isMospiApprover && (
            <TabsContent value="reviewer-comments">
              <div className="space-y-4">
                {submission.sections?.map((section: any) => (
                  <div
                    key={section.id}
                    className="p-4 border rounded-lg bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{section.name}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {section.progress}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Indicator Score
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {section.points}/{section.maxPoints} points |{" "}
                      {section.sectionsWithComments} sections with comments
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="data-review">
            {isMospiApprover ? (
              <MospiApproverDataReviewTab
                submissionId={submission.id}
                sections={submission.sections || []}
                formData={submission.formData}
              />
            ) : (
              <DataReviewTab
                submissionId={submission.id}
                formData={submission.formData}
                submission={submission}
                isPreview={isPreview}
                assignedIndicators={assignedIndicators}
                isNodalOfficer={isNodalOfficer}
                onRefetch={loadSubmission}
              />
            )}
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab
              documents={submission.attachedFiles || []}
              submissionId={submission.id}
              formData={submission.formData}
            />
          </TabsContent>

          <TabsContent value="history">
            <AuditLog entries={generateAuditEntries(submission)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {!isPreview && (
        <>
          <SendBackModal
            open={sendBackModalOpen}
            onClose={() => setSendBackModalOpen(false)}
            submissionId={submission.id}
          />
          <ApproveModal
            open={approveModalOpen}
            onClose={() => setApproveModalOpen(false)}
            submissionId={submission.id}
          />
          <SendToApproverModal
            open={sendToApproverModalOpen}
            onClose={() => setSendToApproverModalOpen(false)}
            submissionId={submission.id}
          />
          <RejectModal
            isOpen={rejectModalOpen}
            onClose={() => setRejectModalOpen(false)}
            submissionId={submission.id}
            onSuccess={() => {
              loadSubmission();
            }}
          />

          {/* Confirmation Dialog for Send Back to State */}
          <AlertDialog
            open={showSendBackConfirmationDialog}
            onOpenChange={setShowSendBackConfirmationDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Send Back to State</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    Are you sure you want to send this submission back to the
                    State Approver?
                  </p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-orange-900 mb-2">
                      ⚠️ Important:
                    </p>
                    <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                      <li>
                        This form will not be visible to MOSPI Reviewer and
                        MOSPI Approver
                      </li>
                      <li>It will be returned back to State Approver</li>
                      <li>
                        It will only be visible again when State Approver
                        submits the form again
                      </li>
                    </ul>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setShowSendBackConfirmationDialog(false)}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      setIsSendingBack(true);
                      // Send back to state using mospiApproverSendBack API
                      await apiService.mospiApproverSendBack(submission.id);

                      notificationService.success(
                        "Submission sent back to State Approver successfully",
                        "Send Back Successful"
                      );

                      setShowSendBackConfirmationDialog(false);
                      // Reload submission to reflect the new status
                      await loadSubmission();
                      // Navigate back to review list
                      setTimeout(() => {
                        navigate("/data-submission/review");
                      }, 1000);
                    } catch (error: any) {
                      console.error("Failed to send back submission:", error);
                      notificationService.error(
                        error?.message ||
                          "Failed to send back submission. Please try again.",
                        "Send Back Failed"
                      );
                    } finally {
                      setIsSendingBack(false);
                    }
                  }}
                >
                  {isSendingBack ? "Sending Back..." : "Confirm Send Back"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};
