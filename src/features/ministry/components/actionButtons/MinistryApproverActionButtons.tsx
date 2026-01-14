import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  Send,
  RotateCcw,
  Edit3,
  Check,
  X,
} from "lucide-react";

interface MinistryApproverActionButtonsProps {
  sectionId?: string;
  onAccept?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onSendBack?: () => void;
  onSendToMospi?: () => void;
  onTimeline?: () => void;
  timelineCount?: number;
  isAccepted?: boolean;
  disabled?: boolean;
  isSaving?: boolean;
}

export function MinistryApproverActionButtons({
  sectionId,
  onAccept,
  onEdit,
  onSave,
  onCancel,
  onSendBack,
  onSendToMospi,
  onTimeline,
  timelineCount = 0,
  isAccepted = false,
  disabled = false,
  isSaving = false,
}: MinistryApproverActionButtonsProps) {
  // Log component render and props for debugging
  console.log("[MinistryApproverActionButtons] Component rendered:", {
    sectionId,
    hasOnAccept: !!onAccept,
    hasOnEdit: !!onEdit,
    hasOnSave: !!onSave,
    hasOnCancel: !!onCancel,
    hasOnSendBack: !!onSendBack,
    hasOnSendToMospi: !!onSendToMospi,
    hasOnTimeline: !!onTimeline,
    timelineCount,
    isAccepted,
    disabled,
    isSaving,
  });

  // If in edit mode, show Save and Cancel buttons
  const isEditMode = !!onSave || !!onCancel;

  console.log("[MinistryApproverActionButtons] Button visibility check:", {
    sectionId,
    isAccepted,
    isEditMode,
    hasOnSave: !!onSave,
    hasOnCancel: !!onCancel,
    hasOnEdit: !!onEdit,
    hasOnAccept: !!onAccept,
    hasOnSendBack: !!onSendBack,
  });

  return (
    <div className="flex items-center gap-2">
      {isAccepted ? (
        <Button
          variant="outline"
          size="sm"
          className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          disabled
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Accepted
        </Button>
      ) : isEditMode ? (
        <>
          {/* Save and Cancel buttons when in edit mode - matches State approver styling */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              console.log(
                "[MinistryApproverActionButtons] Save clicked for section:",
                sectionId
              );
              onSave?.();
            }}
            disabled={disabled || isSaving}
          >
            <Check className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              console.log(
                "[MinistryApproverActionButtons] Cancel clicked for section:",
                sectionId
              );
              onCancel?.();
            }}
            disabled={disabled || isSaving}
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </>
      ) : (
        <>
          {/* Edit Button - matches State approver styling */}
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                console.log(
                  "[MinistryApproverActionButtons] Edit clicked for section:",
                  sectionId
                );
                onEdit();
              }}
              disabled={disabled}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
          )}

          {/* Send Back Button - matches State approver styling */}
          {onSendBack && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                console.log(
                  "[MinistryApproverActionButtons] Send Back clicked for section:",
                  sectionId
                );
                onSendBack();
              }}
              disabled={disabled}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
          )}
          {/* Accept Button - matches State approver styling */}
          {onAccept && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                console.log(
                  "[MinistryApproverActionButtons] Accept clicked for section:",
                  sectionId
                );
                onAccept();
              }}
              disabled={disabled}
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </Button>
          )}
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onTimeline}
        className="flex items-center gap-1 h-7 px-2 text-xs"
      >
        <Clock className="w-3 h-3" />
        Timeline ({timelineCount})
      </Button>
    </div>
  );
}
