import type { PPPDevelopmentData, FileUpload } from "../types";

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

const isValidDate = (value: string): boolean => {
  if (!value || value.trim() === "") return false;
  try {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  } catch {
    return false;
  }
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
      if (!hasRequiredFile(section31.file)) {
        errors["section3_1.file"] = "Upload file is required.";
      } else if (
        section31.file &&
        section31.file.file &&
        !isValidPdfFile(section31.file)
      ) {
        errors["section3_1.file"] = "Only PDF files are allowed.";
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
      if (!hasRequiredFile(section32.file)) {
        errors["section3_2.file"] = "Upload notification is required.";
      } else if (
        section32.file &&
        section32.file.file &&
        !isValidPdfFile(section32.file)
      ) {
        errors["section3_2.file"] = "Only PDF files are allowed.";
      }
    } else if (section32.available === "no") {
      if (!section32.comment || section32.comment.trim() === "") {
        errors["section3_2.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 3.3 - Proposals under VGF/IIPDF
  if (shouldValidateSection("3.3")) {
    const section33 = data.section3_3;
    if (!section33) {
      // Skip validation if section doesn't exist
    } else if (!section33.VGFArray || section33.VGFArray.length === 0) {
      errors["section3_3.VGFArray"] = "At least one proposal is required.";
    } else {
      section33.VGFArray.forEach((entry, index) => {
        if (!entry.projectName || entry.projectName.trim() === "") {
          errors[`section3_3.VGFArray.${index}.projectName`] =
            "Project name is required.";
        }
        if (!entry.sector || entry.sector.trim() === "") {
          errors[`section3_3.VGFArray.${index}.sector`] = "Sector is required.";
        }
        if (!entry.scheme || entry.scheme.trim() === "") {
          errors[`section3_3.VGFArray.${index}.scheme`] = "Scheme is required.";
        }
        if (!entry.submissionDate || !isValidDate(entry.submissionDate)) {
          errors[`section3_3.VGFArray.${index}.submissionDate`] =
            "Submission date is required (DD-MM-YYYY format).";
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
      const totalProjectsAwardedStr = section34.totalProjectsAwarded != null 
        ? String(section34.totalProjectsAwarded) 
        : "";
      if (!totalProjectsAwardedStr || totalProjectsAwardedStr.trim() === "") {
        errors["section3_4.totalProjectsAwarded"] =
          "Total number of infrastructure projects awarded is required.";
      } else if (!isValidInteger(totalProjectsAwardedStr)) {
        errors["section3_4.totalProjectsAwarded"] =
          "Enter a valid non-negative integer.";
      }

      const totalProjectCostAwardedStr = section34.totalProjectCostAwarded != null 
        ? String(section34.totalProjectCostAwarded) 
        : "";
      if (!totalProjectCostAwardedStr || totalProjectCostAwardedStr.trim() === "") {
        errors["section3_4.totalProjectCostAwarded"] =
          "Total project cost of infrastructure projects awarded is required.";
      } else if (
        !isNonNegativeDecimal(totalProjectCostAwardedStr) ||
        !hasMaxTwoDecimals(totalProjectCostAwardedStr)
      ) {
        errors["section3_4.totalProjectCostAwarded"] =
          "Enter a valid non-negative amount with up to two decimal places.";
      }

      // Note: Individual project fields in section3_4.projects are not required per the table
      // but if projects are added, they should be validated for completeness
      if (section34.projects && section34.projects.length > 0) {
        section34.projects.forEach((project, index) => {
          // Validate decimal fields if they have values
          const totalProjectCostStr = project.totalProjectCost != null 
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
          const capexPercentageStr = project.capexPercentage != null 
            ? String(project.capexPercentage) 
            : "";
          if (capexPercentageStr && capexPercentageStr.trim() !== "") {
            if (!isNonNegativeDecimal(capexPercentageStr)) {
              errors[`section3_4.projects.${index}.capexPercentage`] =
                "Enter a valid non-negative percentage.";
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
