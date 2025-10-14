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

  const formDataObj = formData as Record<string, unknown>;

  return {
    submissionId,
    formData: {
      infraFinancing: formDataObj.infraFinancing || {},
      infraDevelopment: formDataObj.infraDevelopment || {},
      pppDevelopment: formDataObj.pppDevelopment || {},
      infraEnablers: formDataObj.infraEnablers || {},
    },
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
  const requiredSections = [
    "infraFinancing",
    "infraDevelopment",
    "pppDevelopment",
    "infraEnablers",
  ];

  const formDataObj = formData as Record<string, unknown>;

  const validationResults = requiredSections.map((section) => {
    const hasSection = formDataObj && formDataObj[section];
    const hasData = hasSection
      ? hasMeaningfulData(formDataObj[section])
      : false;

    return { section, hasData };
  });

  const missingSections = validationResults
    .filter((result) => !result.hasData)
    .map((result) => result.section);

  const isValid = missingSections.length === 0;

  return { isValid, missingSections };
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

  console.log("🔍 Form Data Summary:", summary);
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
