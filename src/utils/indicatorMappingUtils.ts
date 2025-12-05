/**
 * Utility functions for building indicator-level mapping for consolidated submissions
 * This enables tracking which indicators came from which nodal officer submissions
 */

/**
 * Map section keys to indicator codes
 */
const SECTION_TO_INDICATOR_MAP: Record<string, string> = {
  section1_1: "1.1",
  section1_2: "1.2",
  section1_3: "1.3",
  section1_4: "1.4",
  section1_5: "1.5",
  section2_1: "2.1",
  section2_2: "2.2",
  section2_3: "2.3",
  section2_4: "2.4",
  section2_5: "2.5",
  section3_1: "3.1",
  section3_2: "3.2",
  section3_3: "3.3",
  section3_4: "3.4",
  section4_1: "4.1",
  section4_2: "4.2",
  section4_3: "4.3",
  section4_4: "4.4",
  section4_5: "4.5",
  section4_6: "4.6",
};

/**
 * All categories in the form
 */
const CATEGORIES = [
  "infraFinancing",
  "infraDevelopment",
  "pppDevelopment",
  "infraEnablers",
];

/**
 * Interface for indicator mapping entry
 */
export interface IndicatorMappingEntry {
  sourceSubmissionId: string;
  sourceNodalOfficerId: string;
  sourceNodalOfficerName: string;
  sourceNodalOfficerEmail?: string;
}

/**
 * Interface for indicator mapping structure
 * Key format: "{category}.{sectionKey}" (e.g., "infraFinancing.section1_4")
 */
export type IndicatorMapping = Record<string, IndicatorMappingEntry>;

/**
 * Check if a section has meaningful data
 */
function hasMeaningfulData(sectionData: unknown): boolean {
  if (!sectionData || typeof sectionData !== "object") {
    return false;
  }

  const keys = Object.keys(sectionData);
  if (keys.length === 0) {
    return false;
  }

  // Check if any field has non-empty value (excluding metadata fields)
  const excludeKeys = ["_source", "_metadata", "status", "marksObtained", "proportion", "percentage"];
  const hasData = keys.some((key) => {
    if (excludeKeys.includes(key)) return false;
    
    const value = sectionData[key];

    // Handle arrays
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    // Handle objects
    if (typeof value === "object" && value !== null) {
      return Object.keys(value).some((subKey) => {
        if (excludeKeys.includes(subKey)) return false;
        const subValue = value[subKey];
        return subValue !== null && subValue !== undefined && subValue !== "";
      });
    }

    // Handle primitives
    return value !== null && value !== undefined && value !== "";
  });

  return hasData;
}

/**
 * Build indicator-level mapping from source submissions
 * This function analyzes each source submission and maps which indicators came from which submission
 * 
 * @param sourceSubmissions - Array of source submissions (nodal officer submissions)
 * @param consolidatedFormData - The consolidated formData to map indicators from
 * @returns Indicator mapping object with keys like "infraFinancing.section1_4"
 */
export function buildIndicatorMapping(
  sourceSubmissions: any[],
  consolidatedFormData: any
): IndicatorMapping {
  const mapping: IndicatorMapping = {};

  if (!sourceSubmissions || sourceSubmissions.length === 0) {
    console.warn("⚠️ [buildIndicatorMapping] No source submissions provided");
    return mapping;
  }

  if (!consolidatedFormData || typeof consolidatedFormData !== "object") {
    console.warn("⚠️ [buildIndicatorMapping] No consolidated formData provided");
    return mapping;
  }

  console.log("🔍 [buildIndicatorMapping] Building indicator mapping...");
  console.log("🔍 [buildIndicatorMapping] Source submissions count:", sourceSubmissions.length);
  console.log("🔍 [buildIndicatorMapping] Consolidated formData categories:", Object.keys(consolidatedFormData));

  // Iterate through each category in consolidated formData
  CATEGORIES.forEach((category) => {
    const categoryData = consolidatedFormData[category];
    if (!categoryData || typeof categoryData !== "object") {
      return;
    }

    // Iterate through each section in the category
    Object.keys(categoryData).forEach((sectionKey) => {
      // Skip metadata and non-section keys
      if (sectionKey.startsWith("_") || !sectionKey.startsWith("section")) {
        return;
      }

      const sectionData = categoryData[sectionKey];
      if (!sectionData || !hasMeaningfulData(sectionData)) {
        return;
      }

      const mappingKey = `${category}.${sectionKey}`;
      const indicatorCode = SECTION_TO_INDICATOR_MAP[sectionKey];

      console.log(`🔍 [buildIndicatorMapping] Processing ${mappingKey} (indicator: ${indicatorCode})`);

      // Find which source submission contains this indicator
      let foundSource: any = null;

      for (const sourceSubmission of sourceSubmissions) {
        const sourceFormData = sourceSubmission.formData || sourceSubmission.form_data || {};
        const sourceCategoryData = sourceFormData[category];

        if (!sourceCategoryData || typeof sourceCategoryData !== "object") {
          continue;
        }

        const sourceSectionData = sourceCategoryData[sectionKey];

        // Check if this source submission has this section with meaningful data
        if (sourceSectionData && hasMeaningfulData(sourceSectionData)) {
          // Check if the data matches (simple comparison - could be enhanced)
          // For now, if the section exists in source, we consider it as the source
          foundSource = sourceSubmission;
          console.log(`✅ [buildIndicatorMapping] Found source for ${mappingKey}: ${sourceSubmission.submissionId || sourceSubmission.id}`);
          break;
        }
      }

      // If we found a source, add it to the mapping
      if (foundSource) {
        const sourceUser = foundSource.user || {};
        const sourceSubmittedBy = foundSource.submittedBy;

        mapping[mappingKey] = {
          sourceSubmissionId: foundSource.submissionId || foundSource.id || "",
          sourceNodalOfficerId: sourceUser.id || sourceSubmittedBy || "",
          sourceNodalOfficerName: 
            sourceUser.firstName && sourceUser.lastName
              ? `${sourceUser.firstName} ${sourceUser.lastName}`.trim()
              : sourceUser.email || sourceUser.name || "Unknown Nodal Officer",
          sourceNodalOfficerEmail: sourceUser.email || undefined,
        };

        console.log(`✅ [buildIndicatorMapping] Mapped ${mappingKey} to:`, mapping[mappingKey]);
      } else {
        console.warn(`⚠️ [buildIndicatorMapping] No source found for ${mappingKey} - may be from state approver's own data`);
      }
    });
  });

  console.log("✅ [buildIndicatorMapping] Mapping complete. Total indicators mapped:", Object.keys(mapping).length);
  console.log("📋 [buildIndicatorMapping] Mapping keys:", Object.keys(mapping));

  return mapping;
}

/**
 * Get indicator mapping for a specific indicator path
 * @param mapping - The indicator mapping object
 * @param category - Category name (e.g., "infraFinancing")
 * @param sectionKey - Section key (e.g., "section1_4")
 * @returns Mapping entry if found, null otherwise
 */
export function getIndicatorMapping(
  mapping: IndicatorMapping,
  category: string,
  sectionKey: string
): IndicatorMappingEntry | null {
  const mappingKey = `${category}.${sectionKey}`;
  return mapping[mappingKey] || null;
}

/**
 * Get all indicators mapped to a specific source submission
 * @param mapping - The indicator mapping object
 * @param sourceSubmissionId - Source submission ID to filter by
 * @returns Array of indicator paths (e.g., ["infraFinancing.section1_4", "infraFinancing.section1_5"])
 */
export function getIndicatorsBySourceSubmission(
  mapping: IndicatorMapping,
  sourceSubmissionId: string
): string[] {
  return Object.entries(mapping)
    .filter(([_, entry]) => entry.sourceSubmissionId === sourceSubmissionId)
    .map(([key, _]) => key);
}

/**
 * Get all indicators mapped to a specific nodal officer
 * @param mapping - The indicator mapping object
 * @param nodalOfficerId - Nodal officer user ID to filter by
 * @returns Array of indicator paths
 */
export function getIndicatorsByNodalOfficer(
  mapping: IndicatorMapping,
  nodalOfficerId: string
): string[] {
  return Object.entries(mapping)
    .filter(([_, entry]) => entry.sourceNodalOfficerId === nodalOfficerId)
    .map(([key, _]) => key);
}

/**
 * Extract indicator mapping from a consolidated submission
 * @param submission - The submission object (consolidated submission)
 * @returns Indicator mapping if found, null otherwise
 */
export function getIndicatorMappingFromSubmission(submission: any): IndicatorMapping | null {
  if (!submission) {
    return null;
  }

  const formData = submission.formData || submission.form_data || {};
  const metadata = formData._metadata;

  if (!metadata || !metadata.isConsolidated) {
    return null;
  }

  return metadata.indicatorMapping || null;
}

/**
 * Check if a submission is consolidated and has indicator mapping
 * @param submission - The submission object
 * @returns true if submission is consolidated and has mapping
 */
export function hasIndicatorMapping(submission: any): boolean {
  const mapping = getIndicatorMappingFromSubmission(submission);
  return mapping !== null && Object.keys(mapping).length > 0;
}

/**
 * Get source information for a specific indicator in a consolidated submission
 * @param submission - The consolidated submission
 * @param category - Category name (e.g., "infraFinancing")
 * @param sectionKey - Section key (e.g., "section1_4")
 * @returns Mapping entry if found, null otherwise
 */
export function getIndicatorSource(
  submission: any,
  category: string,
  sectionKey: string
): IndicatorMappingEntry | null {
  const mapping = getIndicatorMappingFromSubmission(submission);
  if (!mapping) {
    return null;
  }

  return getIndicatorMapping(mapping, category, sectionKey);
}

/**
 * Get summary of indicator sources for a consolidated submission
 * @param submission - The consolidated submission
 * @returns Object with summary information about sources
 */
export function getIndicatorMappingSummary(submission: any): {
  totalIndicators: number;
  uniqueNodalOfficers: number;
  nodalOfficerBreakdown: Array<{
    nodalOfficerId: string;
    nodalOfficerName: string;
    indicatorCount: number;
    indicators: string[];
  }>;
} | null {
  const mapping = getIndicatorMappingFromSubmission(submission);
  if (!mapping) {
    return null;
  }

  const totalIndicators = Object.keys(mapping).length;
  const nodalOfficerMap = new Map<string, {
    nodalOfficerId: string;
    nodalOfficerName: string;
    indicators: string[];
  }>();

  Object.entries(mapping).forEach(([indicatorPath, entry]) => {
    const key = entry.sourceNodalOfficerId;
    if (!nodalOfficerMap.has(key)) {
      nodalOfficerMap.set(key, {
        nodalOfficerId: entry.sourceNodalOfficerId,
        nodalOfficerName: entry.sourceNodalOfficerName,
        indicators: [],
      });
    }
    nodalOfficerMap.get(key)!.indicators.push(indicatorPath);
  });

  const nodalOfficerBreakdown = Array.from(nodalOfficerMap.values()).map(no => ({
    ...no,
    indicatorCount: no.indicators.length,
  }));

  return {
    totalIndicators,
    uniqueNodalOfficers: nodalOfficerMap.size,
    nodalOfficerBreakdown,
  };
}

