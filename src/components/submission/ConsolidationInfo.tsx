import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ExternalLink, Users, Calendar, Link as LinkIcon } from "lucide-react";
import {
  isConsolidatedSubmission,
  getSourceSubmissionIds,
  getSubmissionStatus,
} from "@/utils/indicatorStatusUtils";

interface ConsolidationInfoProps {
  submission: Record<string, any>;
  sourceSubmissions?: Record<string, any>[];
  className?: string;
}

/**
 * Component to display consolidation relationships
 * Shows source submissions for consolidated submissions
 * Shows consolidation link for source submissions
 */
export const ConsolidationInfo: React.FC<ConsolidationInfoProps> = ({
  submission,
  sourceSubmissions = [],
  className = "",
}) => {
  const isConsolidated = isConsolidatedSubmission(submission);
  const statusInfo = getSubmissionStatus(submission);

  // If this is a consolidated submission, show source submissions
  if (isConsolidated) {
    const sourceIds = getSourceSubmissionIds(submission);
    const sources = sourceSubmissions.filter((sub) =>
      sourceIds.includes(sub.submissionId || sub.id)
    );

    if (sources.length === 0) {
      return null;
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Source Submissions ({sources.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sources.map((source) => {
              const sourceStatus = getSubmissionStatus(source);
              return (
                <div
                  key={source.id || source.submissionId}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <Link
                      to={`/data-submission/review/${source.id || source.submissionId}`}
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      {source.submissionId || source.id}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">
                      {source.user?.firstName} {source.user?.lastName}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      sourceStatus.status === "READY_FOR_CONSOLIDATION"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }
                  >
                    {sourceStatus.status === "READY_FOR_CONSOLIDATION"
                      ? "Ready"
                      : "Under Review"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If this is a source submission, show consolidation link
  if (statusInfo.isConsolidated && statusInfo.consolidatedInto) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Consolidation Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Consolidated Into:</span>
              <Link
                to={`/data-submission/review/${statusInfo.consolidatedInto}`}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {statusInfo.consolidatedInto}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            {statusInfo.consolidatedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                Consolidated on: {new Date(statusInfo.consolidatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

