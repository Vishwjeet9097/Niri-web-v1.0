/**
 * Global tooltip configuration for all indicators
 * This file contains detailed help text for each indicator that will be displayed
 * in tooltips across the application (Create page, Review page, etc.)
 */

export interface IndicatorTooltip {
  code: string;
  fieldName: string;
  tooltip: string;
}

export const INDICATOR_TOOLTIPS: Record<string, IndicatorTooltip> = {
  "1.1": {
    code: "1.1",
    fieldName: "Budgeted Capex & GSDP",
    tooltip:
      "Data Requirement: Provide GSDP and Budgeted Capex allocation data.\n\nData Validation & Calculation: Percentage of Capex to GSDP is calculated as the ratio of Budgeted Capital Allocation by State in the financial year of assessment and the most recent verifiable GSDP data available. Details provided by State will be verified with the most recent data available on CGA website.\n\nScoring Methodology: 10 marks for every 1%.\n\nDocuments Required: NIL",
  },
  "1.2": {
    code: "1.2",
    fieldName: "State Capex Utilization",
    tooltip:
      "Data Requirement: Provide Budgeted Capital Allocation and Actual Capital Expenditure data.\n\nData Validation & Calculation: Percentage of Capex Utilization is calculated as the ratio of actual Capital Expenditure and the Total Budgeted Capital Allocation by the State in the financial year of assessment. Details provided by State will be verified with the most recent data available on CGA website.\n\nScoring Methodology: 1 mark for every 2%.\n\nDocuments Required: NIL",
  },
  "1.3": {
    code: "1.3",
    fieldName: "ULB Credit Rating Coverage",
    tooltip:
      "Data Requirement: Provide count of Total number of ULBs, list of credit rated ULBs with copy of credit rating certificates.\n\nData Validation & Calculation: Percentage of credit rated ULB is calculated as the ratio of the number of credit rated ULBs and Total number of ULBs with a population coverage of 50,000 and above, in the financial year of assessment.\n\nScoring Methodology: 1 mark for every 2%.\n\nDocuments Required: Copy of credit rating certificate for every credit rated ULB",
  },
  "1.4": {
    code: "1.4",
    fieldName: "ULB Bond Issuance Details",
    tooltip:
      "Data Requirement: Provide Details on number and type of bonds issuances in the financial year of assessment and name of issuing ULBs.\n\nData Validation & Calculation: Under issuance of Bonds by ULBs, issuance of Municipal Bonds, Green Bonds, or any capital market debt instrument in the financial year of assessment by ULBs which have a population coverage of 50,000 and above will be considered. Percentage of such ULBs issuing bonds is calculated as ratio of No. of ULBs issuing bonds and total no. of ULBs in the financial year of assessment.\n\nScoring Methodology: 2 marks for every 1%.\n\nDocuments Required: NIL",
  },
  "1.5": {
    code: "1.5",
    fieldName: "State Financial Intermediary",
    tooltip:
      "Data Requirement: Provide website link of the financial entity and information around funding mobilized.\n\nData Validation & Calculation: Financial Intermediary means any financing entity (statutory body, corporation, trust, etc.) of the State government undertaking financing for only infrastructure projects. SPVs formed only for implementation of a particular project will not be considered under this metric.\n\nScoring Methodology: Full Marks on a valid financial intermediary.\n\nDocuments Required: NIL",
  },
  "2.1": {
    code: "2.1",
    fieldName: "Infrastructure Act / Policy",
    tooltip:
      "**Provide copy of the Infrastructure Act/Policy. In case no specific infrastructure act or policy is available, sector specific policies promoting infra in the respective sectors can be submitted, provided the State has a minimum of 3 sector-specific policies for infrastructure.**\n\nEach sector gets 10 marks and to secure full marks, 5 sector-specific policies will be required. Copy of each Act/Policy to be provided. An overarching Infrastructure Act/Policy is required for supporting development of infrastructure projects across multiple sectors. For this indicator, infrastructure sectors will be either those under Ministry of Finance's Harmonised Master List or those approved as infra through some policy by the State itself.",
  },
  "2.2": {
    code: "2.2",
    fieldName: "Specialized Infrastructure Entity",
    tooltip:
      "**Provide Notification for establishment of specialized Authority/Department/Agency and functions/ mandate of entity to be provided.**\n\nSpecialized Entity specified means any state-level Institutional Entity established through Cabinet approval, statute, or Government Order in form of an Authority/Department/Agency, whose primary and exclusive mandate is infrastructure project development and structuring across multiple sectors. Statutory Development Authorities, Urban Local Bodies, Industrial or Area Development Authorities, Housing Boards, sector-specific utilities, line departments performing routine administrative functions, or SPVs constituted for a single project, geography, or corridor shall not qualify under this indicator.",
  },
  "2.3": {
    code: "2.3",
    fieldName: "Sector Infrastructure Development Plan",
    tooltip:
      "**Provide a copy of the Sector Infrastructure Developmental Plan, if available.**\n\nSector Infrastructure Development Plan means a formally approved, sector-specific planning document prepared by the concerned infrastructure department (or a designated nodal infrastructure agency) for a defined medium- to long-term horizon (normally 5–10 years). The plan must include inter-alia - current status and targets of infra development with quantum of investment required and proposed ways to mobilize such investment to achieve the targets. Broad policy statements or general development plans without quantified targets, investment estimates, and financing pathways shall not qualify.",
  },
  "2.4": {
    code: "2.4",
    fieldName: "Investment-ready Project Pipeline",
    tooltip:
      "**Provide the website link where the projects are hosted and visible to investors.**\n\nInvestment ready project pipeline means a publicly available list of infrastructure that is ready for market engagement / for bidding out and where the public authority is seeking an investor or an equity/JV/developmental partner. Projects included must have crossed minimum preparation thresholds (such as preliminary feasibility/DPR) and identification of implementation structure. The pipeline shall be hosted on an official state/center government website, be accessible to investors, and include basic project details and timelines.",
  },
  "2.5": {
    code: "2.5",
    fieldName: "Asset Monetisation Pipeline",
    tooltip:
      '**Provide the list of assets and the website link where the details have been hosted.**\n\nAn "Asset Monetisation Pipeline" shall mean a publicly available list of core brownfield infrastructure assets proposed for monetisation through time-bound transfer of usage or revenue rights to the private sector for an upfront and/or periodic consideration, without transfer of asset ownership. The pipeline shall specify the mode of monetization of the brownfield assets (e.g., TOT, lease, concession, InvIT, O&M with revenue share), indicative timelines, and basic asset details. The pipeline shall be hosted on an official government website and accessible to investors.',
  },
  "3.1": {
    code: "3.1",
    fieldName: "PPP Policy",
    tooltip:
      "**Provide the Copy of the PPP Policy or copy of relevant provisions of Infrastructure Act/Policy for promoting/ developing PPP projects.**\n\nPPP Policy should be available for supporting development of infrastructure projects in PPP across multiple sectors. It could be either a standalone Policy or a part of the Infrastructure Act/Policy, provided that in such case it clearly specifies provisions for promoting/developing PPP projects.",
  },
  "3.2": {
    code: "3.2",
    fieldName: "State PPP Cell / Unit",
    tooltip:
      "**Provide copy of the Notification for establishment of PPP Unit. If it is part of Specialized Entity then relevant provisions of its mandate for promoting/undertaking PPP projects are to be provided.**\n\nFunctional State/UT PPP Cell/Unit is either a standalone entity setup for promoting/undertaking PPP mode of infra project development. It could also be part of a Specialized Entity, if its ToR or mandate clearly specifies provisions for promoting/undertaking PPP projects.",
  },
  "3.3": {
    code: "3.3",
    fieldName: "VGF / IIPDF Proposals",
    tooltip:
      "**Provide List and details of submitted VGF/IIPDF proposals.**\n\nProposals submitted for VGF or Project Development support to either DEA in stipulated format (VGF/IIPDF Memo or online via https://www.pppinindia.gov.in/ portal) or under a State-Specific Scheme in financial year of assessment (indicated at the time of NIE-I's notification) will be considered. If the project is being considered under a state scheme, the policy document for the scheme should also be attached. It should also be noted that any project which receives VGF support from both Centre and State, will only be counted once, to avoid any duplication or repetition of projects being considered.",
  },
  "3.4": {
    code: "3.4",
    fieldName: "PPP Project Cost Ratio",
    tooltip:
      "**Provide the List of PPP projects awarded in the financial year of Assessment. Copy of Letter of Award may also be requested for verification of project details.**\n\nThis metric indicates the extent to which the State is leveraging private capital and non-budgetary resources to supplement public infrastructure investment, rather than relying solely on budgetary funding. For this parameter, the ratio of Total Project Cost (TPC) of PPP projects awarded during the financial year of assessment to the State's annual budgeted capital allocation will be calculated. Full marks will be provided where the computed value of the ratio is 50% or higher. Proportionate marks shall be awarded for values below the threshold, as per the scoring framework.",
  },
  "4.1": {
    code: "4.1",
    fieldName: "State Project Monitoring System",
    tooltip:
      "**Provide the relevant Government Order / notification and the portal link evidencing the State Project Monitoring Group mechanism.**\n\nState Infrastructure Project Monitoring mechanism as extension or on lines of GoI's PMG (Project Monitoring Group) portal for tracking monitoring of implementation of infrastructure projects. The portal should enable project-wise, milestone-based monitoring, identification of inter-departmental issues, and monitoring through a defined escalation mechanism, with reviews at highest levels of government.",
  },
  "4.2": {
    code: "4.2",
    fieldName: "PM GatiShakti Usage",
    tooltip:
      "**Provide Evidence of project-specific use of the platform, such as screenshots of the PM GatiShakti planning interface, State-level dashboards linked to PM GatiShakti, official communications, or project IDs generated on the PM GatiShakti platform.**\n\nAdoption of PM GatiShakti for project planning means use of PM GatiShakti digital platform and its data layers at the project identification and planning stage to inform project alignment, inter-sectoral coordination, and optimisation of project scope and location. Generic references to PM GatiShakti in policy documents without demonstrable project-level usage shall not qualify. Final decision regarding applicability of the same rests with DEA.",
  },
  "4.3": {
    code: "4.3",
    fieldName: "ADR Mechanism",
    tooltip:
      "**Provide Copy of official orders/notifications for ADR mechanism dedicated to infrastructure projects.**\n\nAlternative Dispute Resolution (ADR) means any State/UT-notified or contractually mandated mechanism for time-bound resolution of disputes arising from infrastructure or PPP projects, prior to or in lieu of litigation. ADR may include arbitration, conciliation, mediation, dispute resolution boards, or judicial settlement mechanisms (including Lok Adalats or notified settlement schemes), provided these are explicitly applicable to infrastructure contracts. Generic legal provisions or ad-hoc schemes not linked to infrastructure projects shall not qualify.",
  },
  "4.4": {
    code: "4.4",
    fieldName: "Innovative Practices",
    tooltip:
      "**Provide documentary evidence for each of the identified innovative practices.**\n\nInnovative practice must be other than those covered under NIE-I metrics. The purpose of the innovative practice shall be including but not limited to encouraging bankable and viable project structuring, faster rolling out of projects, promoting private investment in Infra, promoting user pay models, and efficient project monitoring, etc. Right to accept the indicated policy as innovative practice will be with IFS, DEA.",
  },
  "4.5": {
    code: "4.5",
    fieldName: "Infrastructure Training",
    tooltip:
      "**Provide list of officials who have completed infrastructure focused training in the assessment year.**\n\nInfra-Trainings includes training on infra development imparted by any source: GoI, State, academic institutes, international agencies, etc.",
  },
};

/**
 * Get tooltip text for an indicator code
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns The tooltip text or null if not found
 */
export function getIndicatorTooltip(indicatorCode: string): string | null {
  return INDICATOR_TOOLTIPS[indicatorCode]?.tooltip || null;
}

/**
 * Get full tooltip information for an indicator code
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns The tooltip object or null if not found
 */
export function getIndicatorTooltipInfo(
  indicatorCode: string
): IndicatorTooltip | null {
  return INDICATOR_TOOLTIPS[indicatorCode] || null;
}

/**
 * Get field name for an indicator code
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns The field name or null if not found
 */
export function getIndicatorFieldName(indicatorCode: string): string | null {
  return INDICATOR_TOOLTIPS[indicatorCode]?.fieldName || null;
}
