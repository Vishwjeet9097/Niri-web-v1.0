/**
 * Abbreviations and their full forms for the NIE-I questionnaire.
 * Use these wherever abbreviations appear so users see the full form for better understanding.
 */

export const ABBREVIATIONS: Record<string, string> = {
  ADR: "Alternative Dispute Resolution",
  Capex: "Capital Expenditure",
  CRORE: "Crore (10 million)",
  DPR: "Detailed Project Report",
  FI: "Financial Intermediary",
  FFI: "Functional Financial Intermediary",
  FY: "Financial Year",
  GoI: "Government of India",
  GSDP: "Gross State Domestic Product",
  IIPDF: "India Infrastructure Project Development Fund",
  INR: "Indian Rupee",
  PMG: "Project Monitoring Group",
  PM: "Pradhan Mantri",
  PPP: "Public-Private Partnership",
  TPC: "Total Project Cost",
  ULB: "Urban Local Body",
  ULBs: "Urban Local Bodies",
  VGF: "Viability Gap Funding",
  UT: "Union Territory",
};

/**
 * Return label with full form in parentheses, e.g. "ULB (Urban Local Body)"
 */
export function withFullForm(abbreviation: string): string {
  const full = ABBREVIATIONS[abbreviation];
  return full ? `${abbreviation} (${full})` : abbreviation;
}
