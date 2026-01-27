import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getSubmissionsForCurrentUser, getMospiMinistrySubmissionDetails, submitMospiFormAction, getFormStatusStatistics } from '@/services/ministry.service';
import { useAuth } from '@/features/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Send, RotateCcw, CheckCircle } from 'lucide-react';
import { MinistrySubmissionDetailsCard } from '../components/MinistrySubmissionDetailsCard';
import { MinistryOverviewTab } from '../components/tabs/MinistryOverviewTab';
import { MinistryDataReviewTab } from '../components/tabs/MinistryDataReviewTab';
import { MinistryDocumentsTab } from '../components/tabs/MinistryDocumentsTab';
import { MinistryHistoryTab } from '../components/tabs/MinistryHistoryTab';

export function MinistryFormReviewSubmissionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if isConsolidated query parameter is true
  // If true, use consolidated API, otherwise use regular API
  const isConsolidated = searchParams.get('isConsolidated') === 'true';
  
  console.log("🔍 Ministry Review Page - API Selection:", {
    isConsolidated,
    submissionId: id,
    willUseConsolidatedApi: isConsolidated
  });
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const { toast } = useToast();
  
  // Form status statistics for MOSPI Approver button logic
  const [formStatusStats, setFormStatusStats] = useState<{
    total: number;
    totalSentBack: number;
    totalApproved: number;
    totalSubmitted: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (id) {
      loadSubmission();
    } else {
      setLoading(false);
      setError('Submission ID not found');
    }
  }, [id, isConsolidated]);

  // Fetch form status statistics for MOSPI Approver
  useEffect(() => {
    const fetchFormStatusStats = async () => {
      console.log("🔍 fetchFormStatusStats called:", {
        userRole: user?.role,
        hasSubmission: !!submission,
        submissionFormId: submission?.formId,
        submissionId: submission?.id,
      });

      if (user?.role !== "MOSPI_APPROVER") {
        console.log("⚠️ User is not MOSPI_APPROVER, skipping stats fetch");
        return;
      }

      if (!submission) {
        console.log("⚠️ Submission not loaded yet, skipping stats fetch");
        return;
      }

      // Get formId from submission
      const currentFormId = submission?.formId || submission?.id;
      if (!currentFormId) {
        console.log("⚠️ No formId available for statistics");
        return;
      }

      try {
        setLoadingStats(true);
        console.log("📊 Fetching form status statistics for formId:", currentFormId);
        const response = await getFormStatusStatistics(currentFormId);
        
        console.log("📊 Raw API response:", response);
        console.log("📊 Response type:", typeof response);
        console.log("📊 Response keys:", response ? Object.keys(response) : "null");
        
        // Handle different response structures
        let statsData: any = null;
        
        if (response?.status && response?.data) {
          // Standard structure: { status: true, data: { formId, total, ... } }
          statsData = response.data;
          console.log("✅ Using response.data:", statsData);
        } else if ((response as any)?.formId) {
          // Direct data structure: { formId: ..., total: ..., ... }
          statsData = response;
          console.log("✅ Using direct response:", statsData);
        } else if ((response as any)?.data?.formId) {
          // Nested data structure: { data: { formId: ..., total: ..., ... } }
          statsData = (response as any).data;
          console.log("✅ Using response.data (nested):", statsData);
        } else {
          console.warn("⚠️ Unexpected response structure:", response);
          console.warn("⚠️ Full response:", JSON.stringify(response, null, 2));
        }
        
        if (statsData && statsData.formId) {
          console.log("✅ Setting formStatusStats:", statsData);
          setFormStatusStats(statsData);
        } else {
          console.error("❌ Invalid stats data structure:", statsData);
        }
      } catch (error: any) {
        console.error("❌ Error fetching form status statistics:", error);
        console.error("❌ Error details:", {
          message: error?.message,
          response: error?.response,
          data: error?.response?.data,
        });
        // Don't show error toast, just log it
      } finally {
        setLoadingStats(false);
      }
    };

    fetchFormStatusStats();
  }, [user?.role, submission]);

  // Debug: Log when formStatusStats changes
  useEffect(() => {
    console.log("🔄 formStatusStats state changed:", formStatusStats);
  }, [formStatusStats]);

  // Listen for indicator status updates to reload form statistics
  useEffect(() => {
    const handleIndicatorStatusUpdate = async (event: CustomEvent) => {
      console.log("🔄 Indicator status updated, reloading form statistics:", event.detail);
      
      if (user?.role !== "MOSPI_APPROVER") {
        return;
      }

      const currentFormId = submission?.formId || submission?.id;
      if (!currentFormId) {
        console.log("⚠️ No formId available for statistics reload");
        return;
      }

      // Small delay to ensure backend has processed the update
      setTimeout(async () => {
        try {
          setLoadingStats(true);
          console.log("📊 Reloading form status statistics after indicator update for formId:", currentFormId);
          const response = await getFormStatusStatistics(currentFormId);
          
          // Handle different response structures
          let statsData: any = null;
          
          if (response?.status && response?.data) {
            statsData = response.data;
          } else if ((response as any)?.formId) {
            statsData = response;
          } else if ((response as any)?.data?.formId) {
            statsData = (response as any).data;
          }
          
          if (statsData && statsData.formId) {
            console.log("✅ Reloaded form status statistics:", statsData);
            setFormStatusStats(statsData);
          }
        } catch (error: any) {
          console.error("❌ Error reloading form status statistics:", error);
        } finally {
          setLoadingStats(false);
        }
      }, 500); // 500ms delay to ensure backend has processed the update
    };

    // Listen for custom event when indicator status is updated
    window.addEventListener(
      "ministry-indicator-status-updated",
      handleIndicatorStatusUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "ministry-indicator-status-updated",
        handleIndicatorStatusUpdate as EventListener
      );
    };
  }, [user?.role, submission?.formId, submission?.id]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      
      // For consolidated submissions, first call current user API to get submission details
      // This provides the submission metadata (user info, status, etc.)
      if (isConsolidated) {
        console.log("📋 Loading consolidated submission - Step 1: Getting submission from current user API, submissionId:", id);
        
        // First, get submission from current user API
        const response = await getSubmissionsForCurrentUser();
        
        let submissionsData: any[] = [];
        if (Array.isArray(response)) {
          submissionsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          submissionsData = response.data;
        }

        // Find the submission by ID
        const foundSubmission = submissionsData.find((sub) => sub.id === id);
        
        if (foundSubmission) {
          console.log("✅ Found consolidated submission from current user API:", foundSubmission);
          setSubmission(foundSubmission);
        } else {
          // Fallback: Try MOSPI dashboard API if not found in current user API
          console.log("⚠️ Submission not found in current user API, trying MOSPI dashboard API...");
          
          if (!user?.id) {
            setError('User ID is required for consolidated API');
            setLoading(false);
            return;
          }
          
          const mospiResponse = await getMospiMinistrySubmissionDetails(user.id);
          
          if (mospiResponse?.status && mospiResponse?.data?.submissions) {
            const foundInMospi = mospiResponse.data.submissions.find((sub: any) => sub.id === id);
            
            if (foundInMospi) {
              console.log("✅ Found submission from MOSPI dashboard API:", foundInMospi);
              setSubmission(foundInMospi);
            } else {
              setError('Submission not found in consolidated data');
            }
          } else {
            setError('Failed to load submissions from consolidated API');
          }
        }
      } else {
        // Use regular API - get submission from current user's submissions
        console.log("📋 Loading submission using regular API, submissionId:", id);
        const response = await getSubmissionsForCurrentUser();
        
        let submissionsData: any[] = [];
        if (Array.isArray(response)) {
          submissionsData = response;
        } else if (response?.data && Array.isArray(response.data)) {
          submissionsData = response.data;
        }

        // Find the submission by ID
        const foundSubmission = submissionsData.find((sub) => sub.id === id);
        
        if (foundSubmission) {
          console.log("✅ Found submission from regular API:", foundSubmission);
          setSubmission(foundSubmission);
        } else {
          setError('Submission not found');
        }
      }
    } catch (error: any) {
      console.error('Error loading submission:', error);
      setError(error.message || 'Failed to load submission');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Redirect based on user role
    if (user?.role === "MINISTRY_APPROVER") {
      navigate('/ministry/review-submissions');
    } else if (user?.role === "NODAL_OFFICER") {
      navigate('/ministry/nodal');
    } else {
      // For MOSPI_APPROVER and MOSPI_REVIEWER, keep current behavior
      navigate('/data-submission/review');
    }
  };

  const statusConfig: Record<string, { label: string; badgeClass: string }> = {
    DRAFT: {
      label: 'Draft',
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    SUBMITTED_TO_STATE: {
      label: 'Submitted',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    SUBMITTED_TO_MOSPI_REVIEWER: {
      label: 'Under Review',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    APPROVED: {
      label: 'Approved',
      badgeClass: 'bg-green-100 text-green-800 border-green-200',
    },
    REJECTED: {
      label: 'Rejected',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
    },
    REJECTED_FINAL: {
      label: 'Rejected',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-white rounded-lg">
          <CardContent className="p-6">
            <p className="text-red-600">{error || 'Submission not found'}</p>
            <Button onClick={handleBack} variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = submission.status || 'DRAFT';
  const config = statusConfig[status] || {
    label: status,
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const ministryName = submission.user?.ministryName || 'N/A';
  const submissionId = submission.submissionId || 'N/A';
  const formId = submission.formId || submission.id;

  // Handle MOSPI Reviewer action: Send to Approver
  const handleSendToApprover = async () => {
    try {
      setIsSubmitting(true);
      console.log("📤 Sending to Approver, formId:", formId);
      
      await submitMospiFormAction(formId, "submit-to-approver");
      
      toast({
        title: "Success",
        description: "Submission sent to Approver successfully",
      });
      
      // Reload submission to reflect status change
      await loadSubmission();
      
      // Reload form status statistics for MOSPI Approver
      if (isMospiApprover && formId) {
        try {
          const response = await getFormStatusStatistics(formId);
          if (response?.status && response?.data) {
            setFormStatusStats(response.data);
          }
        } catch (error) {
          console.error("Error reloading form status statistics:", error);
        }
      }
    } catch (error: any) {
      console.error("❌ Error sending to approver:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to send to approver",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle MOSPI Approver action: Send Back
  const handleSendBack = async () => {
    try {
      setIsSubmitting(true);
      console.log("📤 Sending back, formId:", formId);
      
      await submitMospiFormAction(formId, "send-back");
      
      toast({
        title: "Success",
        description: "Submission sent back successfully",
      });
      
      // Reload submission to reflect status change
      await loadSubmission();
      
      // Reload form status statistics for MOSPI Approver
      if (isMospiApprover && formId) {
        try {
          const response = await getFormStatusStatistics(formId);
          if (response?.status && response?.data) {
            setFormStatusStats(response.data);
          }
        } catch (error) {
          console.error("Error reloading form status statistics:", error);
        }
      }
    } catch (error: any) {
      console.error("❌ Error sending back:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to send back",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle MOSPI Approver action: Submit (Accept) - Show confirmation dialog
  const handleSubmit = () => {
    setShowAcceptDialog(true);
  };

  // Handle cancel accept dialog
  const handleCancelAccept = () => {
    setShowAcceptDialog(false);
  };

  // Handle confirm accept - actually perform the accept action
  const handleConfirmAccept = async () => {
    try {
      setIsSubmitting(true);
      setShowAcceptDialog(false);
      console.log("📤 Submitting (Accepting), formId:", formId);
      
      await submitMospiFormAction(formId, "accept");
      
      toast({
        title: "Success",
        description: "Submission accepted successfully",
      });
      
      // Reload submission to reflect status change
      await loadSubmission();
      
      // Reload form status statistics for MOSPI Approver
      if (isMospiApprover && formId) {
        try {
          const response = await getFormStatusStatistics(formId);
          if (response?.status && response?.data) {
            setFormStatusStats(response.data);
          }
        } catch (error) {
          console.error("Error reloading form status statistics:", error);
        }
      }
    } catch (error: any) {
      console.error("❌ Error accepting submission:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || error?.message || "Failed to accept submission",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is MOSPI Reviewer or Approver
  const isMospiReviewer = user?.role === "MOSPI_REVIEWER";
  const isMospiApprover = user?.role === "MOSPI_APPROVER";
  
  // Debug: Log user role to verify
  console.log("🔍 MinistryFormReviewSubmissionPage - User:", user);
  console.log("🔍 User role:", user?.role);
  console.log("🔍 isMospiReviewer:", isMospiReviewer);
  console.log("🔍 isMospiApprover:", isMospiApprover);
  console.log("🔍 formId:", formId);
  console.log("🔍 submission:", submission);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Card */}
      <Card className="mb-6 bg-white rounded-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-primary hover:text-primary/90 hover:bg-primary/10 p-0 h-auto mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Review Submission
              </h1>

              {/* Submission ID and Ministry */}
              <p className="text-sm text-gray-600">
                {submissionId} • {ministryName}
              </p>
            </div>

            {/* Status Badge and Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <Badge variant="outline" className={`${config.badgeClass} text-xs font-medium px-3 py-1`}>
                {config.label}
              </Badge>
              
              {/* Action Buttons - MOSPI Reviewer */}
              {isMospiReviewer && (
                <Button
                  onClick={handleSendToApprover}
                  disabled={isSubmitting || submission?.status !== "SUBMITTED_TO_MOSPI_REVIEWER"}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to Approver
                    </>
                  )}
                </Button>
              )}
              
              {/* Action Buttons - MOSPI Approver */}
              {isMospiApprover && (() => {
                // First check: If formStatus is not SUBMITTED_TO_MOSPI_APPROVER, disable both buttons
                const isCorrectStatus = submission?.status === "SUBMITTED_TO_MOSPI_APPROVER";
                
                if (!isCorrectStatus) {
                  console.log("⚠️ Disabling buttons: formStatus is not SUBMITTED_TO_MOSPI_APPROVER", {
                    currentStatus: submission?.status,
                    requiredStatus: "SUBMITTED_TO_MOSPI_APPROVER",
                  });
                }
                
                // Calculate button enable/disable logic based on form status statistics
                let isSubmitEnabled = false;
                let isSendBackEnabled = false;
                
                console.log("🔍 Button Logic - formStatusStats:", formStatusStats);
                console.log("🔍 Button Logic - submission status:", submission?.status);
                
                if (formStatusStats && isCorrectStatus) {
                  const { total, totalSentBack, totalApproved, totalSubmitted } = formStatusStats;
                  
                  console.log("🔍 Button Logic - Stats:", {
                    total,
                    totalSentBack,
                    totalApproved,
                    totalSubmitted,
                  });
                  
                  // If totalSubmitted !== total, disable both buttons
                  if (totalSubmitted !== total) {
                    console.log("⚠️ Disabling both: totalSubmitted !== total");
                    isSubmitEnabled = false;
                    isSendBackEnabled = false;
                  } else {
                    // If totalSubmitted === total:
                    // - Submit enabled when totalApproved === total
                    isSubmitEnabled = totalApproved === total;
                    
                    // - Send Back enabled when totalSentBack !== 0
                    isSendBackEnabled = totalSentBack !== 0;
                    
                    console.log("✅ Button states:", {
                      isSubmitEnabled,
                      isSendBackEnabled,
                      reason: {
                        submit: totalApproved === total ? "All approved" : `${totalApproved}/${total} approved`,
                        sendBack: totalSentBack !== 0 ? `Has ${totalSentBack} sent back` : "No sent back items",
                      },
                    });
                  }
                } else {
                  if (!isCorrectStatus) {
                    console.log("⚠️ Buttons disabled: formStatus is not SUBMITTED_TO_MOSPI_APPROVER");
                  } else {
                    console.log("⚠️ formStatusStats is null/undefined");
                  }
                }
                
                // Final disabled state: combine status check with stats logic
                const sendBackDisabled = isSubmitting || !isCorrectStatus || !isSendBackEnabled;
                const submitDisabled = isSubmitting || !isCorrectStatus || !isSubmitEnabled;
                
                console.log("🔍 Final button disabled states:", {
                  isSubmitting,
                  isCorrectStatus,
                  isSendBackEnabled,
                  isSubmitEnabled,
                  sendBackDisabled,
                  submitDisabled,
                });
                
                return (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSendBack}
                      disabled={sendBackDisabled}
                      variant="outline"
                      className="flex items-center gap-2 border-orange-500 text-orange-700 hover:bg-orange-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          Send Back
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitDisabled}
                      className="flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Submit
                        </>
                      )}
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submission Details Card */}
      <MinistrySubmissionDetailsCard
        submittedByName={submission.user ? `${submission.user.firstName} ${submission.user.lastName}` : undefined}
        submittedByEmail={submission.user?.email}
        submissionDate={submission.createdAt}
        currentOwner={submission.user?.role}
        currentUserRole={user?.role}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="data-review">Data Review</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <MinistryOverviewTab 
            submission={submission} 
            currentUserRole={user?.role}
            currentUserPhone={user?.contactNumber}
          />
        </TabsContent>

        <TabsContent value="data-review">
          <MinistryDataReviewTab 
            submission={submission}
            useConsolidatedApi={isConsolidated}
            submissionId={id}
          />
        </TabsContent>

        <TabsContent value="documents">
          <MinistryDocumentsTab 
            submission={submission}
            documents={submission?.attachedFiles || []}
            formData={submission?.formData}
            submissionId={submission?.id}
          />
        </TabsContent>

        <TabsContent value="history">
          <MinistryHistoryTab submission={submission} />
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for MOSPI Approver Accept */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Accept</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this submission? This action will mark the submission as ACCEPTED and finalize the review. No further action can be taken after accept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>
              Confirm & Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}