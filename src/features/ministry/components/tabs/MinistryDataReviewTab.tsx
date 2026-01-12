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
  return (
    <div className="space-y-6">
      <MinistrySubmissionReviewWrapper 
        submission={submission}
        userId={submission?.user?.id}
        useConsolidatedApi={useConsolidatedApi}
        submissionId={submissionId || submission?.id}
      />
    </div>
  );
}

