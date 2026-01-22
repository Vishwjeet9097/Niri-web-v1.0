/**
 * Global tooltip configuration for all ministry indicators
 * This file contains detailed help text for each ministry indicator that will be displayed
 * in tooltips across the ministry form builder
 */

export interface MinistryIndicatorTooltip {
  code: string;
  fieldName: string;
  tooltip: string;
}

export const MINISTRY_INDICATOR_TOOLTIPS: Record<string, MinistryIndicatorTooltip> = {
  "1.1": {
    code: "1.1",
    fieldName: "% Capex Utilization",
    tooltip:
      "Data Requirement: Provide details of Total Budgeted Capital Expenditure and Actual Capital Expenditure incurred by the Ministry during the financial year of assessment.\n\nData Validation & Calculation: Percentage of Capex Utilization is calculated as the ratio of Actual Capital Expenditure to Total Budgeted Capital Expenditure in the financial year of assessment (as indicated at the time of NIE-I notification).Capex utilization shall be calculated primarily against allocated GBS, IEBR, and Grants for Creation of Capital Assets, wherever applicable. Data submitted by the Ministry will be verified.\n\nScoring Methodology: 1 mark for every 1% of Capex Utilization.\n\nDocuments Required: -NIL-",
  },
  "1.2": {
    code: "1.2",
    fieldName: "Asset Monetization Pipeline – Achievement against Annual Target",
    tooltip:
      "Data Requirement: Provide details of Asset Monetization targets and actual achievement during the financial year of assessment.\n\nData Validation & Calculation: Asset Monetization targets are set under NMP 1.0 / Asset Monetisation 2.0 and monitored through CGAM. Achievement against targets shall be provided as per Annex 13 and verified against data from NITI Aayog. For Ministries not assigned an Asset Monetization target under NMP, scores shall be normalized.\n\nScoring Methodology: 1.5 marks for every 2% achievement against the annual target.\n\nDocuments Required: -NIL-",
  },
  "1.3": {
    code: "1.3",
    fieldName: "Special Financing Mechanism for Infrastructure Development",
    tooltip:
      "Data Requirement: Details of any Special Financing Mechanism introduced by the Ministry.\n\nData Validation & Calculation: A Special Financing Mechanism refers to an innovative financing initiative, over and above routine budgetary support, aimed at mobilizing additional capital or improving bankability of infrastructure projects. Details submitted shall be verified.\n\nScoring Methodology: Full marks for one or more eligible Special Financing Mechanisms.\n\nDocuments Required: -NIL-",
  },
  "2.1": {
    code: "2.1",
    fieldName: "Availability of Infrastructure Development Plan",
    tooltip:
      "Data Requirement: Copy of the approved Infrastructure Development Plan.\n\nData Validation & Calculation: The Plan must be a formally approved, ministry-level document with a medium- to long-term horizon (minimum up to 2030), outlining infrastructure roadmap, targets, estimated investments, and financing pathways.\n\nScoring Methodology: Yes / No.\n\nDocuments Required: Copy of the Infrastructure Developmental Plan",
  },
  "2.2": {
    code: "2.2",
    fieldName: "Availability of Investment-Ready Project Pipeline",
    tooltip:
      "Data Requirement: Details and web link of the Investment-Ready Project Pipeline.\n\nData Validation & Calculation: The pipeline must be publicly available on an official government website and include projects ready for market engagement or bidding, with basic project details and timelines.\n\nScoring Methodology: Yes / No.\n\nDocuments Required: Website link to project pipeline",
  },
  "2.3": {
    code: "2.3",
    fieldName: "Use of Program-Based Approach for Project Development",
    tooltip:
      "Data Requirement: Details of the approved program/mission adopting a program-based approach.\n\nData Validation & Calculation: A program-based approach refers to a formally approved, ministry-led programme that bundles multiple projects under a common strategic framework with defined timelines and modes of execution. Standalone or ad-hoc projects shall not qualify.\n\nScoring Methodology: Yes / No.\n\nDocuments/Website Link Required: Website Link",
  },
  "2.4": {
    code: "2.4",
    fieldName: "Availability of Model Concession Agreement (MCA)",
    tooltip:
      "Data Requirement: Copies of approved and notified Model Concession Agreements.\n\nData Validation & Calculation: Only officially approved and notified MCAs shall be considered. Draft or consultative versions shall not qualify.\n\nScoring Methodology: 25 marks for each approved MCA.\n\nDocuments Required: Copy of the Model Concession Agreement along with documentary evidence of notification to be provided",
  },
  "2.5": {
    code: "2.5",
    fieldName: "Percentage of Awarded PPP Projects to Total Awarded Infrastructure Projects (by value)",
    tooltip:
      "Data Requirement: Details of total infrastructure projects awarded and PPP projects awarded during the assessment year, by value.\n\nData Validation & Calculation: Calculated as the ratio of the Total Project Cost (TPC) of PPP projects awarded to the total TPC of all infrastructure projects awarded by the Ministry during the assessment year.\n\nScoring Methodology: 1 mark for every 1%.\n\nDocuments Required: -NA-",
  },
  "3.1": {
    code: "3.1",
    fieldName: "Availability of Policy Directives for Promoting PPP",
    tooltip:
      "Data Requirement: Details of policy/guidelines/advisory issued to promote PPP projects.\n\nData Validation & Calculation: Any formally issued policy, guideline, or advisory clearly encouraging PPP adoption with defined intent or targets shall be considered.\n\nScoring Methodology: Yes / No.\n\nDocuments Required: • Policy / Notification / Guidelines",
  },
  "3.2": {
    code: "3.2",
    fieldName: "Proposals Submitted under VGF / IIPDF",
    tooltip:
      "Data Requirement: Details of PPP proposals submitted for VGF or IIPDF support during the assessment year.\n\nData Validation & Calculation: Proposals submitted to DEA in the prescribed format (VGF/IIPDF memo or via pppinindia.gov.in) or under a Ministry-specific VGF/IIPDF scheme shall be considered. Details to be submitted as per Annex 18.\n\nScoring Methodology: 7.5 marks for each eligible proposal submitted.\n\nDocuments Required: • Scheme policy document (if applicable)",
  },
  "3.3": {
    code: "3.3",
    fieldName: "TPC of PPP Projects as % of Total Budgeted Capital Allocation",
    tooltip:
      "Data Requirement: Details of PPP projects awarded and Ministry's budgeted capital allocation for the assessment year.\n\nData Validation & Calculation: Calculated as the ratio of Total Project Cost (TPC) of PPP projects awarded during the assessment year to the Ministry's annual budgeted capital allocation. Full marks are awarded for values ≥ 50%; proportionate marks for lower values.\n\nScoring Methodology: 2 marks for every 1%.\n\nDocuments Required: • Copy of Letter of Award",
  },
  "4.1": {
    code: "4.1",
    fieldName: "Availability and Use of High-Level Project Monitoring System",
    tooltip:
      "Data Requirement: Details of the Project Monitoring System used for infrastructure projects.\n\nData Validation & Calculation: The system should enable project-wise, milestone-based monitoring, issue escalation, and high-level reviews, and function as an extension of or aligned with GoI's PMG portal. Relevant Government Order/notification and portal link shall be verified.\n\nScoring Methodology: Yes / No.\n\nDocuments/Website link Required: • Government Order / Notification • Portal link",
  },
  "4.2": {
    code: "4.2",
    fieldName: "Adoption of PM GatiShakti National Master Plan",
    tooltip:
      "Data Requirement: Details of infrastructure projects planned using PM GatiShakti platform.\n\nData Validation & Calculation: Adoption requires demonstrable project-level use of the PM GatiShakti digital platform and data layers at the planning stage. Evidence may include screenshots, dashboards, official communications, or project IDs generated on the platform. Generic policy references without project-level usage shall not qualify.\n\nScoring Methodology: 10 marks for each project planned through PM GatiShakti.\n\nDocuments Required: • Project-specific evidence of PM GatiShakti usage (screenshots of the PM GatiShakti planning interface, Ministry-level dashboards linked to PM GatiShakti, official communications, or project IDs generated on the PM GatiShakti platform.)",
  },
  "4.3": {
    code: "4.3",
    fieldName: "Adoption of Alternate Dispute Resolution (ADR) Mechanism",
    tooltip:
      "Data Requirement: Details of ADR mechanism applicable to infrastructure/PPP projects.\n\nData Validation & Calculation: ADR refers to a Ministry-notified or contractually mandated mechanism for time-bound resolution of infrastructure-related disputes (e.g. arbitration, mediation, dispute resolution boards, SAROD, Lok Adalats where applicable). Generic legal provisions not specific to infrastructure shall not qualify.\n\nScoring Methodology: Yes / No.\n\nDocuments Required: • Official order / notification / contractual provision for ADR",
  },
  "4.4": {
    code: "4.4",
    fieldName: "Any Innovative Practice for Promotion or Development of Infrastructure",
    tooltip:
      "Data Requirement: Details of innovative practices undertaken during the assessment period.\n\nData Validation & Calculation: Innovative practices must be distinct from other NIE-I metrics and aimed at improving project structuring, accelerating implementation, promoting private investment, user-pay models, or efficient monitoring.\n\nScoring Methodology: 10 marks for each eligible innovative practice.\n\nDocuments Required: • Supporting documentary evidence",
  },
  "4.5": {
    code: "4.5",
    fieldName: "Capacity Building – Officer Participation in Infra-Focused Training",
    tooltip:
      "Data Requirement: List of officers who have completed infrastructure-focused training.\n\nData Validation & Calculation: Infra-focused training imparted by GoI, academic institutions, or international agencies shall be considered.\n\nScoring Methodology: 1 mark for each officer participation.\n\nDocuments Required: -NA-",
  },
};

/**
 * Get tooltip text for a ministry indicator code
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns The tooltip text or null if not found
 */
export function getMinistryIndicatorTooltip(indicatorCode: string): string | null {
  return MINISTRY_INDICATOR_TOOLTIPS[indicatorCode]?.tooltip || null;
}

/**
 * Get full tooltip information for a ministry indicator code
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns The tooltip object or null if not found
 */
export function getMinistryIndicatorTooltipInfo(
  indicatorCode: string
): MinistryIndicatorTooltip | null {
  return MINISTRY_INDICATOR_TOOLTIPS[indicatorCode] || null;
}

/**
 * Get field name for a ministry indicator code
 * @param indicatorCode - The indicator code (e.g., "1.1", "2.3")
 * @returns The field name or null if not found
 */
export function getMinistryIndicatorFieldName(indicatorCode: string): string | null {
  return MINISTRY_INDICATOR_TOOLTIPS[indicatorCode]?.fieldName || null;
}
