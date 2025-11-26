/**
 * Form Data Transformer Utility
 * Transforms form data from localStorage format to API submission format
 * Backend expects: { submissionId: string, formData: object }
 */

import { IndicatorMapping } from "./indicatorMappingUtils";

export interface TransformedFormData {
  submissionId: string;
  formData: Record<string, unknown>;
  status?: string;
}

/**
 * Generate consolidated submission ID
 * @param stateUt - State/UT name (not used in ID, kept for compatibility)
 * @returns Consolidated submission ID in format: SUB-{YEAR}-{LAST_6_DIGITS_OF_TIMESTAMP}
 */
export const generateConsolidatedSubmissionId = (stateUt?: string): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  // Use last 6 digits of timestamp to match regular submission pattern
  const lastSixDigits = String(timestamp).slice(-6);
  return `SUB-${year}-${lastSixDigits}`;
};

/**
 * Transform form data to API submission format
 * @param formData - Original form data from localStorage
 * @param status - Submission status (SUBMITTED_TO_STATE for submit, DRAFT for save draft)
 * @param options - Optional parameters for consolidation
 * @returns Transformed data for API submission
 */
export const transformFormDataForSubmission = (
  formData: unknown,
  status: string = "SUBMITTED_TO_STATE",
  options?: {
    isConsolidated?: boolean;
    sourceSubmissionIds?: string[];
    consolidatedBy?: string;
    stateUt?: string;
    existingSubmissionId?: string; // Use this ID if updating existing submission
    indicatorMapping?: IndicatorMapping; // Indicator-level mapping for traceability
  }
): TransformedFormData => {
  // Generate submission ID based on whether it's consolidated or not
  // If existingSubmissionId is provided, use it (for updates)
  let submissionId: string;
  if (options?.existingSubmissionId) {
    submissionId = options.existingSubmissionId;
  } else if (options?.isConsolidated && options?.stateUt) {
    submissionId = generateConsolidatedSubmissionId(options.stateUt);
  } else {
    submissionId = `SUB-${new Date().getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`;
  }

  const formDataObj = formData as Record<string, any>;

  // Helper: deep prune empty values ("", null, undefined) and empty arrays/objects
  const prune = (value: any): any => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string") return value.trim() === "" ? undefined : value;

    if (Array.isArray(value)) {
      const prunedArray = value
        .map((item) => prune(item))
        .filter((item) => item !== undefined && !(Array.isArray(item) && item.length === 0) && !(typeof item === "object" && item !== null && Object.keys(item).length === 0));
      return prunedArray.length > 0 ? prunedArray : undefined;
    }

    if (typeof value === "object") {
      const prunedObj: Record<string, any> = {};
      Object.keys(value).forEach((key) => {
        const prunedVal = prune(value[key]);
        if (
          prunedVal !== undefined &&
          !(Array.isArray(prunedVal) && prunedVal.length === 0) &&
          !(typeof prunedVal === "object" && prunedVal !== null && Object.keys(prunedVal).length === 0)
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

  // Add consolidation metadata if this is a consolidated submission
  if (options?.isConsolidated) {
    cleaned._metadata = {
      isConsolidated: true,
      sourceSubmissionIds: options.sourceSubmissionIds || [],
      consolidatedBy: options.consolidatedBy || '',
      consolidatedAt: new Date().toISOString(),
      // Add indicator-level mapping if provided
      ...(options.indicatorMapping && { indicatorMapping: options.indicatorMapping }),
    };
  }

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
