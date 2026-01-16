import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, CheckCircle } from "lucide-react";

interface MospiReviewerActionButtonsProps {
  sectionId?: string;
  onAddComment?: () => void;
  onAccept?: () => void;
  onTimeline?: () => void;
  timelineCount?: number;
  disabled?: boolean;
}

export function MospiReviewerActionButtons({
  sectionId,
  onAddComment,
  onAccept,
  onTimeline,
  timelineCount = 0,
  disabled = false,
}: MospiReviewerActionButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddComment}
        disabled={disabled}
        className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
      >
        <MessageSquare className="w-4 h-4 mr-1" />
        Add Comment
      </Button>
      {onAccept && (
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

