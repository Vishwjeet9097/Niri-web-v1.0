/* eslint-disable @typescript-eslint/no-explicit-any */
/*
  Shared utilities to compute dynamic section completion and step progress.
  These functions are intentionally liberal in determining whether a section
  is "filled": if the section object/array contains any non-empty value, it is
  considered filled. This keeps UI progress responsive without coupling to
  strict validation.
*/
import { apiService } from "@/services/api.service";
import { ALL_INDICATOR_CODES } from "@/hooks/useIndicatorAccess";

export type StepKey =
  | "infraFinancing"
  | "infraDevelopment"
  | "pppDevelopment"
  | "infraEnablers";

// Map each step to its section keys and indicator codes
const STEP_SECTIONS: Record<
  StepKey,
  { sectionKey: string; indicator: string }[]
> = {
  infraFinancing: [
    { sectionKey: "section1_1", indicator: "1.1" },
    { sectionKey: "section1_2", indicator: "1.2" },
    { sectionKey: "section1_3", indicator: "1.3" },
    { sectionKey: "section1_4", indicator: "1.4" },
    { sectionKey: "section1_5", indicator: "1.5" },
  ],
  infraDevelopment: [
    { sectionKey: "section2_1", indicator: "2.1" },
    { sectionKey: "section2_2", indicator: "2.2" },
    { sectionKey: "section2_3", indicator: "2.3" },
    { sectionKey: "section2_4", indicator: "2.4" },
    { sectionKey: "section2_5", indicator: "2.5" },
  ],
  pppDevelopment: [
    { sectionKey: "section3_1", indicator: "3.1" },
    { sectionKey: "section3_2", indicator: "3.2" },
    { sectionKey: "section3_3", indicator: "3.3" },
    { sectionKey: "section3_4", indicator: "3.4" },
  ],
  infraEnablers: [
    { sectionKey: "section4_1", indicator: "4.1" },
    { sectionKey: "section4_2", indicator: "4.2" },
    { sectionKey: "section4_3", indicator: "4.3" },
    { sectionKey: "section4_4", indicator: "4.4" },
    { sectionKey: "section4_5", indicator: "4.5" },
  ],
};

// Strict rules: per-section completion checks
type SectionCheck = (data: unknown) => boolean;
const anyValid = (
  arr: unknown,
  predicate: (row: Record<string, unknown>) => boolean
) =>
  Array.isArray(arr) &&
  arr.some((r) => predicate(r as Record<string, unknown>));
const REQUIRED_SECTION_CHECKS: Partial<Record<string, SectionCheck>> = {
  // 1.x Infra Financing
  section1_1: (data) => {
    const d = data as Record<string, unknown>;
    return (
      hasMeaningfulValue(d?.year) &&
      hasMeaningfulValue(d?.capitalAllocation) &&
      hasMeaningfulValue(d?.gsdpForFY)
    );
  },
  section1_2: (data) => {
    const d = data as Record<string, unknown>;
    return (
      hasMeaningfulValue(d?.year) &&
      hasMeaningfulValue(d?.actualCapex) &&
      hasMeaningfulValue(d?.stateCapexUtilisation)
    );
  },
  section1_3: (data: any) =>
    Array.isArray(data?.ulbList) &&
    anyValid(
      data.ulbList,
      (r) =>
        hasMeaningfulValue(r.cityName) &&
        hasMeaningfulValue(r.ulb) &&
        hasMeaningfulValue(r.ratingDate) &&
        hasMeaningfulValue(r.rating)
    ),
  section1_4: (data: any) =>
    Array.isArray(data?.bondList) &&
    anyValid(
      data.bondList,
      (r) =>
        hasMeaningfulValue(r.bondType) &&
        hasMeaningfulValue(r.cityName) &&
        hasMeaningfulValue(r.issuingAuthority) &&
        hasMeaningfulValue(r.value)
    ),
  section1_5: (data: any) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.hasIntermediary)) return false;
    if (d?.hasIntermediary === "yes") {
      return anyValid(
        data?.ffiArray,
        (r) =>
          hasMeaningfulValue(r.organisationName) &&
          hasMeaningfulValue(r.organisationType) &&
          hasMeaningfulValue(r.yearEstablished) &&
          hasMeaningfulValue(r.totalFunding)
      );
    }
    // If "no", comment is required
    if (d?.hasIntermediary === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return true;
  },

  // 2.x Infra Development (updated to handle new nested array structure)
  section2_1: (data: any) =>
    anyValid(
      data?.infraActArray,
      (r) => hasMeaningfulValue(r.sector) && hasMeaningfulValue(r.files)
    ),

  section2_2: (data: any) =>
    anyValid(
      data?.specializedEntityArray,
      (r) => hasMeaningfulValue(r.sector) && hasMeaningfulValue(r.files)
    ),

  section2_3: (data: any) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.hasInfraDevelopmentPlan)) return false;
    if (d?.hasInfraDevelopmentPlan === "yes") {
      return anyValid(
        data?.infraDevelopmentArray,
        (r) => hasMeaningfulValue(r.sector) && hasMeaningfulValue(r.files)
      );
    }
    // If "no", comment is required
    if (d?.hasInfraDevelopmentPlan === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return true;
  },

  section2_4: (data: any) => {
    // Check if hasInvestmentReady is set (yes or no)
    const hasInvestmentReady = data?.hasInvestmentReady;
    if (!hasMeaningfulValue(hasInvestmentReady)) return false;

    // If "yes", check for websiteLink and investmentReadyArray with valid entries
    if (hasInvestmentReady === "yes") {
      if (!hasMeaningfulValue(data?.websiteLink)) return false;
      return anyValid(
        data?.investmentReadyArray,
        (r) =>
          hasMeaningfulValue(r.projectName) &&
          hasMeaningfulValue(r.sector) &&
          hasMeaningfulValue(r.status) &&
          hasMeaningfulValue(r.investmentType)
      );
    }

    // If "no", check for comment
    if (hasInvestmentReady === "no") {
      return hasMeaningfulValue(data?.comment);
    }

    return false;
  },

  section2_5: (data: any) =>
    anyValid(
      data?.assetMonetizationArray,
      (r) =>
        hasMeaningfulValue(r.projectName) &&
        hasMeaningfulValue(r.sector) &&
        hasMeaningfulValue(r.type) &&
        hasMeaningfulValue(r.ownership) &&
        hasMeaningfulValue(r.estimatedMonetization)
    ),

  // 3.x PPP
  section3_1: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.available)) return false;
    if (d?.available === "yes") return hasMeaningfulValue(d?.file);
    // If "no", comment is required
    if (d?.available === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return false;
  },
  section3_2: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.available)) return false;
    if (d?.available === "yes") return hasMeaningfulValue(d?.file);
    // If "no", comment is required
    if (d?.available === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return false;
  },
  section3_3: (data: any) =>
    anyValid(
      data?.VGFArray,
      (r) =>
        hasMeaningfulValue(r.projectName) &&
        hasMeaningfulValue(r.sector) &&
        hasMeaningfulValue(r.scheme) &&
        hasMeaningfulValue(r.totalProjectCost) &&
        hasMeaningfulValue(r.statusOfProject) &&
        hasMeaningfulValue(r.submissionDate)
    ),
  section3_4: (data) => {
    const d = data as
      | {
          projects?: unknown[];
          totalProjectsAwarded?: unknown;
          totalProjectCostAwarded?: unknown;
        }
      | undefined;

    // Check if mandatory summary fields are filled
    const hasSummaryFields =
      hasMeaningfulValue(d?.totalProjectsAwarded) &&
      hasMeaningfulValue(d?.totalProjectCostAwarded);

    // Also check if projects array has valid entries (optional but can be used for completion)
    const hasValidProjects = anyValid(
      d?.projects,
      (r) =>
        hasMeaningfulValue(r.nameOfProject) &&
        hasMeaningfulValue(r.infrastructureSector) &&
        hasMeaningfulValue(r.dateOfAward)
    );

    // Section is complete if mandatory summary fields are filled
    return hasSummaryFields || hasValidProjects;
  },

  // 4.x Infra Enablers
  section4_1: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.available)) return false;
    if (d?.available === "yes") return hasMeaningfulValue(d?.file);
    // If "no", comment is required
    if (d?.available === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return false;
  },
  section4_2: (data: any) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.adopted)) return false;
    if (d?.adopted === "yes") {
      return (
        Array.isArray(d?.projects) &&
        anyValid(
          d.projects,
          (r) =>
            hasMeaningfulValue(r.projectName) &&
            hasMeaningfulValue(r.sector) &&
            hasMeaningfulValue(r.file)
        )
      );
    }
    // If "no", comment is required
    if (d?.adopted === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return true;
  },
  section4_3: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.adopted)) return false;
    if (d?.adopted === "yes") return hasMeaningfulValue(d?.file);
    // If "no", comment is required
    if (d?.adopted === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return false;
  },
  section4_4: (data: any) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.implemented)) return false;
    if (d?.implemented === "yes") {
      return (
        Array.isArray(d?.practices) &&
        anyValid(
          d.practices,
          (r) =>
            hasMeaningfulValue(r.practiceName) &&
            hasMeaningfulValue(r.impact) &&
            hasMeaningfulValue(r.file)
        )
      );
    }
    // If "no", comment is required
    if (d?.implemented === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return true;
  },
  section4_5: (data: any) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.participated)) return false;
    if (d?.participated === "yes") {
      return anyValid(
        data?.capacityArray,
        (r) =>
          hasMeaningfulValue(r.officerName) &&
          hasMeaningfulValue(r.designation) &&
          hasMeaningfulValue(r.programName) &&
          hasMeaningfulValue(r.organiser) &&
          hasMeaningfulValue(r.trainingType) &&
          hasMeaningfulValue(r.trainingPeriod)
      );
    }
    // If "no", comment is required
    if (d?.participated === "no") {
      return hasMeaningfulValue(d?.comment);
    }
    return true;
  },
};

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    const vals = Object.values(value as Record<string, unknown>);
    return vals.some((v) => hasMeaningfulValue(v));
  }
  return true;
}

export function isSectionFilled(
  stepData: Record<string, unknown> | undefined,
  sectionKey: string
): boolean {
  if (!stepData) return false;
  const data = (stepData as Record<string, unknown>)[sectionKey];
  if (!data) return false;
  const checker = REQUIRED_SECTION_CHECKS[sectionKey];
  if (checker) {
    const result = checker(data);
    // 🔍 DEBUG: Log for section2_4
    if (sectionKey === "section2_4") {
      console.log("🔍 [PROGRESS CHECK 2.4] isSectionFilled:", {
        sectionKey,
        data,
        result,
        hasInvestmentReady: (data as any)?.hasInvestmentReady,
        websiteLink: (data as any)?.websiteLink,
        comment: (data as any)?.comment,
        arrayLength: Array.isArray((data as any)?.investmentReadyArray)
          ? (data as any).investmentReadyArray.length
          : 0,
        firstEntry:
          Array.isArray((data as any)?.investmentReadyArray) &&
          (data as any).investmentReadyArray.length > 0
            ? (data as any).investmentReadyArray[0]
            : null,
      });
    }
    return result;
  }
  return hasMeaningfulValue(data);
}

export function computeStepProgress(
  allFormData: Record<string, unknown>,
  stepKey: StepKey,
  options: {
    assignedIndicators?: string[];
    availableIndicators?: string[];
    isNodalOfficer?: boolean;
    isStateApprover?: boolean;
  } = {}
) {
  const {
    assignedIndicators = [],
    availableIndicators = [],
    isNodalOfficer = false,
    isStateApprover = false,
  } = options;

  const sections = STEP_SECTIONS[stepKey];
  const stepData: Record<string, unknown> | undefined = (
    allFormData as Record<string, unknown>
  )?.[stepKey] as Record<string, unknown> | undefined;

  // 🎯 Role-based filtering logic
  const applicable = isNodalOfficer
    ? sections.filter((s) => assignedIndicators.includes(s.indicator))
    : isStateApprover
    ? sections.filter((s) => availableIndicators.includes(s.indicator))
    : sections;

  const total = applicable.length;

  const completed = applicable.filter((s) =>
    isSectionFilled(stepData, s.sectionKey)
  ).length;

  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, progress };
}

export function computeAllStepsSummary(
  allFormData: Record<string, unknown>,
  options: {
    assignedIndicators?: string[];
    availableIndicators?: string[];
    isNodalOfficer?: boolean;
    isStateApprover?: boolean;
  } = {}
) {
  return {
    infraFinancing: computeStepProgress(allFormData, "infraFinancing", options),
    infraDevelopment: computeStepProgress(
      allFormData,
      "infraDevelopment",
      options
    ),
    pppDevelopment: computeStepProgress(allFormData, "pppDevelopment", options),
    infraEnablers: computeStepProgress(allFormData, "infraEnablers", options),
  };
}

/**
 * Calculate progress based on sections with ACCEPTED status
 * @param allFormData - The form data object
 * @returns Object with total sections, accepted sections, and progress percentage
 */
export async function calculateProgressByAcceptedStatus(
  allFormData: Record<string, unknown>
): Promise<{ total: number; accepted: number; progress: number }> {
  // Get user role from localStorage
  let userRole: string | undefined;
  try {
    const authUserStr = localStorage.getItem("niri_app:auth_user");
    console.log(
      "authUserStr in calculateProgressByAcceptedStatus",
      authUserStr
    );
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      userRole = authUser?.role || authUser?.value?.role;
      console.log("userRole in calculateProgressByAcceptedStatus", userRole);
    }
  } catch (error) {
    console.warn("⚠️ Failed to get user role from localStorage:", error);
  }

  const categories = [
    "infraFinancing",
    "infraDevelopment",
    "pppDevelopment",
    "infraEnablers",
  ];
  let totalSections = 0;
  let acceptedSections = 0;

  for (const category of categories) {
    const categoryData =
      (allFormData[category] as Record<string, unknown>) || {};

    // Iterate through all sections in this category
    for (const sectionKey of Object.keys(categoryData)) {
      // Only count sections that match the pattern (section1_1, section2_1, etc.)
      if (!sectionKey.startsWith("section")) {
        continue;
      }

      const sectionData = categoryData[sectionKey];
      if (!sectionData) {
        continue;
      }

      totalSections++;

      // Check for ACCEPTED status
      // Handle both object and array formats
      let status: string | undefined;
      let mospiStatus: string | undefined;

      if (typeof sectionData === "object" && !Array.isArray(sectionData)) {
        // For object format, check status and mospi_status directly
        status = (sectionData as Record<string, unknown>)?.status as
          | string
          | undefined;
        mospiStatus = (sectionData as Record<string, unknown>)?.mospi_status as
          | string
          | undefined;
      } else if (Array.isArray(sectionData)) {
        // For array format, check status on the array object itself first
        status = (sectionData as any)?.status;
        mospiStatus = (sectionData as any)?.mospi_status;

        // If not found on array, check first item in array (common pattern)
        if (
          !status &&
          sectionData.length > 0 &&
          typeof sectionData[0] === "object"
        ) {
          status = (sectionData[0] as any)?.status;
        }
        if (
          !mospiStatus &&
          sectionData.length > 0 &&
          typeof sectionData[0] === "object"
        ) {
          mospiStatus = (sectionData[0] as any)?.mospi_status;
        }

        // Also check if any item in the array has the status (for nested structures)
        if (!mospiStatus) {
          for (const item of sectionData) {
            if (item && typeof item === "object") {
              const itemMospiStatus = (item as any)?.mospi_status;
              if (itemMospiStatus) {
                mospiStatus = itemMospiStatus;
                break;
              }
            }
          }
        }
        if (!status) {
          for (const item of sectionData) {
            if (item && typeof item === "object") {
              const itemStatus = (item as any)?.status;
              if (itemStatus) {
                status = itemStatus;
                break;
              }
            }
          }
        }
      }

      // Normalize status values
      const normalizedStatus = status
        ? String(status).trim().toUpperCase()
        : "";
      const normalizedMospiStatus = mospiStatus
        ? String(mospiStatus).trim().toUpperCase()
        : "";

      // Determine which status to check based on user role
      const normalizedUserRole = userRole
        ? String(userRole).trim().toUpperCase()
        : "";
      const isMospiUser =
        normalizedUserRole === "MOSPI_REVIEWER" ||
        normalizedUserRole === "MOSPI_APPROVER";

      // Count section based on role
      let isAccepted = false;
      if (isMospiUser) {
        // For MOSPI users, check mospi_status
        console.log(
          "normalizedMospiStatus",
          normalizedMospiStatus,
          "for section",
          sectionKey
        );
        isAccepted = normalizedMospiStatus === "ACCEPTED";
      } else {
        // For other users, check status
        isAccepted = normalizedStatus === "ACCEPTED";
      }

      if (isAccepted) {
        acceptedSections++;
      }
    }
  }

  // Get total assigned indicators count
  // For MOSPI users, use default count of 20
  // For other users, fetch from API based on submittedBy user ID
  let totalAssignedIndicators: number | undefined;

  // Check if user is MOSPI approver or reviewer
  const normalizedUserRole = userRole
    ? String(userRole).trim().toUpperCase()
    : "";
  const isMospiUser =
    normalizedUserRole === "MOSPI_REVIEWER" ||
    normalizedUserRole === "MOSPI_APPROVER";

  if (isMospiUser) {
    // For MOSPI users, use default total of 19
    totalAssignedIndicators = ALL_INDICATOR_CODES.length;
    console.log("📊 [Progress] Using default total of 19 for MOSPI user");
  } else {
    // For other users, fetch from API
    try {
      const submittedBy = allFormData.submittedBy;
      let userId: string | undefined;

      // Handle different submittedBy structures
      if (typeof submittedBy === "string") {
        // If submittedBy is a string, it's likely the user ID
        userId = submittedBy;
      } else if (submittedBy && typeof submittedBy === "object") {
        // If submittedBy is an object, extract the ID
        userId =
          (submittedBy as any)?.id ||
          (submittedBy as any)?.userId ||
          (submittedBy as any)?.user?.id;
      }

      if (userId) {
        // Fetch total assigned indicators count from API
        try {
          const response = await apiService.get(
            `/user-indicators/user/${userId}`
          );
          const responseData =
            response?.data?.data || response?.data || response;

          // Handle different response structures
          if (Array.isArray(responseData)) {
            totalAssignedIndicators = responseData.length;
          } else if (
            responseData?.indicators &&
            Array.isArray(responseData.indicators)
          ) {
            totalAssignedIndicators = responseData.indicators.length;
          } else if (typeof responseData?.count === "number") {
            totalAssignedIndicators = responseData.count;
          } else if (typeof responseData?.total === "number") {
            totalAssignedIndicators = responseData.total;
          } else if (responseData && typeof responseData === "object") {
            const keys = Object.keys(responseData);
            if (keys.length > 0) {
              const firstKey = keys[0];
              if (Array.isArray(responseData[firstKey])) {
                totalAssignedIndicators = responseData[firstKey].length;
              }
            }
          }

          console.log(
            "📊 [Progress] Total assigned indicators from API:",
            totalAssignedIndicators
          );
        } catch (apiError) {
          console.warn(
            "⚠️ Failed to fetch assigned indicators count from API:",
            apiError
          );
          // Fallback: use totalSections from formData
        }
      } else {
        console.warn("⚠️ No user ID found in allFormData.submittedBy");
        // Fallback: use totalSections from formData
      }
    } catch (error) {
      console.warn(
        "⚠️ Failed to get user ID from allFormData.submittedBy:",
        error
      );
      // Fallback: use totalSections from formData
    }
  }

  // Use totalAssignedIndicators from API if available, otherwise use totalSections from formData
  const total = totalAssignedIndicators ?? totalSections;
  const progress = total > 0 ? Math.round((acceptedSections / total) * 100) : 0;

  return {
    total: total,
    accepted: acceptedSections,
    progress,
  };
}

export { STEP_SECTIONS };
