import { MinistrySubmissionReviewWrapper } from '../../pages/MinistrySubmissionReviewWrapper';

interface MinistryDataReviewTabProps {
  submission: any;
  useConsolidatedApi?: boolean; // If true, use consolidated API with submissionId
  submissionId?: string; // Submission ID for consolidated API
  consolidatedFormStatus?: string | null; // Consolidated form status (for freeze logic when viewing individual submissions)
  externalSendToApproverDisabled?: boolean; // When true, disables bottom Send to Approver (e.g. when top button submit is in progress)
  onSendToApproverSubmittingChange?: (submitting: boolean) => void; // Notify parent when bottom Send to Approver is submitting
  onSendToApproverOpen?: () => void; // When provided, bottom "Send to Approver" will open the parent's modal instead of using its own flow
}

export function MinistryDataReviewTab({ 
  submission, 
  useConsolidatedApi = false,
  submissionId,
  consolidatedFormStatus,
  externalSendToApproverDisabled,
  onSendToApproverSubmittingChange,
  onSendToApproverOpen,
}: MinistryDataReviewTabProps) {
  // For consolidated submissions, use the consolidated API endpoint
  // The submissionId should be the UUID (submission.id)
  const consolidatedSubmissionId = useConsolidatedApi ? (submissionId || submission?.id) : undefined;
  
  console.log('📋 [MinistryDataReviewTab] API Configuration:', {
    useConsolidatedApi,
    submissionId: consolidatedSubmissionId,
    submissionIdFromProp: submissionId,
    submissionIdFromSubmission: submission?.id,
    consolidatedFormStatus,
    submissionUserId: submission?.user?.id,
  });
  
  return (
    <div className="space-y-6">
      <MinistrySubmissionReviewWrapper 
        submission={submission}
        userId={submission?.user?.id}
        useConsolidatedApi={useConsolidatedApi}
        submissionId={consolidatedSubmissionId}
        consolidatedFormStatus={consolidatedFormStatus}
        externalSendToApproverDisabled={externalSendToApproverDisabled}
        onSendToApproverSubmittingChange={onSendToApproverSubmittingChange}
        onSendToApproverOpen={onSendToApproverOpen}
      />
    </div>
  );
}

