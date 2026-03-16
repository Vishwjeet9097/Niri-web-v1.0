/**
 * Centralized error message utility for all mandatory fields across all 19 indicators.
 * This provides a single source of truth for error messages that can be used
 * in both create mode (submission pages) and edit mode (review components).
 */

import {
  MANDATORY_FIELDS,
  getMandatoryFields,
} from "../constants/mandatoryFields";

/**
 * Default error messages for common field types
 */
export const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  required: "This field is required.",
  invalidNumber: "Please enter a valid number.",
  invalidDecimal: "Please enter a valid decimal number.",
  invalidInteger: "Please enter a valid integer.",
  invalidUrl: "Please enter a valid URL.",
  invalidEmail: "Please enter a valid email address.",
  invalidDate: "Please enter a valid date.",
  invalidPercentage: "Percentage must be between 0 and 100.",
  greaterThanZero: "Value must be greater than zero.",
  maxDecimals: "Maximum two decimal places allowed.",
  invalidFile: "Please upload a valid file.",
  invalidPdf: "Only PDF files are allowed.",
  fileRequired: "File upload is required.",
};

/**
 * Field-specific error messages
 * These override default messages for specific fields
 */
export const FIELD_ERROR_MESSAGES: Record<string, string> = {
  // Section 1.1
  "section1_1.capitalAllocation":
    "Capital Allocation must be greater than zero.",
  "section1_1.gsdpForFY": "GSDP for FY must be greater than zero.",
  "section1_1.allocationToGSDP":
    "Calculated allocation to GSDP cannot exceed 100%.",

  // Section 1.2
  "section1_2.actualCapex":
    "State Capex Utilisation must be greater than zero.",
  "section1_2.stateCapexUtilisation":
    "Capital Allocation for FY must be greater than zero.",
  "section1_2.capexActualsToGSDP":
    "Calculated capex actuals to GSDP cannot exceed 100%.",

  // Section 1.3
  "section1_3.totalULBs": "Total number of ULBs is required.",
  "section1_3.ulbList": "At least one ULB entry is required.",

  // Section 1.4
  "section1_4.totalULBs": "Total number of ULBs is required.",
  "section1_4.bondList": "At least one bond entry is required.",

  // Section 1.5
  "section1_5.hasIntermediary": "Please select Yes or No.",
  "section1_5.ffiArray":
    "Add at least one financial intermediary when selecting Yes.",
  "section1_5.comment": "Comment (reason) is required.",

  // Section 2.1
  "section2_1.infraActArray":
    "At least one infrastructure act/policy entry is required.",
  "section2_1.infraActArray.sector": "Sector is required.",
  "section2_1.infraActArray.files": "Upload file is required.",
  "section2_1.infraActArray.policyName": "Policy name is required.",
  "section2_1.infraActArray.notificationYear":
    "Enter a valid year of notification (e.g., 2024).",

  // Section 2.2
  "section2_2.specializedEntityArray":
    "At least one specialized entity entry is required.",
  "section2_2.specializedEntityArray.entityName":
    "Entity name is required.",
  "section2_2.specializedEntityArray.notificationYear":
    "Enter a valid year of notification (e.g., 2024).",
  "section2_2.specializedEntityArray.files": "Upload evidence is required.",

  // Section 2.3
  "section2_3.hasInfraDevelopmentPlan": "Please select Yes or No.",
  "section2_3.infraDevelopmentArray":
    "At least one development plan entry is required.",
  "section2_3.infraDevelopmentArray.planName": "Plan name is required.",
  "section2_3.infraDevelopmentArray.planDuration":
    "Plan duration is required.",
  "section2_3.infraDevelopmentArray.sector": "Sector is required.",
  "section2_3.infraDevelopmentArray.files": "Upload plan is required.",
  "section2_3.comment": "Comment (reason) is required.",

  // Section 2.4
  "section2_4.hasInvestmentReady": "Please select Yes or No.",
  "section2_4.websiteLink": "Website link is required.",
  "section2_4.investmentReadyArray": "At least one project is required.",
  "section2_4.investmentReadyArray.projectName": "Project name is required.",
  "section2_4.investmentReadyArray.sector": "Sector is required.",
  "section2_4.investmentReadyArray.status": "Status is required.",
  "section2_4.investmentReadyArray.projectSize": "Project size is required.",
  "section2_4.comment": "Comment (reason) is required.",

  // Section 2.5
  "section2_5.assetMonetizationArray":
    "At least one asset monetization entry is required.",
  "section2_5.assetMonetizationArray.projectName":
    "Asset/Project name is required.",
  "section2_5.assetMonetizationArray.type": "Type is required.",
  "section2_5.assetMonetizationArray.sector": "Sector is required.",
  "section2_5.assetMonetizationArray.ownership":
    "Asset ownership must be ≤100 characters.",
  "section2_5.assetMonetizationArray.estimatedMonetization":
    "Enter a non-negative amount with up to two decimal places.",

  // Section 3.1
  "section3_1.available": "Please select Yes or No.",
  "section3_1.policyName": "Policy name is required.",
  "section3_1.notificationYear":
    "Enter a valid year of notification (e.g., 2024).",
  "section3_1.file": "Upload file is required.",
  "section3_1.comment": "Comment (reason) is required.",

  // Section 3.2
  "section3_2.available": "Please select Yes or No.",
  "section3_2.policyName": "Policy name is required.",
  "section3_2.notificationYear":
    "Enter a valid year of notification (e.g., 2024).",
  "section3_2.file": "Upload notification is required.",

  // Section 3.3
  "section3_3.available":
    "Please select Yes or No (proposals submitted under VGF/IIPDF).",
  "section3_3.comment":
    "Comment (reason) is required when there are no proposals.",
  "section3_3.VGFArray": "At least one proposal is required.",
  "section3_3.VGFArray.projectName": "Project name is required.",
  "section3_3.VGFArray.sector": "Sector is required.",
  "section3_3.VGFArray.scheme": "Scheme is required.",
  "section3_3.VGFArray.totalProjectCost": "Total Project Cost is required.",
  "section3_3.VGFArray.totalProjectCost.format":
    "Enter a non-negative number with up to two decimal places.",
  "section3_3.VGFArray.statusOfProject": "Status of Project is required.",
  "section3_3.VGFArray.submissionDate":
    "Submission date is required (DD-MM-YYYY format).",
  "section3_3.VGFArray.file":
    "Either upload a file, select No document available, or provide link/text proof (e.g., PPP India portal).",

  // Section 3.4
  "section3_4.projects": "At least one project is required.",
  "section3_4.totalProjectsAwarded":
    "Total Budgeted capital allocation (INR-CRORE) is required.",
  "section3_4.totalProjectCostAwarded":
    "Total of TPC of PPP Projects (INR-CRORE) is required.",
  "section3_4.projects.totalProjectCost":
    "Enter a valid non-negative amount with up to two decimal places.",
  "section3_4.projects.infrastructureSector":
    "Infrastructure Sector is required.",

  // Section 4.1
  "section4_1.available": "Please select Yes or No.",
  "section4_1.file": "Upload file is required.",
  "section4_1.comment": "Comment (reason) is required.",

  // Section 4.2
  "section4_2.adopted": "Please select Yes or No.",
  "section4_2.projects": "At least one project is required.",
  "section4_2.projects.projectName": "Project name is required.",
  "section4_2.projects.sector": "Sector is required.",
  "section4_2.projects.file": "Upload evidence is required.",
  "section4_2.comment": "Comment (reason) is required.",

  // Section 4.3
  "section4_3.adopted": "Please select Yes or No.",
  "section4_3.file": "Upload orders is required.",
  "section4_3.comment": "Comment (reason) is required.",

  // Section 4.4
  "section4_4.implemented": "Please select Yes or No.",
  "section4_4.practices": "At least one practice is required.",
  "section4_4.practices.practiceName": "Practice name is required.",
  "section4_4.practices.impact": "Impact is required.",
  "section4_4.practices.file": "Upload evidence is required.",
  "section4_4.comment": "Comment (reason) is required.",

  // Section 4.5
  "section4_5.participated": "Please select Yes or No.",
  "section4_5.capacityArray": "At least one officer entry is required.",
  "section4_5.capacityArray.officerName": "Officer name is required.",
  "section4_5.capacityArray.designation": "Designation is required.",
  "section4_5.capacityArray.programName": "Program name is required.",
  "section4_5.capacityArray.organiser": "Organizer is required.",
  "section4_5.capacityArray.trainingType": "Type is required.",
  "section4_5.comment": "Comment (reason) is required.",
};

/**
 * Get error message for a specific field path
 * Priority: validation error (highest) > field-specific message > default message
 *
 * @param fieldPath - The field path (e.g., "section1_1.capitalAllocation")
 * @param validationError - The error message from validation (if any)
 * @param defaultMessage - Default message to use if no specific message found
 * @returns The error message to display
 */
export const getFieldErrorMessage = (
  fieldPath: string,
  validationError?: string,
  defaultMessage: string = DEFAULT_ERROR_MESSAGES.required
): string => {
  // If validation provides a specific error, use it (highest priority)
  // This prevents duplicates - validation errors always take precedence
  if (validationError) {
    return validationError;
  }

  // Check for field-specific error message (only if no validation error)
  if (FIELD_ERROR_MESSAGES[fieldPath]) {
    return FIELD_ERROR_MESSAGES[fieldPath];
  }

  // For array item fields (e.g., "section2_4.investmentReadyArray.0.projectName"),
  // try to match the pattern without the index (e.g., "section2_4.investmentReadyArray.projectName")
  const pathParts = fieldPath.split(".");
  if (pathParts.length >= 3) {
    // Check if any part is a number (index) - typically the second or third part
    for (let i = 1; i < pathParts.length - 1; i++) {
      if (/^\d+$/.test(pathParts[i])) {
        // Found an index, construct pattern without it: section.arrayField.fieldName
        const section = pathParts[0];
        const arrayField = pathParts[i - 1]; // Field before the index
        const fieldName = pathParts.slice(i + 1).join("."); // Everything after index
        const arrayItemPattern = `${section}.${arrayField}.${fieldName}`;

        if (FIELD_ERROR_MESSAGES[arrayItemPattern]) {
          return FIELD_ERROR_MESSAGES[arrayItemPattern];
        }
        break; // Only try the first index found
      }
    }
  }

  // Use default message
  return defaultMessage;
};

/**
 * Get all mandatory field paths for a section
 * Useful for validating all mandatory fields at once
 *
 * @param sectionKey - The section key (e.g., "section1_1")
 * @param data - The section data (for conditional fields)
 * @returns Array of field paths that are mandatory
 */
export const getMandatoryFieldPaths = (
  sectionKey: string,
  data?: any
): string[] => {
  const mandatoryFields = getMandatoryFields(sectionKey, data);
  return mandatoryFields.map((field) => `${sectionKey}.${field}`);
};

/**
 * Check if a field path is mandatory
 *
 * @param fieldPath - The field path (e.g., "section1_1.capitalAllocation")
 * @param data - The section data (for conditional fields)
 * @returns True if the field is mandatory
 */
export const isFieldPathMandatory = (
  fieldPath: string,
  data?: any
): boolean => {
  const pathParts = fieldPath.split(".");
  if (pathParts.length < 2) return false;

  const sectionKey = pathParts[0];
  const fieldName = pathParts[1];

  const mandatoryFields = getMandatoryFields(sectionKey, data);
  return mandatoryFields.includes(fieldName);
};
