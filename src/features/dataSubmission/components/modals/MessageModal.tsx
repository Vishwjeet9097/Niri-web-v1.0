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
import { apiService } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSubmission: unknown) => void;
  sectionTitle: string;
  sectionId: string;
  submissionId: string;
  existingMessage?: string;
  onSendBack?: (sectionId: string) => Promise<void> | void;
}

export const MessageModal = ({
  isOpen,
  onClose,
  onSave,
  sectionTitle,
  sectionId,
  submissionId,
  existingMessage = "",
  onSendBack,
}: MessageModalProps) => {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setMessage(existingMessage || "");
    } else {
      setMessage("");
    }
  }, [existingMessage, isOpen]);

  const handleSave = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    // Store the message before clearing
    const messageToSave = message.trim();
    console.log("🔍 MessageModal - Saving comment:", messageToSave);
    console.log("🔍 MessageModal - SubmissionId:", submissionId);
    console.log("🔍 MessageModal - SectionId:", sectionId);
    
    // Clear the input field immediately when save starts
    setMessage("");
    
    setIsLoading(true);
    try {
      console.log("🔄 MessageModal - Calling API: apiService.addComment");
      const updatedSubmission = await apiService.addComment(
        submissionId,
        messageToSave,
        sectionId,
        "indicator_comment"
      );
      console.log("🔄 MessageModal - API response received:", updatedSubmission);
      
      if (updatedSubmission && typeof updatedSubmission === "object") {
        const data = updatedSubmission as unknown as Record<string, unknown>;
        console.log("🔍 MessageModal - API Response data keys:", Object.keys(data));
        
        // Check if response has submissions array
        if (data.submissions && Array.isArray(data.submissions) && data.submissions.length > 0) {
          const submission = data.submissions[0];
          console.log("✅ MessageModal - Found submission in response:", submission);
          
          if (submission.indicatorComment && typeof submission.indicatorComment === "object") {
            const indicatorComments = submission.indicatorComment as any;
            console.log("✅ MessageModal - Indicator comments:", indicatorComments);
            console.log("✅ MessageModal - Comments count:", Object.keys(indicatorComments).length);
            
            // Real-time update: Trigger custom event for other components
            console.log("🔄 MessageModal - Dispatching niri-comment-updated event");
            window.dispatchEvent(
              new CustomEvent("niri-comment-updated", {
                detail: {
                  submissionId,
                  sectionId,
                  comments: indicatorComments,
                  timestamp: new Date().toISOString(),
                },
              })
            );
            console.log("✅ MessageModal - Event dispatched successfully");
          } else {
            console.log("⚠️ MessageModal - No indicatorComment in submission");
          }
        } else if (data.indicatorComment && typeof data.indicatorComment === "object") {
          const indicatorComments = data.indicatorComment as any;
          console.log("✅ MessageModal - Indicator comments (direct):", indicatorComments);
          console.log("✅ MessageModal - Comments count:", Object.keys(indicatorComments).length);
          
          // Real-time update: Trigger custom event for other components
          console.log("🔄 MessageModal - Dispatching niri-comment-updated event");
          window.dispatchEvent(
            new CustomEvent("niri-comment-updated", {
              detail: {
                submissionId,
                sectionId,
                comments: indicatorComments,
                timestamp: new Date().toISOString(),
              },
            })
          );
          console.log("✅ MessageModal - Event dispatched successfully");
        } else {
          console.log("⚠️ MessageModal - No indicatorComment or submissions in API response");
        }
      } else {
        console.log("❌ MessageModal - API response is null or not an object");
      }
      
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
      
      // Call onSave with updatedSubmission - parent component will handle closing modal if needed
      // If onSave doesn't handle closing, we'll close it after a delay
      onSave(updatedSubmission);
      
      // If onSendBack is provided, let the parent handle closing (might show confirmation)
      if (onSendBack) {
        await onSendBack(sectionId);
        // Parent will handle closing if needed, so we don't close here
        return;
      }
      
      // For regular comments (no onSendBack), close modal after a small delay
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (error: unknown) {
      console.error("Error adding comment:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add comment";
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
    setMessage("");
    onClose();
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Comment</DialogTitle>
          <DialogDescription>
            Add or edit your comment for: {sectionTitle}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Comment</Label>
            <Textarea
              id="message"
              placeholder="Enter your comment here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
            Save Comment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
