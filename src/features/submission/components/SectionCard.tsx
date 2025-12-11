import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string | ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  indicatorStatus?: string; // Status of the indicator (ACCEPTED, SUBMITTED_TO_STATE, etc.)
}

export const SectionCard = ({
  title,
  subtitle,
  children,
  className,
  indicatorStatus,
}: SectionCardProps) => {
  // Get status badge
  const getStatusBadge = () => {
    if (!indicatorStatus) return null;

    const upperStatus = indicatorStatus.toUpperCase();

    if (upperStatus === "ACCEPTED") {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 ml-2">
          <CheckCircle2 className="w-3 h-3" />
          Accepted
        </Badge>
      );
    }

    if (upperStatus === "SUBMITTED_TO_STATE") {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1 ml-2">
          <Clock className="w-3 h-3" />
          Submitted
        </Badge>
      );
    }

    return null;
  };

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-base font-semibold bg-[#E9EDFB] px-6 py-2 flex items-center justify-between">
          <div className="flex-1">{title}</div>
          {getStatusBadge()}
        </CardTitle>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground font-normal px-6">
            {subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent className="">{children}</CardContent>
    </Card>
  );
};
