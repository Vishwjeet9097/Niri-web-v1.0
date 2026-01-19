import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { addMinistrySubmissionComment } from "@/services/ministry.service";

interface MinistryCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSendBack?: (sectionId: string) => Promise<void> | void;
  sectionTitle?: string;
  submissionIndicatorId: string;
  existingComment?: string;
  sectionId?: string;
}

export function MinistryCommentDialog({
  isOpen,
  onClose,
  onSuccess,
  onSendBack,
  sectionTitle,
  submissionIndicatorId,
  existingComment = "",
  sectionId,
}: MinistryCommentDialogProps) {
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setComment(existingComment || "");
    } else {
      setComment("");
    }
  }, [existingComment, isOpen]);

  const handleSave = async () => {
    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    if (!submissionIndicatorId) {
      toast({
        title: "Error",
        description: "Submission indicator ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("📝 Adding ministry submission comment:", {
        submissionIndicatorId,
        text: comment.trim(),
      });

      await addMinistrySubmissionComment(submissionIndicatorId, comment.trim());

      // If onSendBack is provided, call it after saving comment (for send back flow)
      if (onSendBack && sectionId) {
        try {
          await onSendBack(sectionId);
          // Close dialog after successful send back
          setComment("");
          onClose();
        } catch (sendBackError: any) {
          // Error is already handled by onSendBack, but keep dialog open
          // so user can see the error and potentially retry
          console.error("❌ Error in send back:", sendBackError);
          // Don't close dialog on error - let user see the error message
          throw sendBackError; // Re-throw to prevent closing dialog
        }
        return;
      }

      // For regular comments (no onSendBack), show success and close dialog
      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      // Call onSuccess callback if provided (only for regular comments)
      if (onSuccess) {
        onSuccess();
      }

      // Close dialog after a small delay for regular comments
      setTimeout(() => {
        setComment("");
        onClose();
      }, 100);
    } catch (error: any) {
      console.error("❌ Error adding comment:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to add comment";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setComment("");
    onClose();
  };

  const handleClose = () => {
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {onSendBack ? "Send Back with Comment" : "Add Comment"}
          </DialogTitle>
          <DialogDescription>
            {onSendBack
              ? sectionTitle
                ? `Add a comment and send back: ${sectionTitle}`
                : "Add a comment to send back this section"
              : sectionTitle
              ? `Add or edit your comment for: ${sectionTitle}`
              : "Add or edit your comment"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Enter your comment here..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {onSendBack ? "Send Back" : "Save Comment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

