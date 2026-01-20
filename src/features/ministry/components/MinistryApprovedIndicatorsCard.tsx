import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { getMinistryProgressBarData, updateMinistryFormStatus } from '@/services/ministry.service';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notification.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProgressStats {
  approved: number;
  total: number;
  percentage: number;
  formId?: string | null;
  formStatus?: string | null;
}

interface MinistryApprovedIndicatorsCardProps {
  submissions?: any[];
  loading?: boolean;
  onSubmissionSuccess?: () => void;
}

export function MinistryApprovedIndicatorsCard({
  submissions = [],
  loading = false,
  onSubmissionSuccess,
}: MinistryApprovedIndicatorsCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ministryProgress, setMinistryProgress] = useState<ProgressStats | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmittedToMospi, setIsSubmittedToMospi] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isFetchingProgress = useRef(false);

  useEffect(() => {
    if (!user?.id || loading) {
      return;
    }

    const loadProgress = async () => {
      // Avoid duplicate calls or running in background tab
      if (document?.hidden || isFetchingProgress.current) return;

      try {
        isFetchingProgress.current = true;
        setProgressLoading(true);
        console.log('📊 [MinistryProgress] Fetching progress data for user:', user.id);

        // Call the API endpoint: GET /ministry/dashboard/progress/:ministryUserId
        const response: any = await getMinistryProgressBarData(user.id);
        console.log('✅ [MinistryProgress] API response:', response);

        // Handle different response structures:
        // 1. Wrapped: { status, data: { accepted, total, formId, formStatus }, message }
        // 2. Direct: { accepted, total, formId, formStatus }
        let accepted = 0;
        let total = 0;
        let formId: string | null = null;
        let formStatus: string | null = null;

        if (response?.status && response?.data) {
          // Wrapped response structure
          accepted = response.data.accepted || 0;
          total = response.data.total || 0;
          formId = response.data.formId || null;
          formStatus = response.data.formStatus || null;
        } else if (response?.accepted !== undefined && response?.total !== undefined) {
          // Direct response structure (data object)
          accepted = response.accepted || 0;
          total = response.total || 0;
          formId = response.formId || null;
          formStatus = response.formStatus || null;
        } else {
          console.warn('⚠️ [MinistryProgress] Unexpected response structure:', response);
          // Try to extract from response.data if it exists
          if (response?.data) {
            accepted = response.data.accepted || 0;
            total = response.data.total || 0;
            formId = response.data.formId || null;
            formStatus = response.data.formStatus || null;
          }
        }

        // Calculate percentage
        const percentage = total > 0 ? Math.round((accepted / total) * 100) : 0;

        console.log('✅ [MinistryProgress] Extracted formStatus:', formStatus);

        setMinistryProgress({
          approved: accepted,
          total: total,
          percentage,
          formId,
          formStatus,
        });

        // Reset submission state if not all indicators are accepted
        // This handles cases where indicators might have been returned/rejected
        if (percentage !== 100) {
          setIsSubmittedToMospi(false);
        }

        console.log('✅ [MinistryProgress] Progress calculated:', {
          approved: accepted,
          total: total,
          percentage,
        });
      } catch (error: any) {
        console.error('❌ [MinistryProgress] Failed to load progress:', error);
        // Don't reset progress to null on error - keep existing progress
      } finally {
        setProgressLoading(false);
        isFetchingProgress.current = false;
      }
    };

    // Run immediately on mount
    loadProgress();

    // Refresh when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ [MinistryProgress] Page visible - refreshing progress');
        loadProgress();
      }
    };

    // Refresh when window gains focus (user navigates back)
    const handleFocus = () => {
      console.log('🎯 [MinistryProgress] Window focused - refreshing progress');
      loadProgress();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Auto-refresh every 60 seconds
    const intervalId = window.setInterval(loadProgress, 60_000);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id, loading]);

  // Check form status from submissions to determine if already submitted
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      // Look for consolidated submission with status SUBMITTED_TO_MOSPI_REVIEWER or later
      const hasSubmittedForm = submissions.some((sub) => {
        const formStatus = sub.formStatus || sub.status;
        return (
          sub.isConsolidated === true &&
          (formStatus === 'SUBMITTED_TO_MOSPI_REVIEWER' ||
            formStatus === 'SUBMITTED_TO_MOSPI_APPROVER' ||
            formStatus === 'ACCEPTED_BY_MOSPI')
        );
      });

      // Set submission state based on form status
      if (hasSubmittedForm) {
        setIsSubmittedToMospi(true);
      }
    }
  }, [submissions]);

  const handlePreviewClick = () => {
    // Navigate to preview page
    if (user?.id) {
      navigate(`/ministry/preview?userId=${user.id}`);
    }
  };

  const handleSubmitNow = () => {
    if (!ministryProgress) {
      toast({
        title: 'Error',
        description: 'Progress data not available. Please wait for data to load.',
        variant: 'destructive',
      });
      return;
    }

    // Check if formStatus allows submission (null, DRAFT, or RETURNED_FROM_MOSPI)
    const allowedFormStatuses = [null, 'DRAFT', 'RETURNED_FROM_MOSPI'];
    const isFormStatusAllowed = allowedFormStatuses.includes(ministryProgress.formStatus);

    console.log('🔍 [MinistrySubmit] Checking submit conditions:', {
      percentage: ministryProgress.percentage,
      formStatus: ministryProgress.formStatus,
      isFormStatusAllowed,
      isSubmittedToMospi,
    });

    // Prevent opening modal if:
    // 1. Already submitted to MoSPI
    // 2. Not all indicators are accepted (percentage !== 100)
    // 3. FormStatus is not allowed (not null, DRAFT, or RETURNED_FROM_MOSPI)
    if (isSubmittedToMospi || ministryProgress.percentage !== 100 || !isFormStatusAllowed) {
      let errorMessage = 'Cannot submit. ';
      if (isSubmittedToMospi) {
        errorMessage += 'Form has already been submitted to MoSPI.';
      } else if (ministryProgress.percentage !== 100) {
        errorMessage += 'Not all indicators are accepted.';
      } else if (!isFormStatusAllowed) {
        errorMessage += `Form status (${ministryProgress.formStatus || 'null'}) does not allow submission.`;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    // Open confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!ministryProgress) {
      toast({
        title: 'Error',
        description: 'Progress data not available. Please wait for data to load.',
        variant: 'destructive',
      });
      setShowConfirmModal(false);
      return;
    }

    try {
      setSubmitting(true);
      console.log('🚀 [MinistrySubmit] Submitting form, formId:', ministryProgress.formId);

      // Submit to MoSPI Reviewer
      const result = await updateMinistryFormStatus(
        ministryProgress.formId || undefined,
        'SUBMITTED_TO_MOSPI_REVIEWER'
      );

      if (result.status) {
        toast({
          title: 'Success',
          description: result.message || 'Form submitted successfully to MoSPI Reviewer',
          variant: 'default',
        });
        notificationService.success(result.message || 'Form submitted successfully');
        
        // Mark as submitted to prevent duplicate submissions
        setIsSubmittedToMospi(true);
        
        // Close the modal
        setShowConfirmModal(false);
        
        // Call the callback to refresh submissions list in parent component
        if (onSubmissionSuccess) {
          onSubmissionSuccess();
        }
        
        // Refresh progress data after submission
        // The loadProgress function will be called automatically via the interval/visibility handlers
        // Force immediate refresh
        if (user?.id && !document?.hidden) {
          try {
            const response: any = await getMinistryProgressBarData(user.id);
            let accepted = 0;
            let total = 0;
            let formId: string | null = null;

            let formStatus: string | null = null;
            
            if (response?.status && response?.data) {
              accepted = response.data.accepted || 0;
              total = response.data.total || 0;
              formId = response.data.formId || null;
              formStatus = response.data.formStatus || null;
            } else if (response?.accepted !== undefined && response?.total !== undefined) {
              accepted = response.accepted || 0;
              total = response.total || 0;
              formId = response.formId || null;
              formStatus = response.formStatus || null;
            } else if (response?.data) {
              accepted = response.data.accepted || 0;
              total = response.data.total || 0;
              formId = response.data.formId || null;
              formStatus = response.data.formStatus || null;
            }

            const percentage = total > 0 ? Math.round((accepted / total) * 100) : 0;
            setMinistryProgress({
              approved: accepted,
              total: total,
              percentage,
              formId,
              formStatus,
            });
          } catch (error) {
            console.error('❌ [MinistrySubmit] Failed to refresh progress after submission:', error);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to submit form');
      }
    } catch (error: any) {
      console.error('❌ [MinistrySubmit] Failed to submit form:', error);
      const errorMessage = error?.message || 'Failed to submit form. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      notificationService.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (progressLoading) {
    return (
      <div className="border rounded-lg p-4 border-amber-200 bg-amber-50/50">
        <div className="text-sm text-muted-foreground">Loading progress…</div>
      </div>
    );
  }

  if (!ministryProgress) {
    return null;
  }

  return (
    <div
      className={`border rounded-lg p-4 mb-6 ${
        ministryProgress.percentage === 100
          ? 'border-green-200 bg-green-50/50'
          : 'border-amber-200 bg-amber-50/50'
      }`}
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Approved Indicator for FY 2025 - 2026
        </h2>
        <div className="flex items-center gap-2 text-sm mt-1">
          <span
            className={`font-medium ${
              ministryProgress.percentage === 100
                ? 'text-green-600'
                : 'text-amber-800'
            }`}
          >
            {ministryProgress.approved}/{ministryProgress.total}
          </span>
          <span
            className={
              ministryProgress.percentage === 100
                ? 'text-green-600'
                : 'text-amber-800'
            }
          >
            {Math.round(ministryProgress.percentage)}% Submitted
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Progress
            value={ministryProgress.percentage}
            className={`h-3 ${
              ministryProgress.percentage === 100
                ? '[&>div]:bg-green-600'
                : '[&>div]:bg-amber-700'
            }`}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="shrink-0 px-6 text-[#1e3a8a] hover:bg-gray-50 border-[#1e3a8a]"
            onClick={handlePreviewClick}
          >
            Preview
          </Button>
          <Button
            className="shrink-0 text-white px-6 bg-[#1e3a8a] hover:bg-[#1e3299]"
            onClick={handleSubmitNow}
            disabled={
              submitting || 
              progressLoading || 
              ministryProgress.percentage !== 100 || 
              isSubmittedToMospi ||
              !([null, 'DRAFT', 'RETURNED_FROM_MOSPI'].includes(ministryProgress.formStatus))
            }
          >
            Submit Now
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={(open) => !submitting && setShowConfirmModal(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit to MoSPI Reviewer</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this form to the MoSPI Reviewer for review?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              On clicking submit button, the form will be forwarded for review to MoSPI Reviewer. Once submitted, you will not be able to make changes until it is reviewed.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={submitting}
              className="bg-[#1e3a8a] hover:bg-[#1e3299] text-white"
            >
              {submitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

