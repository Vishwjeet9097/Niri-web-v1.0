/**
 * Centralized status management utilities
 * Provides consistent status text and styling across the application
 */

export interface StatusInfo {
  label: string;
  description: string;
  className: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
}

export const STATUS_MAP: Record<string, StatusInfo> = {
  DRAFT: {
    label: "Draft",
    description: "Being prepared by Nodal Officer",
    className: "bg-gray-100 text-gray-800 border-gray-200",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
    borderClass: "border-l-gray-400",
    bgClass: "bg-gray-50",
  },
  SUBMITTED_TO_STATE: {
    label: "Under Review",
    description: "Waiting for State Approver Review",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-400",
    bgClass: "bg-blue-50",
  },
  SUBMITTED_TO_MOSPI_REVIEWER: {
    label: "Under Review",
    description: "Waiting for Mospi Reviewer Review",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-400",
    bgClass: "bg-blue-50",
  },
  SUBMITTED_TO_MOSPI_APPROVER: {
    label: "Under Review",
    description: "Waiting for Mospi Approver Review",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    borderClass: "border-l-blue-400",
    bgClass: "bg-blue-50",
  },
  APPROVED: {
    label: "Approved",
    description: "Approved by Mospi Approver",
    className: "bg-green-100 text-green-800 border-green-200",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    borderClass: "border-l-green-400",
    bgClass: "bg-green-50",
  },
  REJECTED: {
    label: "Rejected",
    description: "Rejected and returned for corrections",
    className: "bg-red-100 text-red-800 border-red-200",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    borderClass: "border-l-red-400",
    bgClass: "bg-red-50",
  },
  RETURNED_FROM_STATE: {
    label: "Returned",
    description: "Returned by State Approver for corrections",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-400",
    bgClass: "bg-orange-50",
  },
  RETURNED_FROM_MOSPI_REVIEWER: {
    label: "Returned",
    description: "Returned by Mospi Reviewer for corrections",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-400",
    bgClass: "bg-orange-50",
  },
  RETURNED_FROM_MOSPI_APPROVER: {
    label: "Returned",
    description: "Returned by Mospi Approver for corrections",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    borderClass: "border-l-orange-400",
    bgClass: "bg-orange-50",
  },
};

/**
 * Get status information by status string
 */
export const getStatusInfo = (status: string): StatusInfo => {
  return (
    STATUS_MAP[status] || {
      label: "Unknown",
      description: "Status unknown",
      className: "bg-gray-100 text-gray-800 border-gray-200",
      badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
      borderClass: "border-l-gray-400",
      bgClass: "bg-gray-50",
    }
  );
};

/**
 * Get status pills for display (for multi-status scenarios)
 * @param status - Submission status
 * @param currentUserRole - Current user's role (optional)
 */
export const getStatusPills = (status: string, currentUserRole?: string) => {
  const statusInfo = getStatusInfo(status);

  // Don't show "waiting for" message to the user who needs to take action
  if (
    status === "SUBMITTED_TO_STATE" ||
    status === "SUBMITTED_TO_MOSPI_REVIEWER" ||
    status === "SUBMITTED_TO_MOSPI_APPROVER"
  ) {
    // Check if current user is the one who needs to take action
    const isWaitingForCurrentUser =
      (status === "SUBMITTED_TO_STATE" &&
        currentUserRole === "STATE_APPROVER") ||
      (status === "SUBMITTED_TO_MOSPI_REVIEWER" &&
        currentUserRole === "MOSPI_REVIEWER") ||
      (status === "SUBMITTED_TO_MOSPI_APPROVER" &&
        currentUserRole === "MOSPI_APPROVER");

    if (isWaitingForCurrentUser) {
      // Show only "Under Review" for the user who needs to take action
      return [{ label: statusInfo.label, className: statusInfo.className }];
    } else {
      // Show both "Under Review" and "Waiting for..." for other users
      return [
        { label: statusInfo.label, className: statusInfo.className },
        { label: statusInfo.description, className: statusInfo.className },
      ];
    }
  }

  return [{ label: statusInfo.label, className: statusInfo.className }];
};

/**
 * Get waiting message based on status and current user role
 */
export const getWaitingMessage = (
  status: string,
  currentUserRole: string
): string => {
  const statusInfo = getStatusInfo(status);

  switch (currentUserRole) {
    case "NODAL_OFFICER":
      return `Your submission is ${statusInfo.description.toLowerCase()}`;
    case "STATE_APPROVER":
      // No waiting message for State Approver
      return "";
    case "MOSPI_REVIEWER":
      // No waiting message for Mospi Reviewer
      return "";
    case "MOSPI_APPROVER":
      // No waiting message for Mospi Approver
      return "";
    default:
      return `This submission is ${statusInfo.description.toLowerCase()}`;
  }
};

/**
 * Check if status shows multiple pills
 * @param status - Submission status
 * @param currentUserRole - Current user's role (optional)
 */
export const shouldShowMultipleStatusPills = (
  status: string,
  currentUserRole?: string
): boolean => {
  if (
    status === "SUBMITTED_TO_STATE" ||
    status === "SUBMITTED_TO_MOSPI_REVIEWER" ||
    status === "SUBMITTED_TO_MOSPI_APPROVER"
  ) {
    // Check if current user is the one who needs to take action
    const isWaitingForCurrentUser =
      (status === "SUBMITTED_TO_STATE" &&
        currentUserRole === "STATE_APPROVER") ||
      (status === "SUBMITTED_TO_MOSPI_REVIEWER" &&
        currentUserRole === "MOSPI_REVIEWER") ||
      (status === "SUBMITTED_TO_MOSPI_APPROVER" &&
        currentUserRole === "MOSPI_APPROVER");

    // Show multiple pills only if it's NOT waiting for current user
    return !isWaitingForCurrentUser;
  }

  return false;
};
