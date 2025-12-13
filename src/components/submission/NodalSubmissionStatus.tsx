import React from "react";
import { SubmissionStatusBadge } from "./SubmissionStatusBadge";
import { getSubmissionStatus, getConsolidationInfo } from "@/utils/indicatorStatusUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface NodalSubmissionStatusProps {
  submission: Record<string, any>;
  showDetails?: boolean;
  className?: string;
}

/**
 * Component to show status at nodal level with consolidation information
 */
export const NodalSubmissionStatus: React.FC<NodalSubmissionStatusProps> = ({
  submission,
  showDetails = false,
  className = "",
}) => {
  const statusInfo = getSubmissionStatus(submission);
  const consolidationInfo = getConsolidationInfo(submission);

  return (
    <div className={className}>
      <SubmissionStatusBadge
        statusInfo={statusInfo}
        showProgress={true}
        showConsolidationLink={!!consolidationInfo?.consolidatedInto}
      />

      {showDetails && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Status Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Indicators:</span>
              <span className="font-medium">{statusInfo.totalIndicators}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accepted:</span>
              <span className="font-medium text-green-600">
                {statusInfo.acceptedIndicators}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium text-orange-600">
                {statusInfo.pendingIndicators}
              </span>
            </div>

            {consolidationInfo?.consolidatedInto && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consolidated Into:</span>
                  <Link
                    to={`/data-submission/review/${consolidationInfo.consolidatedInto}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {consolidationInfo.consolidatedInto}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                {consolidationInfo.consolidatedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Consolidated on: {new Date(consolidationInfo.consolidatedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};