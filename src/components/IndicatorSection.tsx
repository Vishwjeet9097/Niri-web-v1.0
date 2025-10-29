import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertTriangle } from 'lucide-react';
import { useIndicatorAccess } from '@/hooks/useIndicatorAccess';

interface IndicatorSectionProps {
  sectionId: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  showAccessDenied?: boolean;
}

export function IndicatorSection({ 
  sectionId, 
  title, 
  children, 
  className = "",
  showAccessDenied = true 
}: IndicatorSectionProps) {
  const { hasSectionAccess, getSectionAccess, isNodalOfficer } = useIndicatorAccess();

  // If not a nodal officer, show all sections
  if (!isNodalOfficer) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
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
              आपको इस section तक पहुंच की अनुमति नहीं है। कृपया अपने administrator से संपर्क करें।
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {sectionAccess.hiddenIndicators.length > 0 && (
          <div className="text-sm text-muted-foreground">
            केवल {sectionAccess.assignedIndicators.join(', ')} indicators दिखाए जा रहे हैं
          </div>
        )}
      </CardHeader>
      <CardContent>
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
  const { hasSectionAccess, getSectionAccess, isNodalOfficer } = useIndicatorAccess();

  return {
    hasAccess: !isNodalOfficer || hasSectionAccess(sectionId),
    sectionAccess: getSectionAccess(sectionId),
    isNodalOfficer
  };
}
