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
}

export const MessageModal = ({
  isOpen,
  onClose,
  onSave,
  sectionTitle,
  sectionId,
  submissionId,
  existingMessage = "",
}: MessageModalProps) => {
  const [message, setMessage] = useState(existingMessage);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMessage(existingMessage);
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

    setIsLoading(true);
    try {
           const updatedSubmission = await apiService.addComment(
             submissionId,
             message.trim(),
             sectionId,
             "indicator_comment"
           );
      
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
      
      onSave(updatedSubmission);
      onClose();
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
    setMessage(existingMessage);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
