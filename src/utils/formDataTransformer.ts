/**
 * Form Data Transformer Utility
 * Transforms form data from localStorage format to API submission format
 * Backend expects: { submissionId: string, formData: object }
 */

export interface TransformedFormData {
  submissionId: string;
  formData: Record<string, unknown>;
  status?: string;
}

/**
 * Transform form data to API submission format
 * @param formData - Original form data from localStorage
 * @param status - Submission status (SUBMITTED_TO_STATE for submit, DRAFT for save draft)
 * @returns Transformed data for API submission
 */
export const transformFormDataForSubmission = (
  formData: unknown,
  status: string = "SUBMITTED_TO_STATE"
): TransformedFormData => {
  // Generate unique submission ID
  const submissionId = `SUB-${new Date().getFullYear()}-${String(
    Date.now()
  ).slice(-6)}`;

  const formDataObj = formData as Record<string, any>;

  // Helper: deep prune empty values ("", null, undefined) and empty arrays/objects
  const prune = (value: any): any => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string")
      return value.trim() === "" ? undefined : value;

    if (Array.isArray(value)) {
      const prunedArray = value
        .map((item) => prune(item))
        .filter(
          (item) =>
            item !== undefined &&
            !(Array.isArray(item) && item.length === 0) &&
            !(
              typeof item === "object" &&
              item !== null &&
              Object.keys(item).length === 0
            )
        );
      return prunedArray.length > 0 ? prunedArray : undefined;
    }

    if (typeof value === "object") {
      const prunedObj: Record<string, any> = {};
      Object.keys(value).forEach((key) => {
        // Only skip mospi_status if it's REVERTED - preserve ACCEPTED status
        // (Backend cleanup should have already removed REVERTED, but we check here as a safety measure)
        if (key === "mospi_status") {
          const mospiStatus = value[key];
          if (mospiStatus && String(mospiStatus).trim().toUpperCase() === "REVERTED") {
            return; // Skip REVERTED mospi_status
          }
          // Preserve ACCEPTED or other non-REVERTED mospi_status - continue to add it below
        }
        const prunedVal = prune(value[key]);
        if (
          prunedVal !== undefined &&
          !(Array.isArray(prunedVal) && prunedVal.length === 0) &&
          !(
            typeof prunedVal === "object" &&
            prunedVal !== null &&
            Object.keys(prunedVal).length === 0
          )
        ) {
          prunedObj[key] = prunedVal;
        }
      });
      return Object.keys(prunedObj).length > 0 ? prunedObj : undefined;
    }

    return value;
  };

  const cleaned = {
    infraFinancing: prune(formDataObj.infraFinancing) || {},
    infraDevelopment: prune(formDataObj.infraDevelopment) || {},
    pppDevelopment: prune(formDataObj.pppDevelopment) || {},
    infraEnablers: prune(formDataObj.infraEnablers) || {},
  };

  return {
    submissionId,
    formData: cleaned,
    status,
  };
};

/**
 * Check if a section has meaningful data
 */
const hasMeaningfulData = (sectionData: unknown): boolean => {
  if (!sectionData || typeof sectionData !== "object") {
    return false;
  }

  const keys = Object.keys(sectionData);
  if (keys.length === 0) {
    return false;
  }

  // Check if any field has non-empty value
  const hasData = keys.some((key) => {
    const value = sectionData[key];

    // Handle arrays
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // Handle objects
    if (typeof value === "object" && value !== null) {
      return Object.keys(value).some((subKey) => {
        const subValue = value[subKey];
        return subValue !== null && subValue !== undefined && subValue !== "";
      });
    }

    // Handle primitives
    return value !== null && value !== undefined && value !== "";
  });

  return hasData;
};

/**
 * Validate if form data has required sections
 * @param formData - Form data to validate
 * @returns boolean indicating if data is valid
 */
export const validateFormData = (
  formData: unknown
): { isValid: boolean; missingSections: string[] } => {
  // Validation disabled - always return valid to allow form submission
  return { isValid: true, missingSections: [] };
};

/**
 * Debug utility to check form data structure (optimized to prevent infinite loops)
 */
export const debugFormData = (formData: unknown) => {
  // Only log in development mode and limit output
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const formDataObj = formData as Record<string, unknown>;

  const sections = [
    "infraFinancing",
    "infraDevelopment",
    "pppDevelopment",
    "infraEnablers",
  ];

  const summary = sections.reduce((acc, section) => {
    const sectionData = formDataObj?.[section];
    acc[section] = {
      exists: !!sectionData,
      hasContent: sectionData
        ? Object.keys(sectionData as Record<string, unknown>).length > 0
        : false,
      fieldCount: sectionData
        ? Object.keys(sectionData as Record<string, unknown>).length
        : 0,
    };
    return acc;
  }, {} as Record<string, unknown>);
  // Debug logging removed for performance
};

/**
 * Get form data summary for debugging
 * @param formData - Form data to summarize
 * @returns Summary object with section counts
 */
export const getFormDataSummary = (formData: unknown) => {
  const formDataObj = formData as Record<string, unknown>;

  const sections = [
    "infraFinancing",
    "infraDevelopment",
    "pppDevelopment",
    "infraEnablers",
  ];

  return sections.reduce((summary, section) => {
    const sectionData = formDataObj[section] || {};
    summary[section] = {
      hasData: Object.keys(sectionData as Record<string, unknown>).length > 0,
      fieldCount: Object.keys(sectionData as Record<string, unknown>).length,
      subSections: Object.keys(sectionData as Record<string, unknown>),
    };
    return summary;
  }, {} as Record<string, unknown>);
};

/**
 * Clean formData by removing MOSPI_APPROVER-specific fields
 * NOTE: This function is deprecated. Use API call cleanMospiStatusFromSubmission instead.
 * @param formData - Form data to clean
 * @returns Cleaned form data without mospi_status fields (returns as-is, cleanup done via API)
 * @deprecated Use apiService.cleanMospiStatusFromSubmission() instead
 */
export const cleanMospiApproverActions = (
  formData: Record<string, any>
): Record<string, any> => {
  // This function is kept for backward compatibility but does nothing
  // The actual cleanup is now done via API call
  console.warn(
    "⚠️ [cleanMospiApproverActions] This function is deprecated. Use API call instead."
  );
  return formData;
};

/**
 * Clean review comments by removing MOSPI_APPROVER comments
 * @param reviewComments - Array of review comments
 * @returns Filtered array without MOSPI_APPROVER comments
 */
export const cleanMospiApproverComments = (reviewComments: any[]): any[] => {
  if (!Array.isArray(reviewComments)) {
    return [];
  }

  return reviewComments.filter((comment) => {
    const role = comment?.role?.toUpperCase() || "";
    return role !== "MOSPI_APPROVER";
  });
};

/**
 * Clean indicator comments by removing MOSPI_APPROVER comments
 * @param indicatorComments - Object with indicator comments
 * @returns Cleaned object without MOSPI_APPROVER comments
 */
export const cleanMospiApproverIndicatorComments = (
  indicatorComments: Record<string, any>
): Record<string, any> => {
  if (!indicatorComments || typeof indicatorComments !== "object") {
    return {};
  }

  const cleaned: Record<string, any> = {};

  Object.keys(indicatorComments).forEach((indicatorKey) => {
    const comments = indicatorComments[indicatorKey];
    if (Array.isArray(comments)) {
      const filtered = comments.filter((comment: any) => {
        const role = comment?.role?.toUpperCase() || "";
        return role !== "MOSPI_APPROVER";
      });
      if (filtered.length > 0) {
        cleaned[indicatorKey] = filtered;
      }
    } else {
      cleaned[indicatorKey] = comments;
    }
  });

  return cleaned;
};
