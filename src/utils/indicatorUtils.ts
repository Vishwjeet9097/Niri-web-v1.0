import type { IndicatorSection, SectionAccess } from "@/types";

// NIRI Indicator Sections Configuration
export const INDICATOR_SECTIONS: IndicatorSection[] = [
  {
    id: "infra-financing",
    name: "Infrastructure Financing",
    indicators: ["1.1", "1.2", "1.3", "1.4", "1.5"],
    points: 250,
    description: "Capital allocation and financial management indicators",
  },
  {
    id: "infra-development",
    name: "Infrastructure Development",
    indicators: ["2.1", "2.2", "2.3", "2.4", "2.5"],
    points: 250,
    description: "Infrastructure planning and development indicators",
  },
  {
    id: "ppp-development",
    name: "PPP Development",
    indicators: ["3.1", "3.2", "3.3", "3.4"],
    points: 250,
    description: "Public-Private Partnership development indicators",
  },
  {
    id: "infra-enablers",
    name: "Infrastructure Enablers",
    indicators: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
    points: 250,
    description: "Supporting infrastructure and policy enablers",
  },
];

// Indicator to section mapping
export const INDICATOR_TO_SECTION_MAP: Record<string, string> = {};
INDICATOR_SECTIONS.forEach((section) => {
  section.indicators.forEach((indicator) => {
    INDICATOR_TO_SECTION_MAP[indicator] = section.id;
  });
});

// Section to indicators mapping
export const SECTION_TO_INDICATORS_MAP: Record<string, string[]> = {};
INDICATOR_SECTIONS.forEach((section) => {
  SECTION_TO_INDICATORS_MAP[section.id] = section.indicators;
});

/**
 * Get section by ID
 */
export function getSectionById(
  sectionId: string
): IndicatorSection | undefined {
  return INDICATOR_SECTIONS.find((section) => section.id === sectionId);
}

/**
 * Get section by indicator code
 */
export function getSectionByIndicator(
  indicatorCode: string
): IndicatorSection | undefined {
  const sectionId = INDICATOR_TO_SECTION_MAP[indicatorCode];
  return sectionId ? getSectionById(sectionId) : undefined;
}

/**
 * Filter form data to only include assigned indicators
 */
export function filterFormDataByIndicators(
  formData: Record<string, any>,
  assignedIndicators: string[]
): Record<string, any> {
  if (!assignedIndicators || assignedIndicators.length === 0) {
    return {};
  }

  const filteredData: Record<string, any> = {};

  // Filter by indicator codes
  assignedIndicators.forEach((indicatorCode) => {
    if (formData[indicatorCode] !== undefined) {
      filteredData[indicatorCode] = formData[indicatorCode];
    }
  });

  // Always include general info if present
  if (formData.generalInfo) {
    filteredData.generalInfo = formData.generalInfo;
  }

  return filteredData;
}

/**
 * Get available sections based on assigned indicators
 */
export function getAvailableSections(
  assignedIndicators: string[]
): IndicatorSection[] {
  if (!assignedIndicators || assignedIndicators.length === 0) {
    return [];
  }

  return INDICATOR_SECTIONS.filter((section) =>
    section.indicators.some((indicator) =>
      assignedIndicators.includes(indicator)
    )
  );
}

/**
 * Get restricted sections based on assigned indicators
 */
export function getRestrictedSections(assignedIndicators: string[]): string[] {
  const availableSections = getAvailableSections(assignedIndicators);
  return INDICATOR_SECTIONS.filter(
    (section) => !availableSections.includes(section)
  ).map((section) => section.id);
}

/**
 * Check if user has access to specific indicator
 */
export function hasIndicatorAccess(
  indicatorCode: string,
  assignedIndicators: string[]
): boolean {
  return assignedIndicators.includes(indicatorCode);
}

/**
 * Check if user has access to specific section
 */
export function hasSectionAccess(
  sectionId: string,
  assignedIndicators: string[]
): boolean {
  const section = getSectionById(sectionId);
  if (!section) return false;

  return section.indicators.some((indicator) =>
    assignedIndicators.includes(indicator)
  );
}

/**
 * Get section access details
 */
export function getSectionAccess(
  sectionId: string,
  assignedIndicators: string[]
): SectionAccess {
  const section = getSectionById(sectionId);
  if (!section) {
    return {
      sectionId,
      hasAccess: false,
      assignedIndicators: [],
      hiddenIndicators: [],
    };
  }

  const assignedInSection = section.indicators.filter((indicator) =>
    assignedIndicators.includes(indicator)
  );
  const hiddenInSection = section.indicators.filter(
    (indicator) => !assignedIndicators.includes(indicator)
  );

  return {
    sectionId,
    hasAccess: assignedInSection.length > 0,
    assignedIndicators: assignedInSection,
    hiddenIndicators: hiddenInSection,
  };
}

/**
 * Get first available section for navigation
 */
export function getFirstAvailableSection(
  assignedIndicators: string[]
): string | null {
  const availableSections = getAvailableSections(assignedIndicators);
  return availableSections.length > 0 ? availableSections[0].id : null;
}

/**
 * Validate form data against assigned indicators
 */
export function validateFormDataAccess(
  formData: Record<string, any>,
  assignedIndicators: string[]
): { isValid: boolean; unauthorizedFields: string[] } {
  const unauthorizedFields: string[] = [];

  Object.keys(formData).forEach((key) => {
    // Skip general info and other non-indicator fields
    if (key === "generalInfo") return;

    // Check if this is an indicator field
    const section = getSectionByIndicator(key);
    if (section && !assignedIndicators.includes(key)) {
      unauthorizedFields.push(key);
    }
  });

  return {
    isValid: unauthorizedFields.length === 0,
    unauthorizedFields,
  };
}

/**
 * Get indicator display name
 */
export function getIndicatorDisplayName(indicatorCode: string): string {
  const indicatorNames: Record<string, string> = {
    "1.1": "Capex to GSDP Ratio",
    "1.2": "Capex Utilization",
    "1.3": "Credit Rated ULBs",
    "1.4": "ULBs Issuing Bonds",
    "1.5": "Functional Financial Intermediary",
    "2.1": "Infrastructure Act/Policy",
    "2.2": "Specialized Entity",
    "2.3": "Sector Infrastructure Plan",
    "2.4": "Investment Ready Pipeline",
    "2.5": "Asset Monetization Pipeline",
    "3.1": "PPP Act/Policy",
    "3.2": "PPP Cell",
    "3.3": "VGF/IIPDF Proposals",
    "3.4": "PPP Bankable Projects",
    "3.5": "PPP Project Monitoring",
    "4.1": "PMG Portal Eligible",
    "4.2": "State PMG Portal",
    "4.3": "PM Gati Shakti Adoption",
    "4.4": "ADR Adoption",
    "4.5": "Innovative Practices",
  };

  return indicatorNames[indicatorCode] || indicatorCode;
}

/**
 * Get section display name
 */
export function getSectionDisplayName(sectionId: string): string {
  const section = getSectionById(sectionId);
  return section?.name || sectionId;
}

/**
 * Check if all required indicators are assigned
 */
export function hasAllRequiredIndicators(
  assignedIndicators: string[]
): boolean {
  const allIndicators = INDICATOR_SECTIONS.flatMap(
    (section) => section.indicators
  );
  return allIndicators.every((indicator) =>
    assignedIndicators.includes(indicator)
  );
}

/**
 * Get missing indicators
 */
export function getMissingIndicators(assignedIndicators: string[]): string[] {
  const allIndicators = INDICATOR_SECTIONS.flatMap(
    (section) => section.indicators
  );
  return allIndicators.filter(
    (indicator) => !assignedIndicators.includes(indicator)
  );
}

/**
 * Filter section-based formData to only include sections for assigned indicators
 * This is used for filtering formData with structure: { infraFinancing: {}, infraDevelopment: {}, ... }
 */
export function filterSectionFormDataByIndicators(
  formData: any,
  assignedIndicators: string[]
): any {
  if (!formData || !assignedIndicators || assignedIndicators.length === 0) {
    return formData || {};
  }

  const filtered: any = {
    infraFinancing: {},
    infraDevelopment: {},
    pppDevelopment: {},
    infraEnablers: {},
  };

  // Map indicator codes to their section keys
  const indicatorToSectionMap: Record<string, { category: string; sectionKey: string }> = {
    "1.1": { category: "infraFinancing", sectionKey: "section1_1" },
    "1.2": { category: "infraFinancing", sectionKey: "section1_2" },
    "1.3": { category: "infraFinancing", sectionKey: "section1_3" },
    "1.4": { category: "infraFinancing", sectionKey: "section1_4" },
    "1.5": { category: "infraFinancing", sectionKey: "section1_5" },
    "2.1": { category: "infraDevelopment", sectionKey: "section2_1" },
    "2.2": { category: "infraDevelopment", sectionKey: "section2_2" },
    "2.3": { category: "infraDevelopment", sectionKey: "section2_3" },
    "2.4": { category: "infraDevelopment", sectionKey: "section2_4" },
    "2.5": { category: "infraDevelopment", sectionKey: "section2_5" },
    "3.1": { category: "pppDevelopment", sectionKey: "section3_1" },
    "3.2": { category: "pppDevelopment", sectionKey: "section3_2" },
    "3.3": { category: "pppDevelopment", sectionKey: "section3_3" },
    "3.4": { category: "pppDevelopment", sectionKey: "section3_4" },
    "4.1": { category: "infraEnablers", sectionKey: "section4_1" },
    "4.2": { category: "infraEnablers", sectionKey: "section4_2" },
    "4.3": { category: "infraEnablers", sectionKey: "section4_3" },
    "4.4": { category: "infraEnablers", sectionKey: "section4_4" },
    "4.5": { category: "infraEnablers", sectionKey: "section4_5" },
    "4.6": { category: "infraEnablers", sectionKey: "section4_6" },
  };

  // Only include sections for assigned indicators
  // IMPORTANT: Always include assigned sections, even if they're undefined or empty,
  // so they appear in preview/review pages regardless of data presence
  assignedIndicators.forEach((indicatorCode) => {
    const mapping = indicatorToSectionMap[indicatorCode];
    if (mapping) {
      if (!filtered[mapping.category]) {
        filtered[mapping.category] = {};
      }
      // Include the section if it exists in formData, or include an empty object if assigned
      // This ensures assigned indicators always appear in preview/review
      if (formData[mapping.category] && formData[mapping.category][mapping.sectionKey] !== undefined) {
        filtered[mapping.category][mapping.sectionKey] = formData[mapping.category][mapping.sectionKey];
      } else {
        // Include assigned section even if undefined - use empty object to preserve structure
        // The review component will handle displaying empty/undefined sections appropriately
        filtered[mapping.category][mapping.sectionKey] = formData[mapping.category]?.[mapping.sectionKey] ?? {};
      }
    }
  });

  // Remove empty categories
  Object.keys(filtered).forEach((category) => {
    if (Object.keys(filtered[category]).length === 0) {
      delete filtered[category];
    }
  });

  // Preserve other formData properties (like stateUt, etc.)
  const otherProps = { ...formData };
  delete otherProps.infraFinancing;
  delete otherProps.infraDevelopment;
  delete otherProps.pppDevelopment;
  delete otherProps.infraEnablers;

  return {
    ...otherProps,
    ...filtered,
  };
}