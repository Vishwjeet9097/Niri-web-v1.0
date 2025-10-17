import { FileText, Clock, File, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { hasMospiApproverComment, canReviewSubmission, isReturnedFromMospi } from "@/utils/auditUtils";
import { getStatusInfo, getStatusPills } from "@/utils/statusUtils";

interface ApproverSubmissionCardProps {
  title: string;
  status: string; // Now accepts any string (submissionId)
  submittedBy: string;
  submissionDate: string;
  deadline: string;
  category: string;
  progress: number;
  documents: number;
  pendingDays: number;
  completionPercent: number;
  submission?: any; // Add submission data for MOSPI_APPROVER comment check
  currentUserRole?: string; // Add current user role for permissions
  onReview?: () => void;
}

export function ApproverSubmissionCard({
  title,
  status,
  submittedBy,
  submissionDate,
  deadline,
  category,
  progress,
  documents,
  pendingDays,
  completionPercent,
  submission,
  currentUserRole,
  onReview,
}: ApproverSubmissionCardProps) {
  // Status configuration
  const statusConfig = {
    overdue: {
      label: "Overdue",
      borderClass: "border-l-red-500",
      bgClass: "bg-red-50",
      badgeClass: "bg-red-100 text-red-800",
    },
    pending: {
      label: "Pending",
      borderClass: "border-l-blue-500",
      bgClass: "bg-white",
      badgeClass: "bg-blue-100 text-blue-800",
    },
    submitted_to_mospi_reviewer: {
      label: "Under MoSPI Review",
      borderClass: "border-l-blue-500",
      bgClass: "bg-blue-50",
      badgeClass: "bg-blue-100 text-blue-800",
    },
    submitted_to_mospi_approver: {
      label: "Waiting for Final Approval",
      borderClass: "border-l-blue-500",
      bgClass: "bg-blue-50",
      badgeClass: "bg-blue-100 text-blue-800",
    },
    approved: {
      label: "Approved",
      borderClass: "border-l-green-500",
      bgClass: "bg-green-50",
      badgeClass: "bg-green-100 text-green-800",
    },
    rejected: {
      label: "Rejected",
      borderClass: "border-l-red-500",
      bgClass: "bg-red-50",
      badgeClass: "bg-red-100 text-red-800",
    },
    draft: {
      label: "Draft",
      borderClass: "border-l-gray-500",
      bgClass: "bg-gray-50",
      badgeClass: "bg-gray-100 text-gray-800",
    },
    returned_from_mospi: {
      label: "Returned from MoSPI",
      borderClass: "border-l-orange-500",
      bgClass: "bg-orange-50",
      badgeClass: "bg-orange-100 text-orange-800",
    },
  };

  // Use centralized status utilities
  const statusInfo = getStatusInfo(status);
  
  // Check if status is a submissionId (starts with SUB- or contains submissionId pattern)
  const isSubmissionId = status && (status.startsWith('SUB-') || status.includes('-'));
  const config = isSubmissionId ? {
    label: status,
    borderClass: "border-l-blue-500",
    bgClass: "bg-blue-50",
    badgeClass: "bg-blue-100 text-blue-700",
  } : {
    label: statusInfo.label,
    borderClass: statusInfo.borderClass,
    bgClass: statusInfo.bgClass,
    badgeClass: statusInfo.badgeClass,
  };

  // Production ready - no debug logging


  return (
    <div
      className={`rounded-lg border-l-4 p-6 mb-4 ${config.borderClass} ${config.bgClass}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        </div>
        {submission && hasMospiApproverComment(submission) && status !== "APPROVED" ? (
          <Button 
            className="bg-red-600 hover:bg-red-700"
            onClick={onReview}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Action Required
          </Button>
        ) : submission && isReturnedFromMospi(submission) && currentUserRole === "STATE_APPROVER" && status !== "APPROVED" ? (
          <Button 
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={onReview}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Action Required
          </Button>
        ) : (
          // Show Review Now button only if user can review this submission
          canReviewSubmission(currentUserRole || "", status) && (
            <Button 
              className="bg-primary hover:bg-primary-hover"
              onClick={onReview}
            >
              <FileText className="w-4 h-4 mr-2" />
              Review Now
            </Button>
          )
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-600 mb-1">Submitted by</p>
          <p className="text-sm font-medium text-gray-900">{submittedBy}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Submission Date</p>
          <p className="text-sm font-medium text-gray-900">{submissionDate}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Deadline</p>
          <p className="text-sm font-medium text-gray-900">{deadline}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Category</p>
          <p className="text-sm font-medium text-gray-900">{category}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-gray-700 font-medium">Progress</p>
          <p className="text-xs text-gray-900 font-semibold">{progress}%</p>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="flex items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <File className="w-4 h-4" />
          <span>{documents} documents</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>Pending {pendingDays} days</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{completionPercent}% complete</span>
        </div>
      </div>
    </div>
  );
}
