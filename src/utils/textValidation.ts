/**
 * Text validation utilities for submission forms.
 * Used for name/project/authority fields where the first letter must be capital.
 */

/**
 * Returns true if the value is empty or if the first letter of the text is uppercase.
 * Only the first character of the string needs to be capital, not every word.
 */
export function hasInitialsCapital(value: string): boolean {
  if (!value || typeof value !== "string") return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const match = trimmed.match(/\p{L}/u);
  if (!match) return true;
  const firstLetter = match[0];
  return firstLetter === firstLetter.toUpperCase();
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
