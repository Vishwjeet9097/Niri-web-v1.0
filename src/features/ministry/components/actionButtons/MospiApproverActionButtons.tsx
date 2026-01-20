import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Clock } from "lucide-react";

interface MospiApproverActionButtonsProps {
  sectionId?: string;
  sectionTitle?: string;
  status?: string;
  formStatus?: string; // Form/submission level status
  originalMospiStatus?: string; // Original status set by MOSPI Approver (before Ministry edits)
  onAccept?: () => void;
  onSendBack?: () => void;
  onTimeline?: () => void;
  timelineCount?: number;
  isAccepted?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  sendBackDisabled?: boolean;
}

export function MospiApproverActionButtons({
  sectionId,
  sectionTitle,
  status,
  formStatus,
  originalMospiStatus,
  onAccept,
  onSendBack,
  onTimeline,
  timelineCount = 0,
  isAccepted = false,
  disabled = false,
  submitDisabled = false,
  sendBackDisabled = false,
}: MospiApproverActionButtonsProps) {
  console.log("MospiApproverActionButtons status:", status, "formStatus:", formStatus, "originalMospiStatus:", originalMospiStatus);
  
  // Check if form status is RETURNED_FROM_MOSPI_APPROVER (case-insensitive)
  const upperFormStatus = formStatus?.toUpperCase() || "";
  const isFormReturnedFromMospiApprover = 
    upperFormStatus === "RETURNED_FROM_MOSPI_APPROVER" ||
    upperFormStatus === "RETURNED_FROM_MOSPI";
  
  // Check if form has been submitted to MOSPI (case-insensitive)
  const isFormSubmittedToMospi = 
    upperFormStatus === "SUBMITTED_TO_MOSPI_APPROVER" ||
    upperFormStatus === "SUBMITTED_TO_MOSPI_REVIEWER";
  
  // Check original MOSPI status (preserved before Ministry edits) - use this when form is returned
  const upperOriginalStatus = originalMospiStatus?.toUpperCase() || "";
  const wasOriginallyAcceptedByMospi = 
    upperOriginalStatus === "ACCEPTED_BY_MOSPI" || 
    upperOriginalStatus === "ACCEPTED_BY_MOSPI_APPROVER_DRAFT";
  const wasOriginallySentBack = 
    upperOriginalStatus === "RETURNED_FROM_MOSPI_APPROVER_DRAFT" ||
    upperOriginalStatus === "RETURNED_FROM_MOSPI_APPROVER" ||
    (upperOriginalStatus && (
      upperOriginalStatus.includes("RETURNED_FROM_MOSPI_APPROVER") ||
      upperOriginalStatus.includes("RETURNED_FROM_MOSPI")
    ));
  
  // Check current indicator status (case-insensitive) - use this when form is submitted to MOSPI
  const upperStatus = status?.toUpperCase() || "";
  const isAcceptedByMospi = 
    upperStatus === "ACCEPTED_BY_MOSPI" || 
    upperStatus === "ACCEPTED_BY_MOSPI_APPROVER_DRAFT" ||
    isAccepted;
  
  // Check if this indicator was sent back (for badge display)
  // Check more flexibly to handle cases where status might have been modified by Ministry edits
  const isSentBackToMinistry = 
    upperStatus === "RETURNED_FROM_MOSPI_APPROVER_DRAFT" ||
    upperStatus === "RETURNED_FROM_MOSPI_APPROVER" ||
    (upperStatus && (
      upperStatus.includes("RETURNED_FROM_MOSPI_APPROVER") ||
      upperStatus.includes("RETURNED_FROM_MOSPI")
    ));
  
  // IMPORTANT: If form status is RETURNED_FROM_MOSPI_APPROVER, preserve the original status/badge
  // until form is submitted to MOSPI. This prevents Ministry edits from changing what MOSPI Approver sees.
  // Logic matches Ministry Approver "Returned from MOSPI" badge - check form status first
  if (isFormReturnedFromMospiApprover && !isFormSubmittedToMospi) {
    // Priority 1: Show "Accepted" badge if indicator was accepted (preserve this status)
    // Use originalMospiStatus if available (preserves state before Ministry edits), 
    // otherwise fall back to current status check
    // Check this first because accepted takes precedence over sent back
    const shouldShowAccepted = originalMospiStatus 
      ? wasOriginallyAcceptedByMospi 
      : isAcceptedByMospi;
    
    if (shouldShowAccepted) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
            disabled
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Accepted
          </Button>
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
    
    // Priority 2: Show "Send Back" badge for non-accepted indicators when form is returned
    // CRITICAL: Similar to Ministry Approver "Returned from MOSPI" badge logic
    // If form is RETURNED_FROM_MOSPI_APPROVER and indicator is NOT accepted,
    // show "Send Back" badge based on form status (not just indicator status)
    // This ensures badge persists even if Ministry edits change the indicator status
    // Logic: If form is returned and indicator is NOT accepted, it means it was sent back
    // Use form status first (like Ministry Approver does: isFormReturnedFromMospiApprover || isReturnedFromMospi)
    // For MOSPI Approver: if form is returned and not accepted, show "Send Back" badge
    if (!shouldShowAccepted) {
      return (
        <div className="flex items-center gap-2">
          {/* Send Back badge - matches State Approver Sent Back styling */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
            disabled
          >
            <RotateCcw className="w-4 h-4" />
            Send Back
          </Button>
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
  }
  
  // If form has been submitted to MOSPI, check current indicator status
  // Show "Send Back" badge if indicator was sent back (for immediate display after clicking)
  if (isSentBackToMinistry) {
    return (
      <div className="flex items-center gap-2">
        {/* Send Back badge - matches State Approver Sent Back styling */}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
          disabled
        >
          <RotateCcw className="w-4 h-4" />
          Send Back
        </Button>
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
  
  // Show "Accepted" badge if indicator was accepted
  if (isAcceptedByMospi) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          disabled
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Accepted
        </Button>
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

  // Normal behavior when form is NOT returned from MOSPI
  // Check if status is ACCEPTED_BY_MOSPI or isAccepted prop is true
  const showAccepted = status === "ACCEPTED_BY_MOSPI" || isAccepted;

  return (
    <div className="flex items-center gap-2">
      {showAccepted ? (
        <Button
          variant="outline"
          size="sm"
          className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          disabled
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Accepted
        </Button>
      ) : (
        <>
          {/* Send Back Button - matches Ministry Approver styling */}
          {onSendBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendBack}
              disabled={disabled || sendBackDisabled}
              className="flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
          )}
          {/* Accept Button - matches Ministry Approver styling */}
          {onAccept && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAccept}
              disabled={disabled || submitDisabled}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
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

