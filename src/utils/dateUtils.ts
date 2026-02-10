/**
 * Returns the current Financial Year in short format, e.g., "2025-26"
 * Financial Year runs from April (04) to March (03)
 */
export const getCurrentFinancialYear = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // If April (4) or later, FY = currentYear–(nextYear % 100)
  // Else FY = (previousYear)–(currentYear % 100)
  if (month >= 4) {
    const nextYearShort = (year + 1).toString().slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    const prevYear = year - 1;
    const currYearShort = year.toString().slice(-2);
    return `${prevYear}-${currYearShort}`;
  }
};

/**
 * Get Financial Year from a date in MM/YY format
 * @param mmYy - Date in MM/YY format (e.g., "04/24", "12/25")
 * @returns Financial Year in short format (e.g., "2024-25")
 */
export const getFinancialYearFromMMYY = (mmYy: string): string | null => {
  if (!mmYy || typeof mmYy !== "string") return null;

  // Handle various formats: "04/24", "04-24", "0424", "4/24", etc.
  const cleaned = mmYy.trim().replace(/-/g, "/");
  const parts = cleaned.split("/");

  if (parts.length !== 2) {
    // Try parsing as 4-digit number (MMYY)
    if (/^\d{4}$/.test(cleaned)) {
      const month = parseInt(cleaned.slice(0, 2), 10);
      const yearShort = cleaned.slice(2);
      return calculateFYFromMonthYear(month, yearShort);
    }
    return null;
  }

  const month = parseInt(parts[0], 10);
  const yearShort = parts[1];

  if (isNaN(month) || month < 1 || month > 12 || !yearShort) {
    return null;
  }

  return calculateFYFromMonthYear(month, yearShort);
};

/**
 * Calculate Financial Year from month and year (short format)
 * @param month - Month (1-12)
 * @param yearShort - Year in short format (e.g., "24", "25")
 */
const calculateFYFromMonthYear = (month: number, yearShort: string): string => {
  // Convert short year to full year (assuming 2000s)
  const year = 2000 + parseInt(yearShort, 10);

  // Financial Year: April (4) to March (3)
  // If month is April (4) or later, FY starts in current year
  // If month is January-March (1-3), FY started in previous year
  if (month >= 4) {
    const nextYear = year + 1;
    const nextYearShort = nextYear.toString().slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    const prevYear = year - 1;
    const prevYearShort = year.toString().slice(-2);
    return `${prevYear}-${prevYearShort}`;
  }
};

/**
 * Format a year value as Financial Year (e.g. 2025 -> "2025-26").
 * If already in FY format (YYYY-YY), return as is.
 */
export const formatYearAsFinancialYear = (
  value: string | number | null | undefined
): string => {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}$/.test(str)) return str;
  const num = parseInt(str, 10);
  if (!isNaN(num) && /^\d{4}$/.test(str)) {
    const nextYearShort = (num + 1).toString().slice(-2);
    return `${num}-${nextYearShort}`;
  }
  return str;
};

/**
 * Check if a date (MM/YY or YYYY-MM-DD format) falls within a given Financial Year
 * @param dateStr - Date in MM/YY format (e.g. "04/24") or YYYY-MM-DD/ISO (e.g. "2025-04-15")
 * @param fy - Financial Year in format "YYYY-YY" (e.g., "2024-25")
 */
export const isDateInFinancialYear = (dateStr: string, fy: string): boolean => {
  const dateFY = getFinancialYearFromMMYY(dateStr) || getFinancialYearFromYYYYMMDD(dateStr);
  return dateFY === fy;
};

/**
 * Format training period for display in review mode.
 * Converts YYYY-MM-DD or ISO format to MM/YY (e.g. "2025-04-15" -> "04/25").
 * If already in MM/YY format, returns as is.
 */
export const formatTrainingPeriodForDisplay = (
  value: string | null | undefined
): string => {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";
  const yyyyMmDdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (yyyyMmDdMatch) {
    const month = yyyyMmDdMatch[2];
    const yearShort = yyyyMmDdMatch[1].slice(-2);
    return `${month}/${yearShort}`;
  }
  return str;
};

/**
 * Get Financial Year from a date in YYYY-MM-DD or ISO format.
 * Used when backend stores dates in this format (e.g. valueDate from API).
 */
function getFinancialYearFromYYYYMMDD(dateStr: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12) return null;
  const yearShort = year.toString().slice(-2);
  const nextYearShort = (year + 1).toString().slice(-2);
  if (month >= 4) {
    return `${year}-${nextYearShort}`;
  } else {
    const prevYear = year - 1;
    const prevYearShort = prevYear.toString().slice(-2);
    return `${prevYear}-${yearShort}`;
  }
}

/**
 * Get training period value from a capacity building entry and derive its FY.
 * Entries may have trainingPeriod (Excel) or store it under a field id (form).
 * Supports both MM/YY format (e.g. "04/24") and YYYY-MM-DD/ISO (e.g. "2025-04-15") from API.
 */
function getTrainingPeriodFromEntry(entry: Record<string, unknown>): string | null {
  const tryGetFY = (val: string): string | null => {
    if (!val || typeof val !== "string" || !val.trim()) return null;
    const fy = getFinancialYearFromMMYY(val) || getFinancialYearFromYYYYMMDD(val);
    return fy;
  };

  if (entry.trainingPeriod && typeof entry.trainingPeriod === "string" && entry.trainingPeriod.trim()) {
    const fy = tryGetFY(entry.trainingPeriod);
    if (fy) return entry.trainingPeriod;
  }
  for (const key of Object.keys(entry)) {
    if (key === "id" || key === "_fieldPrimaryIds") continue;
    const val = entry[key];
    if (val && typeof val === "string" && val.trim()) {
      const fy = tryGetFY(val);
      if (fy) return val;
    }
  }
  return null;
}

/**
 * Count officers trained in the current Financial Year only.
 * Only entries whose training period falls in the current FY are counted.
 * @param capacityArray - Array of capacity building entries (trainingPeriod or field-id values in MM/YY format)
 * @returns Count of officers trained in current FY
 */
export const countOfficersTrainedInCurrentFY = (
  capacityArray: Array<Record<string, unknown>>
): number => {
  if (!capacityArray || !Array.isArray(capacityArray)) return 0;

  const currentFY = getCurrentFinancialYear();

  return capacityArray.filter((entry) => {
    const trainingPeriod = getTrainingPeriodFromEntry(entry);
    if (!trainingPeriod) return false;
    return isDateInFinancialYear(trainingPeriod, currentFY);
  }).length;
};
