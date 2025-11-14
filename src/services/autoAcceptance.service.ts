/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auto-Acceptance Service for STATE_APPROVER Submissions
 *
 * This service handles automatic acceptance of indicators when STATE_APPROVER
 * submits their own form for indicators left at STATE_APPROVER level.
 *
 * Flow:
 * 1. STATE_APPROVER submits form with indicators from availableIndicators
 * 2. After successful submission, auto-accept those indicators
 * 3. Indicators will show as accepted when viewing submissions
 */

import { apiService } from "./api.service";

/**
 * Maps indicator codes to their category and section
 * Format: indicator code (e.g., "1.1") -> { category: "infraFinancing", section: "section1_1" }
 */
const INDICATOR_TO_CATEGORY_MAP: Record<
  string,
  { category: string; section: string }
> = {
  // Infrastructure Financing (1.1 - 1.5)
  "1.1": { category: "infraFinancing", section: "section1_1" },
  "1.2": { category: "infraFinancing", section: "section1_2" },
  "1.3": { category: "infraFinancing", section: "section1_3" },
  "1.4": { category: "infraFinancing", section: "section1_4" },
  "1.5": { category: "infraFinancing", section: "section1_5" },

  // Infrastructure Development (2.1 - 2.5)
  "2.1": { category: "infraDevelopment", section: "section2_1" },
  "2.2": { category: "infraDevelopment", section: "section2_2" },
  "2.3": { category: "infraDevelopment", section: "section2_3" },
  "2.4": { category: "infraDevelopment", section: "section2_4" },
  "2.5": { category: "infraDevelopment", section: "section2_5" },

  // PPP Development (3.1 - 3.4)
  "3.1": { category: "pppDevelopment", section: "section3_1" },
  "3.2": { category: "pppDevelopment", section: "section3_2" },
  "3.3": { category: "pppDevelopment", section: "section3_3" },
  "3.4": { category: "pppDevelopment", section: "section3_4" },

  // Infrastructure Enablers (4.1 - 4.6)
  "4.1": { category: "infraEnablers", section: "section4_1" },
  "4.2": { category: "infraEnablers", section: "section4_2" },
  "4.3": { category: "infraEnablers", section: "section4_3" },
  "4.4": { category: "infraEnablers", section: "section4_4" },
  "4.5": { category: "infraEnablers", section: "section4_5" },
  "4.6": { category: "infraEnablers", section: "section4_6" },
};

/**
 * Maps form fields to indicator codes
 * Used to identify which indicators are present in the submitted form data
 */
const FIELD_TO_INDICATOR_MAP: Record<string, string> = {
  capexToGsdpRatio: "1.1",
  capexUtilization: "1.2",
  creditRatedULBs: "1.3",
  ulbsIssuingBonds: "1.4",
  functionalFinancialIntermediary: "1.5",
  infrastructureActPolicy: "2.1",
  specializedEntity: "2.2",
  sectorInfraPlan: "2.3",
  investmentReadyPipeline: "2.4",
  assetMonetizationPipeline: "2.5",
  pppActPolicy: "3.1",
  pppCell: "3.2",
  vgfIipdfProposals: "3.3",
  pppBankableProjects: "3.4",
  pmgPortalEligible: "4.1",
  statePmgPortal: "4.2",
  pmGatiShaktiAdoption: "4.3",
  adrAdoption: "4.4",
  innovativePractices: "4.5",
  capacityBuilding: "4.6",
};

/**
 * Map section keys (e.g., "section1_1") to indicator codes (e.g., "1.1")
 */
const SECTION_KEY_TO_INDICATOR_MAP: Record<string, string> = {
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
 * Check if a section has meaningful data
 */
function hasMeaningfulData(value: any): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  // Check for empty arrays
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // Check for empty objects
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return false;
    }
    // Check if object has at least one non-empty value
    return keys.some((key) => {
      const val = value[key];
      if (val === null || val === undefined || val === "") {
        return false;
      }
      if (Array.isArray(val)) {
        return val.length > 0;
      }
      if (typeof val === "object") {
        return Object.keys(val).length > 0;
      }
      return true;
    });
  }

  return true;
}

/**
 * Extract indicator codes from form data
 * Identifies which indicators have data in the submitted form
 * Form data structure: { infraFinancing: { section1_1: {...}, ... }, ... }
 */
function extractIndicatorsFromFormData(
  formData: Record<string, any>
): string[] {
  const indicators: string[] = [];

  console.log("🔍 [AutoAccept] Extracting indicators from form data...");
  console.log("📋 [AutoAccept] Form data keys:", Object.keys(formData));
  console.log(
    "📋 [AutoAccept] Form data structure:",
    JSON.stringify(formData, null, 2).substring(0, 500)
  );

  // Check nested sections (infraFinancing, infraDevelopment, etc.)
  const categoryKeys = [
    "infraFinancing",
    "infraDevelopment",
    "pppDevelopment",
    "infraEnablers",
  ];

  for (const categoryKey of categoryKeys) {
    if (formData[categoryKey] && typeof formData[categoryKey] === "object") {
      const categoryData = formData[categoryKey];
      console.log(`  🔍 Checking category: ${categoryKey}`);
      console.log(`  📋 Category keys:`, Object.keys(categoryData));

      // Check each section within the category (e.g., section1_1, section2_1)
      for (const sectionKey of Object.keys(categoryData)) {
        const indicatorCode = SECTION_KEY_TO_INDICATOR_MAP[sectionKey];

        if (indicatorCode) {
          const sectionData = categoryData[sectionKey];

          console.log(
            `    🔍 Checking section: ${sectionKey} (indicator: ${indicatorCode})`
          );
          console.log(`    📦 Section data:`, sectionData);

          if (hasMeaningfulData(sectionData)) {
            if (!indicators.includes(indicatorCode)) {
              indicators.push(indicatorCode);
              console.log(
                `    ✅ Found indicator ${indicatorCode} from ${categoryKey}.${sectionKey}`
              );
            }
          } else {
            console.log(`    ⚠️ Section ${sectionKey} has no meaningful data`);
          }
        } else {
          // Also check for direct field names (fallback for different form structures)
          const indicatorCodeFromField = FIELD_TO_INDICATOR_MAP[sectionKey];
          if (indicatorCodeFromField) {
            const fieldValue = categoryData[sectionKey];
            if (
              hasMeaningfulData(fieldValue) &&
              !indicators.includes(indicatorCodeFromField)
            ) {
              indicators.push(indicatorCodeFromField);
              console.log(
                `    ✅ Found indicator ${indicatorCodeFromField} from ${categoryKey}.${sectionKey} (field name)`
              );
            }
          }
        }
      }
    }
  }

  // Also check root level fields (for backward compatibility)
  for (const fieldName of Object.keys(formData)) {
    const indicatorCode = FIELD_TO_INDICATOR_MAP[fieldName];
    if (indicatorCode && !indicators.includes(indicatorCode)) {
      const fieldValue = formData[fieldName];
      if (hasMeaningfulData(fieldValue)) {
        indicators.push(indicatorCode);
        console.log(
          `  ✅ Found indicator ${indicatorCode} from root field: ${fieldName}`
        );
      }
    }
  }

  console.log(
    `📊 [AutoAccept] Total indicators found in form data: ${indicators.length}`
  );
  console.log(`📋 [AutoAccept] Indicators:`, indicators);

  return indicators;
}

/**
 * Filter indicators to only include those that STATE_APPROVER has access to
 * (i.e., indicators from availableIndicators list)
 */
function filterStateApproverIndicators(
  indicators: string[],
  availableIndicators: string[]
): string[] {
  const filtered = indicators.filter((ind) =>
    availableIndicators.includes(ind)
  );

  console.log("🔍 [AutoAccept] Filtering indicators for STATE_APPROVER...");
  console.log(`  📋 All indicators in form: ${indicators.length}`, indicators);
  console.log(
    `  📋 Available indicators (STATE_APPROVER): ${availableIndicators.length}`,
    availableIndicators
  );
  console.log(
    `  ✅ Filtered indicators to accept: ${filtered.length}`,
    filtered
  );

  return filtered;
}

/**
 * Accept a single indicator
 */
async function acceptIndicator(
  submissionId: string,
  indicatorCode: string
): Promise<void> {
  const mapping = INDICATOR_TO_CATEGORY_MAP[indicatorCode];

  if (!mapping) {
    console.error(
      `❌ [AutoAccept] No mapping found for indicator: ${indicatorCode}`
    );
    throw new Error(`Unknown indicator code: ${indicatorCode}`);
  }

  const payload = {
    submissionId,
    category: mapping.category,
    section: mapping.section,
    status: true, // true = accept
  };

  console.log(`🔄 [AutoAccept] Accepting indicator ${indicatorCode}...`);
  console.log(`  📦 Payload:`, payload);

  try {
    await apiService.indicatorStatus(payload);
    console.log(
      `  ✅ Successfully accepted indicator ${indicatorCode} (${mapping.category}/${mapping.section})`
    );
  } catch (error: any) {
    console.error(`  ❌ Failed to accept indicator ${indicatorCode}:`, error);
    throw error;
  }
}

/**
 * Main function: Auto-accept indicators for STATE_APPROVER submission
 *
 * @param submissionId - The ID of the submission that was just created
 * @param formData - The form data that was submitted
 * @param availableIndicators - List of indicator codes that STATE_APPROVER has access to
 * @returns Promise that resolves when all indicators are accepted
 */
export async function autoAcceptStateApproverIndicators(
  submissionId: string,
  formData: Record<string, any>,
  availableIndicators: string[]
): Promise<void> {
  console.group("🚀 [AutoAccept] Starting auto-acceptance process...");
  console.log(`📝 Submission ID: ${submissionId}`);
  console.log(`👤 Role: STATE_APPROVER`);
  console.log(
    `📋 Available indicators: ${availableIndicators.length}`,
    availableIndicators
  );

  try {
    // Step 1: Extract indicators from form data
    const allIndicators = extractIndicatorsFromFormData(formData);

    if (allIndicators.length === 0) {
      console.warn(
        "⚠️ [AutoAccept] No indicators found in form data. Skipping auto-acceptance."
      );
      console.groupEnd();
      return;
    }

    // Step 2: Filter to only STATE_APPROVER indicators
    const indicatorsToAccept = filterStateApproverIndicators(
      allIndicators,
      availableIndicators
    );

    if (indicatorsToAccept.length === 0) {
      console.log(
        "ℹ️ [AutoAccept] No STATE_APPROVER indicators found in submission. Skipping auto-acceptance."
      );
      console.groupEnd();
      return;
    }

    // Step 3: Accept each indicator sequentially
    console.log(
      `\n🔄 [AutoAccept] Accepting ${indicatorsToAccept.length} indicator(s)...`
    );

    const results: Array<{ indicator: string; success: boolean; error?: any }> =
      [];

    for (const indicatorCode of indicatorsToAccept) {
      try {
        await acceptIndicator(submissionId, indicatorCode);
        results.push({ indicator: indicatorCode, success: true });
      } catch (error: any) {
        console.error(
          `❌ [AutoAccept] Failed to accept indicator ${indicatorCode}:`,
          error
        );
        results.push({ indicator: indicatorCode, success: false, error });
        // Continue with other indicators even if one fails
      }
    }

    // Step 4: Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 [AutoAccept] Auto-acceptance summary:`);
    console.log(
      `  ✅ Successfully accepted: ${successful}/${indicatorsToAccept.length}`
    );
    console.log(`  ❌ Failed: ${failed}/${indicatorsToAccept.length}`);

    if (failed > 0) {
      console.warn(
        `⚠️ [AutoAccept] Some indicators failed to accept. Check logs above for details.`
      );
      const failedIndicators = results
        .filter((r) => !r.success)
        .map((r) => r.indicator);
      console.warn(`  Failed indicators:`, failedIndicators);
    }

    console.groupEnd();

    // If all failed, throw an error
    if (successful === 0 && indicatorsToAccept.length > 0) {
      throw new Error(
        `Failed to accept any indicators. Check logs for details.`
      );
    }
  } catch (error: any) {
    console.error("❌ [AutoAccept] Auto-acceptance process failed:", error);
    console.groupEnd();
    throw error;
  }
}

/**
 * Helper function to extract submission UUID (id) from API response
 * Backend expects UUID 'id' field, not 'submissionId' string
 * Handles different response formats
 */
export function extractSubmissionId(response: any): string | null {
  if (!response) {
    console.warn(
      "⚠️ [AutoAccept] No response provided to extract submission ID"
    );
    return null;
  }

  // Log full response structure for debugging
  console.log("🔍 [AutoAccept] Full response structure:", {
    hasData: !!response.data,
    dataKeys: response.data ? Object.keys(response.data) : [],
    hasDataData: !!response.data?.data,
    dataDataKeys: response.data?.data ? Object.keys(response.data.data) : [],
  });

  // Priority order: UUID 'id' field first (backend expects UUID), then fallback to submissionId
  // Backend repository uses: findOne({ where: { id: submissionId } })
  // So we need the UUID 'id' field, not the string 'submissionId'
  const possiblePaths = [
    response.data?.id, // UUID id field (preferred - backend expects this)
    response.data?.data?.id, // Nested UUID id field
    response.id, // Direct UUID id field
    response.data?.submissionId, // Fallback to submissionId string if UUID not found
    response.data?.data?.submissionId, // Nested submissionId
    response.submissionId, // Direct submissionId
  ];

  for (const id of possiblePaths) {
    if (id && typeof id === "string") {
      // Check if it's a UUID format (basic check: contains hyphens and is 36 chars)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id
        );

      if (isUUID) {
        console.log(`✅ [AutoAccept] Found UUID submission ID: ${id}`);
        return id;
      } else if (id.startsWith("SUB-")) {
        // If we only have submissionId string, log warning but still try to use it
        console.warn(
          `⚠️ [AutoAccept] Found submissionId string (${id}) instead of UUID. Backend may reject this.`
        );
        console.log(
          `📋 [AutoAccept] Full response:`,
          JSON.stringify(response, null, 2).substring(0, 1000)
        );
        // Don't return non-UUID, let it continue searching
      }
    }
  }

  console.warn(
    "⚠️ [AutoAccept] Could not extract UUID submission ID from response"
  );
  console.warn(
    "📋 [AutoAccept] Response structure:",
    JSON.stringify(response, null, 2).substring(0, 1000)
  );
  return null;
}
