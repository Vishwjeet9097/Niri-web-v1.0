/**
 * Comment validation utilities for form submissions
 */

export interface CommentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CommentValidationOptions {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  allowSpecialChars?: boolean;
  allowEmptyLines?: boolean;
  maxEmptyLines?: number;
  checkProfanity?: boolean;
  checkSpam?: boolean;
}

// Default validation options
const DEFAULT_OPTIONS: Required<CommentValidationOptions> = {
  minLength: 10,
  maxLength: 1000,
  required: true,
  allowSpecialChars: true,
  allowEmptyLines: false,
  maxEmptyLines: 2,
  checkProfanity: false,
  checkSpam: false,
};

// Common profanity words (basic list - can be expanded)
const PROFANITY_WORDS = [
  "spam",
  "scam",
  "fake",
  "fraud",
  "cheat",
  "lie",
  "false",
];

// Spam patterns
const SPAM_PATTERNS = [
  /(.)\1{4,}/g, // Repeated characters like "aaaaa"
  /https?:\/\/[^\s]+/g, // URLs
  /[A-Z]{5,}/g, // Excessive caps
  /\d{10,}/g, // Long number sequences
];

/**
 * Validate comment text based on provided options
 */
export function validateComment(
  text: string,
  options: CommentValidationOptions = {}
): CommentValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Trim whitespace
  const trimmedText = text.trim();

  // Required field check
  if (opts.required && !trimmedText) {
    errors.push("Comment is required");
    return { isValid: false, errors, warnings };
  }

  // Skip further validation if empty and not required
  if (!trimmedText && !opts.required) {
    return { isValid: true, errors, warnings };
  }

  // Length validation
  if (trimmedText.length < opts.minLength) {
    errors.push(`Comment must be at least ${opts.minLength} characters long`);
  }

  if (trimmedText.length > opts.maxLength) {
    errors.push(`Comment must not exceed ${opts.maxLength} characters`);
  }

  // Empty lines check
  if (!opts.allowEmptyLines) {
    const emptyLines = trimmedText
      .split("\n")
      .filter((line) => line.trim() === "").length;
    if (emptyLines > opts.maxEmptyLines) {
      warnings.push(
        `Too many empty lines. Please keep it under ${
          opts.maxEmptyLines + 1
        } lines.`
      );
    }
  }

  // Special characters check
  if (!opts.allowSpecialChars) {
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g;
    if (specialCharRegex.test(trimmedText)) {
      warnings.push(
        "Comment contains special characters which may not be appropriate"
      );
    }
  }

  // Profanity check
  if (opts.checkProfanity) {
    const lowerText = trimmedText.toLowerCase();
    const foundProfanity = PROFANITY_WORDS.filter((word) =>
      lowerText.includes(word)
    );
    if (foundProfanity.length > 0) {
      errors.push(
        `Comment contains inappropriate content: ${foundProfanity.join(", ")}`
      );
    }
  }

  // Spam check
  if (opts.checkSpam) {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(trimmedText)) {
        warnings.push("Comment appears to contain spam-like content");
        break;
      }
    }
  }

  // Additional business logic validations
  validateBusinessRules(trimmedText, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate business-specific rules for comments
 */
function validateBusinessRules(
  text: string,
  errors: string[],
  warnings: string[]
): void {
  // Check for minimum meaningful content
  const words = text.split(/\s+/).filter((word) => word.length > 2);
  if (words.length < 3) {
    warnings.push(
      "Comment seems too short. Please provide more detailed feedback."
    );
  }

  // Check for excessive repetition
  const wordCounts: { [key: string]: number } = {};
  words.forEach((word) => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  const maxRepetition = Math.max(...Object.values(wordCounts));
  if (maxRepetition > words.length * 0.3) {
    warnings.push(
      "Comment contains repetitive content. Please provide more varied feedback."
    );
  }

  // Check for proper sentence structure
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    const avgSentenceLength =
      sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length;
    if (avgSentenceLength < 10) {
      warnings.push("Comments should be more descriptive and detailed.");
    }
  }
}

/**
 * Validate rejection comments with specific rules
 */
export function validateRejectionComment(
  text: string
): CommentValidationResult {
  return validateComment(text, {
    minLength: 20,
    maxLength: 500,
    required: true,
    allowSpecialChars: true,
    allowEmptyLines: false,
    maxEmptyLines: 1,
    checkProfanity: true,
    checkSpam: true,
  });
}

/**
 * Validate approval comments with specific rules
 */
export function validateApprovalComment(text: string): CommentValidationResult {
  return validateComment(text, {
    minLength: 5,
    maxLength: 300,
    required: false,
    allowSpecialChars: true,
    allowEmptyLines: false,
    maxEmptyLines: 1,
    checkProfanity: false,
    checkSpam: true,
  });
}

/**
 * Validate general comments with specific rules
 */
export function validateGeneralComment(text: string): CommentValidationResult {
  return validateComment(text, {
    minLength: 10,
    maxLength: 400,
    required: true,
    allowSpecialChars: true,
    allowEmptyLines: false,
    maxEmptyLines: 2,
    checkProfanity: false,
    checkSpam: true,
  });
}

/**
 * Get character count with limits
 */
export function getCharacterCountInfo(
  text: string,
  maxLength: number = 1000
): {
  current: number;
  remaining: number;
  isOverLimit: boolean;
  percentage: number;
} {
  const current = text.length;
  const remaining = maxLength - current;
  const isOverLimit = current > maxLength;
  const percentage = (current / maxLength) * 100;

  return {
    current,
    remaining,
    isOverLimit,
    percentage,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  result: CommentValidationResult
): string {
  if (result.isValid) return "";

  const allIssues = [...result.errors, ...result.warnings];
  return allIssues.join(". ");
}

/**
 * Get validation status color class
 */
export function getValidationStatusClass(
  result: CommentValidationResult
): string {
  if (result.isValid) {
    return result.warnings.length > 0 ? "text-yellow-600" : "text-green-600";
  }
  return "text-red-600";
}
