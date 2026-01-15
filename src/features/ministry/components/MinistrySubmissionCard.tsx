import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, Clock, User } from "lucide-react";

export interface MinistrySubmissionCardProps {
  id: string;
  submissionId: string;
  ministryName?: string;
  userName?: string;
  userEmail?: string;
  status: string;
  updatedDate: string;
  progress: number;
  totalIndicators: number;
  submittedIndicators: number;
  nextStep?: string;
  onViewDetails?: () => void;
  onReview?: () => void;
}

const statusConfig: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  DRAFT: {
    label: "Draft",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-500",
  },
  SUBMITTED_TO_STATE: {
    label: "Submitted",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-500",
  },
  SUBMITTED_TO_MOSPI_REVIEWER: {
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
};

export function MinistrySubmissionCard({
  id,
  submissionId,
  ministryName,
  userName,
  userEmail,
  status,
  updatedDate,
  progress,
  totalIndicators,
  submittedIndicators,
  nextStep,
  onViewDetails,
  onReview,
}: MinistrySubmissionCardProps) {
  // Debug: Log what we're receiving
  console.log('🎴 [MinistrySubmissionCard] Props received:', {
    submissionId,
    ministryName,
    userName,
    hasMinistryName: !!ministryName,
    ministryNameValue: ministryName,
  });

  const config = statusConfig[status] || {
    label: status || "Unknown",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-500",
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className={`p-10 mb-8 border-l-4 ${config.borderClass} hover:shadow-lg transition-all duration-200 rounded-lg bg-white`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-8">
          {/* Submission ID and Status Badge */}
          <div className="flex items-center gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {submissionId}
            </h3>
            <Badge variant="outline" className={`${config.badgeClass} text-xs font-medium px-3 py-1.5`}>
              {config.label}
            </Badge>
          </div>

          {/* Metadata: Ministry, Updated, Submitted by */}
          <div className="flex items-center gap-8 text-sm text-gray-500 mb-6">
            <span className="font-medium">Ministry: {ministryName || 'N/A'}</span>
            <span>Updated: {formatDate(updatedDate)}</span>
            {userName && <span>Submitted by: {userName}</span>}
          </div>

          {/* Next Step */}
          {nextStep && (
            <p className="text-base text-gray-700 mt-2">
              Next step: {nextStep}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {onViewDetails && (
            <Button size="sm" variant="outline" onClick={onViewDetails} className="px-4 py-2">
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

