import { MinistrySubmissionReviewWrapper } from '../../pages/MinistrySubmissionReviewWrapper';

interface MinistryDataReviewTabProps {
  submission: any;
  useConsolidatedApi?: boolean; // If true, use consolidated API with submissionId
  submissionId?: string; // Submission ID for consolidated API
  consolidatedFormStatus?: string | null; // Consolidated form status (for freeze logic when viewing individual submissions)
}

export function MinistryDataReviewTab({ 
  submission, 
  useConsolidatedApi = false,
  submissionId,
  consolidatedFormStatus
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
      />
    </div>
  );
}

