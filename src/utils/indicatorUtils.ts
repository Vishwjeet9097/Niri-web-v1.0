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
