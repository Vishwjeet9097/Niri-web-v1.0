import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Send } from "lucide-react";

interface MinistryApproverActionButtonsProps {
  sectionId?: string;
  onAccept?: () => void;
  onSendToMospi?: () => void;
  onTimeline?: () => void;
  timelineCount?: number;
  isAccepted?: boolean;
  disabled?: boolean;
}

export function MinistryApproverActionButtons({
  sectionId,
  onAccept,
  onSendToMospi,
  onTimeline,
  timelineCount = 0,
  isAccepted = false,
  disabled = false,
}: MinistryApproverActionButtonsProps) {
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
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onAccept}
            disabled={disabled}
            className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSendToMospi}
            disabled={disabled}
            className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
          >
            <Send className="w-4 h-4 mr-1" />
            Send to MoSPI
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

