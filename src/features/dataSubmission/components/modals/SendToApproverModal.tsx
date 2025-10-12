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
import { CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/AuthProvider";

interface SendToApproverModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
}

export const SendToApproverModal = ({
  open,
  onClose,
  submissionId,
}: SendToApproverModalProps) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const isStateApprover = user?.role === "STATE_APPROVER";
  const isMospiReviewer = user?.role === "MOSPI_REVIEWER";
  const isMospiApprover = user?.role === "MOSPI_APPROVER";

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      let response;
      let successMessage;

      if (isStateApprover) {
        // State Approver forwards to MoSPI Reviewer
        response = await apiService.forwardToMospi(submissionId, "Forwarding to MoSPI Reviewer for review");
        successMessage = "Sent to MoSPI Reviewer Successfully";
      } else if (isMospiReviewer) {
        // MoSPI Reviewer forwards to MoSPI Approver
        response = await apiService.forwardToMospiApprover(submissionId, "Reviewed and approved, forwarding to MoSPI Approver for final approval");
        successMessage = "Sent to MoSPI Approver Successfully";
      } else if (isMospiApprover) {
        // MoSPI Approver approves submission
        response = await apiService.approveSubmission(submissionId, "Approved by MoSPI Approver. Submission meets all requirements.");
        successMessage = "Submission Approved Successfully";
      } else {
        throw new Error("Invalid user role");
      }
      
      setShowSuccess(true);

      // Auto close and navigate after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        navigate("/data-submission/review");
      }, 2000);
    } catch (error: unknown) {
      console.error("Failed to process submission:", error);
      notificationService.error(
        (error as Error)?.message || "Failed to process submission. Please try again.",
        "Process Failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {isStateApprover && "Send to MoSPI Reviewer"}
                {isMospiReviewer && "Send to MoSPI Approver"}
                {isMospiApprover && "Approve Submission"}
              </DialogTitle>
              <DialogDescription>
                {isStateApprover && "Are you sure you want to send this submission to the MoSPI Reviewer for review?"}
                {isMospiReviewer && "Are you sure you want to send this submission to the MoSPI Approver for final approval?"}
                {isMospiApprover && "Are you sure you want to approve this submission?"}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {isStateApprover && "On clicking send to reviewer button, the submission will be forwarded for review to MoSPI Reviewer."}
                {isMospiReviewer && "On clicking send to approver button, the submission will be forwarded for final approval to MoSPI Approver."}
                {isMospiApprover && "On clicking approve button, the submission will be approved and finalized."}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                {isStateApprover && "Send to MoSPI Reviewer"}
                {isMospiReviewer && "Send to MoSPI Approver"}
                {isMospiApprover && "Approve Submission"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <div className="font-semibold mb-1">
                  {isStateApprover && "Sent to MoSPI Reviewer Successfully"}
                  {isMospiReviewer && "Sent to MoSPI Approver Successfully"}
                  {isMospiApprover && "Submission Approved Successfully"}
                </div>
                <div className="text-sm">
                  {isStateApprover && "The data has been successfully forwarded to MoSPI Reviewer for review. You will be notified of its status."}
                  {isMospiReviewer && "The data has been successfully forwarded to MoSPI Approver for final approval. You will be notified of its status."}
                  {isMospiApprover && "The submission has been successfully approved and finalized. The NIP score will be calculated."}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
