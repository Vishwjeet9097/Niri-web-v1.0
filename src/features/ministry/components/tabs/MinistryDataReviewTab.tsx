import { MinistrySubmissionReviewWrapper } from '../../pages/MinistrySubmissionReviewWrapper';

interface MinistryDataReviewTabProps {
  submission: any;
}

export function MinistryDataReviewTab({ submission }: MinistryDataReviewTabProps) {
  return (
    <div className="space-y-6">
      <MinistrySubmissionReviewWrapper 
        submission={submission}
        userId={submission?.user?.id}
      />
    </div>
  );
}

