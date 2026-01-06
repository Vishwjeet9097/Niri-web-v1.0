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
      "Enter the State's total budgeted capital expenditure (Capex) for the assessment year and the latest verifiable GSDP value. The system calculates Capex as a percentage of GSDP. Values will be verified using CGA data.",
  },
  "1.2": {
    code: "1.2",
    fieldName: "State Capex Utilization",
    tooltip:
      "Provide the State Capex Utilisation and the Capital Allocation for FY for the assessment year. This shows utilization efficiency. Data must be consistent and will be cross-checked with CGA records.",
  },
  "1.3": {
    code: "1.3",
    fieldName: "ULB Credit Rating Coverage",
    tooltip:
      "Enter the total number of ULBs with population of 50,000 or more and the number of those having valid credit ratings during the assessment year. Upload rating certificates for verification.",
  },
  "1.4": {
    code: "1.4",
    fieldName: "ULB Bond Issuance Details",
    tooltip:
      "Provide details of ULBs (population ≥50,000) that issued municipal, green, or other capital market bonds during the assessment year, including bond type and issuing authority.",
  },
  "1.5": {
    code: "1.5",
    fieldName: "State Financial Intermediary",
    tooltip:
      "Specify State-owned entities exclusively financing infrastructure projects. Project-specific SPVs are not eligible. Upload website link and funding details for validation.",
  },
  "2.1": {
    code: "2.1",
    fieldName: "Infrastructure Act / Policy",
    tooltip:
      "Upload a State Infrastructure Act or Policy supporting multi-sector infrastructure development. If unavailable, upload sector-specific infrastructure policies (five required for full marks).",
  },
  "2.2": {
    code: "2.2",
    fieldName: "Specialized Infrastructure Entity",
    tooltip:
      "Provide notification establishing a State-level entity exclusively mandated for infrastructure project development and structuring across sectors. Routine departments and utilities are not eligible.",
  },
  "2.3": {
    code: "2.3",
    fieldName: "Sector Infrastructure Development Plan",
    tooltip:
      "Upload a formally approved sector-specific infrastructure plan (5–10 years) with current status, future targets, investment estimates, and financing strategy.",
  },
  "2.4": {
    code: "2.4",
    fieldName: "Investment-ready Project Pipeline",
    tooltip:
      "Provide the official website link where investment-ready infrastructure projects are listed for investor engagement. Projects should have completed minimum preparation such as DPR or feasibility.",
  },
  "2.5": {
    code: "2.5",
    fieldName: "Asset Monetisation Pipeline",
    tooltip:
      "Submit a publicly available list of brownfield infrastructure assets proposed for monetisation, including monetisation mode, timelines, and asset details.",
  },
  "3.1": {
    code: "3.1",
    fieldName: "PPP Policy",
    tooltip:
      "Upload a State PPP Policy or relevant provisions within the Infrastructure Act that clearly promote PPP-based infrastructure development across sectors.",
  },
  "3.2": {
    code: "3.2",
    fieldName: "State PPP Cell / Unit",
    tooltip:
      "Provide notification of a functional State PPP Cell or Unit. If part of another entity, upload mandate clearly indicating PPP promotion responsibilities.",
  },
  "3.3": {
    code: "3.3",
    fieldName: "VGF / IIPDF Proposals",
    tooltip:
      "List PPP projects submitted for VGF/IIPDF support to DEA or under State schemes during the assessment year. Attach scheme policy if applicable.",
  },
  "3.4": {
    code: "3.4",
    fieldName: "PPP Project Cost Ratio",
    tooltip:
      "Provide details of PPP projects awarded during the assessment year. The ratio of total project cost to budgeted Capex will be calculated to assess private capital leverage.",
  },
  "4.1": {
    code: "4.1",
    fieldName: "State Project Monitoring System",
    tooltip:
      "Upload Government Order and portal link for the State infrastructure project monitoring system enabling milestone tracking, issue escalation, and high-level reviews.",
  },
  "4.2": {
    code: "4.2",
    fieldName: "PM GatiShakti Usage",
    tooltip:
      "Provide project-level evidence of PM GatiShakti usage during planning, such as screenshots, dashboards, or project IDs. Policy references alone are not sufficient.",
  },
  "4.3": {
    code: "4.3",
    fieldName: "ADR Mechanism",
    tooltip:
      "Upload official notifications detailing infrastructure-specific alternative dispute resolution mechanisms applicable to infrastructure or PPP contracts.",
  },
  "4.4": {
    code: "4.4",
    fieldName: "Innovative Practices",
    tooltip:
      "Describe innovative infrastructure practices not covered under other indicators that improve project bankability, speed, private investment, or monitoring.",
  },
  "4.5": {
    code: "4.5",
    fieldName: "Infrastructure Training",
    tooltip:
      "Provide list of State officials who completed infrastructure-focused training from recognised institutions during the assessment year.",
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
