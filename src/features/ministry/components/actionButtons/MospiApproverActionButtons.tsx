import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw, Clock } from "lucide-react";

interface MospiApproverActionButtonsProps {
  sectionId?: string;
  onAccept?: () => void;
  onSendBack?: () => void;
  onTimeline?: () => void;
  timelineCount?: number;
  isAccepted?: boolean;
  disabled?: boolean;
}

export function MospiApproverActionButtons({
  sectionId,
  onAccept,
  onSendBack,
  onTimeline,
  timelineCount = 0,
  isAccepted = false,
  disabled = false,
}: MospiApproverActionButtonsProps) {
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
            onClick={onSendBack}
            disabled={disabled}
            className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Send Back
          </Button>
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

