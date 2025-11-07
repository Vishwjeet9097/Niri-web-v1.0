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
  section1_5: (data) =>
    anyValid(
      data,
      (r) =>
        hasMeaningfulValue(r.organisationName) &&
        hasMeaningfulValue(r.organisationType) &&
        hasMeaningfulValue(r.yearEstablished) &&
        hasMeaningfulValue(r.totalFunding)
    ),

  // 2.x Infra Development (all arrays with at least one entry)
  section2_1: (data) =>
    anyValid(
      data,
      (r) => hasMeaningfulValue(r.sector) && hasMeaningfulValue(r.files)
    ),
  section2_2: (data) =>
    anyValid(
      data,
      (r) => hasMeaningfulValue(r.sector) && hasMeaningfulValue(r.files)
    ),
  section2_3: (data) =>
    anyValid(
      data,
      (r) => hasMeaningfulValue(r.sector) && hasMeaningfulValue(r.files)
    ),
  section2_4: (data) =>
    anyValid(
      data,
      (r) => hasMeaningfulValue(r.projectName) && hasMeaningfulValue(r.dprFile)
    ),
  section2_5: (data) =>
    anyValid(
      data,
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
  section3_3: (data) =>
    anyValid(
      data,
      (r) =>
        hasMeaningfulValue(r.projectName) &&
        hasMeaningfulValue(r.sector) &&
        hasMeaningfulValue(r.type) &&
        hasMeaningfulValue(r.submissionDate) &&
        hasMeaningfulValue(r.file)
    ),
  section3_4: (data) => {
    const d = data as { projects?: unknown[] } | undefined;
    return anyValid(
      d?.projects,
      (r) =>
        hasMeaningfulValue(r.nameOfProject) &&
        hasMeaningfulValue(r.nipId) &&
        hasMeaningfulValue(r.fundingSource) &&
        hasMeaningfulValue(r.infrastructureSector) &&
        hasMeaningfulValue(r.dateOfAward) &&
        hasMeaningfulValue(r.capexPercentage)
    );
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
    return hasMeaningfulValue(d?.numberOfProjects);
  },
  section4_4: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.adopted)) return false;
    if (d?.adopted === "yes") return hasMeaningfulValue(d?.file);
    return true;
  },
  section4_5: (data) => {
    const d = data as Record<string, unknown>;
    if (!hasMeaningfulValue(d?.implemented)) return false;
    if (d?.implemented === "yes")
      return (
        hasMeaningfulValue(d?.practiceName) && hasMeaningfulValue(d?.impact)
      );
    return true;
  },
  section4_6: (data) =>
    anyValid(
      data,
      (r) =>
        hasMeaningfulValue(r.officerName) &&
        hasMeaningfulValue(r.designation) &&
        hasMeaningfulValue(r.programName) &&
        hasMeaningfulValue(r.organiser) &&
        hasMeaningfulValue(r.trainingType)
    ),
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
  if (checker) return checker(data);
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


export { STEP_SECTIONS };
