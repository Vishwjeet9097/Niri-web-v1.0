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
    fieldName: "Budgeted Capex (Capital Expenditure) & GSDP (Gross State Domestic Product)",
    tooltip:
      "Data Requirement: Provide GSDP and Budgeted Capex allocation data.\n\nData Validation & Calculation: Percentage of Capex to GSDP is calculated as the ratio of Budgeted Capital Allocation by State in the financial year of assessment and the most recent verifiable GSDP data available. Details provided by State will be verified with the most recent data available on CGA website.\n\nScoring Methodology: 10 marks for every 1%.\n\nDocuments Required: NIL",
  },
  "1.2": {
    code: "1.2",
    fieldName: "State Capex (Capital Expenditure) Utilization",
    tooltip:
      "Data Requirement: Provide Budgeted Capital Allocation and Actual Capital Expenditure data.\n\nData Validation & Calculation: Percentage of Capex Utilization is calculated as the ratio of actual Capital Expenditure and the Total Budgeted Capital Allocation by the State in the financial year of assessment. Details provided by State will be verified with the most recent data available on CGA website.\n\nScoring Methodology: 1 mark for every 2%.\n\nDocuments Required: NIL",
  },
  "1.3": {
    code: "1.3",
    fieldName: "ULB (Urban Local Body) Credit Rating Coverage",
    tooltip:
      "Data Requirement: Provide count of Total number of ULBs, list of credit rated ULBs with copy of credit rating certificates.\n\nData Validation & Calculation: Percentage of credit rated ULB is calculated as the ratio of the number of credit rated ULBs and Total number of ULBs with a population coverage of 50,000 and above, in the financial year of assessment.\n\nScoring Methodology: 1 mark for every 2%.\n\nDocuments Required: Copy of credit rating certificate for every credit rated ULB",
  },
  "1.4": {
    code: "1.4",
    fieldName: "ULB (Urban Local Body) Bond Issuance Details",
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
      "Data Requirement: Provide details on the existence of a State Infrastructure Act or an overarching Infrastructure Policy supporting development of infrastructure projects across multiple sectors.\n\nData Validation & Calculation: Submitted Act/Policy will be verified for State notification/approval and applicability across multiple infrastructure sectors.\n\nScoring Methodology: Yes/No. Full marks are awarded if a qualifying Infrastructure Act or Policy exists.\n\nDocuments Required: Copy of the notified Infrastructure Act or Infrastructure Policy.",
  },
  "2.2": {
    code: "2.2",
    fieldName: "Specialized Infrastructure Entity",
    tooltip:
      "Data Requirement: Provide details of a State-level specialized Authority/Department/Agency established with a primary and exclusive mandate for infrastructure development across multiple sectors.\n\nData Validation & Calculation: Notification and mandate will be verified to ensure the entity is not sector-specific, project-specific, or a routine line department.\n\nScoring Methodology: Yes/No. Full marks are awarded if a qualifying specialized entity exists.\n\nDocuments Required: Government Order / Notification establishing the entity along with mandate/functions.",
  },
  "2.3": {
    code: "2.3",
    fieldName: "Sector Infrastructure Development Plan",
    tooltip:
      "Data Requirement: Provide count and details of sector-specific Infrastructure Development Plans prepared for a medium- to long-term horizon, covering infrastructure status, targets, and investment requirements.\n\nData Validation & Calculation: Each submitted plan will be verified for formal approval, sector coverage, and inclusion of quantified targets and investment estimates.\n\nScoring Methodology: 10 marks for each qualifying sector Infrastructure Development Plan, subject to a maximum of 50 marks.\n\nDocuments Required: Copy of approved Sector Infrastructure Development Plan(s).",
  },
  "2.4": {
    code: "2.4",
    fieldName: "Investment-ready Project Pipeline",
    tooltip:
      "Data Requirement: Provide details and official website link of an investment-ready infrastructure project pipeline hosted on a government portal and visible to investors.\n\nData Validation & Calculation: Portal accessibility and minimum project readiness (feasibility/DPR and identified implementation structure) will be verified.\n\nScoring Methodology: Yes/No. Full marks are awarded if an investment-ready project pipeline is available.\n\nDocuments Required: Official website link hosting the investment-ready project pipeline.",
  },
  "2.5": {
    code: "2.5",
    fieldName: "Asset Monetisation Pipeline",
    tooltip:
      "Data Requirement: Provide details and official website link of a publicly available Asset Monetization Pipeline listing brownfield infrastructure assets proposed for monetization.\n\nData Validation & Calculation: Pipeline will be verified for public accessibility and inclusion of asset details, monetization mode, and indicative timelines.\n\nScoring Methodology: Yes/No. Full marks are awarded if an Asset Monetization Pipeline is available.\n\nDocuments Required: Official website link and list of assets included in the Asset Monetization Pipeline.",
  },
  "3.1": {
    code: "3.1",
    fieldName: "PPP (Public-Private Partnership) Policy",
    tooltip:
      "Data Requirement: Provide details of a standalone PPP Act/Policy or PPP-related provisions within an Infrastructure Act/Policy applicable across sectors.\n\nData Validation & Calculation: Policy document will be verified for explicit provisions promoting PPP projects.\n\nScoring Methodology: Yes/No. Full marks are awarded if a qualifying PPP Act or Policy exists.\n\nDocuments Required: Copy of PPP Act/Policy or relevant policy provisions.",
  },
  "3.2": {
    code: "3.2",
    fieldName: "State PPP (Public-Private Partnership) Cell / Unit",
    tooltip:
      "Data Requirement: Provide details of a functional State/UT PPP Cell or Unit established for promoting and undertaking PPP projects.\n\nData Validation & Calculation: Notification and mandate will be verified to confirm PPP-specific functions.\n\nScoring Methodology: Yes/No. Full marks are awarded if a functional PPP Cell/Unit exists.\n\nDocuments Required: Government Order / Notification establishing the PPP Cell/Unit and its mandate.",
  },
  "3.3": {
    code: "3.3",
    fieldName: "VGF (Viability Gap Funding) / IIPDF (India Infrastructure Project Development Fund) Proposals",
    tooltip:
      "Data Requirement: Provide count and list of PPP or infrastructure project proposals submitted under VGF or IIPDF during the assessment year.\n\nData Validation & Calculation: Submitted proposals will be verified against DEA records or State scheme documentation.\n\nScoring Methodology: 5 marks for each qualifying project, subject to a maximum of 50 marks.\n\nDocuments Required: List of VGF/IIPDF proposals and copies of submission documents.",
  },
  "3.4": {
    code: "3.4",
    fieldName: "PPP (Public-Private Partnership) Project Cost Ratio; TPC = Total Project Cost",
    tooltip:
      "Data Requirement: Provide Total Project Cost (TPC) of awarded PPP projects and total budgeted capital allocation of the State for the assessment year.\n\nData Validation & Calculation: Percentage is calculated as the ratio of TPC of awarded PPP projects to total budgeted capital allocation.\n\nScoring Methodology: 2 marks for every 1%, subject to a maximum of 100 marks.\n\nDocuments Required: List of awarded PPP projects with TPC details and State budgeted capital allocation documents.",
  },
  "4.1": {
    code: "4.1",
    fieldName: "State Project Monitoring System (PMG = Project Monitoring Group)",
    tooltip:
      "Data Requirement: Provide details of a State/UT Project Monitoring Portal for infrastructure projects on the lines of GoI PMG (Project Monitoring Group).\n\nData Validation & Calculation: Portal availability and usage will be verified through portal access and official notifications.\n\nScoring Methodology: Yes/No. Full marks are awarded if the portal is available and in use.\n\nDocuments Required: Government Order / Notification and official portal link.",
  },
  "4.2": {
    code: "4.2",
    fieldName: "PM GatiShakti Usage",
    tooltip:
      "Data Requirement: Provide count and details of infrastructure projects planned using the PM GatiShakti platform.\n\nData Validation & Calculation: Project-level usage will be verified through screenshots, project IDs, or official communications.\n\nScoring Methodology: 10 marks for each project planned through PM GatiShakti, subject to a maximum of 30 marks.\n\nDocuments Required: Screenshots, project IDs, or official communications evidencing PM GatiShakti usage.",
  },
  "4.3": {
    code: "4.3",
    fieldName: "ADR (Alternative Dispute Resolution) Mechanism",
    tooltip:
      "Data Requirement: Provide details of a notified ADR mechanism applicable to infrastructure or PPP projects.\n\nData Validation & Calculation: Notification will be verified for infrastructure-specific applicability.\n\nScoring Methodology: Yes/No. Full marks are awarded if an ADR mechanism exists.\n\nDocuments Required: Government Order / Notification establishing the ADR mechanism.",
  },
  "4.4": {
    code: "4.4",
    fieldName: "Innovative Practices",
    tooltip:
      "Data Requirement: Provide count and description of innovative practices undertaken for promotion or development of infrastructure.\n\nData Validation & Calculation: Practices will be reviewed for relevance, uniqueness, and infrastructure impact.\n\nScoring Methodology: 10 marks for each qualifying innovative practice, subject to a maximum of 50 marks.\n\nDocuments Required: Documentary evidence supporting each innovative practice.",
  },
  "4.5": {
    code: "4.5",
    fieldName: "Infrastructure Training",
    tooltip:
      "Data Requirement: Provide count and list of officers who participated in infrastructure-focused training during the assessment year.\n\nData Validation & Calculation: Training records will be verified for relevance and completion.\n\nScoring Methodology: 1 mark for each officer participation, subject to a maximum of 50 marks.\n\nDocuments Required: List of officials and training participation/completion certificates.",
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
