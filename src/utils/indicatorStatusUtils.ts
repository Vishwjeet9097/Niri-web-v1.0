/**
 * Utility functions for checking indicator acceptance status
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * All possible section keys mapped to their indicator codes
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
 * Check if a section has been accepted
 */
function isSectionAccepted(
  formData: Record<string, any>,
  category: string,
  section: string
): boolean {
  try {
    const categoryData = formData[category];
    if (!categoryData || typeof categoryData !== "object") {
      return false;
    }

    const sectionData = categoryData[section];
    if (!sectionData) {
      return false;
    }

    // Check if section has status field
    if (sectionData.status === "ACCEPTED") {
      return true;
    }

    // For array sections, check if status is set on the array itself
    if (
      Array.isArray(sectionData) &&
      (sectionData as any).status === "ACCEPTED"
    ) {
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error checking section ${category}.${section}:`, error);
    return false;
  }
}

/**
 * Get all indicators present in the form data
 */
function getIndicatorsInFormData(formData: Record<string, any>): string[] {
  const indicators: string[] = [];

  for (const category of CATEGORIES) {
    const categoryData = formData[category];
    if (!categoryData || typeof categoryData !== "object") {
      continue;
    }

    for (const sectionKey of Object.keys(categoryData)) {
      const indicatorCode = SECTION_TO_INDICATOR_MAP[sectionKey];
      if (indicatorCode) {
        // Check if section has meaningful data (not just empty object)
        const sectionData = categoryData[sectionKey];
        const hasData =
          sectionData &&
          typeof sectionData === "object" &&
          Object.keys(sectionData).length > 0;

        if (hasData && !indicators.includes(indicatorCode)) {
          indicators.push(indicatorCode);
        }
      }
    }
  }

  return indicators;
}

/**
 * Check if all indicators in a submission are accepted
 * @param submission - The submission object with formData
 * @returns true if all indicators are accepted, false otherwise
 */
export function areAllIndicatorsAccepted(
  submission: Record<string, any> | undefined
): boolean {
  console.group("🔍 [indicatorStatusUtils] areAllIndicatorsAccepted");

  if (!submission) {
    console.log("❌ No submission provided");
    console.groupEnd();
    return false;
  }

  const formData = submission.formData;
  if (!formData || typeof formData !== "object") {
    console.log("❌ No formData or formData is not an object");
    console.groupEnd();
    return false;
  }

  // Get all indicators present in the form
  const indicators = getIndicatorsInFormData(formData);
  console.log("📋 Indicators found in form:", indicators);

  if (indicators.length === 0) {
    // No indicators found, can't determine acceptance status
    console.log("⚠️ No indicators found, can't determine acceptance status");
    console.groupEnd();
    return false;
  }

  const acceptanceStatus: Record<string, boolean> = {};

  // Check each indicator
  for (const indicatorCode of indicators) {
    // Map indicator code to category and section
    const [sectionNum, indicatorNum] = indicatorCode.split(".");
    const categoryMap: Record<string, string> = {
      "1": "infraFinancing",
      "2": "infraDevelopment",
      "3": "pppDevelopment",
      "4": "infraEnablers",
    };

    const category = categoryMap[sectionNum];
    const section = `section${sectionNum}_${indicatorNum}`;

    if (!category || !section) {
      console.warn(
        `⚠️ Could not map indicator ${indicatorCode} to category/section`
      );
      continue;
    }

    // Check if this indicator is accepted
    const isAccepted = isSectionAccepted(formData, category, section);
    acceptanceStatus[indicatorCode] = isAccepted;
    console.log(
      `  ${indicatorCode} (${category}.${section}): ${
        isAccepted ? "✅ ACCEPTED" : "❌ NOT ACCEPTED"
      }`
    );

    if (!isAccepted) {
      console.log(
        `❌ Indicator ${indicatorCode} is not accepted. Returning false.`
      );
      console.groupEnd();
      return false;
    }
  }

  console.log("✅ All indicators are accepted:", acceptanceStatus);
  console.groupEnd();
  return true;
}

/**
 * Check if submission is from NODAL_OFFICER
 * @param submission - The submission object
 * @returns true if submission is from NODAL_OFFICER
 */
export function isSubmissionFromNodalOfficer(
  submission: Record<string, any> | undefined
): boolean {
  console.group("🔍 [indicatorStatusUtils] isSubmissionFromNodalOfficer");

  if (!submission) {
    console.log("❌ No submission provided");
    console.groupEnd();
    return false;
  }

  // Check user role
  const userRole = submission.user?.role;
  console.log("👤 User role:", userRole);
  if (userRole === "NODAL_OFFICER") {
    console.log("✅ Submission is from NODAL_OFFICER (via user.role)");
    console.groupEnd();
    return true;
  }

  // Check currentOwnerRole
  const currentOwnerRole = submission.currentOwnerRole;
  console.log("👤 Current owner role:", currentOwnerRole);
  if (currentOwnerRole === "NODAL_OFFICER") {
    console.log("✅ Submission is from NODAL_OFFICER (via currentOwnerRole)");
    console.groupEnd();
    return true;
  }

  // Check submittedBy field (if it contains user info)
  // This is a fallback check
  console.log("❌ Submission is not from NODAL_OFFICER");
  console.groupEnd();
  return false;
}

/**
 * Check if all indicators in a submission have mospi_status = "ACCEPTED" or "APPROVED" (case-insensitive)
 * This is used by MOSPI_APPROVER to determine if they can final submit
 * @param submission - The submission object with formData
 * @returns true if all indicators have mospi_status accepted, false otherwise
 */
export function areAllIndicatorsMospiAccepted(
  submission: Record<string, any> | undefined
): boolean {
  console.group("🔍 [indicatorStatusUtils] areAllIndicatorsMospiAccepted");

  if (!submission) {
    console.log("❌ No submission provided");
    console.groupEnd();
    return false;
  }

  const formData = submission.formData;
  if (!formData || typeof formData !== "object") {
    console.log("❌ No formData or formData is not an object");
    console.groupEnd();
    return false;
  }

  // Get all indicators present in the form
  const indicators = getIndicatorsInFormData(formData);
  console.log("📋 Indicators found in form:", indicators);

  if (indicators.length === 0) {
    console.log("⚠️ No indicators found, can't determine acceptance status");
    console.groupEnd();
    return false;
  }

  const acceptanceStatus: Record<string, boolean> = {};

  // Check each indicator
  for (const indicatorCode of indicators) {
    // Map indicator code to category and section
    const [sectionNum, indicatorNum] = indicatorCode.split(".");
    const categoryMap: Record<string, string> = {
      "1": "infraFinancing",
      "2": "infraDevelopment",
      "3": "pppDevelopment",
      "4": "infraEnablers",
    };

    const category = categoryMap[sectionNum];
    const section = `section${sectionNum}_${indicatorNum}`;

    if (!category || !section) {
      console.warn(
        `⚠️ Could not map indicator ${indicatorCode} to category/section`
      );
      continue;
    }

    // Get category and section data
    const categoryData = formData[category];
    if (!categoryData || typeof categoryData !== "object") {
      console.log(
        `❌ Indicator ${indicatorCode}: No category data found. Returning false.`
      );
      console.groupEnd();
      return false;
    }

    const sectionData = categoryData[section];
    if (!sectionData) {
      console.log(
        `❌ Indicator ${indicatorCode}: No section data found. Returning false.`
      );
      console.groupEnd();
      return false;
    }

    // Check mospi_status field (case-insensitive)
    const mospiStatus = sectionData.mospi_status;
    if (!mospiStatus) {
      console.log(
        `❌ Indicator ${indicatorCode}: No mospi_status found. Returning false.`
      );
      console.groupEnd();
      return false;
    }

    const normalizedStatus = String(mospiStatus).trim().toUpperCase();
    const isAccepted = normalizedStatus === "ACCEPTED" || normalizedStatus === "APPROVED";
    acceptanceStatus[indicatorCode] = isAccepted;

    console.log(
      `  ${indicatorCode} (${category}.${section}): mospi_status = "${mospiStatus}" → ${
        isAccepted ? "✅ ACCEPTED" : "❌ NOT ACCEPTED"
      }`
    );

    if (!isAccepted) {
      console.log(
        `❌ Indicator ${indicatorCode} mospi_status is not ACCEPTED or APPROVED. Returning false.`
      );
      console.groupEnd();
      return false;
    }
  }

  console.log("✅ All indicators have mospi_status ACCEPTED or APPROVED:", acceptanceStatus);
  console.groupEnd();
  return true;
}

/**
 * Submission Status Types
 */
export type SubmissionStatusType = 
  | "READY_FOR_CONSOLIDATION" 
  | "UNDER_REVIEW" 
  | "CONSOLIDATED" 
  | "PENDING" 
  | "UNKNOWN";

/**
 * Detailed status information for a submission
 */
export interface SubmissionStatusInfo {
  status: SubmissionStatusType;
  progress: number; // 0-100
  totalIndicators: number;
  acceptedIndicators: number;
  pendingIndicators: number;
  canConsolidate: boolean;
  isConsolidated: boolean;
  consolidatedInto?: string;
  consolidatedAt?: string;
  indicatorBreakdown: {
    indicatorCode: string;
    status: string;
    isAccepted: boolean;
  }[];
}

/**
 * Get all indicators from formData with their status
 */
function getAllIndicatorsWithStatus(formData: Record<string, any>): Array<{
  indicatorCode: string;
  category: string;
  section: string;
  status: string;
  isAccepted: boolean;
}> {
  const indicators: Array<{
    indicatorCode: string;
    category: string;
    section: string;
    status: string;
    isAccepted: boolean;
  }> = [];

  for (const category of CATEGORIES) {
    const categoryData = formData[category];
    if (!categoryData || typeof categoryData !== "object") {
      continue;
    }

    for (const sectionKey of Object.keys(categoryData)) {
      const indicatorCode = SECTION_TO_INDICATOR_MAP[sectionKey];
      if (!indicatorCode) {
        continue;
      }

      const sectionData = categoryData[sectionKey];
      if (!sectionData) {
        continue;
      }

      // Get status from section data
      const status = sectionData.status || "PENDING";
      const isAccepted = status === "ACCEPTED";

      indicators.push({
        indicatorCode,
        category,
        section: sectionKey,
        status,
        isAccepted,
      });
    }
  }

  return indicators;
}

/**
 * Calculate submission-level status based on indicator acceptance
 * @param submission - The submission object with formData
 * @returns Detailed status information
 */
export function getSubmissionStatus(
  submission: Record<string, any> | undefined
): SubmissionStatusInfo {
  const defaultStatus: SubmissionStatusInfo = {
    status: "UNKNOWN",
    progress: 0,
    totalIndicators: 0,
    acceptedIndicators: 0,
    pendingIndicators: 0,
    canConsolidate: false,
    isConsolidated: false,
    indicatorBreakdown: [],
  };

  if (!submission) {
    return defaultStatus;
  }

  const formData = submission.formData;
  if (!formData || typeof formData !== "object") {
    return defaultStatus;
  }

  // Check if submission is consolidated
  const consolidationInfo = formData._consolidation;
  const isConsolidated = !!consolidationInfo?.consolidatedInto;

  // Get all indicators with their status
  const indicators = getAllIndicatorsWithStatus(formData);

  if (indicators.length === 0) {
    return {
      ...defaultStatus,
      status: "PENDING",
    };
  }

  // Calculate statistics
  const totalIndicators = indicators.length;
  const acceptedIndicators = indicators.filter((ind) => ind.isAccepted).length;
  const pendingIndicators = totalIndicators - acceptedIndicators;
  const progress = totalIndicators > 0 ? (acceptedIndicators / totalIndicators) * 100 : 0;

  // Determine status
  let status: SubmissionStatusType;
  if (isConsolidated) {
    status = "CONSOLIDATED";
  } else if (acceptedIndicators === totalIndicators && totalIndicators > 0) {
    status = "READY_FOR_CONSOLIDATION";
  } else if (acceptedIndicators > 0) {
    status = "UNDER_REVIEW";
  } else {
    status = "PENDING";
  }

  return {
    status,
    progress: Math.round(progress),
    totalIndicators,
    acceptedIndicators,
    pendingIndicators,
    canConsolidate: status === "READY_FOR_CONSOLIDATION",
    isConsolidated,
    consolidatedInto: consolidationInfo?.consolidatedInto,
    consolidatedAt: consolidationInfo?.consolidatedAt,
    indicatorBreakdown: indicators.map((ind) => ({
      indicatorCode: ind.indicatorCode,
      status: ind.status,
      isAccepted: ind.isAccepted,
    })),
  };
}

/**
 * Check if submission is consolidated
 * @param submission - The submission object
 * @returns true if submission is consolidated, false otherwise
 */
export function isSubmissionConsolidated(
  submission: Record<string, any> | undefined
): boolean {
  if (!submission) {
    return false;
  }

  const formData = submission.formData;
  if (!formData || typeof formData !== "object") {
    return false;
  }

  // Check consolidation metadata
  const consolidationInfo = formData._consolidation;
  if (consolidationInfo?.consolidatedInto) {
    return true;
  }

  // Check metadata flag (primary way to identify consolidated submissions)
  const metadata = formData._metadata;
  if (metadata?.isConsolidated) {
    return true;
  }

  return false;
}

/**
 * Get consolidation information from a submission
 * @param submission - The submission object
 * @returns Consolidation info or null
 */
export function getConsolidationInfo(
  submission: Record<string, any> | undefined
): {
  consolidatedInto?: string;
  consolidatedAt?: string;
  consolidatedBy?: string;
} | null {
  if (!submission) {
    return null;
  }

  const formData = submission.formData;
  if (!formData || typeof formData !== "object") {
    return null;
  }

  const consolidationInfo = formData._consolidation;
  if (consolidationInfo) {
    return {
      consolidatedInto: consolidationInfo.consolidatedInto,
      consolidatedAt: consolidationInfo.consolidatedAt,
      consolidatedBy: consolidationInfo.consolidatedBy,
    };
  }

  return null;
}

/**
 * Get source submission IDs from a consolidated submission
 * @param submission - The consolidated submission object
 * @returns Array of source submission IDs
 */
export function getSourceSubmissionIds(
  submission: Record<string, any> | undefined
): string[] {
  if (!submission) {
    return [];
  }

  const formData = submission.formData;
  if (!formData || typeof formData !== "object") {
    return [];
  }

  const metadata = formData._metadata;
  if (metadata?.isConsolidated && metadata?.sourceSubmissionIds) {
    return metadata.sourceSubmissionIds;
  }

  return [];
}

/**
 * Check if submission is a consolidated submission (not a source)
 * @param submission - The submission object
 * @returns true if this is a consolidated submission, false if it's a source
 */
export function isConsolidatedSubmission(
  submission: Record<string, any> | undefined
): boolean {
  if (!submission) {
    return false;
  }

  // Check metadata flag (primary way to identify consolidated submissions)
  const formData = submission.formData || submission.form_data || {};
  const metadata = formData._metadata;
  if (metadata?.isConsolidated) {
    return true;
  }

  return false;
}