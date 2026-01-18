import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Clock } from "lucide-react";
import { MinistryReturnedDialog } from "../modals/MinistryReturnedDialog";

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
  const [returnedDialogOpen, setReturnedDialogOpen] = useState(false);

  console.log("MospiApproverActionButtons status:", status);
  // If status is RETURNED_FROM_MOSPI_APPROVER_DRAFT, show "Returned Back" button that opens dialog and Timeline button
  if (status === "RETURNED_FROM_MOSPI_APPROVER_DRAFT") {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReturnedDialogOpen(true)}
            className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Returned Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTimeline}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <Clock className="w-4 h-4 mr-1" />
            Timeline ({timelineCount})
          </Button>
        </div>
        <MinistryReturnedDialog
          isOpen={returnedDialogOpen}
          onClose={() => setReturnedDialogOpen(false)}
          sectionTitle={sectionTitle || sectionId || "Unknown Section"}
        />
      </>
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
          <Button
            variant="outline"
            size="sm"
            onClick={onSendBack}
            disabled={disabled || sendBackDisabled}
            className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Send Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onAccept}
            disabled={disabled || submitDisabled}
            className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Accept
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onTimeline}
        className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      >
        <Clock className="w-4 h-4 mr-1" />
        Timeline ({timelineCount})
      </Button>
    </div>
  );
}

