import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lock, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";

interface IndicatorSectionProps {
  sectionId: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  showAccessDenied?: boolean;
  indicatorStatus?: string; // Status of the indicator (ACCEPTED, SUBMITTED_TO_STATE, etc.)
  isEditable?: boolean; // Whether the indicator is editable
}

export function IndicatorSection({
  sectionId,
  title,
  children,
  className = "",
  showAccessDenied = true,
  indicatorStatus,
  isEditable = true,
}: IndicatorSectionProps) {
  const { hasSectionAccess, getSectionAccess, isNodalOfficer } =
    useIndicatorAccess();

  // Get status badge
  const getStatusBadge = () => {
    if (!indicatorStatus) return null;

    const upperStatus = indicatorStatus.toUpperCase();

    if (upperStatus === "ACCEPTED") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Accepted
        </Badge>
      );
    }

    if (upperStatus === "SUBMITTED_TO_STATE") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Submitted
        </Badge>
      );
    }

    return null;
  };

  // If not a nodal officer, show all sections
  if (!isNodalOfficer) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{title}</span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent
          className={!isEditable ? "opacity-60 pointer-events-none" : ""}
        >
          {children}
        </CardContent>
      </Card>
    );
  }

  // Check if user has access to this section
  const hasAccess = hasSectionAccess(sectionId);
  const sectionAccess = getSectionAccess(sectionId);

  if (!hasAccess) {
    if (!showAccessDenied) {
      return null; // Hide section completely
    }

    return (
      <Card className={`${className} opacity-60`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              आपको इस section तक पहुंच की अनुमति नहीं है। कृपया अपने
              administrator से संपर्क करें।
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <span>{title}</span>
            {sectionAccess.hiddenIndicators.length > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                केवल {sectionAccess.assignedIndicators.join(", ")} indicators
                दिखाए जा रहे हैं
              </div>
            )}
          </div>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={!isEditable ? "opacity-60 pointer-events-none" : ""}
      >
        {children}
      </CardContent>
    </Card>
  );
}

// Higher-order component for conditional rendering
export function withIndicatorAccess<T extends object>(
  Component: React.ComponentType<T>,
  sectionId: string,
  fallback?: React.ComponentType<T>
) {
  return function WrappedComponent(props: T) {
    const { hasSectionAccess, isNodalOfficer } = useIndicatorAccess();

    // If not a nodal officer, always show
    if (!isNodalOfficer) {
      return <Component {...props} />;
    }

    // If user has access, show component
    if (hasSectionAccess(sectionId)) {
      return <Component {...props} />;
    }

    // If no access and fallback provided, show fallback
    if (fallback) {
      return <fallback {...props} />;
    }

    // Otherwise, don't render anything
    return null;
  };
}

// Hook for conditional rendering based on indicator access
export function useIndicatorSectionAccess(sectionId: string) {
  const { hasSectionAccess, getSectionAccess, isNodalOfficer } =
    useIndicatorAccess();

  return {
    hasAccess: !isNodalOfficer || hasSectionAccess(sectionId),
    sectionAccess: getSectionAccess(sectionId),
    isNodalOfficer,
  };
}
