import type { InfraEnablersData, FileUpload } from "../types";

export interface InfraEnablersValidationErrors {
  [fieldPath: string]: string;
}

export interface InfraEnablersValidationOptions {
  allowedIndicators?: string[];
}

export interface InfraEnablersValidationResult {
  isValid: boolean;
  errors: InfraEnablersValidationErrors;
}

const isValidUrl = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
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

const hasRequiredFileOrUrl = (
  file: FileUpload | null | undefined,
  url?: string
): boolean => {
  if (hasRequiredFile(file)) return true;
  if (url && url.trim() !== "" && isValidUrl(url)) return true;
  return false;
};

export const validateInfraEnablers = (
  data: InfraEnablersData,
  options: InfraEnablersValidationOptions = {}
): InfraEnablersValidationResult => {
  const errors: InfraEnablersValidationErrors = {};
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

  // Section 4.1 - Availability & Use of State/UT PMG
  if (shouldValidateSection("4.1")) {
    const section42 = data.section4_1;
    if (!section42) {
      // Skip validation if section doesn't exist
    } else if (
      !section42.available ||
      (section42.available !== "yes" && section42.available !== "no")
    ) {
      errors["section4_1.available"] = "Please select Yes or No.";
    } else if (section42.available === "yes") {
      // Check if file or URL is provided (assuming URL might be in comment or a separate field)
      // For now, we'll check if file exists. If URL support is needed, we'll need to check that too
      if (!hasRequiredFile(section42.file)) {
        errors["section4_1.file"] = "Upload file is required.";
      }
      // Note: If URL is stored elsewhere, add validation here
    } else if (section42.available === "no") {
      if (!section42.comment || section42.comment.trim() === "") {
        errors["section4_1.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 4.2 - Adoption of PM GatiShakti
  if (shouldValidateSection("4.2")) {
    const section43 = data.section4_2;
    if (!section43) {
      // Skip validation if section doesn't exist
    } else if (
      !section43.adopted ||
      (section43.adopted !== "yes" && section43.adopted !== "no")
    ) {
      errors["section4_2.adopted"] = "Please select Yes or No.";
    } else if (section43.adopted === "yes") {
      if (!section43.projects || section43.projects.length === 0) {
        errors["section4_2.projects"] = "At least one project is required.";
      } else {
        section43.projects.forEach((project, index) => {
          if (!project.projectName || project.projectName.trim() === "") {
            errors[`section4_2.projects.${index}.projectName`] =
              "Project name is required.";
          } else if (!isAlphabetsOnly(project.projectName)) {
            errors[`section4_2.projects.${index}.projectName`] =
              "Project name should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!project.sector || project.sector.trim() === "") {
            errors[`section4_2.projects.${index}.sector`] =
              "Sector is required.";
          }
          if (!hasRequiredFile(project.file)) {
            errors[`section4_2.projects.${index}.file`] =
              "Upload evidence is required.";
          } else if (
            project.file &&
            project.file.file &&
            !isValidPdfFile(project.file)
          ) {
            errors[`section4_2.projects.${index}.file`] =
              "Only PDF files are allowed.";
          }
        });
      }
    } else if (section43.adopted === "no") {
      if (!section43.comment || section43.comment.trim() === "") {
        errors["section4_2.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 4.3 - Adoption of ADR
  if (shouldValidateSection("4.3")) {
    const section44 = data.section4_3;
    if (!section44) {
      // Skip validation if section doesn't exist
    } else if (
      !section44.adopted ||
      (section44.adopted !== "yes" && section44.adopted !== "no")
    ) {
      errors["section4_3.adopted"] = "Please select Yes or No.";
    } else if (section44.adopted === "yes") {
      if (!hasRequiredFile(section44.file)) {
        errors["section4_3.file"] = "Upload orders is required.";
      } else if (
        section44.file &&
        section44.file.file &&
        !isValidPdfFile(section44.file)
      ) {
        errors["section4_3.file"] = "Only PDF files are allowed.";
      }
    } else if (section44.adopted === "no") {
      if (!section44.comment || section44.comment.trim() === "") {
        errors["section4_3.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 4.4 - Innovative Practices
  if (shouldValidateSection("4.4")) {
    const section45 = data.section4_4;
    if (!section45) {
      // Skip validation if section doesn't exist
    } else if (
      !section45.implemented ||
      (section45.implemented !== "yes" && section45.implemented !== "no")
    ) {
      errors["section4_4.implemented"] = "Please select Yes or No.";
    } else if (section45.implemented === "yes") {
      if (!section45.practices || section45.practices.length === 0) {
        errors["section4_4.practices"] = "At least one practice is required.";
      } else {
        section45.practices.forEach((practice, index) => {
          if (!practice.practiceName || practice.practiceName.trim() === "") {
            errors[`section4_4.practices.${index}.practiceName`] =
              "Practice name is required.";
          } else if (!isAlphabetsOnly(practice.practiceName)) {
            errors[`section4_4.practices.${index}.practiceName`] =
              "Practice name should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!practice.impact || practice.impact.trim() === "") {
            errors[`section4_4.practices.${index}.impact`] =
              "Impact is required.";
          }
          if (!hasRequiredFile(practice.file)) {
            errors[`section4_4.practices.${index}.file`] =
              "Upload evidence is required.";
          }
        });
      }
    } else if (section45.implemented === "no") {
      if (!section45.comment || section45.comment.trim() === "") {
        errors["section4_4.comment"] = "Comment (reason) is required.";
      }
    }
  }

  // Section 4.5 - Capacity Building – Officer Participation
  if (shouldValidateSection("4.5")) {
    const section46 = data.section4_5;
    if (!section46) {
      // Skip validation if section doesn't exist
    } else if (
      !section46.participated ||
      (section46.participated !== "yes" && section46.participated !== "no")
    ) {
      errors["section4_5.participated"] = "Please select Yes or No.";
    } else if (section46.participated === "yes") {
      if (!section46.capacityArray || section46.capacityArray.length === 0) {
        errors["section4_5.capacityArray"] =
          "At least one officer entry is required.";
      } else {
        section46.capacityArray.forEach((entry, index) => {
          if (!entry.officerName || entry.officerName.trim() === "") {
            errors[`section4_5.capacityArray.${index}.officerName`] =
              "Officer name is required.";
          } else if (!isAlphabetsOnly(entry.officerName)) {
            errors[`section4_5.capacityArray.${index}.officerName`] =
              "Officer name should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!entry.designation || entry.designation.trim() === "") {
            errors[`section4_5.capacityArray.${index}.designation`] =
              "Designation is required.";
          } else if (!isAlphabetsOnly(entry.designation)) {
            errors[`section4_5.capacityArray.${index}.designation`] =
              "Designation should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!entry.programName || entry.programName.trim() === "") {
            errors[`section4_5.capacityArray.${index}.programName`] =
              "Program name is required.";
          } else if (!isAlphabetsOnly(entry.programName)) {
            errors[`section4_5.capacityArray.${index}.programName`] =
              "Program name should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!entry.organiser || entry.organiser.trim() === "") {
            errors[`section4_5.capacityArray.${index}.organiser`] =
              "Organizer is required.";
          } else if (!isAlphabetsOnly(entry.organiser)) {
            errors[`section4_5.capacityArray.${index}.organiser`] =
              "Organizer should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!entry.trainingType || entry.trainingType.trim() === "") {
            errors[`section4_5.capacityArray.${index}.trainingType`] =
              "Type is required.";
          } else if (!isAlphabetsOnly(entry.trainingType)) {
            errors[`section4_5.capacityArray.${index}.trainingType`] =
              "Training type should contain only letters, spaces, hyphens, and apostrophes.";
          }
          if (!entry.trainingPeriod || entry.trainingPeriod.trim() === "") {
            errors[`section4_5.capacityArray.${index}.trainingPeriod`] =
              "Conducted during (MM/YY) is required.";
          } else {
            // Handle both MM/YY and MMYY formats for backward compatibility
            let monthStr: string;
            let yearStr: string;
            let formatValid = false;

            if (
              entry.trainingPeriod.includes("/") &&
              entry.trainingPeriod.length === 5
            ) {
              // MM/YY format (e.g., "07/26")
              const parts = entry.trainingPeriod.split("/");
              if (
                parts.length === 2 &&
                parts[0].length === 2 &&
                parts[1].length === 2
              ) {
                monthStr = parts[0];
                yearStr = parts[1];
                formatValid = true;
              }
            } else if (/^\d{4}$/.test(entry.trainingPeriod)) {
              // MMYY format (e.g., "0726") - backward compatibility
              monthStr = entry.trainingPeriod.substring(0, 2);
              yearStr = entry.trainingPeriod.substring(2, 4);
              formatValid = true;
            }

            if (!formatValid) {
              errors[`section4_5.capacityArray.${index}.trainingPeriod`] =
                "Conducted during must be in MM/YY format (e.g., 07/26).";
            } else {
              // Validate month (01-12) and year (00-99)
              const month = parseInt(monthStr, 10);
              const year = parseInt(yearStr, 10);

              if (isNaN(month) || month < 1 || month > 12) {
                errors[`section4_5.capacityArray.${index}.trainingPeriod`] =
                  "Month must be between 01 and 12.";
              }
              if (isNaN(year) || year < 0 || year > 99) {
                errors[`section4_5.capacityArray.${index}.trainingPeriod`] =
                  "Year must be between 00 and 99.";
              }
            }
          }
        });
      }
    } else if (section46.participated === "no") {
      if (!section46.comment || section46.comment.trim() === "") {
        errors["section4_5.comment"] = "Comment (reason) is required.";
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
