// NIRI Submission Data Types
export interface SubmissionMetadata {
  state_ut_id: string;
  submission_status: string;
  submission_date: string;
  submitted_by_user_id: string;
}

export interface IndicatorData {
  indicator_id: string;
  indicator_name: string;
  user_fill_value_a1: number | string;
  user_fill_value_a2: number | string | null;
  details?: {
    planned_sectors?: Array<{ sector: string; plan_year: number }>;
    projects_submitted?: Array<{ project_name: string; fund_type: string }>;
    projects_planned_via_pmgs?: Array<{ project_name: string }>;
    practices_list?: Array<{ name: string }>;
  };
}

export interface SubmissionData {
  Infrastructure_Financing: IndicatorData[];
  Infrastructure_Development: IndicatorData[];
  PPP_Development: IndicatorData[];
  Infrastructure_Enablers: IndicatorData[];
}

export interface NiriSubmission {
  state_ut_id: string;
  submission_status: string;
  submission_date: string;
  submitted_by_user_id: string;
  submission_data: SubmissionData;
}

// Form field mapping for UI
export interface FormFieldMapping {
  [key: string]: {
    section: keyof SubmissionData;
    indicator_id: string;
    field_type: "number" | "text" | "select" | "boolean";
    options?: string[];
    required: boolean;
  };
}

export const FORM_FIELD_MAPPING: FormFieldMapping = {
  // Infrastructure Financing
  capexToGsdpRatio: {
    section: "Infrastructure_Financing",
    indicator_id: "1.1",
    field_type: "number",
    required: true,
  },
  capexUtilization: {
    section: "Infrastructure_Financing",
    indicator_id: "1.2",
    field_type: "number",
    required: true,
  },
  creditRatedULBs: {
    section: "Infrastructure_Financing",
    indicator_id: "1.3",
    field_type: "number",
    required: true,
  },
  ulbsIssuingBonds: {
    section: "Infrastructure_Financing",
    indicator_id: "1.4",
    field_type: "number",
    required: true,
  },
  functionalFinancialIntermediary: {
    section: "Infrastructure_Financing",
    indicator_id: "1.5",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },

  // Infrastructure Development
  infrastructureActPolicy: {
    section: "Infrastructure_Development",
    indicator_id: "2.1",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  specializedEntity: {
    section: "Infrastructure_Development",
    indicator_id: "2.2",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  sectorInfraPlan: {
    section: "Infrastructure_Development",
    indicator_id: "2.3",
    field_type: "number",
    required: true,
  },
  investmentReadyPipeline: {
    section: "Infrastructure_Development",
    indicator_id: "2.4",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  assetMonetizationPipeline: {
    section: "Infrastructure_Development",
    indicator_id: "2.5",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },

  // PPP Development
  pppActPolicy: {
    section: "PPP_Development",
    indicator_id: "3.1",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  pppCell: {
    section: "PPP_Development",
    indicator_id: "3.2",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  vgfIipdfProposals: {
    section: "PPP_Development",
    indicator_id: "3.3",
    field_type: "number",
    required: true,
  },
  pppBankableProjects: {
    section: "PPP_Development",
    indicator_id: "3.4",
    field_type: "number",
    required: true,
  },

  // Infrastructure Enablers
  pmgPortalEligible: {
    section: "Infrastructure_Enablers",
    indicator_id: "4.1",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  statePmgPortal: {
    section: "Infrastructure_Enablers",
    indicator_id: "4.2",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  pmGatiShaktiAdoption: {
    section: "Infrastructure_Enablers",
    indicator_id: "4.3",
    field_type: "number",
    required: true,
  },
  adrAdoption: {
    section: "Infrastructure_Enablers",
    indicator_id: "4.4",
    field_type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  innovativePractices: {
    section: "Infrastructure_Enablers",
    indicator_id: "4.5",
    field_type: "number",
    required: true,
  },
  capacityBuilding: {
    section: "Infrastructure_Enablers",
    indicator_id: "4.6",
    field_type: "number",
    required: true,
  },
};
