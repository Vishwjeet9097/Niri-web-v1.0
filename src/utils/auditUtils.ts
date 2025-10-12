/**
 * Common Audit Entries Generator Utility
 * Generates audit entries from submission data for all user roles
 */

import { AuditEntry } from "@/components/AuditLog";

/**
 * Generate audit entries from submission data
 * Works for all user roles: NODAL_OFFICER, STATE_APPROVER, MOSPI_REVIEWER, MOSPI_APPROVER
 * @param submission - Submission data object
 * @returns Array of audit entries sorted by timestamp (newest first)
 */
export const generateAuditEntries = (submission: any): AuditEntry[] => {
  if (!submission) return [];

  const entries: AuditEntry[] = [];

  // Add creation entry
  if (submission.createdAt) {
    entries.push({
      id: "created",
      timestamp: submission.createdAt,
      action: "Created",
      actor:
        submission.nodalOfficer?.name ||
        submission.user?.firstName + " " + submission.user?.lastName ||
        "Unknown User",
      actorRole:
        submission.nodalOfficer?.role ||
        submission.user?.role ||
        "NODAL_OFFICER",
      status: "Draft",
      details: "Submission created and saved as draft",
    });
  }

  // Add submission entry
  if (submission.submittedAt) {
    entries.push({
      id: "submitted",
      timestamp: submission.submittedAt,
      action: "Submitted to State",
      actor:
        submission.nodalOfficer?.name ||
        submission.user?.firstName + " " + submission.user?.lastName ||
        "Unknown User",
      actorRole:
        submission.nodalOfficer?.role ||
        submission.user?.role ||
        "NODAL_OFFICER",
      status: "Submitted to State",
      details: "Submission submitted to State Approver for review",
    });
  }

  // Add state approval/forwarding entry
  if (submission.forwardedToMospiAt) {
    entries.push({
      id: "forwarded",
      timestamp: submission.forwardedToMospiAt,
      action: "Forwarded to MoSPI",
      actor: submission.stateApprover?.name || "State Approver",
      actorRole: "STATE_APPROVER",
      status: "Waiting for Approval",
      details: "Submission forwarded to MoSPI Reviewer for review",
    });
  }

  // Add MoSPI review entry
  if (submission.mospiReviewedAt) {
    entries.push({
      id: "mospi_reviewed",
      timestamp: submission.mospiReviewedAt,
      action: submission.status === "APPROVED" ? "Approved" : "Rejected",
      actor: submission.mospiReviewer?.name || "MoSPI Reviewer",
      actorRole: "MOSPI_REVIEWER",
      status: submission.status,
      comment: submission.mospiReviewerComment,
      details:
        submission.status === "APPROVED"
          ? "Submission approved by MoSPI Reviewer"
          : "Submission rejected by MoSPI Reviewer",
    });
  }

  // Add final approval entry
  if (submission.finalApprovedAt) {
    entries.push({
      id: "final_approved",
      timestamp: submission.finalApprovedAt,
      action: "Final Approved",
      actor: submission.mospiApprover?.name || "MoSPI Approver",
      actorRole: "MOSPI_APPROVER",
      status: "Approved",
      details: "Submission finally approved and scored",
    });
  }

  // Add comments from reviewComments (NEW FEATURE)
  if (submission.reviewComments && Array.isArray(submission.reviewComments)) {
    submission.reviewComments.forEach((comment: any, index: number) => {
      const isMospiApprover =
        comment.role === "MOSPI_APPROVER" || comment.role === "MOSPI APPROVER";

      entries.push({
        id: `review_comment_${index}`,
        timestamp: comment.timestamp || new Date().toISOString(),
        action: isMospiApprover
          ? "Commented"
          : comment.type === "comment"
          ? "Commented"
          : comment.type === "rejection"
          ? "Rejected"
          : comment.type === "approval"
          ? "Approved"
          : "Commented",
        actor: comment.userId || "Unknown User",
        actorRole: comment.role || "Unknown Role",
        comment: comment.text || comment.comment || comment.message,
        details: isMospiApprover
          ? "Review comment added"
          : comment.type === "comment"
          ? "Review comment added"
          : comment.type === "rejection"
          ? "Submission rejected with comment"
          : comment.type === "approval"
          ? "Submission approved with comment"
          : "Comment added to submission",
        status: isMospiApprover ? "Action Required" : undefined,
      });
    });
  }

  // Add comments from history (fallback for older data)
  if (submission.history && Array.isArray(submission.history)) {
    submission.history.forEach((comment: any, index: number) => {
      entries.push({
        id: `history_comment_${index}`,
        timestamp:
          comment.timestamp || comment.createdAt || new Date().toISOString(),
        action: "Commented",
        actor: comment.author || comment.user?.name || "Unknown User",
        actorRole: comment.role || "Unknown Role",
        comment: comment.text || comment.comment || comment.message,
        details: "Comment added to submission",
      });
    });
  }

  // Add status change entries based on current status
  if (submission.status) {
    const statusEntry = getStatusChangeEntry(submission);
    if (statusEntry) {
      entries.push(statusEntry);
    }
  }

  // Sort by timestamp (newest first)
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Generate status change entry based on current submission status
 * @param submission - Submission data object
 * @returns Audit entry for status change or null
 */
const getStatusChangeEntry = (submission: any): AuditEntry | null => {
  const status = submission.status;
  const updatedAt = submission.updatedAt;

  if (!status || !updatedAt) return null;

  switch (status) {
    case "SUBMITTED_TO_STATE":
      return {
        id: "status_submitted_to_state",
        timestamp: updatedAt,
        action: "Status Changed",
        actor: "Action Required",
        actorRole: "SYSTEM",
        status: "Submitted to State",
        details: "Submission status changed to Submitted to State",
      };

    case "SUBMITTED_TO_MOSPI_REVIEWER":
      return {
        id: "status_submitted_to_mospi",
        timestamp: updatedAt,
        action: "Status Changed",
        actor: "Action Required",
        actorRole: "SYSTEM",
        status: "Waiting for Approval",
        details: "Submission status changed to Waiting for Approval",
      };

    case "APPROVED":
      return {
        id: "status_approved",
        timestamp: updatedAt,
        action: "Status Changed",
        actor: "Action Required",
        actorRole: "SYSTEM",
        status: "Approved",
        details: "Submission status changed to Approved",
      };

    case "REJECTED":
      return {
        id: "status_rejected",
        timestamp: updatedAt,
        action: "Status Changed",
        actor: "Action Required",
        actorRole: "SYSTEM",
        status: "Rejected",
        details: "Submission status changed to Rejected",
      };

    default:
      return null;
  }
};

/**
 * Get user display name from submission data
 * @param submission - Submission data object
 * @returns Formatted user name
 */
export const getUserDisplayName = (submission: any): string => {
  if (submission.nodalOfficer?.name) {
    return submission.nodalOfficer.name;
  }

  if (submission.user?.firstName && submission.user?.lastName) {
    return `${submission.user.firstName} ${submission.user.lastName}`;
  }

  if (submission.user?.email) {
    return submission.user.email;
  }

  return "Unknown User";
};

/**
 * Get user role display name (without underscores)
 * @param role - User role string
 * @returns Formatted role name without underscores
 */
export const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    NODAL_OFFICER: "NODAL OFFICER",
    STATE_APPROVER: "STATE APPROVER",
    MOSPI_REVIEWER: "MOSPI REVIEWER",
    MOSPI_APPROVER: "MOSPI APPROVER",
    SYSTEM: "ACTION REQUIRED",
  };

  return roleMap[role] || role.replace(/_/g, " ");
};

/**
 * Get pill color class based on action and status
 * @param action - Action type
 * @param status - Status (optional)
 * @returns CSS class for pill color
 */
export const getPillColorClass = (action: string, status?: string): string => {
  const actionLower = action.toLowerCase();

  // REJECTED - Red
  if (
    actionLower.includes("rejected") ||
    actionLower.includes("sent back") ||
    status === "Rejected" ||
    status === "REJECTED" ||
    status === "REJECTED_FINAL"
  ) {
    return "bg-red-100 text-red-800 border-red-200";
  }

  // MOSPI_APPROVER send back to state - Orange (warning)
  if (
    actionLower.includes("returned") ||
    actionLower.includes("send back") ||
    status === "RETURNED_FROM_MOSPI" ||
    status === "RETURNED_FROM_MOSPI"
  ) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }

  // New submissions - Blue
  if (
    actionLower.includes("forwarded") ||
    actionLower.includes("submitted") ||
    status === "Waiting for Approval" ||
    status === "Submitted to State" ||
    status === "SUBMITTED_TO_STATE" ||
    status === "SUBMITTED_TO_MOSPI_REVIEWER" ||
    status === "SUBMITTED_TO_MOSPI_APPROVER"
  ) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  // Approved - Green
  if (
    actionLower.includes("approved") ||
    actionLower.includes("completed") ||
    actionLower.includes("created") ||
    status === "Approved" ||
    status === "APPROVED"
  ) {
    return "bg-green-100 text-green-800 border-green-200";
  }

  // Draft - Grey
  if (status === "Draft" || status === "DRAFT") {
    return "bg-gray-100 text-gray-800 border-gray-200";
  }

  // MOSPI Approver Action Required - Red (based on status)
  if (status === "Action Required") {
    return "bg-red-100 text-red-800 border-red-200";
  }

  // Comments - Purple
  if (actionLower.includes("commented")) {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }

  // Status changes - Orange
  if (actionLower.includes("status changed")) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }

  // Default - Gray
  return "bg-gray-100 text-gray-800 border-gray-200";
};

/**
 * Check if submission has MOSPI_APPROVER comment requiring action
 * @param submission - Submission data object
 * @returns boolean indicating if action is required
 */
export const hasMospiApproverComment = (submission: any): boolean => {
  if (
    !submission ||
    !submission.reviewComments ||
    !Array.isArray(submission.reviewComments)
  ) {
    return false;
  }

  return submission.reviewComments.some((comment: any) => {
    const role = comment.role?.toUpperCase();
    return role === "MOSPI_APPROVER" || role === "MOSPI APPROVER";
  });
};

/**
 * Get MOSPI_APPROVER comment text for display
 * @param submission - Submission data object
 * @returns MOSPI_APPROVER comment text or null
 */
export const getMospiApproverComment = (submission: any): string | null => {
  if (
    !submission ||
    !submission.reviewComments ||
    !Array.isArray(submission.reviewComments)
  ) {
    return null;
  }

  const mospiComment = submission.reviewComments.find((comment: any) => {
    const role = comment.role?.toUpperCase();
    return role === "MOSPI_APPROVER" || role === "MOSPI APPROVER";
  });

  return mospiComment
    ? mospiComment.text || mospiComment.comment || mospiComment.message
    : null;
};

/**
 * Check if submission is waiting for current user's approval
 * @param submission - Submission data object
 * @param currentUserRole - Current user's role
 * @returns boolean indicating if submission is waiting for current user
 */
export const isWaitingForCurrentUser = (
  submission: any,
  currentUserRole: string
): boolean => {
  if (!submission || !currentUserRole) return false;

  const status = submission.status;

  switch (currentUserRole) {
    case "NODAL_OFFICER":
      return (
        status === "RETURNED_FROM_MOSPI" || status === "RETURNED_FROM_MOSPI"
      );
    case "STATE_APPROVER":
      return status === "SUBMITTED_TO_STATE";
    case "MOSPI_REVIEWER":
      return status === "SUBMITTED_TO_MOSPI_REVIEWER";
    case "MOSPI_APPROVER":
      return status === "SUBMITTED_TO_MOSPI_APPROVER";
    default:
      return false;
  }
};

/**
 * Get waiting message for current user
 * @param submission - Submission data object
 * @param currentUserRole - Current user's role
 * @returns waiting message string
 */
export const getWaitingMessage = (
  submission: any,
  currentUserRole: string
): string => {
  if (!submission || !currentUserRole) return "";

  const status = submission.status;

  switch (currentUserRole) {
    case "NODAL_OFFICER":
      if (status === "RETURNED_FROM_MOSPI") {
        return "आपका submission State Approver से वापस आया है - कृपया revision करें";
      }
      if (status === "RETURNED_FROM_MOSPI") {
        return "आपका submission MoSPI से वापस आया है - कृपया revision करें";
      }
      break;
    case "STATE_APPROVER":
      if (status === "SUBMITTED_TO_STATE") {
        return "आपका approval के लिए wait कर रहा है";
      }
      break;
    case "MOSPI_REVIEWER":
      if (status === "SUBMITTED_TO_MOSPI_REVIEWER") {
        return "आपका review के लिए wait कर रहा है";
      }
      break;
    case "MOSPI_APPROVER":
      if (status === "SUBMITTED_TO_MOSPI_APPROVER") {
        return ""; // No waiting message needed
      }
      break;
  }

  return "";
};

/**
 * Check if a submission has been returned from MoSPI based on reviewComments
 * @param submission - submission object
 * @returns boolean indicating if submission was returned from MoSPI
 */
export const isReturnedFromMospi = (submission: any): boolean => {
  if (
    !submission ||
    !submission.reviewComments ||
    !Array.isArray(submission.reviewComments)
  ) {
    return false;
  }

  // Check if there's a MOSPI_APPROVER comment indicating return from MoSPI
  return submission.reviewComments.some((comment: any) => {
    const role = comment.role?.toUpperCase();
    return role === "MOSPI_APPROVER" || role === "MOSPI APPROVER";
  });
};

/**
 * Check if user can edit/submit submission based on role and status
 * @param userRole - Current user's role
 * @param submissionStatus - Submission status
 * @returns boolean indicating if user can edit/submit
 */
export const canEditSubmission = (
  userRole: string,
  submissionStatus: string
): boolean => {
  if (!userRole || !submissionStatus) return false;

  switch (userRole) {
    case "NODAL_OFFICER":
      return submissionStatus === "DRAFT";
    case "STATE_APPROVER":
    case "MOSPI_REVIEWER":
    case "MOSPI_APPROVER":
      return false; // These roles cannot edit submissions
    default:
      return false;
  }
};

/**
 * Check if user can approve submission based on role and status
 * @param userRole - Current user's role
 * @param submissionStatus - Submission status
 * @returns boolean indicating if user can approve
 */
export const canApproveSubmission = (
  userRole: string,
  submissionStatus: string
): boolean => {
  if (!userRole || !submissionStatus) return false;

  switch (userRole) {
    case "STATE_APPROVER":
      return (
        submissionStatus === "SUBMITTED_TO_STATE" ||
        submissionStatus === "RETURNED_FROM_MOSPI"
      );
    case "MOSPI_APPROVER":
      return submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER";
    case "NODAL_OFFICER":
    case "MOSPI_REVIEWER":
      return false; // These roles cannot approve submissions
    default:
      return false;
  }
};

/**
 * Check if user can review submission based on role and status
 * @param userRole - Current user's role
 * @param submissionStatus - Submission status
 * @returns boolean indicating if user can review
 */
export const canReviewSubmission = (
  userRole: string,
  submissionStatus: string
): boolean => {
  if (!userRole || !submissionStatus) return false;

  switch (userRole) {
    case "MOSPI_REVIEWER":
      return submissionStatus === "SUBMITTED_TO_MOSPI_REVIEWER";
    case "STATE_APPROVER":
      return (
        submissionStatus === "SUBMITTED_TO_STATE" ||
        submissionStatus === "RETURNED_FROM_MOSPI"
      );
    case "MOSPI_APPROVER":
      return submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER";
    case "NODAL_OFFICER":
      return false; // Nodal officers cannot review submissions
    default:
      return false;
  }
};

/**
 * Check if user can reject submission based on role and status
 * @param userRole - Current user's role
 * @param submissionStatus - Submission status
 * @returns boolean indicating if user can reject
 */
export const canRejectSubmission = (
  userRole: string,
  submissionStatus: string
): boolean => {
  if (!userRole || !submissionStatus) return false;

  switch (userRole) {
    case "STATE_APPROVER":
      return (
        submissionStatus === "SUBMITTED_TO_STATE" ||
        submissionStatus === "RETURNED_FROM_MOSPI"
      );
    case "MOSPI_APPROVER":
      return submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER";
    case "NODAL_OFFICER":
    case "MOSPI_REVIEWER":
      return false; // These roles cannot reject submissions
    default:
      return false;
  }
};

/**
 * Check if user can send back submission based on role and status
 * @param userRole - Current user's role
 * @param submissionStatus - Submission status
 * @returns boolean indicating if user can send back
 */
export const canSendBackSubmission = (
  userRole: string,
  submissionStatus: string
): boolean => {
  if (!userRole || !submissionStatus) return false;

  switch (userRole) {
    case "STATE_APPROVER":
      return (
        submissionStatus === "SUBMITTED_TO_STATE" ||
        submissionStatus === "RETURNED_FROM_MOSPI"
      );
    case "MOSPI_APPROVER":
      return submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER";
    case "NODAL_OFFICER":
    case "MOSPI_REVIEWER":
      return false; // These roles cannot send back submissions
    default:
      return false;
  }
};

/**
 * Get comment background color class based on submission status
 */
export const getCommentBackgroundClass = (status: string): string => {
  switch (status) {
    case "REJECTED":
    case "REJECTED_FINAL":
      return "bg-red-50 border-red-200";
    case "RETURNED_FROM_MOSPI":
    case "RETURNED_FROM_STATE":
      return "bg-orange-50 border-orange-200";
    case "SUBMITTED_TO_STATE":
    case "SUBMITTED_TO_MOSPI_REVIEWER":
    case "SUBMITTED_TO_MOSPI_APPROVER":
      return "bg-blue-50 border-blue-200";
    case "APPROVED":
      return "bg-green-50 border-green-200";
    case "DRAFT":
      return "bg-gray-50 border-gray-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

/**
 * Get comment text color class based on submission status
 */
export const getCommentTextColorClass = (status: string): string => {
  switch (status) {
    case "REJECTED":
    case "REJECTED_FINAL":
      return "text-red-800";
    case "RETURNED_FROM_MOSPI":
    case "RETURNED_FROM_STATE":
      return "text-orange-800";
    case "SUBMITTED_TO_STATE":
    case "SUBMITTED_TO_MOSPI_REVIEWER":
    case "SUBMITTED_TO_MOSPI_APPROVER":
      return "text-blue-800";
    case "APPROVED":
      return "text-green-800";
    case "DRAFT":
      return "text-gray-800";
    default:
      return "text-gray-800";
  }
};

/**
 * Get comment icon color class based on submission status
 */
export const getCommentIconColorClass = (status: string): string => {
  switch (status) {
    case "REJECTED":
    case "REJECTED_FINAL":
      return "text-red-600";
    case "RETURNED_FROM_MOSPI":
    case "RETURNED_FROM_STATE":
      return "text-orange-600";
    case "SUBMITTED_TO_STATE":
    case "SUBMITTED_TO_MOSPI_REVIEWER":
    case "SUBMITTED_TO_MOSPI_APPROVER":
      return "text-blue-600";
    case "APPROVED":
      return "text-green-600";
    case "DRAFT":
      return "text-gray-600";
    default:
      return "text-gray-600";
  }
};
