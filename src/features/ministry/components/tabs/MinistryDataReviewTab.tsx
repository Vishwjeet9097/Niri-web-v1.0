import { MinistrySubmissionReviewWrapper } from '../../pages/MinistrySubmissionReviewWrapper';

interface MinistryDataReviewTabProps {
  submission: any;
  useConsolidatedApi?: boolean; // If true, use consolidated API with submissionId
  submissionId?: string; // Submission ID for consolidated API
}

export function MinistryDataReviewTab({ 
  submission, 
  useConsolidatedApi = false,
  submissionId 
}: MinistryDataReviewTabProps) {
  // For consolidated submissions, use the consolidated API endpoint
  // The submissionId should be the UUID (submission.id)
  const consolidatedSubmissionId = useConsolidatedApi ? (submissionId || submission?.id) : undefined;
  
  console.log('📋 [MinistryDataReviewTab] API Configuration:', {
    useConsolidatedApi,
    submissionId: consolidatedSubmissionId,
    submissionIdFromProp: submissionId,
    submissionIdFromSubmission: submission?.id,
  });
  
  return (
    <div className="space-y-6">
      <MinistrySubmissionReviewWrapper 
        submission={submission}
        userId={submission?.user?.id}
        useConsolidatedApi={useConsolidatedApi}
        submissionId={consolidatedSubmissionId}
      />
    </div>
  );
}

