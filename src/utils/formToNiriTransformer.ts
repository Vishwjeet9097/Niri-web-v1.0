import { SubmissionFormData } from "@/features/submission/types";
import {
  NiriSubmission,
  SubmissionData,
  IndicatorData,
} from "@/types/submission";

/**
 * Transform UI form data to NIRI submission format
 */
export function transformFormDataToNiriSubmission(
  formData: Partial<SubmissionFormData>,
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

  // Transform Infrastructure Financing data
  if (formData.infraFinancing) {
    // 1.1 - Capex to GSDP ratio
    if (formData.infraFinancing.section1_1) {
      const s1_1 = formData.infraFinancing.section1_1;
      const capexToGsdpRatio = parseFloat(s1_1.allocationToGSDP) || 0;

      submissionData.Infrastructure_Financing.push({
        indicator_id: "1.1",
        indicator_name: "% of Capex (Budgetary Capital Allocation) to GSDP",
        user_fill_value_a1: capexToGsdpRatio,
        user_fill_value_a2: null,
      });
    }

    // 1.2 - Capex Utilization
    if (formData.infraFinancing.section1_2) {
      const s1_2 = formData.infraFinancing.section1_2;
      const capexUtilization = parseFloat(s1_2.capexActualsToGSDP) || 0;

      submissionData.Infrastructure_Financing.push({
        indicator_id: "1.2",
        indicator_name: "% Capex Utilization",
        user_fill_value_a1: capexUtilization,
        user_fill_value_a2: null,
      });
    }

    // 1.3 - Credit Rated ULBs
    if (formData.infraFinancing.section1_3) {
      const creditRatedULBs = formData.infraFinancing.section1_3.length;

      submissionData.Infrastructure_Financing.push({
        indicator_id: "1.3",
        indicator_name: "% of Credit Rated ULBs",
        user_fill_value_a1: creditRatedULBs,
        user_fill_value_a2: null,
        details: {
          planned_sectors: formData.infraFinancing.section1_3.map((ulb) => ({
            sector: ulb.cityName,
            plan_year:
              new Date(ulb.ratingDate).getFullYear() ||
              new Date().getFullYear(),
          })),
        },
      });
    }

    // 1.4 - ULBs issuing Bonds
    if (formData.infraFinancing.section1_4) {
      const ulbsIssuingBonds = formData.infraFinancing.section1_4.length;

      submissionData.Infrastructure_Financing.push({
        indicator_id: "1.4",
        indicator_name: "% of ULBs issuing Bonds",
        user_fill_value_a1: ulbsIssuingBonds,
        user_fill_value_a2: null,
        details: {
          projects_submitted: formData.infraFinancing.section1_4.map(
            (bond) => ({
              project_name: bond.cityName,
              fund_type: bond.bondType,
            })
          ),
        },
      });
    }

    // 1.5 - Functional financial intermediary
    if (formData.infraFinancing.section1_5) {
      const hasFunctionalIntermediary =
        formData.infraFinancing.section1_5.length > 0;

      submissionData.Infrastructure_Financing.push({
        indicator_id: "1.5",
        indicator_name: "Functional financial intermediary for infra dev",
        user_fill_value_a1: hasFunctionalIntermediary ? "Yes" : "No",
        user_fill_value_a2: null,
        details: {
          practices_list: formData.infraFinancing.section1_5.map((org) => ({
            name: org.organisationName,
          })),
        },
      });
    }
  }

  // Transform Infrastructure Development data
  if (formData.infraDevelopment) {
    // 2.1 - Infrastructure Act/Policy
    if (formData.infraDevelopment.section2_1) {
      const hasActPolicy = formData.infraDevelopment.section2_1.length > 0;

      submissionData.Infrastructure_Development.push({
        indicator_id: "2.1",
        indicator_name: "Availability of Infrastructure Act/Policy",
        user_fill_value_a1: hasActPolicy ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 2.2 - Specialized entity
    if (formData.infraDevelopment.section2_2) {
      const hasSpecializedEntity =
        formData.infraDevelopment.section2_2.length > 0;

      submissionData.Infrastructure_Development.push({
        indicator_id: "2.2",
        indicator_name: "Availability of specialized entity for infra dev",
        user_fill_value_a1: hasSpecializedEntity ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 2.3 - Sector Infra Development Plan
    if (formData.infraDevelopment.section2_3) {
      const sectorPlans = formData.infraDevelopment.section2_3.length;

      submissionData.Infrastructure_Development.push({
        indicator_id: "2.3",
        indicator_name: "Availability of Sector Infra Development Plan",
        user_fill_value_a1: sectorPlans,
        user_fill_value_a2: null,
        details: {
          planned_sectors: formData.infraDevelopment.section2_3.map((plan) => ({
            sector: plan.sector,
            plan_year: new Date().getFullYear(),
          })),
        },
      });
    }

    // 2.4 - Investment Ready project pipeline
    if (formData.infraDevelopment.section2_4) {
      const hasInvestmentPipeline =
        formData.infraDevelopment.section2_4.length > 0;

      submissionData.Infrastructure_Development.push({
        indicator_id: "2.4",
        indicator_name: "Availability of Investment Ready project pipeline",
        user_fill_value_a1: hasInvestmentPipeline ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 2.5 - Asset Monetization pipeline
    if (formData.infraDevelopment.section2_5) {
      const hasMonetizationPipeline =
        formData.infraDevelopment.section2_5.length > 0;

      submissionData.Infrastructure_Development.push({
        indicator_id: "2.5",
        indicator_name: "Availability of Asset Monetization pipeline",
        user_fill_value_a1: hasMonetizationPipeline ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }
  }

  // Transform PPP Development data
  if (formData.pppDevelopment) {
    // 3.1 - PPP Act/Policy
    if (formData.pppDevelopment.section3_1) {
      const hasPppAct = formData.pppDevelopment.section3_1.available === "yes";

      submissionData.PPP_Development.push({
        indicator_id: "3.1",
        indicator_name: "Availability of PPP Act/Policy",
        user_fill_value_a1: hasPppAct ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 3.2 - PPP Cell
    if (formData.pppDevelopment.section3_2) {
      const hasPppCell = formData.pppDevelopment.section3_2.available === "yes";

      submissionData.PPP_Development.push({
        indicator_id: "3.2",
        indicator_name: "Functional State/UT PPP Cell/Unit",
        user_fill_value_a1: hasPppCell ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 3.3 - VGF/IIPDF Proposals
    if (formData.pppDevelopment.section3_3) {
      const vgfProposals = formData.pppDevelopment.section3_3.length;

      submissionData.PPP_Development.push({
        indicator_id: "3.3",
        indicator_name: "Proposals submitted under VGF/IIPDF",
        user_fill_value_a1: vgfProposals,
        user_fill_value_a2: null,
        details: {
          projects_submitted: formData.pppDevelopment.section3_3.map(
            (proposal) => ({
              project_name: proposal.projectName,
              fund_type: proposal.type,
            })
          ),
        },
      });
    }

    // 3.4 - PPP Bankable projects
    if (formData.pppDevelopment.section3_4) {
      const capexFundedPercentage =
        parseFloat(formData.pppDevelopment.section3_4.capexFundedPercentage) ||
        0;

      submissionData.PPP_Development.push({
        indicator_id: "3.4",
        indicator_name: "Proportion of TPC of PPP or Bankable projects",
        user_fill_value_a1: capexFundedPercentage,
        user_fill_value_a2: null,
      });
    }
  }

  // Transform Infrastructure Enablers data
  if (formData.infraEnablers) {
    // 4.1 - PMG Portal Eligible
    if (formData.infraEnablers.section4_1) {
      const allEligible =
        formData.infraEnablers.section4_1.allEligible === "yes";

      submissionData.Infrastructure_Enablers.push({
        indicator_id: "4.1",
        indicator_name: "Are all eligible Infra projects on PMG portal",
        user_fill_value_a1: allEligible ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 4.2 - State PMG Portal
    if (formData.infraEnablers.section4_2) {
      const hasStatePortal =
        formData.infraEnablers.section4_2.available === "yes";

      submissionData.Infrastructure_Enablers.push({
        indicator_id: "4.2",
        indicator_name: "Availability and use of State/UT PMG portal",
        user_fill_value_a1: hasStatePortal ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 4.3 - PM GatiShakti NMP
    if (formData.infraEnablers.section4_3) {
      const adopted = formData.infraEnablers.section4_3.adopted === "yes";

      submissionData.Infrastructure_Enablers.push({
        indicator_id: "4.3",
        indicator_name: "Adoption of PM GatiShakti NMP",
        user_fill_value_a1: adopted ? 1 : 0,
        user_fill_value_a2: null,
        details: {
          projects_planned_via_pmgs: adopted
            ? [
                {
                  project_name: "PM GatiShakti NMP Implementation",
                },
              ]
            : [],
        },
      });
    }

    // 4.4 - ADR Adoption
    if (formData.infraEnablers.section4_4) {
      const adopted = formData.infraEnablers.section4_4.adopted === "yes";

      submissionData.Infrastructure_Enablers.push({
        indicator_id: "4.4",
        indicator_name: "Adoption of Alternate Dispute Resolution (ADR)",
        user_fill_value_a1: adopted ? "Yes" : "No",
        user_fill_value_a2: null,
      });
    }

    // 4.5 - Innovative Practices
    if (formData.infraEnablers.section4_5) {
      const implemented =
        formData.infraEnablers.section4_5.implemented === "yes";

      submissionData.Infrastructure_Enablers.push({
        indicator_id: "4.5",
        indicator_name: "Any Innovative Practice for Infra Dev",
        user_fill_value_a1: implemented ? 1 : 0,
        user_fill_value_a2: null,
        details: {
          practices_list:
            implemented && formData.infraEnablers.section4_5.practiceName
              ? [
                  {
                    name: formData.infraEnablers.section4_5.practiceName,
                  },
                ]
              : [],
        },
      });
    }

    // 4.6 - Capacity Building
    if (formData.infraEnablers.section4_6) {
      const capacityBuilding = formData.infraEnablers.section4_6.length;

      submissionData.Infrastructure_Enablers.push({
        indicator_id: "4.6",
        indicator_name: "Capacity building - officer participation",
        user_fill_value_a1: capacityBuilding,
        user_fill_value_a2: null,
      });
    }
  }

  return {
    state_ut_id: stateUt,
    submission_status: "DRAFT",
    submission_date: now,
    submitted_by_user_id: userId,
    submission_data: submissionData,
  };
}

/**
 * Transform NIRI submission format back to UI form data
 */
export function transformNiriSubmissionToFormData(
  submission: NiriSubmission
): Partial<SubmissionFormData> {
  const formData: Partial<SubmissionFormData> = {};

  // This is a complex transformation that would need to be implemented
  // based on the specific requirements. For now, return empty object.
  // In a real implementation, you would parse the NIRI submission data
  // and map it back to the UI form structure.

  return formData;
}
