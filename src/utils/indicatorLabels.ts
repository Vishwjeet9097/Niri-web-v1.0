/**
 * Single source of truth for indicator **titles** (strategy: frontend catalog).
 *
 * - **`INDICATOR_LIST_LABELS`**: the string shown after the indicator code on
 *   submission steps (for most indicators), plus selects, exports, etc.
 * - **`INDICATOR_STEP_HEADINGS`**: only punctuation after the code and whether the
 *   step uses `INDICATOR_LIST_LABELS` as-is (`source: "list"`) or a small set of
 *   inline `withFullForm` segments (`source: "parts"`) where the headline must
 *   expand abbreviations (see `abbreviations.ts`).
 *
 * Edit **`INDICATOR_LIST_LABELS`** to change wording everywhere it applies; only
 * indicators with `source: "parts"` need their `parts` array updated if the
 * headline structure changes.
 */

export type IndicatorTitlePart =
  | { type: "text"; value: string }
  | { type: "abbr"; key: string };

export type IndicatorStepHeading =
  | { afterCodeInPrimary: string; source: "list" }
  | {
      afterCodeInPrimary: string;
      source: "parts";
      parts: IndicatorTitlePart[];
    };

/** Compact label (no inline abbreviation expansion). */
export const INDICATOR_LIST_LABELS: Record<string, string> = {
  "1.1": "% of Capex (Budgetary Capital Allocation) to GSDP",
  "1.2": "% Capex Utilization",
  "1.3": "% of Credit Rated ULBs",
  "1.4": "% of ULBs issuing Bonds",
  "1.5": "Functional Financial Intermediary For Infra Development",
  "2.1": "Availability of Infrastructure Act/Policy",
  "2.2": "Availability of Specialised Entity for Infrastructure Development",
  "2.3": "Availability of Sector Infra Development Plan",
  "2.4": "Availability of Investment Ready project pipeline",
  "2.5": "Availability of Asset Monetization pipeline",
  "3.1": "Availability of PPP Act/Policy",
  "3.2": "Functional State/UT PPP Cell/Unit",
  "3.3": "Proposals submitted under VGF/IIPDF",
  "3.4": "TPC of PPP projects as a percentage of total budgeted capital allocation of the State for the assessment year",
  "4.1":
    "Availability and use of a State/UT Project Monitoring Portal on the lines of GoI (Government Of India)",
  "4.2":
    "Adoption of PM GatiShakti National Master Plan in infrastructure planning",
  "4.3": "Adoption of Alternate Dispute Resolution (ADR) mechanism for Infrastructure Projects",
  "4.4": "Any Innovative Practice undertaken for promotion or development of Infrastructure",
  "4.5": "Capacity building - officer participation in infra focused training",
};

/** Step heading layout: most rows use `source: "list"` → body text is `INDICATOR_LIST_LABELS[code]`. */
export const INDICATOR_STEP_HEADINGS: Record<string, IndicatorStepHeading> = {
  "1.1": {
    afterCodeInPrimary: " -",
    source: "parts",
    parts: [
      { type: "text", value: "% " },
      { type: "abbr", key: "Capex" },
      { type: "text", value: " to " },
      { type: "abbr", key: "GSDP" },
      { type: "text", value: " " },
    ],
  },
  "1.2": {
    afterCodeInPrimary: " -",
    source: "parts",
    parts: [
      { type: "text", value: "% " },
      { type: "abbr", key: "Capex" },
      { type: "text", value: " Utilization " },
    ],
  },
  "1.3": {
    afterCodeInPrimary: " -",
    source: "parts",
    parts: [
      { type: "text", value: "% of Credit Rated " },
      { type: "abbr", key: "ULBs" },
      { type: "text", value: " " },
    ],
  },
  "1.4": {
    afterCodeInPrimary: " -",
    source: "parts",
    parts: [
      { type: "text", value: "% of " },
      { type: "abbr", key: "ULBs" },
      { type: "text", value: " issuing Bonds " },
    ],
  },
  "1.5": { afterCodeInPrimary: " -", source: "list" },
  "2.1": { afterCodeInPrimary: " -", source: "list" },
  "2.2": { afterCodeInPrimary: " -", source: "list" },
  "2.3": { afterCodeInPrimary: " -", source: "list" },
  "2.4": { afterCodeInPrimary: " -", source: "list" },
  "2.5": { afterCodeInPrimary: " -", source: "list" },
  "3.1": {
    afterCodeInPrimary: " - ",
    source: "parts",
    parts: [
      { type: "text", value: "Availability of " },
      { type: "abbr", key: "PPP" },
      { type: "text", value: " Act/Policy" },
    ],
  },
  "3.2": { afterCodeInPrimary: " - ", source: "list" },
  "3.3": {
    afterCodeInPrimary: " - ",
    source: "parts",
    parts: [
      { type: "text", value: "Proposals Submitted under " },
      { type: "abbr", key: "VGF" },
      { type: "text", value: "/" },
      { type: "abbr", key: "IIPDF" },
      { type: "text", value: " " },
    ],
  },
  "3.4": {
    afterCodeInPrimary: " – ",
    source: "parts",
    parts: [
      { type: "text", value: "TPC of " },
      { type: "abbr", key: "PPP" },
      {
        type: "text",
        value:
          " projects as a percentage of total budgeted capital allocation of the State for the assessment year",
      },
    ],
  },
  "4.1": { afterCodeInPrimary: " - ", source: "list" },
  "4.2": {
    afterCodeInPrimary: " – ",
    source: "parts",
    parts: [
      { type: "text", value: "Adoption of " },
      { type: "abbr", key: "PM" },
      {
        type: "text",
        value: " GatiShakti National Master Plan in infrastructure planning",
      },
    ],
  },
  "4.3": { afterCodeInPrimary: " – ", source: "list" },
  "4.4": { afterCodeInPrimary: " – ", source: "list" },
  "4.5": { afterCodeInPrimary: " – ", source: "list" },
};

export function getIndicatorShortTitle(code: string): string {
  return INDICATOR_LIST_LABELS[code] ?? code;
}
