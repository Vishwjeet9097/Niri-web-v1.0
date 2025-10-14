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
  Clock
} from "lucide-react";
import { 
  isWaitingForCurrentUser, 
  getWaitingMessage, 
  canEditSubmission, 
  canReviewSubmission, 
  getCommentBackgroundClass, 
  getCommentTextColorClass, 
  getCommentIconColorClass, 
  isReturnedFromMospi 
} from "@/utils/auditUtils";

export interface UnifiedSubmissionCardProps {
  id: string;
  title: string;
  status: "draft" | "under_review" | "approved" | "need_revision" | "DRAFT" | "SUBMITTED_TO_STATE" | "APPROVED" | "REJECTED" | "SUBMITTED_TO_MOSPI" | "MOSPI_APPROVED" | "MOSPI_REJECTED" | "RETURNED_FROM_MOSPI" | "RETURNED_FROM_STATE" | "SUBMITTED_TO_MOSPI_REVIEWER" | "SUBMITTED_TO_MOSPI_APPROVER" | "REJECTED_FINAL";
  referenceId: string;
  updatedDate: string;
  dueDate: string;
  progress: number;
  nextStep: string;
  reviewerNote?: string;
  submission?: any;
  currentUserRole?: string;
  submittedBy?: string; // Added submitted by field
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
  const isWaiting = currentUserRole ? isWaitingForCurrentUser({ status }, currentUserRole) : false;
  const waitingMessage = currentUserRole ? getWaitingMessage({ status }, currentUserRole) : "";

  // Determine if we should show multiple status pills
  const showMultipleStatusPills = status === "SUBMITTED_TO_STATE" || status === "SUBMITTED_TO_MOSPI_REVIEWER" || status === "SUBMITTED_TO_MOSPI_APPROVER";
  
  // Special handling for specific status combinations
  const getStatusPills = () => {
    if (status === "SUBMITTED_TO_STATE") {
      return [
        { label: "Under Review", className: "bg-blue-100 text-blue-800 border-blue-200" },
        { label: "Waiting for State Approver Review", className: "bg-blue-100 text-blue-800 border-blue-200" }
      ];
    }
    if (status === "SUBMITTED_TO_MOSPI_APPROVER") {
      return [
        { label: "Under Review", className: "bg-blue-100 text-blue-800 border-blue-200" },
        { label: "Waiting for State Approver Review", className: "bg-blue-100 text-blue-800 border-blue-200" }
      ];
    }
    return [{ label: config.label, className: config.badgeClass }];
  };

  return (
    <Card className={`p-6 mb-4 border-l-4 ${config.borderClass} ${config.bgClass} hover:shadow-lg transition-all duration-200 rounded-lg`}>
      {/* Header with title and status pills */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status pills */}
              {getStatusPills().map((pill, index) => (
                <Badge key={index} variant="outline" className={`${pill.className} text-xs font-medium px-2 py-1`}>
                  {pill.label}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Submission details */}
          <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
            <span className="font-medium">ID: {referenceId}</span>
            <span>Updated: {updatedDate}</span>
            <span>Due: {dueDate}</span>
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
            <Button size="sm" variant="outline" className="text-red-600 border-red-300 cursor-default" disabled>
              <XCircle className="w-4 h-4 mr-1" />
              Rejected
            </Button>
          ) : submission && isReturnedFromMospi(submission) && currentUserRole === "STATE_APPROVER" && status !== "APPROVED" ? (
            <Button size="sm" variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50 hover:bg-yellow-100" onClick={onViewDetails}>
              <AlertCircle className="w-4 h-4 mr-1" />
              Action Required
            </Button>
          ) : (status === "need_revision" || status === "RETURNED_FROM_MOSPI" || status === "RETURNED_FROM_STATE") && onRevise ? (
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={onRevise}>
              Revise
            </Button>
          ) : onReview && canReviewSubmission(currentUserRole || "", status) ? (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onReview}>
              <FileText className="w-4 h-4 mr-1" />
              Review Now
            </Button>
          ) : onEdit && canEditSubmission(currentUserRole || "", status) ? (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
          ) : null}
          
          {/* View Details button */}
          {onViewDetails && (
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              View Details
            </Button>
          )}
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 font-medium">Progress</span>
          <span className="font-semibold text-gray-700">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-600">
          <span className="font-medium">Next step:</span> {nextStep}
        </p>
      </div>

      {/* Reviewer note */}
      {reviewerNote && (
        <div className={`mt-4 p-3 ${getCommentBackgroundClass(status)} rounded-lg flex gap-2`}>
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
