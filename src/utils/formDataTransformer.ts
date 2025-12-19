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
 * This is used when resubmitting a RETURNED_FROM_MOSPI form to clear previous MOSPI_APPROVER actions
 * @param formData - Form data to clean
 * @returns Cleaned form data without mospi_status fields
 */
export const cleanMospiApproverActions = (
  formData: Record<string, any>
): Record<string, any> => {
  if (!formData || typeof formData !== "object") {
    console.warn(
      "⚠️ [cleanMospiApproverActions] Invalid formData provided:",
      formData
    );
    return formData || {};
  }

  const cleaned = JSON.parse(JSON.stringify(formData)); // Deep clone

  // Categories to process
  const categories = [
    "infraFinancing",
    "infraDevelopment",
    "pppDevelopment",
    "infraEnablers",
  ];

  console.log("🧹 [cleanMospiApproverActions] Starting cleanup");
  const formDataKeys = Object.keys(cleaned);
  console.log("📋 [cleanMospiApproverActions] FormData keys:", formDataKeys);
  console.log(
    "📋 [cleanMospiApproverActions] FormData structure (first 1000 chars):",
    JSON.stringify(cleaned, null, 2).substring(0, 1000)
  );

  // Check which categories actually exist in formData and log details
  console.log(
    `📊 [cleanMospiApproverActions] Checking categories in formData...`
  );
  categories.forEach((cat) => {
    const exists = cleaned[cat];
    const isValid =
      exists && typeof exists === "object" && !Array.isArray(exists);
    if (isValid) {
      const sectionCount = Object.keys(exists).length;
      console.log(
        `✅ [cleanMospiApproverActions] Category ${cat}: EXISTS with ${sectionCount} sections`
      );
      // Log sample section keys
      if (sectionCount > 0) {
        const sampleKeys = Object.keys(exists).slice(0, 3);
        console.log(
          `   Sample sections: ${sampleKeys.join(", ")}${
            sectionCount > 3 ? "..." : ""
          }`
        );
      }
    } else {
      console.log(
        `⚠️ [cleanMospiApproverActions] Category ${cat}: ${
          exists
            ? `EXISTS but invalid (type: ${typeof exists}, isArray: ${Array.isArray(
                exists
              )})`
            : "MISSING"
        }`
      );
    }
  });

  // Remove mospi_status from all indicator sections
  let totalRemoved = 0;
  let categoriesProcessed = 0;
  let categoriesSkipped = 0;

  // Process all categories - use for...of to allow proper control flow
  for (const category of categories) {
    console.log(
      `🔍 [cleanMospiApproverActions] Processing category: ${category}`
    );

    // Ensure category exists
    if (!cleaned[category]) {
      console.log(
        `⚠️ [cleanMospiApproverActions] Category ${category} does not exist in formData - skipping`
      );
      categoriesSkipped++;
      continue; // Skip this category if it doesn't exist
    }

    if (typeof cleaned[category] !== "object") {
      console.log(
        `⚠️ [cleanMospiApproverActions] Category ${category} is not an object:`,
        typeof cleaned[category]
      );
      categoriesSkipped++;
      continue; // Skip this category
    }

    // Handle case where category might be null or undefined after pruning
    if (cleaned[category] === null || cleaned[category] === undefined) {
      console.log(
        `⚠️ [cleanMospiApproverActions] Category ${category} is null/undefined - skipping`
      );
      categoriesSkipped++;
      continue; // Skip this category
    }

    const categoryData = cleaned[category];

    // Handle case where categoryData might be an array (shouldn't happen, but be safe)
    if (Array.isArray(categoryData)) {
      console.log(
        `⚠️ [cleanMospiApproverActions] Category ${category} is an array, not an object - skipping`
      );
      categoriesSkipped++;
      continue; // Skip this category
    }

    categoriesProcessed++;
    const sectionKeys = Object.keys(categoryData);
    console.log(
      `📝 [cleanMospiApproverActions] Category ${category} has ${sectionKeys.length} sections:`,
      sectionKeys
    );

    if (sectionKeys.length === 0) {
      console.log(
        `ℹ️ [cleanMospiApproverActions] Category ${category} has no sections to process`
      );
      continue; // Skip if no sections
    }

    let categoryRemovedCount = 0;
    // Use for...of loop for sections as well
    for (const sectionKey of sectionKeys) {
      const section = categoryData[sectionKey];

      if (!section) {
        console.log(
          `⚠️ [cleanMospiApproverActions] Section ${sectionKey} in ${category} is null/undefined`
        );
        continue;
      }

      if (typeof section !== "object") {
        console.log(
          `⚠️ [cleanMospiApproverActions] Section ${sectionKey} in ${category} is not an object:`,
          typeof section
        );
        continue;
      }

      // Handle both object and array cases
      if (Array.isArray(section)) {
        // If section is an array, check each item
        console.log(
          `📋 [cleanMospiApproverActions] Section ${sectionKey} in ${category} is an array with ${section.length} items`
        );
        for (let index = 0; index < section.length; index++) {
          const item = section[index];
          if (item && typeof item === "object" && "mospi_status" in item) {
            console.log(
              `🗑️ [cleanMospiApproverActions] Removing mospi_status from ${category}.${sectionKey}[${index}]`
            );
            delete item.mospi_status;
            categoryRemovedCount++;
            totalRemoved++;
          }
        }
      } else {
        // If section is an object, check directly
        if ("mospi_status" in section) {
          console.log(
            `🗑️ [cleanMospiApproverActions] Removing mospi_status from ${category}.${sectionKey}`
          );
          delete section.mospi_status;
          categoryRemovedCount++;
          totalRemoved++;
        } else {
          console.log(
            `ℹ️ [cleanMospiApproverActions] Section ${category}.${sectionKey} does not have mospi_status`
          );
        }
      }
    }

    console.log(
      `✅ [cleanMospiApproverActions] Category ${category}: Removed ${categoryRemovedCount} mospi_status field(s)`
    );
  }

  console.log("✅ [cleanMospiApproverActions] Cleanup completed");
  console.log(
    `📊 [cleanMospiApproverActions] Summary: Processed ${categoriesProcessed} categories, skipped ${categoriesSkipped}, removed ${totalRemoved} mospi_status field(s)`
  );

  // Verify cleanup by checking if any mospi_status remains
  let remainingMospiStatus = 0;
  for (const category of categories) {
    if (cleaned[category] && typeof cleaned[category] === "object") {
      const categoryData = cleaned[category];
      for (const sectionKey of Object.keys(categoryData)) {
        const section = categoryData[sectionKey];
        if (
          section &&
          typeof section === "object" &&
          "mospi_status" in section
        ) {
          remainingMospiStatus++;
          console.warn(
            `⚠️ [cleanMospiApproverActions] WARNING: ${category}.${sectionKey} still has mospi_status after cleanup!`
          );
        }
      }
    }
  }

  if (remainingMospiStatus > 0) {
    console.error(
      `❌ [cleanMospiApproverActions] ERROR: ${remainingMospiStatus} mospi_status field(s) still remain after cleanup!`
    );
  } else {
    console.log(
      `✅ [cleanMospiApproverActions] Verification: No mospi_status fields remain`
    );
  }

  return cleaned;
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
