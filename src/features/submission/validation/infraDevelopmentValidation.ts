import type { InfraDevelopmentData, FileUpload } from "../types";

export interface InfraDevelopmentValidationErrors {
  [fieldPath: string]: string;
}

export interface InfraDevelopmentValidationOptions {
  allowedIndicators?: string[];
}

export interface InfraDevelopmentValidationResult {
  isValid: boolean;
  errors: InfraDevelopmentValidationErrors;
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

const isValidUrl = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const isValidPdfFile = (file: FileUpload | null): boolean => {
  if (!file || !file.file) return false;
  const fileName = file.fileName || file.file.name || "";
  const mimeType = file.mimeType || file.file.type || "";
  const isPdf =
    fileName.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf";
  return isPdf;
};

const isFileSizeValid = (
  file: FileUpload | null,
  maxSizeMB: number
): boolean => {
  if (!file || !file.fileSize) return false;
  const sizeInMB = file.fileSize / (1024 * 1024);
  return sizeInMB <= maxSizeMB;
};

const hasRequiredFile = (files: FileUpload[] | null | undefined): boolean => {
  if (!files || !Array.isArray(files) || files.length === 0) return false;
  return files.some(
    (file) => file && (file.file || file.fileName || file.filePath)
  );
};

export const validateInfraDevelopment = (
  data: InfraDevelopmentData,
  options: InfraDevelopmentValidationOptions = {}
): InfraDevelopmentValidationResult => {
  const errors: InfraDevelopmentValidationErrors = {};
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

  // Section 2.1 - Availability of Infrastructure Act/Policy
  if (shouldValidateSection("2.1")) {
    const section21 = data.section2_1;
    if (!section21.infraActArray || section21.infraActArray.length < 1) {
      errors["section2_1.infraActArray"] =
        "At least one entry is required.";
    } else {
      section21.infraActArray.forEach((entry, index) => {
        if (!entry.sector || entry.sector.trim() === "") {
          errors[`section2_1.infraActArray.${index}.sector`] =
            "Sector is required.";
        }
        if (!hasRequiredFile(entry.files)) {
          errors[`section2_1.infraActArray.${index}.files`] =
            "Upload file is required.";
        } else {
          const file = entry.files?.[0];
          if (file && file.file && !isValidPdfFile(file)) {
            errors[`section2_1.infraActArray.${index}.files`] =
              "Only PDF files are allowed.";
          }
          if (file && !isFileSizeValid(file, 50)) {
            errors[`section2_1.infraActArray.${index}.files`] =
              "File size must be ≤50MB.";
          }
        }
      });
    }
  }

  // Section 2.2 - Availability of Specialized Entity
  if (shouldValidateSection("2.2")) {
    const section22 = data.section2_2;
    if (
      !section22.specializedEntityArray ||
      section22.specializedEntityArray.length === 0
    ) {
      errors["section2_2.specializedEntityArray"] =
        "At least one entry is required.";
    } else {
      section22.specializedEntityArray.forEach((entry, index) => {
        if (!entry.sector || entry.sector.trim() === "") {
          errors[`section2_2.specializedEntityArray.${index}.sector`] =
            "Sector is required.";
        }
        if (!hasRequiredFile(entry.files)) {
          errors[`section2_2.specializedEntityArray.${index}.files`] =
            "Upload evidence is required.";
        } else {
          const file = entry.files?.[0];
          if (file && file.file && !isValidPdfFile(file)) {
            errors[`section2_2.specializedEntityArray.${index}.files`] =
              "Only PDF files are allowed.";
          }
        }
      });
    }
  }

  // Section 2.3 - Sector Infra Development Plan
  if (shouldValidateSection("2.3")) {
    const section23 = data.section2_3;
    const hasInfraDevelopmentPlan = section23.hasInfraDevelopmentPlan;

    if (
      !hasInfraDevelopmentPlan ||
      (hasInfraDevelopmentPlan !== "yes" && hasInfraDevelopmentPlan !== "no")
    ) {
      errors["section2_3.hasInfraDevelopmentPlan"] = "Please select Yes or No.";
    } else if (hasInfraDevelopmentPlan === "yes") {
      if (
        !section23.infraDevelopmentArray ||
        section23.infraDevelopmentArray.length === 0
      ) {
        errors["section2_3.infraDevelopmentArray"] =
          "At least one entry is required when plan is available.";
      } else {
        section23.infraDevelopmentArray.forEach((entry, index) => {
          if (!entry.sector || entry.sector.trim() === "") {
            errors[`section2_3.infraDevelopmentArray.${index}.sector`] =
              "Sector is required.";
          }
          if (!hasRequiredFile(entry.files)) {
            errors[`section2_3.infraDevelopmentArray.${index}.files`] =
              "Upload plan is required.";
          } else {
            const file = entry.files?.[0];
            if (file && file.file && !isValidPdfFile(file)) {
              errors[`section2_3.infraDevelopmentArray.${index}.files`] =
                "Only PDF files are allowed.";
            }
          }
        });
      }
    } else if (hasInfraDevelopmentPlan === "no") {
      if (!section23.comment || section23.comment.trim() === "") {
        errors["section2_3.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 2.4 - Investment Ready Project Pipeline
  if (shouldValidateSection("2.4")) {
    const section24 = data.section2_4;
    if (
      !section24.hasInvestmentReady ||
      (section24.hasInvestmentReady !== "yes" &&
        section24.hasInvestmentReady !== "no")
    ) {
      errors["section2_4.hasInvestmentReady"] = "Please select Yes or No.";
    } else if (section24.hasInvestmentReady === "yes") {
      if (!section24.websiteLink || section24.websiteLink.trim() === "") {
        errors["section2_4.websiteLink"] = "Website link is required.";
      } else if (!isValidUrl(section24.websiteLink)) {
        errors["section2_4.websiteLink"] = "Enter a valid website URL.";
      }
      if (
        !section24.investmentReadyArray ||
        section24.investmentReadyArray.length === 0
      ) {
        errors["section2_4.investmentReadyArray"] =
          "At least one project is required.";
      } else {
        section24.investmentReadyArray.forEach((entry, index) => {
          if (!entry.projectName || entry.projectName.trim() === "") {
            errors[`section2_4.investmentReadyArray.${index}.projectName`] =
              "Project name is required.";
          }
          if (!entry.sector || entry.sector.trim() === "") {
            errors[`section2_4.investmentReadyArray.${index}.sector`] =
              "Sector is required.";
          }
          if (!entry.status || entry.status.trim() === "") {
            errors[`section2_4.investmentReadyArray.${index}.status`] =
              "Status is required.";
          }
          if (!entry.investmentType || entry.investmentType.trim() === "") {
            errors[`section2_4.investmentReadyArray.${index}.investmentType`] =
              "Type of investment is required.";
          }
          if (entry.projectSize !== undefined && entry.projectSize !== "") {
            if (
              !isNonNegativeDecimal(entry.projectSize) ||
              !hasMaxTwoDecimals(entry.projectSize)
            ) {
              errors[`section2_4.investmentReadyArray.${index}.projectSize`] =
                "Enter a non-negative amount with up to two decimal places.";
            }
          }
        });
      }
    } else if (section24.hasInvestmentReady === "no") {
      if (!section24.comment || section24.comment.trim() === "") {
        errors["section2_4.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 2.5 - Asset Monetization Pipeline
  if (shouldValidateSection("2.5")) {
    const section25 = data.section2_5;
    if (
      !section25.assetMonetizationArray ||
      section25.assetMonetizationArray.length === 0
    ) {
      errors["section2_5.assetMonetizationArray"] =
        "At least one asset entry is required.";
    } else {
      section25.assetMonetizationArray.forEach((entry, index) => {
        if (!entry.projectName || entry.projectName.trim() === "") {
          errors[`section2_5.assetMonetizationArray.${index}.projectName`] =
            "Asset/Project name is required.";
        }
        if (!entry.type || entry.type.trim() === "") {
          errors[`section2_5.assetMonetizationArray.${index}.type`] =
            "Type is required.";
        }
        if (!entry.sector || entry.sector.trim() === "") {
          errors[`section2_5.assetMonetizationArray.${index}.sector`] =
            "Sector is required.";
        }
        if (entry.ownership && entry.ownership.length > 100) {
          errors[`section2_5.assetMonetizationArray.${index}.ownership`] =
            "Asset ownership must be ≤100 characters.";
        }
        if (
          entry.estimatedMonetization !== undefined &&
          entry.estimatedMonetization !== ""
        ) {
          if (
            !isNonNegativeDecimal(entry.estimatedMonetization) ||
            !hasMaxTwoDecimals(entry.estimatedMonetization)
          ) {
            errors[
              `section2_5.assetMonetizationArray.${index}.estimatedMonetization`
            ] = "Enter a non-negative amount with up to two decimal places.";
          }
        }
      });
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
