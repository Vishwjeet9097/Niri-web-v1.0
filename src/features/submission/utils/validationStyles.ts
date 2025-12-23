/**
 * Shared utility for validation styling across all submission categories.
 * Ensures consistent red border highlighting for mandatory fields with errors.
 */

/**
 * Get validation styling class for input fields.
 * Returns red border styling when field has validation error.
 * Ensures all mandatory fields (with asterisks) are consistently highlighted in red when they have errors.
 * 
 * @param hasError - Whether the field has a validation error
 * @param showValidationErrors - Whether validation errors should be shown
 * @returns CSS class string for red border styling, or empty string if no error
 */
export const getInputValidationClass = (
  hasError: boolean,
  showValidationErrors: boolean = true
): string => {
  if (!hasError || !showValidationErrors) return "";
  return "border-destructive focus-visible:ring-destructive";
};


