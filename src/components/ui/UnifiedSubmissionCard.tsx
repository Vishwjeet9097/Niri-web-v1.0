import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Edit2,
  ExternalLink,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Eye,
  FileText,
  Clock,
} from "lucide-react";
import {
  isWaitingForCurrentUser,
  canEditSubmission,
  canReviewSubmission,
  getCommentBackgroundClass,
  getCommentTextColorClass,
  getCommentIconColorClass,
  isReturnedFromMospi,
} from "@/utils/auditUtils";
import {
  getStatusInfo,
  getRoleSpecificStatusInfo,
  getStatusPills,
  getWaitingMessage as getStatusWaitingMessage,
  shouldShowMultipleStatusPills,
} from "@/utils/statusUtils";
import {
  areAllIndicatorsAccepted,
  isSubmissionFromNodalOfficer,
  isSubmissionFromStateApprover,
} from "@/utils/indicatorStatusUtils";

export interface UnifiedSubmissionCardProps {
  id: string;
  title: string;
  status:
    | "draft"
    | "under_review"
    | "approved"
    | "need_revision"
    | "DRAFT"
    | "SUBMITTED_TO_STATE"
    | "APPROVED"
    | "REJECTED"
    | "SUBMITTED_TO_MOSPI"
    | "MOSPI_APPROVED"
    | "MOSPI_REJECTED"
    | "RETURNED_FROM_MOSPI"
    | "RETURNED_FROM_MOSPI_APPROVER"
    | "RETURNED_FROM_STATE"
    | "SUBMITTED_TO_MOSPI_REVIEWER"
    | "SUBMITTED_TO_MOSPI_APPROVER"
    | "REJECTED_FINAL";
  referenceId: string;
  updatedDate: string;
  dueDate: string;
  progress: number;
  nextStep: string;
  reviewerNote?: string;
  submission?: Record<string, unknown>;
  currentUserRole?: string;
  submittedBy?: string; // Added submitted by field
  stateUt?: string; // State/UT name
  onEdit?: () => void;
  onViewDetails?: () => void;
  onRevise?: () => void;
  onReview?: () => void;
}

const statusConfig = {
  // Legacy statuses
  draft: {
    label: "Draft",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-500",
    bgClass: "bg-white",
  },
  under_review: {
    label: "Under Review",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
    bgClass: "bg-white",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-500",
    bgClass: "bg-white",
  },
  need_revision: {
    label: "Need Revision",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
    bgClass: "bg-white",
  },
  // Backend statuses
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-500",
    bgClass: "bg-white",
  },
  SUBMITTED_TO_STATE: {
    label: "Under Review",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
    bgClass: "bg-white",
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-500",
    bgClass: "bg-white",
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-500",
    bgClass: "bg-white",
  },
  REJECTED_FINAL: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-500",
    bgClass: "bg-white",
  },
  SUBMITTED_TO_MOSPI_REVIEWER: {
    label: "Under MoSPI Review",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
    bgClass: "bg-white",
  },
  SUBMITTED_TO_MOSPI_APPROVER: {
    label: "Waiting for Final Approval",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
    bgClass: "bg-white",
  },
  MOSPI_APPROVED: {
    label: "MoSPI Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-500",
    bgClass: "bg-white",
  },
  MOSPI_REJECTED: {
    label: "MoSPI Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-500",
    bgClass: "bg-white",
  },
  RETURNED_FROM_MOSPI: {
    label: "Returned from MoSPI",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
    bgClass: "bg-white",
  },
  RETURNED_FROM_MOSPI_APPROVER: {
    label: "Returned from MoSPI Approver",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
    bgClass: "bg-white",
  },
  RETURNED_FROM_STATE: {
    label: "Returned from State",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
    bgClass: "bg-white",
  },
};

export function UnifiedSubmissionCard({
  id,
  title,
  status,
  referenceId,
  updatedDate,
  dueDate,
  progress,
  nextStep,
  reviewerNote,
  submission,
  currentUserRole,
  submittedBy,
  stateUt,
  onEdit,
  onViewDetails,
  onRevise,
  onReview,
}: UnifiedSubmissionCardProps) {
  // Get config with fallback for unknown statuses
  const config = statusConfig[status] || {
    label: status || "Unknown",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
    borderClass: "border-l-gray-500",
    bgClass: "bg-white",
  };

  // Check if submission is waiting for current user
  const isWaiting = currentUserRole
    ? isWaitingForCurrentUser({ status }, currentUserRole)
    : false;
  const waitingMessage = currentUserRole
    ? getStatusWaitingMessage(status, currentUserRole)
    : "";

  // Use centralized status utilities with role-specific labels
  const statusInfo = getRoleSpecificStatusInfo(status, currentUserRole);
  const statusPills = getStatusPills(status, currentUserRole);
  const showMultiplePills = shouldShowMultipleStatusPills(
    status,
    currentUserRole
  );

  // Check if all indicators are accepted
  const allIndicatorsAccepted = areAllIndicatorsAccepted(submission);

  // Check if submission is from NODAL_OFFICER
  const isFromNodalOfficer = isSubmissionFromNodalOfficer(submission);

  // Debug logging
  console.group("🔍 [UnifiedSubmissionCard] Button Display Logic");
  const submissionData = submission as any;
  console.log("📋 Submission:", {
    id: submissionData?.id,
    submissionId: submissionData?.submissionId,
    userRole: submissionData?.user?.role,
    currentOwnerRole: submissionData?.currentOwnerRole,
    status: submissionData?.status || status,
  });
  console.log("👤 Current User Role:", currentUserRole);
  console.log("✅ All Indicators Accepted:", allIndicatorsAccepted);
  console.log("👨‍💼 Is From NODAL_OFFICER:", isFromNodalOfficer);
  console.log(
    "📝 Form Data Structure:",
    submissionData?.formData
      ? Object.keys(submissionData.formData)
      : "No formData"
  );
  if (submissionData?.formData) {
    const formData = submissionData.formData as Record<string, any>;
    console.log("📦 Form Data Categories:", {
      infraFinancing: formData.infraFinancing
        ? Object.keys(formData.infraFinancing)
        : null,
      infraDevelopment: formData.infraDevelopment
        ? Object.keys(formData.infraDevelopment)
        : null,
      pppDevelopment: formData.pppDevelopment
        ? Object.keys(formData.pppDevelopment)
        : null,
      infraEnablers: formData.infraEnablers
        ? Object.keys(formData.infraEnablers)
        : null,
    });
  }

  // Determine which buttons to show
  // Logic:
  // 1. STATE_APPROVER viewing NODAL_OFFICER submission:
  //    - If all indicators accepted → Show "View Details" (hide Review Now)
  //    - If any indicator not accepted → Show "Review Now" (hide View Details for this case)
  // 2. STATE_APPROVER viewing their own submission:
  //    - If all indicators accepted → Show "View Details" (hide Review Now)
  //    - If any indicator not accepted → Show "Review Now" (hide View Details for this case)
  // 3. Other roles → Use existing logic

  const isStateApproverViewingNodalSubmission =
    currentUserRole === "STATE_APPROVER" && isFromNodalOfficer;

  const isStateApproverViewingOwnSubmission =
    currentUserRole === "STATE_APPROVER" &&
    isSubmissionFromStateApprover(submission);

  console.log(
    "🔍 Is STATE_APPROVER viewing NODAL_OFFICER submission:",
    isStateApproverViewingNodalSubmission
  );
  console.log(
    "🔍 Is STATE_APPROVER viewing their own submission:",
    isStateApproverViewingOwnSubmission
  );

  // Show Review Now when STATE_APPROVER views NODAL_OFFICER submission OR their own submission with unaccepted indicators
  const canReview = canReviewSubmission(currentUserRole || "", status);
  const shouldShowReviewNow =
    (isStateApproverViewingNodalSubmission ||
      isStateApproverViewingOwnSubmission) &&
    !allIndicatorsAccepted &&
    onReview &&
    canReview;

  console.log("🔍 Should Show Review Now:", {
    isStateApproverViewingNodalSubmission,
    isStateApproverViewingOwnSubmission,
    allIndicatorsAccepted,
    hasOnReview: !!onReview,
    canReview,
    result: shouldShowReviewNow,
  });

  // Show View Details:
  // - STATE_APPROVER sees View Details (except when showing Review Now for NODAL_OFFICER submissions or their own submissions)
  // - Other roles see View Details when appropriate
  const canEdit = canEditSubmission(currentUserRole || "", status);
  const shouldShowViewDetails =
    onViewDetails &&
    // STATE_APPROVER: Show View Details (except when showing Review Now for NODAL_OFFICER or their own submissions with unaccepted indicators)
    ((currentUserRole === "STATE_APPROVER" && !shouldShowReviewNow) ||
      // Other roles: Show View Details when not showing Review Now
      (currentUserRole !== "STATE_APPROVER" &&
        !shouldShowReviewNow &&
        !onReview) ||
      // Fallback: if can't review and can't edit, show View Details
      (!canReview && !canEdit));

  console.log("🔍 Should Show View Details:", {
    hasOnViewDetails: !!onViewDetails,
    isStateApprover: currentUserRole === "STATE_APPROVER",
    shouldShowReviewNow,
    canReview,
    canEdit,
    result: shouldShowViewDetails,
  });
  console.groupEnd();

  return (
    <Card
      className={`p-6 mb-4 border-l-4 ${config.borderClass} ${config.bgClass} hover:shadow-lg transition-all duration-200 rounded-lg`}
    >
      {/* Header with title and status pills */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-base font-semibold text-[#0F2057]">{title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status pills */}
              {statusPills.map((pill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={`${pill.className} text-xs font-medium px-2 py-1`}
                >
                  {pill.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Submission details */}
          <div className="flex items-center gap-6 text-xs text-gray-500 mb-3">
            <span className="font-medium">
              State:{" "}
              {stateUt ||
                (submission as any)?.stateUt ||
                (submission as any)?.state_ut ||
                referenceId}
            </span>
            <span>Updated: {updatedDate}</span>
            {/* <span>Due: {dueDate}</span> */}
            {submittedBy && <span>Submitted by: {submittedBy}</span>}
          </div>

          {/* Waiting message */}
          {isWaiting && waitingMessage && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">{waitingMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {status === "REJECTED" || status === "REJECTED_FINAL" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 cursor-default"
              disabled
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejected
            </Button>
          ) : submission &&
            isReturnedFromMospi(submission) &&
            currentUserRole === "STATE_APPROVER" &&
            status !== "APPROVED" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-yellow-600 border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
              onClick={onViewDetails}
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Action Required
            </Button>
          ) : (status === "need_revision" ||
              status === "RETURNED_FROM_MOSPI" ||
              status === "RETURNED_FROM_STATE" ||
              status === "RETURNED_FROM_MOSPI_APPROVER") &&
            onRevise &&
            !(
              currentUserRole === "NODAL_OFFICER" &&
              status === "RETURNED_FROM_MOSPI_APPROVER"
            ) ? (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300"
              onClick={onRevise}
            >
              Revise
            </Button>
          ) : shouldShowReviewNow ? (
            // Show "Review Now" when STATE_APPROVER viewing NODAL_OFFICER submission with unaccepted indicators
            <Button
              size="sm"
              // className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onReview}
            >
              <FileText className="w-4 h-4 mr-1" />
              Review Now
            </Button>
          ) : onReview &&
            canReviewSubmission(currentUserRole || "", status) &&
            !shouldShowViewDetails ? (
            // Show "Review Now" for other review cases (not STATE_APPROVER viewing NODAL_OFFICER submissions)
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={onReview}
            >
              <FileText className="w-4 h-4 mr-1" />
              Review Now
            </Button>
          ) : onEdit &&
            canEditSubmission(currentUserRole || "", status) &&
            !allIndicatorsAccepted ? (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : null}

          {/* View Details button - shown conditionally based on indicator acceptance status */}
          {shouldShowViewDetails && (
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </Button>
          )}
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-3">
        {/* <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-medium">Progress</span>
          <span className="font-semibold text-gray-700">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" /> */}
        <p className="text-sm text-gray-600">
          <span className="font-medium">Next step:</span> {nextStep}
        </p>
      </div>

      {/* Reviewer note */}
      {reviewerNote && (
        <div
          className={`mt-4 p-3 ${getCommentBackgroundClass(
            status
          )} rounded-lg flex gap-2`}
        >
          <AlertCircle
            className={`w-4 h-4 ${getCommentIconColorClass(
              status
            )} flex-shrink-0 mt-0.5`}
          />
          <div className="flex-1">
            <p
              className={`text-xs font-semibold ${getCommentTextColorClass(
                status
              )} mb-1`}
            >
              Reviewer Note:
            </p>
            <p className={`text-xs ${getCommentTextColorClass(status)}`}>
              {reviewerNote}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
