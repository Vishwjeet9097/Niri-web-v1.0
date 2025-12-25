/**
 * Configuration for mandatory fields across all submission sections.
 * This serves as a single source of truth for which fields are required.
 * 
 * Fields listed here should:
 * 1. Have validation in the validation files
 * 2. Show asterisk (*) in the UI
 * 3. Be checked in progress calculations
 */

export type MandatoryFieldsConfig = {
  [sectionKey: string]: string[] | ((data: any) => string[]);
};

/**
 * Get mandatory fields for a section, handling conditional requirements
 */
export const getMandatoryFields = (
  sectionKey: string,
  data?: any
): string[] => {
  const config = MANDATORY_FIELDS[sectionKey];
  if (!config) return [];
  
  if (typeof config === 'function') {
    return config(data);
  }
  
  return config;
};

/**
 * Check if a field is mandatory for a given section
 */
export const isFieldMandatory = (
  sectionKey: string,
  fieldName: string,
  data?: any
): boolean => {
  const mandatoryFields = getMandatoryFields(sectionKey, data);
  return mandatoryFields.includes(fieldName);
};

/**
 * Mandatory fields configuration
 * Format: "section1_1": ["field1", "field2", ...]
 * Or use a function for conditional requirements: (data) => ["field1", ...]
 */
export const MANDATORY_FIELDS: MandatoryFieldsConfig = {
  // Section 1.1 - % Capex to GSDP
  "section1_1": ["year", "capitalAllocation", "gsdpForFY"],
  
  // Section 1.2 - % Capex Utilization
  "section1_2": ["year", "actualCapex", "stateCapexUtilisation"],
  
  // Section 1.3 - % of Credit Rated ULBs
  "section1_3": (data: any) => {
    const fields = ["totalULBs"];
    // If totalULBs > 0, then ulbList entries are required
    if (data?.totalULBs > 0) {
      // Individual ULB entry fields are required when entries exist
      // This is handled in validation, but we mark the array as required
    }
    return fields;
  },
  
  // Section 1.4 - % of ULBs issuing Bonds
  "section1_4": (data: any) => {
    const fields = ["totalULBs"];
    // If totalULBs > 0, then bondList entries are required
    return fields;
  },
  
  // Section 1.5 - Functional Financial Intermediary
  "section1_5": (data: any) => {
    const fields: string[] = ["hasIntermediary"];
    if (data?.hasIntermediary === "yes") {
      // When yes, ffiArray entries are required (handled in validation)
    } else if (data?.hasIntermediary === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 2.1 - Availability of Infrastructure Act/Policy
  "section2_1": ["infraActArray"],
  
  // Section 2.2 - Availability of Specialized Entity
  "section2_2": ["specializedEntityArray"],
  
  // Section 2.3 - Sector Infra Development Plan
  "section2_3": (data: any) => {
    const fields: string[] = ["hasInfraDevelopmentPlan"];
    if (data?.hasInfraDevelopmentPlan === "yes") {
      // infraDevelopmentArray is required
    } else if (data?.hasInfraDevelopmentPlan === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 2.4 - Investment Ready Project Pipeline
  "section2_4": (data: any) => {
    const fields: string[] = ["hasInvestmentReady"];
    if (data?.hasInvestmentReady === "yes") {
      fields.push("websiteLink");
    } else if (data?.hasInvestmentReady === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 2.5 - Asset Monetization Pipeline
  "section2_5": ["assetMonetizationArray"],
  
  // Section 3.1 - Availability of PPP Act/Policy
  "section3_1": (data: any) => {
    const fields: string[] = ["available"];
    if (data?.available === "yes") {
      fields.push("file");
    } else if (data?.available === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 3.2 - Functional PPP Cell/Unit
  "section3_2": (data: any) => {
    const fields: string[] = ["available"];
    if (data?.available === "yes") {
      fields.push("file");
    } else if (data?.available === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 3.3 - VGF/IIPDF Proposals Submitted
  "section3_3": ["VGFArray"],
  
  // Section 3.4 - PPP Bankable Projects
  "section3_4": ["projects"],
  
  // Section 4.1 - All Eligible Infra Projects on NIP Portal
  // Section 4.1 - Availability & Use of State/UT PMG
  "section4_1": (data: any) => {
    const fields: string[] = ["available"];
    if (data?.available === "yes") {
      fields.push("file");
    } else if (data?.available === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 4.2 - PM GatiShakti NMP Projects
  "section4_2": (data: any) => {
    const fields: string[] = ["adopted"];
    if (data?.adopted === "yes") {
      // projects array is required
    } else if (data?.adopted === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 4.3 - Adoption of ADR
  "section4_3": (data: any) => {
    const fields: string[] = ["adopted"];
    if (data?.adopted === "yes") {
      fields.push("file");
    } else if (data?.adopted === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 4.4 - Best Practices
  "section4_4": (data: any) => {
    const fields: string[] = ["implemented"];
    if (data?.implemented === "yes") {
      // practices array is required
    } else if (data?.implemented === "no") {
      fields.push("comment");
    }
    return fields;
  },
  
  // Section 4.5 - Capacity Building
  "section4_5": ["capacityArray"],
};

