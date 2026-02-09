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
      console.log(
        `⚠️ [isSectionAccepted] ${category}.${section}: No category data or not an object`
      );
      return false;
    }

    const sectionData = categoryData[section];
    if (!sectionData) {
      console.log(
        `⚠️ [isSectionAccepted] ${category}.${section}: Section data not found. Available sections:`,
        Object.keys(categoryData)
      );
      return false;
    }

    // Debug: Log section data structure
    console.log(
      `🔍 [isSectionAccepted] ${category}.${section}: Section data keys:`,
      Object.keys(sectionData),
      `status: ${sectionData.status}`,
      `mospi_status: ${sectionData.mospi_status}`
    );

    // Check if section has status field (normalize for comparison)
    const statusValue = sectionData.status
      ? String(sectionData.status).trim().toUpperCase()
      : null;

    if (statusValue === "ACCEPTED" || statusValue === "APPROVED") {
      console.log(
        `✅ [isSectionAccepted] ${category}.${section}: Found status = "${sectionData.status}" (normalized: "${statusValue}")`
      );
      return true;
    }

    // For array sections, check if status is set on the array itself
    if (Array.isArray(sectionData)) {
      const arrayStatus = (sectionData as any).status
        ? String((sectionData as any).status)
            .trim()
            .toUpperCase()
        : null;
      if (arrayStatus === "ACCEPTED" || arrayStatus === "APPROVED") {
        console.log(
          `✅ [isSectionAccepted] ${category}.${section}: Found status = "${
            (sectionData as any).status
          }" (normalized: "${arrayStatus}") on array`
        );
        return true;
      }
    }

    console.log(
      `❌ [isSectionAccepted] ${category}.${section}: status is not "ACCEPTED" or "APPROVED". Actual value: "${sectionData.status}" (normalized: "${statusValue}")`
    );
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

/** Section statuses that count as "submitted" by nodal (submitted to state, resubmitted, or accepted) */
const SUBMITTED_SECTION_STATUSES = [
  "SUBMITTED_TO_STATE",
  "RESUBMITTED",
  "ACCEPTED",
  "APPROVED",
];

const CATEGORY_MAP: Record<string, string> = {
  "1": "infraFinancing",
  "2": "infraDevelopment",
  "3": "pppDevelopment",
  "4": "infraEnablers",
};

/**
 * Check if all indicators in a submission have been submitted (by nodal officer).
 * When submission.indicators (assigned indicators) is present, only those are checked.
 * Otherwise falls back to all indicators present in formData.
 * @param submission - The submission object with formData and optionally indicators[]
 * @returns true if every assigned indicator (or every indicator in formData) has a submitted status
 */
export function areAllIndicatorsSubmitted(
  submission: Record<string, any> | undefined
): boolean {
  if (!submission) return false;

  const formData = submission.formData || submission;
  if (!formData || typeof formData !== "object") return false;

  const assignedIndicators =
    Array.isArray(submission.indicators)
      ? submission.indicators
      : Array.isArray((formData as any).indicators)
        ? (formData as any).indicators
        : null;
  const indicators: string[] =
    assignedIndicators && assignedIndicators.length > 0
      ? assignedIndicators.map((c: any) => String(c).trim()).filter(Boolean)
      : getIndicatorsInFormData(formData);

  if (indicators.length === 0) {
    console.log("[areAllIndicatorsSubmitted] No indicators to check → false");
    return false;
  }

  console.log("[areAllIndicatorsSubmitted] Checking indicators:", {
    source: assignedIndicators?.length ? "submission.indicators" : "formData",
    indicators,
  });

  for (const indicatorCode of indicators) {
    const [sectionNum, indicatorNum] = indicatorCode.split(".");
    const category = CATEGORY_MAP[sectionNum];
    const section = `section${sectionNum}_${indicatorNum}`;
    if (!category || !section) continue;

    const categoryData = formData[category];
    if (!categoryData || typeof categoryData !== "object") return false;

    const sectionData = categoryData[section];
    if (!sectionData || typeof sectionData !== "object") return false;

    const status = Array.isArray(sectionData)
      ? (sectionData as any)[0]?.status
      : sectionData?.status;
    const statusStr = status ? String(status).trim().toUpperCase() : "";
    if (!SUBMITTED_SECTION_STATUSES.includes(statusStr)) {
      console.log("[areAllIndicatorsSubmitted] → false (indicator not submitted):", indicatorCode, "status:", statusStr);
      return false;
    }
  }

  console.log("[areAllIndicatorsSubmitted] → true (all submitted)");
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
 * Check if submission is from STATE_APPROVER
 * @param submission - The submission object
 * @returns true if submission is from STATE_APPROVER
 */
export function isSubmissionFromStateApprover(
  submission: Record<string, any> | undefined
): boolean {
  console.group("🔍 [indicatorStatusUtils] isSubmissionFromStateApprover");

  if (!submission) {
    console.log("❌ No submission provided");
    console.groupEnd();
    return false;
  }

  // Check user role
  const userRole = submission.user?.role;
  console.log("👤 User role:", userRole);
  if (userRole === "STATE_APPROVER") {
    console.log("✅ Submission is from STATE_APPROVER (via user.role)");
    console.groupEnd();
    return true;
  }

  // Check currentOwnerRole
  const currentOwnerRole = submission.currentOwnerRole;
  console.log("👤 Current owner role:", currentOwnerRole);
  if (currentOwnerRole === "STATE_APPROVER") {
    console.log("✅ Submission is from STATE_APPROVER (via currentOwnerRole)");
    console.groupEnd();
    return true;
  }

  console.log("❌ Submission is not from STATE_APPROVER");
  console.groupEnd();
  return false;
}

/**
 * Check if a specific indicator was originally submitted by a NODAL_OFFICER
 * This checks the section's status in formData to determine if it was submitted by NODAL_OFFICER
 * @param submission - The submission object
 * @param sectionId - The section ID (e.g., "1.1", "2.3")
 * @returns true if the indicator was originally submitted by NODAL_OFFICER
 */
export function isIndicatorFromNodalOfficer(
  submission: Record<string, any> | undefined,
  sectionId: string
): boolean {
  console.group(
    `🔍 [indicatorStatusUtils] isIndicatorFromNodalOfficer for section ${sectionId}`
  );

  if (!submission) {
    console.log("❌ No submission provided");
    console.groupEnd();
    return false;
  }

  // Map section ID to section key (e.g., "1.1" -> "section1_1")
  const sectionKey = `section${sectionId.replace(".", "_")}`;

  // Check formData structure - it can be nested by category or flat
  const formData = submission.formData || submission.normalizedFormData;
  if (!formData) {
    console.log("❌ No formData found");
    console.groupEnd();
    return false;
  }

  // Helper function to find section data in nested structure
  const findSectionData = (data: any): any => {
    if (!data || typeof data !== "object") return null;

    // Check if section exists directly
    if (data[sectionKey]) {
      return data[sectionKey];
    }

    // Check in category objects (infraFinancing, infraDevelopment, etc.)
    const categories = [
      "infraFinancing",
      "infraDevelopment",
      "pppDevelopment",
      "infraEnablers",
    ];
    for (const category of categories) {
      if (data[category] && data[category][sectionKey]) {
        return data[category][sectionKey];
      }
    }

    // Recursively check nested objects
    for (const key in data) {
      const value = data[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const found = findSectionData(value);
        if (found) return found;
      }
    }

    return null;
  };

  const sectionData = findSectionData(formData);
  if (!sectionData) {
    console.log(`❌ Section ${sectionKey} not found in formData`);
    console.log(`📋 Available formData keys:`, Object.keys(formData || {}));
    console.log(
      `📋 Searching in categories: infraFinancing, infraDevelopment, pppDevelopment, infraEnablers`
    );
    console.groupEnd();
    return false;
  }

  console.log(`📦 Found section data for ${sectionKey}:`, {
    isArray: Array.isArray(sectionData),
    dataType: Array.isArray(sectionData) ? "array" : typeof sectionData,
    keys: Array.isArray(sectionData)
      ? Object.keys(sectionData[0] || {}).slice(0, 10)
      : Object.keys(sectionData || {}).slice(0, 10),
    fullData: Array.isArray(sectionData) ? sectionData[0] : sectionData,
  });

  // First, check if there's a nodalOfficerId field stored in the section (most reliable)
  const nodalOfficerId = Array.isArray(sectionData)
    ? sectionData[0]?.nodalOfficerId
    : sectionData?.nodalOfficerId;

  console.log(`🔑 nodalOfficerId check:`, {
    found: !!nodalOfficerId,
    value: nodalOfficerId,
    extractionMethod: Array.isArray(sectionData)
      ? "array[0].nodalOfficerId"
      : "sectionData.nodalOfficerId",
  });

  if (nodalOfficerId) {
    console.log(
      `✅ Indicator ${sectionId} was originally submitted by NODAL_OFFICER (nodalOfficerId: ${nodalOfficerId})`
    );
    console.groupEnd();
    return true;
  }

  // Check if the submission itself was submitted by STATE_APPROVER
  // If the submission was submitted by STATE_APPROVER, we should NOT use the fallback status check
  // because STATE_APPROVER also uses SUBMITTED_TO_STATE status
  const submissionSubmittedBy =
    submission.submittedBy || submission.submitted_by;
  const submissionUserRole = submission.user?.role;
  const submissionCurrentOwnerRole = submission.currentOwnerRole;
  const isSubmissionFromStateApprover =
    submissionUserRole === "STATE_APPROVER" ||
    submissionCurrentOwnerRole === "STATE_APPROVER" ||
    (submissionSubmittedBy &&
      // If we can't determine from role, check if submittedBy matches a STATE_APPROVER pattern
      // This is a heuristic - in practice, you might want to check the user's role from the ID
      submission.status === "RETURNED_FROM_MOSPI" &&
      submissionCurrentOwnerRole === "STATE_APPROVER");

  console.log(`👤 Submission origin check:`, {
    submissionSubmittedBy,
    submissionUserRole,
    submissionCurrentOwnerRole,
    submissionStatus: submission.status,
    isSubmissionFromStateApprover,
  });

  // Fallback: Check if section has status "SUBMITTED_TO_STATE" (for backward compatibility with old data)
  // BUT: Only use this fallback if the submission was NOT submitted by STATE_APPROVER
  // because STATE_APPROVER also uses SUBMITTED_TO_STATE status
  const status = Array.isArray(sectionData)
    ? sectionData[0]?.status
    : sectionData?.status;

  console.log(`📊 Section ${sectionKey} status:`, status);

  // If submission is from STATE_APPROVER, don't use status fallback - only trust nodalOfficerId
  if (isSubmissionFromStateApprover) {
    console.log(
      `⚠️ Submission is from STATE_APPROVER - NOT using status fallback (unreliable)`
    );
    console.log(
      `❌ Indicator ${sectionId} was NOT originally submitted by NODAL_OFFICER (no nodalOfficerId and submission is from STATE_APPROVER)`
    );
    console.log(`📋 Reasons:`, {
      noNodalOfficerId: !nodalOfficerId,
      isSubmissionFromStateApprover: true,
      status,
    });
    console.groupEnd();
    return false;
  }

  console.log(
    `⚠️ No nodalOfficerId found for section ${sectionKey}, falling back to status check (less reliable)`
  );
  console.log(
    `⚠️ WARNING: Status check is unreliable - STATE_APPROVER also uses SUBMITTED_TO_STATE status`
  );

  // Only use status check if we don't have nodalOfficerId AND submission is not from STATE_APPROVER
  // This helps with existing data that doesn't have nodalOfficerId yet
  if (status === "SUBMITTED_TO_STATE") {
    console.log(
      `✅ Indicator ${sectionId} was likely originally submitted by NODAL_OFFICER (status: SUBMITTED_TO_STATE, but no nodalOfficerId - using fallback)`
    );
    console.log(
      `⚠️ WARNING: This is a fallback check and may be incorrect if STATE_APPROVER also submitted with SUBMITTED_TO_STATE status`
    );
    console.groupEnd();
    return true;
  }

  console.log(
    `❌ Indicator ${sectionId} was not originally submitted by NODAL_OFFICER`
  );
  console.log(`📋 Reasons:`, {
    noNodalOfficerId: !nodalOfficerId,
    status,
    statusMatches: status === "SUBMITTED_TO_STATE",
  });
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
        `❌ Indicator ${indicatorCode}: No section data found. Category: ${category}, Section: ${section}`
      );
      console.groupEnd();
      return false;
    }

    // Handle different section data structures:
    // 1. Object with mospi_status directly (e.g., { mospi_status: "ACCEPTED", ... })
    // 2. Object with nested array (e.g., { infraActArray: [...], mospi_status: "ACCEPTED" })
    // 3. Array format (legacy - should have mospi_status on the object itself)
    // 4. Object with status field (STATE_APPROVER acceptance - fallback to status if mospi_status not found)
    let mospiStatus: string | undefined;

    if (typeof sectionData === "object" && !Array.isArray(sectionData)) {
      // Check for mospi_status directly on the section object
      mospiStatus = sectionData.mospi_status;

      // If mospi_status is not found, check status field as fallback
      // This handles cases where STATE_APPROVER accepted but MOSPI hasn't reviewed yet
      if (!mospiStatus && sectionData.status) {
        const statusValue = String(sectionData.status).trim().toUpperCase();
        if (statusValue === "ACCEPTED" || statusValue === "APPROVED") {
          mospiStatus = sectionData.status;
          console.log(
            `ℹ️ Indicator ${indicatorCode}: Using status field as fallback (${sectionData.status}) since mospi_status not found`
          );
        }
      }

      // Debug: Log the section data structure for troubleshooting
      if (!mospiStatus) {
        console.log(
          `⚠️ Indicator ${indicatorCode}: Section data exists but no mospi_status or valid status. Keys:`,
          Object.keys(sectionData).slice(0, 10),
          `Type: ${typeof sectionData}, IsArray: ${Array.isArray(sectionData)}`
        );
      }
    } else if (Array.isArray(sectionData)) {
      // For array format, check if mospi_status is on the array object itself
      // (some legacy data might have it this way)
      mospiStatus = (sectionData as any).mospi_status;

      // Fallback to status if mospi_status not found
      if (!mospiStatus && (sectionData as any).status) {
        const statusValue = String((sectionData as any).status)
          .trim()
          .toUpperCase();
        if (statusValue === "ACCEPTED" || statusValue === "APPROVED") {
          mospiStatus = (sectionData as any).status;
          console.log(
            `ℹ️ Indicator ${indicatorCode}: Using status field as fallback (${
              (sectionData as any).status
            }) since mospi_status not found`
          );
        }
      }

      if (!mospiStatus) {
        console.log(
          `⚠️ Indicator ${indicatorCode}: Section data is an array but no mospi_status or valid status found. Array length: ${sectionData.length}`
        );
      }
    }

    if (!mospiStatus) {
      console.log(
        `❌ Indicator ${indicatorCode}: No mospi_status or valid status found. Section data structure:`,
        Array.isArray(sectionData) ? "Array" : typeof sectionData,
        `Keys: ${Object.keys(sectionData || {})
          .slice(0, 10)
          .join(", ")}`,
        `Full section data:`,
        JSON.stringify(sectionData, null, 2).substring(0, 200)
      );
      console.groupEnd();
      return false;
    }

    const normalizedStatus = String(mospiStatus).trim().toUpperCase();
    const isAccepted =
      normalizedStatus === "ACCEPTED" || normalizedStatus === "APPROVED";
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

  console.log(
    "✅ All indicators have mospi_status ACCEPTED or APPROVED:",
    acceptanceStatus
  );
  console.groupEnd();
  return true;
}

/**
 * Check if any indicator in a submission has mospi_status = "REVERTED"
 * This is used by MOSPI_APPROVER to determine if they can send back the submission
 * @param submission - The submission object with formData
 * @returns true if at least one indicator has mospi_status REVERTED, false otherwise
 */
export function hasAnyIndicatorMospiReverted(
  submission: Record<string, any> | undefined
): boolean {
  console.group("🔍 [indicatorStatusUtils] hasAnyIndicatorMospiReverted");

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
    console.log("⚠️ No indicators found, can't determine reverted status");
    console.groupEnd();
    return false;
  }

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
      continue;
    }

    const sectionData = categoryData[section];
    if (!sectionData) {
      continue;
    }

    // Handle different section data structures (same as areAllIndicatorsMospiAccepted)
    let mospiStatus: string | undefined;

    if (typeof sectionData === "object" && !Array.isArray(sectionData)) {
      // Check for mospi_status directly on the section object
      mospiStatus = sectionData.mospi_status;
    } else if (Array.isArray(sectionData) && sectionData.length > 0) {
      // For array format, check if mospi_status is on the array object itself
      mospiStatus = (sectionData as any).mospi_status;
    }

    if (!mospiStatus) {
      continue;
    }

    const normalizedStatus = String(mospiStatus).trim().toUpperCase();
    const isReverted = normalizedStatus === "REVERTED";

    if (isReverted) {
      console.log(
        `✅ Indicator ${indicatorCode} (${category}.${section}): mospi_status = "${mospiStatus}" → REVERTED`
      );
      console.log("✅ Found at least one REVERTED indicator. Returning true.");
      console.groupEnd();
      return true;
    }

    console.log(
      `  ${indicatorCode} (${category}.${section}): mospi_status = "${mospiStatus}" → NOT REVERTED`
    );
  }

  console.log("❌ No indicators have mospi_status REVERTED");
  console.groupEnd();
  return false;
}

/**
 * Expected total number of indicators (19)
 */
const EXPECTED_INDICATOR_COUNT = 19;

/**
 * All expected indicator codes (19 indicators)
 */
const ALL_INDICATOR_CODES = [
  "1.1",
  "1.2",
  "1.3",
  "1.4",
  "1.5", // Infra Financing (5)
  "2.1",
  "2.2",
  "2.3",
  "2.4",
  "2.5", // Infra Development (5)
  "3.1",
  "3.2",
  "3.3",
  "3.4", // PPP Development (4)
  "4.1",
  "4.2",
  "4.3",
  "4.4",
  "4.5", // Infra Enablers (5)
];

/**
 * Check if all 19 indicators have some action (either ACCEPTED or REVERTED)
 * @param submission - The submission object with formData
 * @returns true if all 19 indicators have mospi_status set to either ACCEPTED or REVERTED
 */
export function areAllIndicatorsActioned(
  submission: Record<string, any> | undefined
): boolean {
  console.group("🔍 [indicatorStatusUtils] areAllIndicatorsActioned");

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

  let actionedCount = 0;

  // Check each of the 19 expected indicators
  for (const indicatorCode of ALL_INDICATOR_CODES) {
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
      console.log(`❌ Indicator ${indicatorCode}: No category data found.`);
      console.groupEnd();
      return false;
    }

    const sectionData = categoryData[section];
    if (!sectionData) {
      console.log(`❌ Indicator ${indicatorCode}: No section data found.`);
      console.groupEnd();
      return false;
    }

    // Handle different section data structures
    let mospiStatus: string | undefined;

    if (typeof sectionData === "object" && !Array.isArray(sectionData)) {
      mospiStatus = sectionData.mospi_status;
    } else if (Array.isArray(sectionData)) {
      mospiStatus = (sectionData as any).mospi_status;
    }

    if (!mospiStatus) {
      console.log(`❌ Indicator ${indicatorCode}: No mospi_status found.`);
      console.groupEnd();
      return false;
    }

    const normalizedStatus = String(mospiStatus).trim().toUpperCase();
    const isActioned =
      normalizedStatus === "ACCEPTED" ||
      normalizedStatus === "APPROVED" ||
      normalizedStatus === "REVERTED";

    if (isActioned) {
      actionedCount++;
      console.log(
        `  ${indicatorCode}: mospi_status = "${mospiStatus}" → ✅ ACTIONED`
      );
    } else {
      console.log(
        `❌ Indicator ${indicatorCode}: mospi_status = "${mospiStatus}" is not ACCEPTED or REVERTED.`
      );
      console.groupEnd();
      return false;
    }
  }

  const allActioned = actionedCount === EXPECTED_INDICATOR_COUNT;
  console.log(
    `✅ Actioned indicators: ${actionedCount}/${EXPECTED_INDICATOR_COUNT}. All actioned: ${allActioned}`
  );
  console.groupEnd();
  return allActioned;
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
  const progress =
    totalIndicators > 0 ? (acceptedIndicators / totalIndicators) * 100 : 0;

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
