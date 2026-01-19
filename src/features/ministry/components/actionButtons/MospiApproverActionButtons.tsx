import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Clock } from "lucide-react";

interface MospiApproverActionButtonsProps {
  sectionId?: string;
  sectionTitle?: string;
  status?: string;
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
  onAccept,
  onSendBack,
  onTimeline,
  timelineCount = 0,
  isAccepted = false,
  disabled = false,
  submitDisabled = false,
  sendBackDisabled = false,
}: MospiApproverActionButtonsProps) {
  console.log("MospiApproverActionButtons status:", status);
  // If status is RETURNED_FROM_MOSPI_APPROVER_DRAFT, show "Send Back" badge and Timeline button
  if (status === "RETURNED_FROM_MOSPI_APPROVER_DRAFT") {
    return (
      <div className="flex items-center gap-2">
        {/* Send Back badge - matches Ministry Approver Sent Back styling */}
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
          {/* Accept Button - matches Ministry Approver styling */}
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

