import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, ExternalLink, AlertCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { isWaitingForCurrentUser, getWaitingMessage, canEditSubmission, canReviewSubmission, getCommentBackgroundClass, getCommentTextColorClass, getCommentIconColorClass, isReturnedFromMospi } from "@/utils/auditUtils";

export interface SubmissionCardProps {
  id: string;
  title: string;
  status: "draft" | "under_review" | "approved" | "need_revision" | "DRAFT" | "SUBMITTED_TO_STATE" | "APPROVED" | "REJECTED" | "SUBMITTED_TO_MOSPI" | "MOSPI_APPROVED" | "MOSPI_REJECTED" | "RETURNED_FROM_MOSPI" | "RETURNED_FROM_STATE" | "SUBMITTED_TO_MOSPI_REVIEWER" | "SUBMITTED_TO_MOSPI_APPROVER" | "REJECTED_FINAL";
  referenceId: string;
  updatedDate: string;
  dueDate: string;
  progress: number;
  nextStep: string;
  reviewerNote?: string;
  submission?: any; // Full submission object for isReturnedFromMospi check
  currentUserRole?: string;
  submittedBy?: string; // Added submitted by field
  onEdit?: () => void;
  onViewDetails?: () => void;
  onRevise?: () => void;
}

const statusConfig = {
  // Legacy statuses
  draft: {
    label: "Draft",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-500",
  },
  under_review: {
    label: "Under Review",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
  },
  approved: {
    label: "Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-500",
  },
  need_revision: {
    label: "Need Revision",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
  },
  // Backend statuses
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-500",
  },
  SUBMITTED_TO_STATE: {
    label: "Under Review",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-500",
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-500",
  },
  REJECTED_FINAL: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-500",
  },
  SUBMITTED_TO_MOSPI_REVIEWER: {
    label: "Under MoSPI Review",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
  },
  SUBMITTED_TO_MOSPI_APPROVER: {
    label: "Waiting for Final Approval",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
  },
  MOSPI_APPROVED: {
    label: "MoSPI Approved",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-500",
  },
  MOSPI_REJECTED: {
    label: "MoSPI Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-500",
  },
  RETURNED_FROM_MOSPI: {
    label: "Returned from MoSPI",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
  },
  RETURNED_FROM_STATE: {
    label: "Returned from State",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-500",
  },
};

export function SubmissionCard({
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
  onEdit,
  onViewDetails,
  onRevise,
}: SubmissionCardProps) {
  // Get config with fallback for unknown statuses
  const config = statusConfig[status] || {
    label: status || "Unknown",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-300",
    borderClass: "border-l-gray-500",
  };

  // Check if submission is waiting for current user
  const isWaiting = currentUserRole ? isWaitingForCurrentUser({ status }, currentUserRole) : false;
  const waitingMessage = currentUserRole ? getWaitingMessage({ status }, currentUserRole) : "";

  return (
    <Card className={`p-4 mb-3 border-l-4 ${config.borderClass} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {status !== "REJECTED" && (
              <Badge variant="outline" className={`${config.badgeClass} text-xs`}>
                {config.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>ID: {referenceId}</span>
            <span>Updated: {updatedDate}</span>
            <span>Due: {dueDate}</span>
            {submittedBy && <span>Submitted by: {submittedBy}</span>}
          </div>
          {isWaiting && waitingMessage && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">{waitingMessage}</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "REJECTED" ? (
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 cursor-default" disabled>
              <XCircle className="w-4 h-4 mr-1" />
              Rejected
            </Button>
          ) : submission && isReturnedFromMospi(submission) && currentUserRole === "STATE_APPROVER" && status !== "APPROVED" && status !== "RETURNED_FROM_STATE" ? (
            <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 hover:bg-yellow-100" onClick={onViewDetails}>
              <AlertCircle className="w-4 h-4 mr-1" />
              Action Required
            </Button>
          ) : (status === "need_revision" || status === "RETURNED_FROM_MOSPI" || status === "RETURNED_FROM_STATE") && onRevise ? (
            <Button 
              size="sm" 
              variant="outline" 
              className={`${
                status === "RETURNED_FROM_STATE" 
                  ? "text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100" 
                  : "text-blue-600 border-blue-300"
              }`} 
              onClick={onRevise}
            >
              Revise
            </Button>
          ) : (
            // Show Edit button only if user can edit this submission
            onEdit && canEditSubmission(currentUserRole || "", status) && (
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Edit2 className="w-4 h-4" />
              </Button>
            )
          )}
          {/* Show View Details button only if user can review this submission or if it's view-only */}
          {onViewDetails && (canReviewSubmission(currentUserRole || "", status) || !canEditSubmission(currentUserRole || "", status)) && !(submission && isReturnedFromMospi(submission) && currentUserRole === "STATE_APPROVER") && (
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Progress</span>
          <span className="font-semibold text-gray-700">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-gray-600">
          <span className="font-medium">Next step:</span> {nextStep}
        </p>
      </div>

      {reviewerNote && (
        <div className={`mt-3 p-3 ${getCommentBackgroundClass(status)} rounded-lg flex gap-2`}>
          <AlertCircle className={`w-4 h-4 ${getCommentIconColorClass(status)} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <p className={`text-xs font-semibold ${getCommentTextColorClass(status)} mb-1`}>Reviewer Note:</p>
            <p className={`text-xs ${getCommentTextColorClass(status)}`}>{reviewerNote}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
