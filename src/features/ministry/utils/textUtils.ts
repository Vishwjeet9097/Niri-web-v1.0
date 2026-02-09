/**
 * Ensures only the first letter of the string is uppercase; rest is left unchanged.
 * e.g. "department of finance" -> "Department of finance".
 */
export function capitalizeInitials(str: string): string {
  if (str == null || typeof str !== "string") return str;
  const trimmed = str.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Returns true if the first character of the string is an uppercase letter (A-Z).
 * Only the first letter of the whole value is checked, not each word.
 * e.g. "Department of finance" is valid; "department of finance" is invalid.
 */
export function isCapitalizedProperly(str: string): boolean {
  if (str == null || typeof str !== "string") return true;
  const trimmed = str.trim();
  if (!trimmed) return true;
  const first = trimmed[0];
  return first >= "A" && first <= "Z";
}

/**
 * Returns true if the field label indicates a name-type field
 * (Project name, Officer name, Authority, etc.) where initials should be capitalized.
 */
export function isNameTypeField(label: string | undefined): boolean {
  if (!label || typeof label !== "string") return false;
  const lower = label.toLowerCase();
  return (
    lower.includes("name") ||
    lower.includes("officer") ||
    lower.includes("authority") ||
    lower.includes("project") ||
    lower.includes("organiser") ||
    lower.includes("organizer") ||
    lower.includes("designation") ||
    lower.includes("entity") ||
    lower.includes("program name") ||
    lower.includes("training program")
  );
}
