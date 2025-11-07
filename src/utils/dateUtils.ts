
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
