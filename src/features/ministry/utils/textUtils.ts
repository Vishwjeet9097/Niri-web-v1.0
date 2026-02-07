/**
 * Ensures the first letter of each word is uppercase; rest of word is left unchanged.
 * So "SDE" stays "SDE", "sde" becomes "Sde", "new delhi" becomes "New delhi".
 */
export function capitalizeInitials(str: string): string {
  if (str == null || typeof str !== "string") return str;
  const trimmed = str.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return trimmed
    .split(" ")
    .map((word) =>
      word.length ? word.charAt(0).toUpperCase() + word.slice(1) : ""
    )
    .join(" ");
}

/**
 * Returns true if the first character of every word is an uppercase letter (A-Z).
 * Allows "SDE", "MBA", "New Delhi", "New delhi" etc. Fails only when a word starts with lowercase.
 */
export function isCapitalizedProperly(str: string): boolean {
  if (str == null || typeof str !== "string") return true;
  const trimmed = str.trim();
  if (!trimmed) return true;
  const words = trimmed.replace(/\s+/g, " ").split(" ");
  return words.every(
    (word) => word.length === 0 || (word[0] >= "A" && word[0] <= "Z")
  );
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
