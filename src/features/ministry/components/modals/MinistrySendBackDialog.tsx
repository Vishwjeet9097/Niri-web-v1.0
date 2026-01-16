import { useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { notificationService } from "@/services/notification.service";

interface MinistrySendBackDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => Promise<void>;
  sectionTitle?: string;
}

export function MinistrySendBackDialog({
  open,
  onClose,
  onConfirm,
  sectionTitle,
}: MinistrySendBackDialogProps) {
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendBack = async () => {
    if (!comments.trim()) {
      notificationService.warning(
        "Please provide reason for sending back",
        "Comments Required"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(comments.trim());
      setComments("");
      onClose();
    } catch (error: unknown) {
      console.error("Failed to send back submission:", error);
      notificationService.error(
        error instanceof Error
          ? error.message
          : "Failed to send back submission. Please try again.",
        "Send Back Failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Back to Nodal Officer</DialogTitle>
          <DialogDescription>
            This submission will be returned to the nodal officer with your
            comments for revision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comments">Return Comments*</Label>
            <Textarea
              id="comments"
              placeholder="Specify what needs to be revised and provide clear guidance for the nodal officer..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This comment will be visible to the nodal officer and will help
              them understand what needs to be addressed.
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Note:</strong> The nodal officer will receive a
              notification with your comments and can resubmit after making the
              required changes.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSendBack}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Return for Revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
