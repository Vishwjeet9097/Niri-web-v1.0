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

interface MinistryIndicatorActionsProps {
  indicatorStatus?: string;
  userRole?: string;
  isEditable?: boolean;
  isSaving?: boolean;
  isAccepting?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onAccept?: () => void;
}

export function MinistryIndicatorActions({
  indicatorStatus,
  userRole,
  isEditable = false,
  isSaving = false,
  isAccepting = false,
  onEdit,
  onSave,
  onCancel,
  onAccept,
}: MinistryIndicatorActionsProps) {
  const isMinistryApprover = userRole === "MINISTRY_APPROVER";

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

    if (upperStatus === "SUBMITTED_TO_STATE" || upperStatus === "RESUBMITTED") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1 ml-2">
          <Clock className="w-3 h-3" />
          Under Review
        </Badge>
      );
    }

    if (upperStatus === "REVERTED") {
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300 flex items-center gap-1 ml-2">
          <RotateCcw className="w-3 h-3" />
          Sent Back
        </Badge>
      );
    }

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

  // Get action buttons for MINISTRY_APPROVER
  const getMinistryApproverActions = () => {
    if (!isMinistryApprover || !indicatorStatus) return null;

    const upperStatus = indicatorStatus.toUpperCase();
    const isDraft = upperStatus === "DRAFT";
    const isReverted = upperStatus === "REVERTED";
    const isResubmitted = upperStatus === "RESUBMITTED";
    const isAccepted = upperStatus === "ACCEPTED";

    // If accepted, show only the badge (no actions)
    if (isAccepted) {
      return null;
    }

    // If in edit mode, show Save and Cancel buttons
    if (isEditable) {
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
    }

    // Show Edit button for DRAFT, REVERTED, or RESUBMITTED
    const canEdit = isDraft || isReverted || isResubmitted;

    // Show Accept button for DRAFT or RESUBMITTED (when not in edit mode)
    const canAccept = (isDraft || isResubmitted) && !isEditable;

    return (
      <div className="flex items-center gap-2 ml-2">
        {canEdit && onEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="flex items-center gap-1 h-7 px-2 text-xs"
          >
            <Edit3 className="w-3 h-3" />
            Edit
          </Button>
        )}
        {canAccept && onAccept && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAccept}
            disabled={isAccepting}
            className="flex items-center gap-1 h-7 px-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isAccepting ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" />
                Accept
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  // Get action buttons for sent back indicators (original logic for nodal officers)
  const getActionButtons = () => {
    // For MINISTRY_APPROVER, use the new action handler
    if (isMinistryApprover) {
      return getMinistryApproverActions();
    }

    // Original logic for other roles (nodal officers, etc.)
    if (!indicatorStatus) return null;

    const upperStatus = indicatorStatus.toUpperCase();
    const isReverted = upperStatus === "REVERTED";

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
    <div className="flex items-center gap-2">
      {getStatusBadge()}
      {getActionButtons()}
    </div>
  );
}
