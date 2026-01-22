import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit3,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MinistryIndicatorTooltip } from "@/components/MinistryIndicatorTooltip";

interface MinistrySectionCardProps {
  title: string | ReactNode;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  indicatorStatus?: string; // Status of the indicator (ACCEPTED, SUBMITTED_TO_STATE, etc.)
  indicatorCode?: string; // Indicator code (e.g., "1.1", "2.3")
  isEditable?: boolean; // Whether the indicator is currently in edit mode
  onEdit?: () => void; // Callback when Edit button is clicked
  onSave?: () => void; // Callback when Save/Submit button is clicked
  onCancel?: () => void; // Callback when Cancel button is clicked
  isSaving?: boolean; // Whether save/submit is in progress
  reviewModeActionButtons?: ReactNode; // Action buttons for review mode (role-based)
}

export const MinistrySectionCard = ({
  title,
  subtitle,
  children,
  className,
  indicatorStatus,
  indicatorCode,
  isEditable = false,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  reviewModeActionButtons,
}: MinistrySectionCardProps) => {
  // Get status badge
  const getStatusBadge = () => {
    if (!indicatorStatus) return null;

    const upperStatus = indicatorStatus.toUpperCase();

    // Accepted statuses (ministry or MOSPI)
    // Also include RETURNED_FROM_MOSPI_APPROVER - show as "Accepted" until Ministry sends it back
    if (
      upperStatus === "ACCEPTED" ||
      upperStatus === "ACCEPTED_BY_MINISTRY" ||
      upperStatus === "ACCEPTED_BY_MOSPI" ||
      upperStatus === "RETURNED_FROM_MOSPI_APPROVER" ||
      upperStatus === "RETURNED_FROM_MOSPI_APPROVER_DRAFT"
    ) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1 ml-2">
          <CheckCircle2 className="w-3 h-3" />
          Accepted
        </Badge>
      );
    }

    // Under Review statuses (when nodal has submitted)
    if (
      upperStatus === "SUBMITTED_TO_STATE" ||
      upperStatus === "SUBMITTED_TO_MINISTRY" ||
      upperStatus === "RESUBMITTED"
    ) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1 ml-2">
          <Clock className="w-3 h-3" />
          Under Review
        </Badge>
      );
    }

    // Sent Back statuses (only RETURNED_FROM_MINISTRY shows as "Sent Back")
    // RETURNED_FROM_MOSPI_APPROVER is shown as "Accepted" above
    if (
      upperStatus === "REVERTED" ||
      upperStatus === "RETURNED_FROM_MINISTRY" ||
      upperStatus === "RETURNED_FROM_MOSPI"
    ) {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1 ml-2">
          <RotateCcw className="w-3 h-3" />
          Sent Back
        </Badge>
      );
    }

    // Draft status
    if (upperStatus === "DRAFT") {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300 flex items-center gap-1 ml-2">
          <Clock className="w-3 h-3" />
          Draft
        </Badge>
      );
    }

    return null;
  };

  // Get action buttons for sent back indicators
  const getActionButtons = () => {
    if (!indicatorStatus) return null;

    const upperStatus = indicatorStatus.toUpperCase();
    // Only show Edit button for REVERTED status (not RESUBMITTED)
    // RESUBMITTED means it was already saved after being sent back, so it should not be editable again
    const isReverted = upperStatus === "REVERTED";
    const isResubmitted = upperStatus === "RESUBMITTED";

    // Show buttons only for REVERTED status
    if (!isReverted) return null;

    if (isEditable) {
      // Show Save and Cancel buttons when in edit mode
      return (
        <div className="flex items-center gap-2 ml-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 h-7 px-2 text-xs"
          >
            <Check className="w-3 h-3" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center gap-1 h-7 px-2 text-xs"
          >
            <X className="w-3 h-3" />
            Cancel
          </Button>
        </div>
      );
    } else {
      // Show Edit button when not in edit mode
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={onEdit}
          className="flex items-center gap-1 h-7 px-2 text-xs ml-2"
        >
          <Edit3 className="w-3 h-3" />
          Edit
        </Button>
      );
    }
  };

  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className="bg-muted/30">
        <CardTitle className="text-base font-semibold bg-[#E9EDFB] px-6 py-2 flex items-center justify-between">
          <div className="flex-1 min-w-0">{title}</div>
          <div className="flex items-center gap-2">
            {reviewModeActionButtons ? (
              // Show review mode action buttons (role-based)
              <>
                {reviewModeActionButtons}
                {indicatorCode && (
                  <MinistryIndicatorTooltip
                    indicatorCode={indicatorCode}
                    className="flex-shrink-0 ml-2"
                  />
                )}
              </>
            ) : (
              // Show regular action buttons (for edit mode)
              <>
                {getStatusBadge()}
                {getActionButtons()}
                {indicatorCode && (
                  <MinistryIndicatorTooltip
                    indicatorCode={indicatorCode}
                    className="flex-shrink-0 ml-2"
                  />
                )}
              </>
            )}
          </div>
        </CardTitle>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground font-normal px-6">
            {subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent
        className={
          isEditable
            ? ""
            : indicatorStatus && indicatorStatus.toUpperCase() === "REVERTED"
            ? "opacity-60 pointer-events-none"
            : ""
        }
      >
        {children}
      </CardContent>
    </Card>
  );
};
