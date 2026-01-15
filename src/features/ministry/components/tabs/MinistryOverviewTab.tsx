import { MinistryApproverInfoCard } from '../MinistryApproverInfoCard';
import { MinistrySubmissionInfoCard } from '../MinistrySubmissionInfoCard';

interface MinistryOverviewTabProps {
  submission: any;
  currentUserRole?: string;
  currentUserPhone?: string;
}

export function MinistryOverviewTab({ submission, currentUserRole, currentUserPhone }: MinistryOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Ministry Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ministry Approver Information Card */}
        <MinistryApproverInfoCard
          name={submission.user ? `${submission.user.firstName} ${submission.user.lastName}` : undefined}
          role={submission.user?.role ? submission.user.role.replace(/_/g, ' ') : undefined}
          email={submission.user?.email}
          phone={submission.user?.contactNumber}
          currentUserRole={currentUserRole}
          currentUserPhone={currentUserPhone}
        />

        {/* Submission Information Card */}
        <MinistrySubmissionInfoCard
          category="Infrastructure"
          type="N/A"
          location={submission.user?.ministryName || 'N/A'}
          submittedOn={submission.createdAt}
        />
      </div>
    </div>
  );
}

