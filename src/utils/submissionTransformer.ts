/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  NiriSubmission,
  SubmissionData,
  IndicatorData,
  FormFieldMapping,
  FORM_FIELD_MAPPING,
} from "@/types/submission";

export function transformFormDataToNiriSubmission(
  formData: Record<string, any>,
  userId: string,
  stateUt: string
): NiriSubmission {
  const now = new Date().toISOString();

  // Initialize submission data structure
  const submissionData: SubmissionData = {
    Infrastructure_Financing: [],
    Infrastructure_Development: [],
    PPP_Development: [],
    Infrastructure_Enablers: [],
  };

  // Transform each form field to indicator data
  Object.entries(formData).forEach(([fieldName, value]) => {
    const mapping = FORM_FIELD_MAPPING[fieldName];
    if (!mapping) return;

    const indicatorData: IndicatorData = {
      indicator_id: mapping.indicator_id,
      indicator_name: getIndicatorName(mapping.indicator_id),
      user_fill_value_a1: value,
      user_fill_value_a2: null,
    };

    // Add details for specific indicators
    if (mapping.indicator_id === "2.3" && value > 0) {
      indicatorData.details = {
        planned_sectors: generatePlannedSectors(value),
      };
    } else if (mapping.indicator_id === "3.3" && value > 0) {
      indicatorData.details = {
        projects_submitted: generateProjectsSubmitted(value),
      };
    } else if (mapping.indicator_id === "4.2"" && value > 0) {
      indicatorData.details = {
        projects_planned_via_pmgs: generatePmgsProjects(value),
      };
    } else if (mapping.indicator_id === "4.4"" && value > 0) {
      indicatorData.details = {
        practices_list: generateInnovativePractices(value),
      };
    }

    // Add to appropriate section
    submissionData[mapping.section].push(indicatorData);
  });

  return {
    state_ut_id: stateUt,
    submission_status: "SUBMITTED_TO_STATE",
    submission_date: now,
    submitted_by_user_id: userId,
    submission_data: submissionData,
  };
}
/**
 * Transform UI form data to NIRI submission format
 */
export function transformFormDataToSectionSubmission(
  formData: Record<string, any>,
  userId: string,
  stateUt: string
): any {
  const now = new Date().toISOString();

  // Build submission payload in backend’s expected structure
  const submissionId = `SUB-${new Date().getFullYear()}-${Math.floor(
    Math.random() * 1_000_000
  )}`;

  const transformedSubmission = {
    submissionId,
    formData: {
      infraFinancing: {
        section1_1: formData.section1_1 || {},
        section1_2: formData.section1_2 || {},
        section1_3: formData.section1_3 || {},
        section1_4: formData.section1_4 || {},
        section1_5: formData.section1_5 || {},
      },
      infraDevelopment: {
        section2_1: formData.section2_1 || {},
        section2_2: formData.section2_2 || {},
        section2_3: formData.section2_3 || {},
        section2_4: formData.section2_4 || {},
        section2_5: formData.section2_5 || {},
      },
      pppDevelopment: {
        section3_1: formData.section3_1 || {},
        section3_2: formData.section3_2 || {},
        section3_3: formData.section3_3 || {},
        section3_4: formData.section3_4 || {},
      },
      infraEnablers: {
        section4_1: formData.section4_1 || {},
      },
    },
    status: "SUBMITTED_TO_STATE",
    submittedBy: userId,
    stateUt,
    submittedOn: now,
  };

  // Debug log for clarity
  console.log("🧩 Transformed NIRI Submission:", transformedSubmission);

  return transformedSubmission;
}


/**
 * Transform NIRI submission format back to UI form data
 */
export function transformNiriSubmissionToFormData(
  submission: NiriSubmission
): Record<string, any> {
  const formData: Record<string, any> = {};

  // Process each section
  Object.entries(submission.submission_data).forEach(
    ([sectionName, indicators]) => {
      indicators.forEach((indicator) => {
        const fieldName = getFieldNameByIndicatorId(indicator.indicator_id);
        if (fieldName) {
          formData[fieldName] = indicator.user_fill_value_a1;
        }
      });
    }
  );

  return formData;
}

/**
 * Get indicator name by ID
 */
function getIndicatorName(indicatorId: string): string {
  const indicatorNames: Record<string, string> = {
    "1.1": "% of Capex (Budgetary Capital Allocation) to GSDP",
    "1.2": "% Capex Utilization",
    "1.3": "% of Credit Rated ULBs",
    "1.4": "% of ULBs issuing Bonds",
    "1.5": "Functional financial intermediary for infra dev",
    "2.1": "Availability of Infrastructure Act/Policy",
    "2.2": "Availability of specialized entity for infra dev",
    "2.3": "Availability of Sector Infra Development Plan",
    "2.4": "Availability of Investment Ready project pipeline",
    "2.5": "Availability of Asset Monetization pipeline",
    "3.1": "Availability of PPP Act/Policy",
    "3.2": "Functional State/UT PPP Cell/Unit",
    "3.3": "Proposals submitted under VGF/IIPDF",
    "3.4": "Proportion of TPC of PPP or Bankable projects",
    "4.1": "Availability and use of State/UT PMG portal",
    "4.2": "Adoption of PM GatiShakti NMP",
    "4.3": "Adoption of Alternate Dispute Resolution (ADR)",
    "4.4": "Any Innovative Practice for Infra Dev",
    "4.5": "Capacity building - officer participation",
  };

  return indicatorNames[indicatorId] || "";
}

/**
 * Get field name by indicator ID
 */
function getFieldNameByIndicatorId(indicatorId: string): string | null {
  const entry = Object.entries(FORM_FIELD_MAPPING).find(
    ([_, mapping]) => mapping.indicator_id === indicatorId
  );
  return entry ? entry[0] : null;
}

/**
 * Generate planned sectors data
 */
function generatePlannedSectors(
  count: number
): Array<{ sector: string; plan_year: number }> {
  const sectors = [
    "Transport",
    "Water",
    "Energy",
    "Social Infra",
    "Logistics",
    "Digital",
    "Healthcare",
    "Education",
  ];
  const years = [2023, 2024, 2025, 2026];

  return Array.from({ length: count }, (_, i) => ({
    sector: sectors[i % sectors.length],
    plan_year: years[i % years.length],
  }));
}

/**
 * Generate projects submitted data
 */
function generateProjectsSubmitted(
  count: number
): Array<{ project_name: string; fund_type: string }> {
  const fundTypes = ["VGF", "IIPDF"];

  return Array.from({ length: count }, (_, i) => ({
    project_name: `Proj P${i + 1}`,
    fund_type: fundTypes[i % fundTypes.length],
  }));
}

/**
 * Generate PMGS projects data
 */
function generatePmgsProjects(count: number): Array<{ project_name: string }> {
  return Array.from({ length: count }, (_, i) => ({
    project_name: `P${i + 1}`,
  }));
}

/**
 * Generate innovative practices data
 */
function generateInnovativePractices(count: number): Array<{ name: string }> {
  const practices = [
    "GIS Mapping",
    "Fast Track Clearance",
    "Infra Bond Issuance",
    "Skill Dev Program",
    "Digital Monitoring",
    "Public Private Partnership",
    "Green Infrastructure",
    "Smart City Integration",
  ];

  return Array.from({ length: count }, (_, i) => ({
    name: practices[i % practices.length],
  }));
}

/**
 * Validate NIRI submission data
 */
export function validateNiriSubmission(submission: NiriSubmission): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!submission.state_ut_id) errors.push("State/UT ID is required");
  if (!submission.submitted_by_user_id) errors.push("User ID is required");
  if (!submission.submission_data) errors.push("Submission data is required");

  // Check each section has data
  const sections = Object.keys(submission.submission_data);
  if (sections.length === 0) errors.push("At least one section must have data");

  // Check each indicator has required data
  sections.forEach((sectionName) => {
    const indicators =
      submission.submission_data[sectionName as keyof SubmissionData];
    indicators.forEach((indicator) => {
      if (!indicator.indicator_id)
        errors.push(`Indicator ID is required for ${sectionName}`);
      if (!indicator.indicator_name)
        errors.push(`Indicator name is required for ${sectionName}`);
      if (
        indicator.user_fill_value_a1 === undefined ||
        indicator.user_fill_value_a1 === null
      ) {
        errors.push(
          `Value A1 is required for indicator ${indicator.indicator_id}`
        );
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
