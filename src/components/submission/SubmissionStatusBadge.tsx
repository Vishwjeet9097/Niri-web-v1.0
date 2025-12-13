import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, Link as LinkIcon } from "lucide-react";
import { SubmissionStatusInfo, SubmissionStatusType } from "@/utils/indicatorStatusUtils";
import { Link } from "react-router-dom";

interface SubmissionStatusBadgeProps {
  statusInfo: SubmissionStatusInfo;
  showProgress?: boolean;
  showConsolidationLink?: boolean;
  className?: string;
}

/**
 * Component to display submission status with badge and optional progress
 */
export const SubmissionStatusBadge: React.FC<SubmissionStatusBadgeProps> = ({
  statusInfo,
  showProgress = false,
  showConsolidationLink = false,
  className = "",
}) => {
  const getStatusConfig = (status: SubmissionStatusType) => {
    switch (status) {
      case "READY_FOR_CONSOLIDATION":
        return {
          label: "Ready for Consolidation",
          variant: "default" as const,
          icon: CheckCircle,
          className: "bg-green-100 text-green-800 border-green-200",
        };
      case "UNDER_REVIEW":
        return {
          label: "Under Review",
          variant: "default" as const,
          icon: Clock,
          className: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "CONSOLIDATED":
        return {
          label: "Consolidated",
          variant: "default" as const,
          icon: CheckCircle,
          className: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "PENDING":
        return {
          label: "Pending",
          variant: "default" as const,
          icon: AlertCircle,
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
      default:
        return {
          label: "Unknown",
          variant: "default" as const,
          icon: AlertCircle,
          className: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const config = getStatusConfig(statusInfo.status);
  const Icon = config.icon;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className={config.className}>
          <Icon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
        {showProgress && (
          <span className="text-sm text-muted-foreground">
            ({statusInfo.acceptedIndicators}/{statusInfo.totalIndicators} indicators)
          </span>
        )}
      </div>

      {showProgress && statusInfo.totalIndicators > 0 && (
        <div className="w-full">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{statusInfo.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                statusInfo.status === "READY_FOR_CONSOLIDATION"
                  ? "bg-green-500"
                  : statusInfo.status === "UNDER_REVIEW"
                  ? "bg-blue-500"
                  : "bg-gray-400"
              }`}
              style={{ width: `${statusInfo.progress}%` }}
            />
          </div>
        </div>
      )}

      {showConsolidationLink && statusInfo.isConsolidated && statusInfo.consolidatedInto && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <LinkIcon className="w-3 h-3" />
          <Link
            to={`/data-submission/review/${statusInfo.consolidatedInto}`}
            className="text-primary hover:underline"
          >
            View Consolidated Submission
          </Link>
        </div>
      )}
    </div>
  );
};