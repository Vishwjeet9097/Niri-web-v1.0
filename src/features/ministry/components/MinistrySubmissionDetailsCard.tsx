import { getRoleDisplayName } from '@/utils/roles';

export interface MinistrySubmissionDetailsCardProps {
  submittedByName?: string;
  submittedByEmail?: string;
  submissionDate?: string | Date;
  currentOwner?: string;
  currentUserRole?: string;
}

export function MinistrySubmissionDetailsCard({
  submittedByName,
  submittedByEmail,
  submissionDate,
  currentOwner,
  currentUserRole,
}: MinistrySubmissionDetailsCardProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg border border-[#ddd] p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Submitted By */}
        <div>
          <p className="text-sm font-semibold text-[#212121]">Submitted By</p>
          {submittedByName && (
            <p className="text-[#727272] text-sm">{submittedByName}</p>
          )}
          {submittedByEmail && (
            <p className="text-sm text-[#727272]">{submittedByEmail}</p>
          )}
          {!submittedByName && !submittedByEmail && (
            <p className="text-sm text-[#727272]">N/A</p>
          )}
        </div>

        {/* Submission Date */}
        <div>
          <p className="text-sm font-semibold text-[#212121]">Submission Date</p>
          <p className="text-[#727272] text-sm">{formatDate(submissionDate)}</p>
        </div>

        {/* Current Owner */}
        <div>
          <p className="text-sm font-semibold text-[#212121]">Current Owner</p>
          <p className="text-[#727272] text-sm">
            {currentUserRole ? getRoleDisplayName(currentUserRole).replace(/_/g, ' ') : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}

