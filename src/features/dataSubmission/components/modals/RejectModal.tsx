import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { 
  validateRejectionComment,
  getCharacterCountInfo,
  formatValidationErrors,
  getValidationStatusClass,
  type CommentValidationResult 
} from "@/utils/commentValidation";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  onSuccess?: () => void;
}

export function RejectModal({
  isOpen,
  onClose,
  submissionId,
  onSuccess,
}: RejectModalProps) {
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<CommentValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  // Real-time validation
  useEffect(() => {
    if (comment.trim()) {
      const result = validateRejectionComment(comment);
      setValidationResult(result);
      setShowValidation(true);
    } else {
      setValidationResult(null);
      setShowValidation(false);
    }
  }, [comment]);

  const handleReject = async () => {
    if (!comment.trim()) {
      notificationService.error("Please provide a rejection comment", "Validation Error");
      return;
    }

    // Check validation result
    if (validationResult && !validationResult.isValid) {
      const errorMessage = formatValidationErrors(validationResult);
      notificationService.error(errorMessage, "Validation Error");
      return;
    }

    try {
      setIsLoading(true);
      
      await apiService.finalReject(submissionId, comment.trim());
      
      notificationService.success(
        "Submission has been rejected successfully",
        "Rejection Complete"
      );
      
      onSuccess?.();
      onClose();
      setComment("");
      setValidationResult(null);
      setShowValidation(false);
    } catch (error: any) {
      console.error("Error rejecting submission:", error);
      notificationService.error(
        error.message || "Failed to reject submission",
        "Rejection Error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setComment("");
      setValidationResult(null);
      setShowValidation(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Reject Submission
          </DialogTitle>
          <DialogDescription>
            This action will permanently reject the submission. Please provide a detailed reason for rejection.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rejection-comment">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-comment"
              placeholder="Please provide a detailed reason for rejection..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
              disabled={isLoading}
            />
            
            {/* Character count and validation feedback */}
            <div className="space-y-2">
              {/* Character count */}
              {comment && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">
                    Rejection reason ({comment.length} characters)
                  </span>
                  {(() => {
                    const countInfo = getCharacterCountInfo(comment, 500);
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
                      <span>Rejection reason looks good!</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading || !comment.trim() || (validationResult && !validationResult.isValid)}
            className="gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {isLoading ? "Rejecting..." : "Reject Submission"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
