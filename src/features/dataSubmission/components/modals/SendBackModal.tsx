import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";

interface SendBackModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
}

export const SendBackModal = ({ open, onClose, submissionId }: SendBackModalProps) => {
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const isStateApprover = user?.role === "STATE_APPROVER";
  const isMospiApprover = user?.role === "MOSPI_APPROVER";

  const handleSendBack = async () => {
    if (!comments.trim()) {
      notificationService.warning("Please provide reason for sending back", "Comments Required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call backend API to send back submission
      await apiService.stateReject(submissionId, comments);
      
      toast({
        title: "Submission Sent Back Successfully",
        description: isStateApprover ? "The submission has been sent back to the Nodal Officer with your feedback." :
                     isMospiApprover ? "The submission has been sent back to the State Approver with your feedback." :
                     "The submission has been sent back to the Nodal Officer with your feedback.",
      });

      onClose();
      setComments("");
      navigate("/data-submission/review");
    } catch (error: unknown) {
      console.error("Failed to send back submission:", error);
      notificationService.error(
        error instanceof Error ? error.message : "Failed to send back submission. Please try again.",
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
          <DialogTitle>
            {isStateApprover ? "Send Back to Nodal Officer" : 
             isMospiApprover ? "Send Back to State Approver" : 
             "Send Back for Revision"}
          </DialogTitle>
          <DialogDescription>
            {isStateApprover ? "This submission will be returned to the nodal officer with your comments for revision." :
             isMospiApprover ? "This submission will be returned to the state approver with your comments for revision." :
             "This submission will be returned to the nodal officer with your comments for revision."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comments">Return Comments*</Label>
            <Textarea
              id="comments"
              placeholder={isStateApprover ? "Specify what needs to be revised and provide clear guidance for the nodal officer..." :
                         isMospiApprover ? "Specify what needs to be revised and provide clear guidance for the state approver..." :
                         "Specify what needs to be revised and provide clear guidance..."}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {isStateApprover ? "This comment will be visible to the nodal officer and will help them understand what needs to be addressed." :
               isMospiApprover ? "This comment will be visible to the state approver and will help them understand what needs to be addressed." :
               "This comment will be visible to the nodal officer and will help them understand what needs to be addressed."}
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Note:</strong> {isStateApprover ? "The nodal officer will receive a notification with your comments and can resubmit after making the required changes." :
                           isMospiApprover ? "The state approver will receive a notification with your comments and can resubmit after making the required changes." :
                           "The nodal officer will receive a notification with your comments and can resubmit after making the required changes."}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSendBack} className="bg-blue-600 hover:bg-blue-700">
            Return for Revision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
