import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  isSentBack?: boolean; // New prop to indicate if section was sent back
  isReturnedFromMospi?: boolean; // New prop to indicate if section was returned from MOSPI (indicator-level)
  isAcceptedByMospi?: boolean; // New prop to indicate if section was accepted by MOSPI
  formStatus?: string; // Form/submission level status
  disabled?: boolean;
  acceptDisabled?: boolean; // Separate prop to disable only the Accept button
  acceptDisabledTooltip?: string; // Tooltip shown when Accept is disabled (e.g. 3.3 / 1.1 validation)
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
  isSentBack = false,
  isReturnedFromMospi = false,
  isAcceptedByMospi = false,
  formStatus,
  disabled = false,
  acceptDisabled = false, // Separate prop to disable only the Accept button
  acceptDisabledTooltip,
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
    formStatus,
    isReturnedFromMospi,
  });

  // If in edit mode, show Save and Cancel buttons
  const isEditMode = !!onSave || !!onCancel;

  // Check form status to determine if form was returned from MOSPI (case-insensitive)
  const upperFormStatus = formStatus?.toUpperCase() || "";
  const isFormReturnedFromMospiApprover = 
    upperFormStatus === "RETURNED_FROM_MOSPI_APPROVER" ||
    upperFormStatus === "RETURNED_FROM_MOSPI";
  
  // Use form status if available, otherwise fall back to indicator-level status
  const shouldShowReturnedFromMospi = isFormReturnedFromMospiApprover || isReturnedFromMospi;

  console.log("[MinistryApproverActionButtons] Button visibility check:", {
    sectionId,
    isAccepted,
    isEditMode,
    hasOnSave: !!onSave,
    hasOnCancel: !!onCancel,
    hasOnEdit: !!onEdit,
    hasOnAccept: !!onAccept,
    hasOnSendBack: !!onSendBack,
    formStatus,
    isFormReturnedFromMospiApprover,
    shouldShowReturnedFromMospi,
  });

  return (
    <div className="flex items-center gap-2">
      {/* Show badges first - these are informational and don't replace action buttons */}
      {isAcceptedByMospi && (
        // Show "Accepted from MOSPI" badge when accepted by MOSPI
        <Button
          variant="outline"
          size="sm"
          className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          disabled
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Accepted by MOSPI
        </Button>
      )}
      {shouldShowReturnedFromMospi && !isAcceptedByMospi && (
        // Show "Returned from MOSPI" badge when form was returned from MOSPI Approver
        // Check form status first, then fall back to indicator-level status
        // Don't show if indicator was accepted by MOSPI (can't be both accepted and returned)
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-orange-100 text-orange-700 cursor-default"
          disabled
        >
          <RotateCcw className="w-4 h-4" />
          Returned from MOSPI
        </Button>
      )}
      {isAccepted && !isAcceptedByMospi && (
        <Button
          variant="outline"
          size="sm"
          className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          disabled
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Accepted
        </Button>
      )}
      {isSentBack && !isReturnedFromMospi && (
        // Show Sent Back badge when section is sent back (matches STATE level styling)
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
          disabled
        >
          <RotateCcw className="w-4 h-4" />
          Sent Back
        </Button>
      )}
      
      {/* Action buttons - shown based on their normal conditions */}
      {isEditMode ? (
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
          {/* Accept Button - matches State approver styling; show tooltip when disabled */}
          {onAccept && (() => {
            const isAcceptDisabled = disabled || acceptDisabled;
            const acceptButton = (
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
                disabled={isAcceptDisabled}
              >
                <CheckCircle className="w-4 h-4" />
                Accept
              </Button>
            );
            return isAcceptDisabled && acceptDisabledTooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">{acceptButton}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {acceptDisabledTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              acceptButton
            );
          })()}
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
