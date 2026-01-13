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
 * Check if a date (MM/YY format) falls within a given Financial Year
 * @param mmYy - Date in MM/YY format
 * @param fy - Financial Year in format "YYYY-YY" (e.g., "2024-25")
 */
export const isDateInFinancialYear = (mmYy: string, fy: string): boolean => {
  const dateFY = getFinancialYearFromMMYY(mmYy);
  return dateFY === fy;
};

/**
 * Count officers trained in the current Financial Year
 * @param capacityArray - Array of capacity building entries with trainingPeriod field
 * @returns Count of officers trained in current FY
 */
export const countOfficersTrainedInCurrentFY = (
  capacityArray: Array<{ trainingPeriod?: string }>
): number => {
  if (!capacityArray || !Array.isArray(capacityArray)) return 0;

  const currentFY = getCurrentFinancialYear();

  return capacityArray.filter((entry) => {
    if (!entry.trainingPeriod) return false;
    return isDateInFinancialYear(entry.trainingPeriod, currentFY);
  }).length;
};
