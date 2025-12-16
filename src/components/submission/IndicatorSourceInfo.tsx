/**
 * Component to display indicator source information for consolidated submissions
 * Shows which nodal officer submitted each indicator
 */

import React from "react";
import { User, FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getIndicatorMappingFromSubmission,
  getIndicatorMappingSummary,
  getIndicatorSource,
  IndicatorMappingEntry,
} from "@/utils/indicatorMappingUtils";

interface IndicatorSourceInfoProps {
  submission: any;
  category?: string;
  sectionKey?: string;
  showSummary?: boolean;
}

/**
 * Display source information for a specific indicator
 */
export const IndicatorSourceBadge: React.FC<{
  submission: any;
  category: string;
  sectionKey: string;
}> = ({ submission, category, sectionKey }) => {
  const source = getIndicatorSource(submission, category, sectionKey);

  if (!source) {
    return null;
  }

  return (
    <Badge variant="outline" className="ml-2 text-xs">
      <User className="w-3 h-3 mr-1" />
      Source: {source.sourceNodalOfficerName}
    </Badge>
  );
};

/**
 * Display full indicator source information panel
 */
export const IndicatorSourceInfo: React.FC<IndicatorSourceInfoProps> = ({
  submission,
  category,
  sectionKey,
  showSummary = true,
}) => {
  const mapping = getIndicatorMappingFromSubmission(submission);
  const summary = showSummary ? getIndicatorMappingSummary(submission) : null;

  // If specific category and section provided, show only that indicator's source
  if (category && sectionKey) {
    const source = getIndicatorSource(submission, category, sectionKey);
    if (!source) {
      return null;
    }

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Indicator Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Nodal Officer:</span>
              <span className="text-sm">{source.sourceNodalOfficerName}</span>
            </div>
            {source.sourceNodalOfficerEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm">{source.sourceNodalOfficerEmail}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Source Submission:</span>
              <Badge variant="outline" className="text-xs">
                {source.sourceSubmissionId}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no mapping, don't show anything
  if (!mapping || Object.keys(mapping).length === 0) {
    return null;
  }

  // Show summary if requested
  if (summary) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Indicator Source Summary</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            This consolidated submission contains {summary.totalIndicators} indicators from{" "}
            {summary.uniqueNodalOfficers} nodal officer{summary.uniqueNodalOfficers !== 1 ? "s" : ""}.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.nodalOfficerBreakdown.map((nodalOfficer) => (
              <div
                key={nodalOfficer.nodalOfficerId}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{nodalOfficer.nodalOfficerName}</span>
                  </div>
                  <Badge variant="secondary">
                    {nodalOfficer.indicatorCount} indicator{nodalOfficer.indicatorCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Indicators:</p>
                  <div className="flex flex-wrap gap-1">
                    {nodalOfficer.indicators.map((indicator) => {
                      const [cat, sec] = indicator.split(".");
                      const indicatorCode = sec?.replace("section", "").replace("_", ".") || indicator;
                      return (
                        <Badge key={indicator} variant="outline" className="text-xs">
                          {indicatorCode}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show full mapping table
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Indicator Source Mapping</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Track which nodal officer submitted each indicator
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">Indicator</th>
                <th className="text-left p-2 font-semibold">Nodal Officer</th>
                <th className="text-left p-2 font-semibold">Source Submission</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(mapping).map(([indicatorPath, entry]: [string, IndicatorMappingEntry]) => {
                const [category, sectionKey] = indicatorPath.split(".");
                const indicatorCode = sectionKey?.replace("section", "").replace("_", ".") || indicatorPath;
                return (
                  <tr key={indicatorPath} className="border-b">
                    <td className="p-2">
                      <Badge variant="outline">{indicatorCode}</Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{entry.sourceNodalOfficerName}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {entry.sourceSubmissionId}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};