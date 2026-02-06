/**
 * Text validation utilities for submission forms.
 * Used for name/project/authority fields where initial letters must be capital.
 */

/**
 * Returns true if the value is empty or if the first letter of each word is uppercase.
 * Used to enforce "Initials of text must be capital letter" for names, projects, authority, etc.
 */
export function hasInitialsCapital(value: string): boolean {
  if (!value || typeof value !== "string") return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const words = trimmed.split(/\s+/);
  return words.every((word) => {
    const match = word.match(/\p{L}/u);
    if (!match) return true;
    const firstLetter = match[0];
    return firstLetter === firstLetter.toUpperCase();
  });
}

/**
 * Converts a string to title case (first letter of each word capital).
 * Can be used on blur to auto-format user input.
 */
export function toInitialsCapital(value: string): string {
  if (!value || typeof value !== "string") return value;
  return value
    .trim()
    .replace(/\b(\p{L})(\p{L}*)/gu, (_, first, rest) =>
      first.toUpperCase() + (rest || "").toLowerCase()
    );
}
