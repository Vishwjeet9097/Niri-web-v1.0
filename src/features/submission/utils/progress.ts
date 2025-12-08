/* eslint-disable @typescript-eslint/no-explicit-any */
/*
  Shared utilities to compute dynamic section completion and step progress.
  These functions are intentionally liberal in determining whether a section
  is "filled": if the section object/array contains any non-empty value, it is
  considered filled. This keeps UI progress responsive without coupling to
  strict validation.
*/

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
    { sectionKey: "section4_6", indicator: "4.6" },
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
    Array.isArray(data?.bondList) && anyValid(
      data.bondList,
      (r) =>
        hasMeaningfulValue(r.bondType) &&
        hasMeaningfulValue(r.cityName) &&
        hasMeaningfulValue(r.issuingAuthority) &&
        hasMeaningfulValue(r.value)
    ),
  section1_5: (data: any) => {
    const d = data as Record<string, unknown>;
    // If hasIntermediary is "no", section is considered filled
    if (d?.hasIntermediary === "no") return true;
    // If hasIntermediary is "yes", check for valid entries in ffiArray
    if (d?.hasIntermediary === "yes") {
      return anyValid(
        data?.ffiArray,
        (r) =>
          hasMeaningfulValue(r.organisationName) &&
          hasMeaningfulValue(r.organisationType) &&
          hasMeaningfulValue(r.totalFunding) &&
          hasMeaningfulValue(r.website)
      );
    }
    // If hasIntermediary is not set, check if ffiArray has valid entries (backward compatibility)
    return anyValid(
      data?.ffiArray,
      (r) =>
        hasMeaningfulValue(r.organisationName) &&
        hasMeaningfulValue(r.organisationType) &&
        hasMeaningfulValue(r.totalFunding)
    );
  },


   // 2.x Infra Development (updated to handle new nested array structure)
  section2_1: (data: any) => {
    // Check if files array exists and has items with file data
    return anyValid(
      data?.infraActArray,
      (r) => {
        if (!hasMeaningfulValue(r.sector)) return false;
        // Check if files array has items with actual file data
        if (Array.isArray(r.files) && r.files.length > 0) {
          return r.files.some((f: any) => 
            f && (f.id || f.fileName || f.filePath || (f.file && (f.file.id || f.file.fileName || f.file.filePath)))
          );
        }
        return false;
      }
    );
  },

  section2_2: (data: any) => {
    // Check if files array exists and has items with file data
    return anyValid(
      data?.specializedEntityArray,
      (r) => {
        if (!hasMeaningfulValue(r.sector)) return false;
        // Check if files array has items with actual file data
        if (Array.isArray(r.files) && r.files.length > 0) {
          return r.files.some((f: any) => 
            f && (f.id || f.fileName || f.filePath || (f.file && (f.file.id || f.file.fileName || f.file.filePath)))
          );
        }
        return false;
      }
    );
  },

  section2_3: (data: any) => {
    const d = data as Record<string, unknown>;
    // Check if hasInfraDevelopmentPlan field exists (yes/no)
    if (hasMeaningfulValue(d?.hasInfraDevelopmentPlan)) {
      // If "no", section is considered filled (just like other binary yes/no sections)
      if (d?.hasInfraDevelopmentPlan === "no") return true;
      // If "yes", check for infraDevelopmentArray with valid entries
      if (d?.hasInfraDevelopmentPlan === "yes") {
        return anyValid(
          data?.infraDevelopmentArray,
          (r) => {
            if (!hasMeaningfulValue(r.sector)) return false;
            // Check if files array has items with actual file data
            if (Array.isArray(r.files) && r.files.length > 0) {
              return r.files.some((f: any) => 
                f && (f.id || f.fileName || f.filePath || (f.file && (f.file.id || f.file.fileName || f.file.filePath)))
              );
            }
            return false;
          }
        );
      }
    }
    // Backward compatibility: if hasInfraDevelopmentPlan is not set, check infraDevelopmentArray directly
    return anyValid(
      data?.infraDevelopmentArray,
      (r) => {
        if (!hasMeaningfulValue(r.sector)) return false;
        // Check if files array has items with actual file data
        if (Array.isArray(r.files) && r.files.length > 0) {
          return r.files.some((f: any) => 
            f && (f.id || f.fileName || f.filePath || (f.file && (f.file.id || f.file.fileName || f.file.filePath)))
          );
        }
        return false;
      }
    );
  },

  section2_4: (data: any) => {
    // Section 2.4 can have either:
    // 1. A websiteLink at the section level (sufficient for all projects), OR
    // 2. Projects with dprFile
    const d = data as Record<string, unknown>;
    
    // Check if hasInvestmentReady field exists (yes/no)
    if (hasMeaningfulValue(d?.hasInvestmentReady)) {
      // If "no", section is considered filled (just like other binary yes/no sections)
      if (d?.hasInvestmentReady === "no") return true;
      // If "yes", check for websiteLink OR projects with dprFile
      if (d?.hasInvestmentReady === "yes") {
        // Check if section has websiteLink
        if (hasMeaningfulValue(d?.websiteLink)) {
          // If websiteLink exists, check if there are any projects in the array
          if (Array.isArray(d?.investmentReadyArray) && d.investmentReadyArray.length > 0) {
            return anyValid(
              d.investmentReadyArray,
              (r) => hasMeaningfulValue(r.projectName)
            );
          }
          // Even if no projects, websiteLink alone is sufficient
          return true;
        }
        
        // If no websiteLink, check for projects with dprFile
        return anyValid(
          d?.investmentReadyArray,
          (r) => {
            if (!hasMeaningfulValue(r.projectName)) return false;
            // Check if dprFile exists (can be object with id/fileName/filePath or nested file structure)
            if (r.dprFile) {
              if (typeof r.dprFile === 'object') {
                return !!(r.dprFile.id || r.dprFile.fileName || r.dprFile.filePath || 
                         (r.dprFile.file && (r.dprFile.file.id || r.dprFile.file.fileName || r.dprFile.file.filePath)));
              }
              return true; // If it's a truthy value, consider it valid
            }
            return false;
          }
        );
      }
    }
    
    // Backward compatibility: if hasInvestmentReady is not set, check websiteLink or projects
    // Check if section has websiteLink
    if (hasMeaningfulValue(d?.websiteLink)) {
      // If websiteLink exists, check if there are any projects in the array
      if (Array.isArray(d?.investmentReadyArray) && d.investmentReadyArray.length > 0) {
        return anyValid(
          d.investmentReadyArray,
          (r) => hasMeaningfulValue(r.projectName)
        );
      }
      // Even if no projects, websiteLink alone is sufficient
      return true;
    }
    
    // If no websiteLink, check for projects with dprFile
    return anyValid(
      d?.investmentReadyArray,
      (r) => {
        if (!hasMeaningfulValue(r.projectName)) return false;
        // Check if dprFile exists (can be object with id/fileName/filePath or nested file structure)
        if (r.dprFile) {
          if (typeof r.dprFile === 'object') {
            return !!(r.dprFile.id || r.dprFile.fileName || r.dprFile.filePath || 
                     (r.dprFile.file && (r.dprFile.file.id || r.dprFile.file.fileName || r.dprFile.file.filePath)));
          }
          return true; // If it's a truthy value, consider it valid
        }
        return false;
      }
    );
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
    return true;
  },
  section3_2: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.available)) return false;
    if (d?.available === "yes") return hasMeaningfulValue(d?.file);
    return true;
  },
  section3_3: (data: any) => {
    // Check if VGFArray exists and has valid entries
    return Array.isArray(data?.VGFArray) && 
           data.VGFArray.length > 0 &&
           anyValid(
             data.VGFArray,
             (r) =>
               hasMeaningfulValue(r.projectName) &&
               hasMeaningfulValue(r.sector) &&
               hasMeaningfulValue(r.type) &&
               hasMeaningfulValue(r.submissionDate) &&
               hasMeaningfulValue(r.file)
           );
  },
  section3_4: (data: any) => {
    const d = data as { projects?: unknown[]; totalProjectCostAwarded?: unknown; totalTPC?: unknown } | undefined;
    // Section 3.4 is considered filled if:
    // 1. It has a projects array with at least one project that has essential data, OR
    // 2. It has totalProjectCostAwarded or totalTPC (which indicates data was entered)
    if (Array.isArray(d?.projects) && d.projects.length > 0) {
      // If there are projects, check if at least one has essential fields
      // Essential fields: nameOfProject OR totalProjectCost (at least one should exist)
      return anyValid(
        d.projects,
        (r) =>
          hasMeaningfulValue(r.nameOfProject) || hasMeaningfulValue(r.totalProjectCost)
      );
    }
    // Also check if totalProjectCostAwarded or totalTPC exists (indicates data was entered)
    return hasMeaningfulValue(d?.totalProjectCostAwarded) || hasMeaningfulValue(d?.totalTPC);
  },

  // 4.x Infra Enablers
  section4_1: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.allEligible)) return false;
    // अगर 'yes' है तो वेबसाइट लिंक भी चाहिए
    if (d?.allEligible === "yes") return hasMeaningfulValue(d?.websiteLink);
    return true;
  },
  section4_2: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.available)) return false;
    if (d?.available === "yes") return hasMeaningfulValue(d?.file);
    return true;
  },
  section4_3: (data) => {
    const d = data as Record<string, unknown>;
    // Check if adopted field exists (yes/no)
    if (!hasMeaningfulValue(d?.adopted)) return false;
    // If "yes", check for projects array with valid entries
    if (d?.adopted === "yes") {
      return Array.isArray(d?.projects) && 
             d.projects.length > 0 &&
             d.projects.some((p: any) => 
               hasMeaningfulValue(p?.projectName) && 
               hasMeaningfulValue(p?.sector) &&
               (p?.file && (p.file.id || p.file.fileName || p.file.filePath))
             );
    }
    // If "no", section is considered filled (just like other binary yes/no sections)
    return true;
  },
  section4_4: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.adopted)) return false;
    if (d?.adopted === "yes") return hasMeaningfulValue(d?.file);
    return true;
  },
  section4_5: (data: any) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.implemented)) return false;
    // If "yes", check for practices array with valid entries
    if (d?.implemented === "yes") {
      return Array.isArray(d?.practices) && 
             d.practices.length > 0 &&
             d.practices.some((p: any) => 
               hasMeaningfulValue(p?.practiceName) && 
               hasMeaningfulValue(p?.impact) &&
               (p?.file && (p.file.id || p.file.fileName || p.file.filePath))
             );
    }
    // If "no", section is considered filled (just like other binary yes/no sections)
    return true;
  },
  section4_6: (data) => {
    const d = data as Record<string, any>;
    // Check if participated field exists (yes/no)
    if (hasMeaningfulValue(d?.participated)) {
      // If "no", section is considered filled (just like other binary yes/no sections)
      if (d?.participated === "no") return true;
      // If "yes", check for capacityArray with valid entries
      if (d?.participated === "yes") {
        return anyValid(
          d?.capacityArray,
          (r) =>
            hasMeaningfulValue(r.officerName) &&
            hasMeaningfulValue(r.designation) &&
            hasMeaningfulValue(r.programName) &&
            hasMeaningfulValue(r.organiser) &&
            hasMeaningfulValue(r.trainingType)
        );
      }
    }
    // Backward compatibility: if participated is not set, check capacityArray directly
    return anyValid(
      d?.capacityArray,
      (r) =>
        hasMeaningfulValue(r.officerName) &&
        hasMeaningfulValue(r.designation) &&
        hasMeaningfulValue(r.programName) &&
        hasMeaningfulValue(r.organiser) &&
        hasMeaningfulValue(r.trainingType)
    );
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
  // If stepData doesn't exist, section is not filled
  if (!stepData) return false;
  
  const data = (stepData as Record<string, unknown>)[sectionKey];
  
  // If section doesn't exist at all, it's not filled
  if (!data) return false;

  // Respect send-back statuses: if the section was reverted/rejected (state) or mospi_reverted,
  // do not count it as filled even if it has data.
  let sectionStatus: string | undefined;
  let mospiStatus: string | undefined;

  if (Array.isArray(data)) {
    sectionStatus = (data as any)?.status;
    mospiStatus = (data as any)?.mospi_status;
  } else if (typeof data === "object" && data !== null) {
    sectionStatus = (data as any)?.status;
    mospiStatus = (data as any)?.mospi_status;
  }

  if (sectionStatus === "REVERTED" || sectionStatus === "REJECTED") {
    return false;
  }

  if (mospiStatus === "REVERTED") {
    return false;
  }

  // If MoSPI has sent back at form level and set mospi_status to RETURNED_FROM_MOSPI on the section,
  // do not count it as filled.
  if (mospiStatus === "RETURNED_FROM_MOSPI") {
    return false;
  }

  // No mandatory field/file enforcement: any meaningful data (including "no") counts as filled.
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
    isNodalOfficer = false,
  } = options;

  const sections = STEP_SECTIONS[stepKey];
  const stepData: Record<string, unknown> | undefined = (
    allFormData as Record<string, unknown>
  )?.[stepKey] as Record<string, unknown> | undefined;

  // 🎯 For NODAL_OFFICER: Start with assigned indicators (if available)
  // For others: Count indicators that exist in the submission
  let sectionsInSubmission: typeof sections;
  
  if (isNodalOfficer && assignedIndicators.length > 0) {
    // For NODAL_OFFICER: Only consider assigned indicators that exist in formData
    // This ensures progress is based on assigned indicators, not all indicators in submission
    sectionsInSubmission = sections.filter((s) => {
      // Must be in assigned indicators
      if (!assignedIndicators.includes(s.indicator)) return false;
      // And must exist in formData
      if (!stepData) return false;
      return stepData[s.sectionKey] !== undefined && stepData[s.sectionKey] !== null;
    });
    
    // Debug logging for NODAL_OFFICER
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Progress] ${stepKey} - NODAL_OFFICER:`, {
        assignedIndicators,
        sectionsInSubmission: sectionsInSubmission.map(s => s.indicator),
        total: sectionsInSubmission.length,
      });
    }
  } else {
    // For STATE_APPROVER/MOSPI: Count all indicators that exist in the submission
    sectionsInSubmission = sections.filter((s) => {
      if (!stepData) return false;
      // Check if this section exists in the formData
      return stepData[s.sectionKey] !== undefined && stepData[s.sectionKey] !== null;
    });
  }

  const total = sectionsInSubmission.length;

  // ⚠️ IMPORTANT: If total is 0 (no sections in submission), return early
  if (total === 0) {
    return { completed: 0, total: 0, progress: 0 };
  }

  // Count how many sections are filled (excluding REVERTED ones)
  // A section is filled if:
  // 1. It exists in stepData AND
  // 2. It has meaningful data AND
  // 3. It's NOT REVERTED/REJECTED
  const completed = sectionsInSubmission.filter((s) => {
    // Check if section is filled (handles REVERTED status internally)
    // This will return false if:
    // - Section has no meaningful data
    // - Section status is REVERTED or REJECTED
    // - Section mospi_status is REVERTED
    const isFilled = isSectionFilled(stepData, s.sectionKey);
    
    // Debug logging for each section (for all categories, not just pppDevelopment)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Progress] ${stepKey} - ${s.indicator} (${s.sectionKey}):`, {
        exists: stepData?.[s.sectionKey] !== undefined,
        isFilled,
        hasData: stepData?.[s.sectionKey] !== null && stepData?.[s.sectionKey] !== undefined,
        dataKeys: stepData?.[s.sectionKey] && typeof stepData[s.sectionKey] === 'object' 
          ? Object.keys(stepData[s.sectionKey] as object) 
          : 'not an object',
      });
    }
    
    return isFilled;
  }).length;

  // Calculate progress: (completed / total) × 100%
  // Example: Submission has 5 indicators, 4 filled, 1 sent back = (3/5) × 100% = 60%
  // Note: REVERTED indicators are counted in total but not in completed
  const progress = Math.round((completed / total) * 100);

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


export { STEP_SECTIONS };
