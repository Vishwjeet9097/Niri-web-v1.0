import type { PPPDevelopmentData, FileUpload } from "../types";
import { hasInitialsCapital } from "@/utils/textValidation";

export interface PPPDevelopmentValidationErrors {
  [fieldPath: string]: string;
}

export interface PPPDevelopmentValidationOptions {
  allowedIndicators?: string[];
}

export interface PPPDevelopmentValidationResult {
  isValid: boolean;
  errors: PPPDevelopmentValidationErrors;
}

const sanitizeNumber = (value: string): string =>
  (value ?? "")
    .toString()
    .replace(/[₹,\s]/g, "")
    .trim();

const isNonNegativeDecimal = (value: string): boolean => {
  if (value === "") return false;
  const sanitized = sanitizeNumber(value);
  if (sanitized === "") return false;
  const numericRegex = /^-?\d+(\.\d+)?$/;
  if (!numericRegex.test(sanitized)) return false;
  const num = Number(sanitized);
  return !Number.isNaN(num) && num >= 0;
};

const hasMaxTwoDecimals = (value: string): boolean => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === "") return false;
  return /^\d+(\.\d{1,2})?$/.test(sanitized);
};

const parseNumber = (value: string): number => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === "") return NaN;
  const num = Number(sanitized);
  return Number.isNaN(num) ? NaN : num;
};

const isValidInteger = (value: string): boolean => {
  if (value === "") return false;
  const sanitized = sanitizeNumber(value);
  if (sanitized === "") return false;
  const num = Number(sanitized);
  return Number.isInteger(num) && num >= 0;
};

const isValidPdfFile = (file: FileUpload | null): boolean => {
  if (!file || !file.file) return false;
  const fileName = file.fileName || file.file.name || "";
  const mimeType = file.mimeType || file.file.type || "";
  const isPdf =
    fileName.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf";
  return isPdf;
};

const hasRequiredFile = (file: FileUpload | null | undefined): boolean => {
  if (!file) return false;
  return !!(file.file || file.fileName || file.filePath);
};

const isValidYear = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.toString().trim();
  return /^\d{4}$/.test(normalized);
};

const isValidUrl = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const isValidDate = (value: string): boolean => {
  if (!value || value.trim() === "") return false;
  try {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  } catch {
    return false;
  }
};

// Helper function to validate alphabets only (letters, spaces, hyphens, apostrophes)
const isAlphabetsOnly = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  // Allow letters, spaces, hyphens, apostrophes (for names like "O'Brien", "Mary-Jane")
  // Unicode regex for letters including accented characters
  return /^[\p{L}\s'-]+$/u.test(value.trim());
};

export const validatePPPDevelopment = (
  data: PPPDevelopmentData,
  options: PPPDevelopmentValidationOptions = {}
): PPPDevelopmentValidationResult => {
  const errors: PPPDevelopmentValidationErrors = {};
  const { allowedIndicators } = options;

  // Helper function to check if a section should be validated
  const shouldValidateSection = (indicator: string): boolean => {
    // If no allowedIndicators provided, validate all (for backward compatibility)
    if (!allowedIndicators || allowedIndicators.length === 0) {
      return true;
    }
    // Only validate if the indicator is in the allowed list
    return allowedIndicators.includes(indicator);
  };

  // Section 3.1 - Availability of PPP Act/Policy
  if (shouldValidateSection("3.1")) {
    const section31 = data.section3_1;
    if (!section31) {
      // Skip validation if section doesn't exist
    } else if (
      !section31.available ||
      (section31.available !== "yes" && section31.available !== "no")
    ) {
      errors["section3_1.available"] = "Please select Yes or No.";
    } else if (section31.available === "yes") {
      // Policy name and year of notification are required when "yes" is selected
      if (!section31.policyName || section31.policyName.trim() === "") {
        errors["section3_1.policyName"] = "Policy name is required.";
      } else if (!isAlphabetsOnly(section31.policyName)) {
        errors["section3_1.policyName"] =
          "Policy name should contain only letters, spaces, hyphens, and apostrophes.";
      } else if (!hasInitialsCapital(section31.policyName)) {
        errors["section3_1.policyName"] = "First letter must be capital.";
      }
      if (
        !section31.notificationYear ||
        section31.notificationYear.trim() === ""
      ) {
        errors["section3_1.notificationYear"] =
          "Year of notification is required.";
      } else if (!isValidYear(section31.notificationYear)) {
        errors["section3_1.notificationYear"] =
          "Enter a valid year of notification (e.g., 2024).";
      }
      // Skip file validation if "No document available" is selected
      if (!section31.noDocumentAvailable) {
        if (!hasRequiredFile(section31.file)) {
          errors["section3_1.file"] = "Upload file is required.";
        } else if (
          section31.file &&
          section31.file.file &&
          !isValidPdfFile(section31.file)
        ) {
          errors["section3_1.file"] = "Only PDF files are allowed.";
        }
      }
    } else if (section31.available === "no") {
      if (!section31.comment || section31.comment.trim() === "") {
        errors["section3_1.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 3.2 - Functional PPP Cell/Unit
  if (shouldValidateSection("3.2")) {
    const section32 = data.section3_2;
    if (!section32) {
      // Skip validation if section doesn't exist
    } else if (
      !section32.available ||
      (section32.available !== "yes" && section32.available !== "no")
    ) {
      errors["section3_2.available"] = "Please select Yes or No.";
    } else if (section32.available === "yes") {
      // Policy name and year of notification are required when "yes" is selected
      if (!section32.policyName || section32.policyName.trim() === "") {
        errors["section3_2.policyName"] = "Policy name is required.";
      } else if (!isAlphabetsOnly(section32.policyName)) {
        errors["section3_2.policyName"] =
          "Policy name should contain only letters, spaces, hyphens, and apostrophes.";
      } else if (!hasInitialsCapital(section32.policyName)) {
        errors["section3_2.policyName"] = "First letter must be capital.";
      }
      if (
        !section32.notificationYear ||
        section32.notificationYear.trim() === ""
      ) {
        errors["section3_2.notificationYear"] =
          "Year of notification is required.";
      } else if (!isValidYear(section32.notificationYear)) {
        errors["section3_2.notificationYear"] =
          "Enter a valid year of notification (e.g., 2024).";
      }
      // Skip file validation if "No document available" is selected
      if (!section32.noDocumentAvailable) {
        if (!hasRequiredFile(section32.file)) {
          errors["section3_2.file"] = "Upload notification is required.";
        } else if (
          section32.file &&
          section32.file.file &&
          !isValidPdfFile(section32.file)
        ) {
          errors["section3_2.file"] = "Only PDF files are allowed.";
        }
      }
    }
    // When "no", reason/comment is non-mandatory (no validation)
  }

  // Section 3.3 - Proposals under VGF/IIPDF (Yes/No: Yes = proposals; No = comment)
  if (shouldValidateSection("3.3")) {
    const section33 = data.section3_3;
    if (!section33) {
      // Skip validation if section doesn't exist
    } else if (
      section33.available !== "yes" &&
      section33.available !== "no"
    ) {
      errors["section3_3.available"] =
        "Please select Yes or No (proposals submitted under VGF/IIPDF).";
    } else if (section33.available === "no") {
      if (!section33.comment || section33.comment.trim() === "") {
        errors["section3_3.comment"] =
          "Comment (reason) is required when there are no proposals.";
      }
    } else if (!section33.VGFArray || section33.VGFArray.length === 0) {
      errors["section3_3.VGFArray"] = "At least one proposal is required.";
    } else {
      section33.VGFArray.forEach((entry, index) => {
        if (!entry.projectName || entry.projectName.trim() === "") {
          errors[`section3_3.VGFArray.${index}.projectName`] =
            "Project name is required.";
        } else if (!hasInitialsCapital(entry.projectName)) {
          errors[`section3_3.VGFArray.${index}.projectName`] =
            "First letter must be capital.";
        }
        if (!entry.sector || entry.sector.trim() === "") {
          errors[`section3_3.VGFArray.${index}.sector`] = "Sector is required.";
        }
        if (!entry.scheme || entry.scheme.trim() === "") {
          errors[`section3_3.VGFArray.${index}.scheme`] = "Scheme is required.";
        } else if (!isAlphabetsOnly(entry.scheme)) {
          errors[`section3_3.VGFArray.${index}.scheme`] =
            "Scheme should contain only letters, spaces, hyphens, and apostrophes.";
        } else if (!hasInitialsCapital(entry.scheme)) {
          errors[`section3_3.VGFArray.${index}.scheme`] =
            "First letter must be capital.";
        }
        if (!entry.submissionDate || !isValidDate(entry.submissionDate)) {
          errors[`section3_3.VGFArray.${index}.submissionDate`] =
            "Submission date is required (DD-MM-YYYY format).";
        }
        if (!entry.totalProjectCost || entry.totalProjectCost.trim() === "") {
          errors[`section3_3.VGFArray.${index}.totalProjectCost`] =
            "Total Project Cost is required.";
        } else if (
          !isNonNegativeDecimal(entry.totalProjectCost) ||
          !hasMaxTwoDecimals(entry.totalProjectCost)
        ) {
          errors[`section3_3.VGFArray.${index}.totalProjectCost`] =
            "Enter a non-negative number with up to two decimal places.";
        }
        if (!entry.statusOfProject || entry.statusOfProject.trim() === "") {
          errors[`section3_3.VGFArray.${index}.statusOfProject`] =
            "Status of Project is required.";
        } else if (!isAlphabetsOnly(entry.statusOfProject)) {
          errors[`section3_3.VGFArray.${index}.statusOfProject`] =
            "Status should contain only letters, spaces, hyphens, and apostrophes.";
        } else if (!hasInitialsCapital(entry.statusOfProject)) {
          errors[`section3_3.VGFArray.${index}.statusOfProject`] =
            "First letter must be capital.";
        }
        // Proof required: either upload file, "No Document Available", or link/text proof
        const hasFile =
          entry.file && (entry.file.fileName || (entry.file as FileUpload).file);
        const hasProofLinkOrText =
          entry.proofLinkOrText != null &&
          String(entry.proofLinkOrText).trim() !== "";
        if (!hasFile && !hasProofLinkOrText) {
          const message =
            "Either upload a file or provide a valid website link.";
          // Show the error on the Website link field so users know what to fill.
          errors[`section3_3.VGFArray.${index}.proofLinkOrText`] =
            message;
          // Also mark file as invalid so file upload UI can reflect the dependency.
          errors[`section3_3.VGFArray.${index}.file`] = message;
        } else if (hasProofLinkOrText) {
          const proof = String(entry.proofLinkOrText).trim();
          if (!isValidUrl(proof)) {
            errors[`section3_3.VGFArray.${index}.proofLinkOrText`] =
              "Please enter a valid website URL (http/https).";
          }
        }
      });
    }
  }

  // Section 3.4 - Proportion of TPC of PPP Projects
  if (shouldValidateSection("3.4")) {
    const section34 = data.section3_4;
    if (!section34) {
      // Skip validation if section doesn't exist
    } else {
      const totalProjectsAwardedStr =
        section34.totalProjectsAwarded != null
          ? String(section34.totalProjectsAwarded)
          : "";
      if (!totalProjectsAwardedStr || totalProjectsAwardedStr.trim() === "") {
        errors["section3_4.totalProjectsAwarded"] =
          "Total Budgeted capital allocation (INR-CRORE) is required.";
      } else if (
        !isNonNegativeDecimal(totalProjectsAwardedStr) ||
        !hasMaxTwoDecimals(totalProjectsAwardedStr)
      ) {
        errors["section3_4.totalProjectsAwarded"] =
          "Enter a non-negative number with up to two decimal places.";
      } else {
        // Cross-indicator consistency: 3.4's Budget Allocation must match 1.1's Capital Allocation
        const section11 =
          (data as any)?.section1_1 ??
          (data as any)?.infraFinancing?.section1_1;

        const capitalAllocation11 = section11?.capitalAllocation;
        if (
          capitalAllocation11 !== undefined &&
          capitalAllocation11 !== null &&
          String(capitalAllocation11).trim() !== ""
        ) {
          const capitalAllocation11Num = parseNumber(
            String(capitalAllocation11)
          );
          const totalProjectsAwardedNum = parseNumber(
            totalProjectsAwardedStr
          );

          if (
            !Number.isNaN(capitalAllocation11Num) &&
            !Number.isNaN(totalProjectsAwardedNum) &&
            capitalAllocation11Num.toFixed(2) !== totalProjectsAwardedNum.toFixed(2)
          ) {
            errors["section3_4.totalProjectsAwarded"] =
              "Total Budgeted capital allocation (INR-CRORE) in indicator 3.4 must match the Capital Allocation for FY (INR-CRORE) from indicator 1.1.";
          }
        }
      }

      // Note: totalProjectCostAwarded is auto-calculated, so we don't validate it here
      // It will be automatically set based on the sum of project costs

      // Note: Individual project fields in section3_4.projects are not required per the table
      // but if projects are added, they should be validated for completeness
      if (section34.projects && section34.projects.length > 0) {
        section34.projects.forEach((project, index) => {
          if (
            project.nameOfProject &&
            project.nameOfProject.trim() !== "" &&
            !hasInitialsCapital(project.nameOfProject)
          ) {
            errors[`section3_4.projects.${index}.nameOfProject`] =
              "First letter must be capital.";
          }
          // Validate infrastructureSector (required)
          if (
            !project.infrastructureSector ||
            project.infrastructureSector.trim() === ""
          ) {
            errors[`section3_4.projects.${index}.infrastructureSector`] =
              "Infrastructure Sector is required.";
          }

          // Validate decimal fields if they have values
          const totalProjectCostStr =
            project.totalProjectCost != null
              ? String(project.totalProjectCost)
              : "";
          if (totalProjectCostStr && totalProjectCostStr.trim() !== "") {
            if (
              !isNonNegativeDecimal(totalProjectCostStr) ||
              !hasMaxTwoDecimals(totalProjectCostStr)
            ) {
              errors[`section3_4.projects.${index}.totalProjectCost`] =
                "Enter a valid non-negative amount with up to two decimal places.";
            }
          }

          // Proof required: either upload file or provide a valid website link
          const hasFile =
            project.file &&
            ((project.file as FileUpload).fileName ||
              (project.file as FileUpload).file);
          const hasProofLinkOrText =
            project.proofLinkOrText != null &&
            String(project.proofLinkOrText).trim() !== "";

          if (!hasFile && !hasProofLinkOrText) {
            const message =
              "Either upload a file or provide a valid website link.";
            errors[`section3_4.projects.${index}.proofLinkOrText`] =
              message;
            errors[`section3_4.projects.${index}.file`] = message;
          } else if (hasProofLinkOrText) {
            const proof = String(project.proofLinkOrText).trim();
            if (!isValidUrl(proof)) {
              errors[`section3_4.projects.${index}.proofLinkOrText`] =
                "Please enter a valid website URL (http/https).";
            }
          }
        });
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
