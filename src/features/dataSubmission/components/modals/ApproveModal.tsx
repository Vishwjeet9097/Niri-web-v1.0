import { useState, useEffect } from "react";
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
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { 
  validateApprovalComment,
  getCharacterCountInfo,
  formatValidationErrors,
  getValidationStatusClass,
  type CommentValidationResult 
} from "@/utils/commentValidation";

interface ApproveModalProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
}

export const ApproveModal = ({ open, onClose, submissionId }: ApproveModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<CommentValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const isMospiApprover = user?.role === "MOSPI_APPROVER";
  const isMospiReviewer = user?.role === "MOSPI_REVIEWER";
  const isStateApprover = user?.role === "STATE_APPROVER";

  // Real-time validation
  useEffect(() => {
    if (comments.trim()) {
      const result = validateApprovalComment(comments);
      setValidationResult(result);
      setShowValidation(true);
    } else {
      setValidationResult(null);
      setShowValidation(false);
    }
  }, [comments]);

  const handleApprove = async () => {
    if (!comments.trim()) {
      notificationService.warning("Please add approval comments", "Comments Required");
      return;
    }

    // Check validation result
    if (validationResult && !validationResult.isValid) {
      const errorMessage = formatValidationErrors(validationResult);
      notificationService.error(errorMessage, "Validation Error");
      return;
    }

    // Validate State Approver comment
    if (isStateApprover && comments.toLowerCase().includes("mospi approver")) {
      notificationService.warning(
        "Please correct your comment. You are sending to MoSPI Reviewer, not MoSPI Approver.",
        "Incorrect Comment"
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Call backend API based on role
      if (isStateApprover) {
        // State Approver should forward to MoSPI Reviewer, not approve
        await apiService.forwardToMospi(submissionId, comments);
        toast({
          title: "Sent to MoSPI Reviewer Successfully",
          description: "Submission has been forwarded to MoSPI Reviewer for review.",
        });
      } else {
        // MoSPI roles can approve
        await apiService.approveSubmission(submissionId, comments);
        toast({
          title: "Approved & Sent to MoSPI Successfully",
          description: isMospiReviewer 
            ? "Submission has been approved and forwarded to MoSPI Approver for final review."
            : isMospiApprover 
            ? "Submission has been finally approved by MoSPI."
            : "The submission has been successfully approved.",
        });
      }

      onClose();
      setComments("");
      setValidationResult(null);
      setShowValidation(false);
      navigate("/data-submission/review");
    } catch (error: unknown) {
      console.error("Failed to approve submission:", error);
      notificationService.error(
        (error as Error)?.message || "Failed to approve submission. Please try again.",
        "Approval Failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isStateApprover ? "Send to MoSPI Reviewer" : isMospiReviewer ? "Send to MoSPI Approver" : "Confirm Final Approval"}
          </DialogTitle>
          <DialogDescription>
            {isStateApprover 
              ? "You are about to forward this submission to MoSPI Reviewer for review. This action will change the submission status."
              : isMospiReviewer
              ? "You are about to forward this submission to MoSPI Approver for final approval. This action will change the submission status."
              : "You are about to grant final approval for this submission. This action will trigger immediate score updates and is irreversible."
            }
          </DialogDescription>
        </DialogHeader>

        <Alert className={isStateApprover || isMospiReviewer ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"}>
          <CheckCircle2 className={`h-4 w-4 ${isStateApprover || isMospiReviewer ? "text-blue-600" : "text-green-600"}`} />
          <AlertDescription className={`text-sm ${isStateApprover || isMospiReviewer ? "text-blue-900" : "text-green-900"}`}>
            <strong>Note:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {isStateApprover ? (
                <>
                  <li>Submission will be sent to MoSPI Reviewer</li>
                  <li>Status will change to "Under MoSPI Review"</li>
                  <li>MoSPI Reviewer will be notified</li>
                </>
              ) : isMospiReviewer ? (
                <>
                  <li>Submission will be sent to MoSPI Approver</li>
                  <li>Status will change to "Under MoSPI Approval"</li>
                  <li>MoSPI Approver will be notified</li>
                </>
              ) : (
                <>
                  <li>NIP score will be updated immediately</li>
                  <li>Entity ranking may change based on new score</li>
                  <li>Stakeholders will be notified</li>
                </>
              )}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comments">
              {isStateApprover 
                ? "Comments for MoSPI Reviewer (Optional)"
                : isMospiReviewer
                ? "Comments for MoSPI Approver (Optional)"
                : "Approval Comments (Optional)"
              }
            </Label>
            <Textarea
              id="comments"
              placeholder={
                isStateApprover 
                  ? "e.g., Forwarding to MoSPI Reviewer for review. All required documents are complete and submission meets state standards."
                  : isMospiReviewer
                  ? "e.g., Forwarding to MoSPI Approver for final approval. Review completed and submission is ready for final approval."
                  : "e.g., Submission approved and finalized. All requirements have been met."
              }
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            {/* Character count and validation feedback */}
            <div className="space-y-2">
              {/* Character count */}
              {comments && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    {isStateApprover 
                      ? 'Comments for MoSPI Reviewer'
                      : isMospiReviewer
                      ? 'Comments for MoSPI Approver'
                      : 'Approval comments'
                    } ({comments.length} characters)
                  </span>
                  {(() => {
                    const countInfo = getCharacterCountInfo(comments, 300);
                    return (
                      <span className={countInfo.isOverLimit ? 'text-red-500' : 'text-muted-foreground'}>
                        {countInfo.remaining < 0 ? `${Math.abs(countInfo.remaining)} over` : `${countInfo.remaining} remaining`}
                      </span>
                    );
                  })()}
                </div>
              )}
              
              {/* Validation feedback */}
              {showValidation && validationResult && (
                <Alert className={`${validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <AlertTriangle className={`h-4 w-4 ${getValidationStatusClass(validationResult)}`} />
                  <AlertDescription className={getValidationStatusClass(validationResult)}>
                    {validationResult.errors.length > 0 && (
                      <div className="space-y-1">
                        <strong>Errors:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {validationResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResult.warnings.length > 0 && (
                      <div className="space-y-1">
                        <strong>Warnings:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {validationResult.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validationResult.isValid && validationResult.warnings.length === 0 && (
                      <span>Comments look good!</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isStateApprover 
                ? "This comment will be visible to MoSPI Reviewer and will help them understand your review."
                : isMospiReviewer
                ? "This comment will be visible to MoSPI Approver and will help them understand your review."
                : "This comment will be visible to all stakeholders and will help them understand the approval status."
              }
            </p>
            {isStateApprover && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>⚠️ Important:</strong> You are sending this submission to <strong>MoSPI Reviewer</strong>, not MoSPI Approver. 
                  The MoSPI Reviewer will review it first, then forward it to MoSPI Approver if approved.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={isSubmitting || (validationResult && !validationResult.isValid)}
            className={isStateApprover || isMospiReviewer ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"}
          >
            {isStateApprover ? "Send to MoSPI Reviewer" : isMospiReviewer ? "Send to MoSPI Approver" : "Approve Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
