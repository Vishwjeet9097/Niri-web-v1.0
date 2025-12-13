import {
  isConsolidatedSubmission,
  getSourceSubmissionIds,
  getConsolidationInfo,
  getSubmissionStatus,
} from "./indicatorStatusUtils";

/**
 * Grouped submissions structure
 */
export interface GroupedSubmissions {
  consolidated: Array<Record<string, any>>;
  unconsolidated: Array<Record<string, any>>;
  consolidatedWithSources: Array<{
    consolidated: Record<string, any>;
    sources: Array<Record<string, any>>;
  }>;
}

/**
 * Group submissions by consolidation status
 * @param submissions - Array of submissions
 * @returns Grouped submissions
 */
export function groupSubmissionsByConsolidation(
  submissions: Array<Record<string, any>>
): GroupedSubmissions {
  const consolidated: Array<Record<string, any>> = [];
  const unconsolidated: Array<Record<string, any>> = [];
  const consolidatedWithSources: Array<{
    consolidated: Record<string, any>;
    sources: Array<Record<string, any>>;
  }> = [];

  // Separate consolidated and unconsolidated submissions
  submissions.forEach((submission) => {
    if (isConsolidatedSubmission(submission)) {
      consolidated.push(submission);
    } else {
      const consolidationInfo = getConsolidationInfo(submission);
      if (!consolidationInfo?.consolidatedInto) {
        unconsolidated.push(submission);
      }
      // If it has consolidation info, it's a source submission - handled below
    }
  });

  // Group consolidated submissions with their sources
  consolidated.forEach((consolidatedSub) => {
    const sourceIds = getSourceSubmissionIds(consolidatedSub);
    const sources = submissions.filter((sub) =>
      sourceIds.includes(sub.submissionId || sub.id)
    );

    consolidatedWithSources.push({
      consolidated: consolidatedSub,
      sources,
    });
  });

  return {
    consolidated,
    unconsolidated,
    consolidatedWithSources,
  };
}

/**
 * Filter submissions for state approver dashboard
 * Shows consolidated submissions and unconsolidated nodal submissions
 * @param submissions - Array of all submissions
 * @param currentUserId - Current user ID (state approver)
 * @param currentState - Current state/UT
 * @returns Filtered submissions
 */
export function filterSubmissionsForStateApprover(
  submissions: Array<Record<string, any>>,
  currentUserId: string,
  currentState?: string
): {
  consolidated: Array<Record<string, any>>;
  pendingConsolidation: Array<Record<string, any>>;
  allGrouped: GroupedSubmissions;
} {
  // Filter by state if provided
  let filtered = submissions;
  if (currentState) {
    const normalizedState = currentState.toUpperCase();
    filtered = submissions.filter((sub) => {
      const subState = (sub.stateUt || sub.user?.stateUt || "").toString().toUpperCase();
      return subState === normalizedState;
    });
  }

  // Group by consolidation
  const grouped = groupSubmissionsByConsolidation(filtered);

  // Separate consolidated (created by state approver) and pending (nodal submissions)
  const consolidated = grouped.consolidated.filter(
    (sub) => sub.submittedBy === currentUserId || sub.user?.id === currentUserId
  );

  // Pending consolidation: unconsolidated submissions that are not from state approver
  const pendingConsolidation = grouped.unconsolidated.filter(
    (sub) => sub.submittedBy !== currentUserId && sub.user?.id !== currentUserId
  );

  return {
    consolidated,
    pendingConsolidation,
    allGrouped: grouped,
  };
}

/**
 * Get submission display status for dashboard
 * @param submission - Submission object
 * @returns Display status string
 */
export function getSubmissionDisplayStatus(
  submission: Record<string, any>
): string {
  const statusInfo = getSubmissionStatus(submission);

  if (statusInfo.isConsolidated) {
    return "Consolidated";
  }

  switch (statusInfo.status) {
    case "READY_FOR_CONSOLIDATION":
      return "Ready for Consolidation";
    case "UNDER_REVIEW":
      return `Under Review (${statusInfo.progress}%)`;
    case "PENDING":
      return "Pending";
    default:
      return submission.status || "Unknown";
  }
}