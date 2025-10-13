/**
 * Utility functions for handling user data
 */

export interface UserData {
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface SubmissionData {
  submittedBy?: UserData;
  user?: UserData;
}

/**
 * Get display name from user data with proper fallbacks
 * @param user - User object with firstName, lastName, or name
 * @returns Formatted display name or "Unknown"
 */
export function getUserDisplayName(user?: UserData): string {
  if (!user) return "Unknown";

  // If name field exists, use it
  if (user.name) return user.name;

  // If firstName and lastName exist, combine them
  if (user.firstName || user.lastName) {
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || "Unknown";
  }

  return "Unknown";
}

/**
 * Get submitted by name from submission data with proper fallbacks
 * @param submission - Submission object
 * @returns Formatted submitted by name or "Unknown"
 */
export function getSubmittedByName(submission?: SubmissionData): string {
  if (!submission) return "Unknown";

  // Priority 1: user firstName + lastName (main source based on API response)
  if (submission.user) {
    return getUserDisplayName(submission.user);
  }

  // Priority 2: submittedBy.name (if available)
  if (submission.submittedBy?.name) {
    return submission.submittedBy.name;
  }

  // Priority 3: submittedBy firstName + lastName (if available)
  if (submission.submittedBy) {
    return getUserDisplayName(submission.submittedBy);
  }

  return "Unknown";
}
