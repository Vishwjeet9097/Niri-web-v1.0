/**
 * Capitalize the first letter of each word (title case).
 * Used for Names of Project/Officers/Authority etc. so initials are capital.
 */
export function capitalizeInitials(str: string): string {
  if (str == null || typeof str !== "string") return str;
  const trimmed = str.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word.length
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : ""
    )
    .join(" ");
}

/**
 * Returns true if the string is already in title case (first letter of each word capital).
 * Used by validation to block submit when user enters small letters.
 */
export function isCapitalizedProperly(str: string): boolean {
  if (str == null || typeof str !== "string") return true;
  const trimmed = str.trim();
  if (!trimmed) return true;
  const expected = capitalizeInitials(trimmed);
  return trimmed === expected;
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
