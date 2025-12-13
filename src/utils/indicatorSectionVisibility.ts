/**
 * Centralized utility for determining indicator section visibility
 * This ensures consistent logic across all review components and prevents future visibility issues
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for indicator-to-section mappings.
 * If new indicators are added, update the mapping below and all components will automatically use it.
 */

/**
 * Centralized indicator-to-section mapping for all categories
 * This should be the ONLY place where these mappings are defined
 */
const INDICATOR_TO_SECTION_MAP: Record<string, { category: string; sectionKey: string }> = {
  "1.1": { category: "infraFinancing", sectionKey: "section1_1" },
  "1.2": { category: "infraFinancing", sectionKey: "section1_2" },
  "1.3": { category: "infraFinancing", sectionKey: "section1_3" },
  "1.4": { category: "infraFinancing", sectionKey: "section1_4" },
  "1.5": { category: "infraFinancing", sectionKey: "section1_5" },
  "2.1": { category: "infraDevelopment", sectionKey: "section2_1" },
  "2.2": { category: "infraDevelopment", sectionKey: "section2_2" },
  "2.3": { category: "infraDevelopment", sectionKey: "section2_3" },
  "2.4": { category: "infraDevelopment", sectionKey: "section2_4" },
  "2.5": { category: "infraDevelopment", sectionKey: "section2_5" },
  "3.1": { category: "pppDevelopment", sectionKey: "section3_1" },
  "3.2": { category: "pppDevelopment", sectionKey: "section3_2" },
  "3.3": { category: "pppDevelopment", sectionKey: "section3_3" },
  "3.4": { category: "pppDevelopment", sectionKey: "section3_4" },
  "4.1": { category: "infraEnablers", sectionKey: "section4_1" },
  "4.2": { category: "infraEnablers", sectionKey: "section4_2" },
  "4.3": { category: "infraEnablers", sectionKey: "section4_3" },
  "4.4": { category: "infraEnablers", sectionKey: "section4_4" },
  "4.5": { category: "infraEnablers", sectionKey: "section4_5" },
  "4.6": { category: "infraEnablers", sectionKey: "section4_6" },
};

/**
 * Get indicator-to-section mapping for a specific category
 * @param category - The category name (e.g., "infraEnablers", "infraFinancing")
 * @returns Record mapping indicator codes to section keys
 */
export function getIndicatorToSectionMapForCategory(category: string): Record<string, string> {
  const map: Record<string, string> = {};
  
  Object.entries(INDICATOR_TO_SECTION_MAP).forEach(([indicator, mapping]) => {
    if (mapping.category === category) {
      map[indicator] = mapping.sectionKey;
    }
  });
  
  return map;
}

/**
 * Get all possible section keys for a category
 * @param category - The category name
 * @returns Array of section keys (e.g., ["section4_1", "section4_2", ...])
 */
export function getAllSectionsForCategory(category: string): string[] {
  const map = getIndicatorToSectionMapForCategory(category);
  return Object.values(map);
}

/**
 * Determine if sections should be filtered by assigned indicators
 * @param isStateApprover - Whether the user is a STATE_APPROVER
 * @param isPreview - Whether this is preview mode
 * @param isNodalOfficerSubmission - Whether the submission is from a NODAL_OFFICER
 * @param isAggregateSubmission - Whether this is an aggregate/consolidated submission
 * @returns true if sections should be filtered by assigned indicators, false otherwise
 */
export function shouldFilterByAssignedIndicators(
  isStateApprover: boolean,
  isPreview: boolean,
  isNodalOfficerSubmission: boolean,
  isAggregateSubmission: boolean
): boolean {
  if (!isStateApprover) {
    return false; // Only STATE_APPROVERs filter by assigned indicators
  }
  
  // Don't filter if:
  // 1. Reviewing NODAL_OFFICER submission (not in preview mode)
  // 2. Viewing aggregate/consolidated form in preview mode
  if ((!isPreview && isNodalOfficerSubmission) || (isPreview && isAggregateSubmission)) {
    return false;
  }
  
  // Filter if:
  // 1. Creating own submission in preview mode (not aggregate)
  // 2. Reviewing another STATE_APPROVER's submission
  return true;
}

/**
 * Get all sections that exist in formData/state for a category
 * This ensures STATE_APPROVERs see all indicators when reviewing NODAL_OFFICER submissions
 * or viewing aggregate forms, even if getSectionsWithData doesn't detect them
 * @param category - The category name
 * @param formData - The form data object
 * @param state - The state object (optional, used as fallback)
 * @param submissionFormData - The submission formData (optional, used as fallback)
 * @returns Array of section keys that exist in the data
 */
export function getAllExistingSectionsForCategory(
  category: string,
  formData: any,
  state?: any,
  submissionFormData?: any
): string[] {
  const allPossibleSections = getAllSectionsForCategory(category);
  const categoryKey = category; // e.g., "infraEnablers"
  
  // Check formData first, then state, then submissionFormData
  const dataToCheck = formData || state || submissionFormData || {};
  const categoryData = dataToCheck[categoryKey] || {};
  
  return allPossibleSections.filter(sectionKey => {
    // Check if section key exists in category data (even if value is null, empty object, or empty array)
    return sectionKey in categoryData;
  });
}

/**
 * Check if a submission is an aggregate/consolidated submission
 * @param submission - The submission object
 * @returns true if it's an aggregate submission
 */
export function isAggregateSubmission(submission: any): boolean {
  if (!submission) return false;
  return (
    (submission.submissionId && submission.submissionId.startsWith("AGG-")) ||
    (submission.id && submission.id.startsWith("aggregate-"))
  );
}

/**
 * Check if a submission is from a NODAL_OFFICER
 * @param submission - The submission object
 * @returns true if the submission is from a NODAL_OFFICER
 */
export function isNodalOfficerSubmission(submission: any): boolean {
  if (!submission) return false;
  return submission.user?.role === "NODAL_OFFICER";
}

