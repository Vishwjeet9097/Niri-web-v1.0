import type { InfraFinancingData } from "../types";

export interface InfraFinancingValidationErrors {
  [fieldPath: string]: string;
}

export interface InfraFinancingValidationResult {
  isValid: boolean;
  errors: InfraFinancingValidationErrors;
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

const isValidYear = (value: string): boolean => {
  const normalized = (value ?? "").toString().trim();
  return /^\d{4}$/.test(normalized) || /^\d{4}-\d{2}$/.test(normalized);
};

const parseNumber = (value: string): number => {
  const sanitized = sanitizeNumber(value);
  if (sanitized === "") return NaN;
  const num = Number(sanitized);
  return Number.isNaN(num) ? NaN : num;
};

const isValidPercentage = (value: number): boolean =>
  !Number.isNaN(value) && value >= 0 && value <= 100;

const isValidInteger = (value: number): boolean =>
  Number.isInteger(value) && value >= 0;

const isValidUrl = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

export const validateInfraFinancing = (
  data: InfraFinancingData
): InfraFinancingValidationResult => {
  const errors: InfraFinancingValidationErrors = {};

  // Section 1.1 validations
  const section11 = data.section1_1;
  if (!isValidYear(section11.year)) {
    errors["section1_1.year"] = "Enter a valid year (e.g., 2024 or 2024-25).";
  }

  if (
    !isNonNegativeDecimal(section11.capitalAllocation) ||
    !hasMaxTwoDecimals(section11.capitalAllocation)
  ) {
    errors["section1_1.capitalAllocation"] =
      "Enter a non-negative amount with up to two decimal places.";
  }

  if (
    !isNonNegativeDecimal(section11.gsdpForFY) ||
    !hasMaxTwoDecimals(section11.gsdpForFY)
  ) {
    errors["section1_1.gsdpForFY"] =
      "Enter a non-negative amount with up to two decimal places.";
  }

  const capitalAllocation = parseNumber(section11.capitalAllocation);
  const gsdpForFY = parseNumber(section11.gsdpForFY);
  if (
    !Number.isNaN(capitalAllocation) &&
    !Number.isNaN(gsdpForFY) &&
    gsdpForFY > 0
  ) {
    const allocationPercentage = (capitalAllocation / gsdpForFY) * 100;
    if (!isValidPercentage(allocationPercentage)) {
      errors["section1_1.allocationToGSDP"] =
        "Calculated allocation to GSDP must be between 0% and 100%.";
    }
  }

  // Section 1.2 validations
  const section12 = data.section1_2;
  if (!isValidYear(section12.year)) {
    errors["section1_2.year"] = "Enter a valid year (e.g., 2024 or 2024-25).";
  }

  if (
    !isNonNegativeDecimal(section12.actualCapex) ||
    !hasMaxTwoDecimals(section12.actualCapex)
  ) {
    errors["section1_2.actualCapex"] =
      "Enter a non-negative amount with up to two decimal places.";
  }

  if (
    !isNonNegativeDecimal(section12.stateCapexUtilisation) ||
    !hasMaxTwoDecimals(section12.stateCapexUtilisation)
  ) {
    errors["section1_2.stateCapexUtilisation"] =
      "Enter a non-negative amount with up to two decimal places.";
  } else if (parseNumber(section12.stateCapexUtilisation) === 0) {
    errors["section1_2.stateCapexUtilisation"] =
      "State capex utilisation must be greater than zero.";
  }

  const actualCapex = parseNumber(section12.actualCapex);
  const stateCapexUtilisation = parseNumber(section12.stateCapexUtilisation);
  if (
    !Number.isNaN(actualCapex) &&
    !Number.isNaN(stateCapexUtilisation) &&
    stateCapexUtilisation > 0
  ) {
    const capexPercentage = (actualCapex / stateCapexUtilisation) * 100;
    if (!isValidPercentage(capexPercentage)) {
      errors["section1_2.capexActualsToGSDP"] =
        "Calculated capex actuals to GSDP must be between 0% and 100%.";
    }
  }

  // Section 1.3 validations
  const section13 = data.section1_3;
  if (!isValidInteger(section13.totalULBs)) {
    errors["section1_3.totalULBs"] = "Enter a valid non-negative integer.";
  }

  section13.ulbList.forEach((ulb, index) => {
    const basePath = `section1_3.ulbList.${index}`;
    if (!ulb.cityName) {
      errors[`${basePath}.cityName`] = "City name is required.";
    }
    if (!ulb.ulb) {
      errors[`${basePath}.ulb`] = "ULB is required.";
    }
    if (!ulb.ratingDate || Number.isNaN(Date.parse(ulb.ratingDate))) {
      errors[`${basePath}.ratingDate`] = "Select a valid rating date.";
    }
    if (!ulb.rating) {
      errors[`${basePath}.rating`] = "Rating is required.";
    }
  });

  if (section13.totalULBs > 0 && section13.ulbList.length === 0) {
    errors["section1_3.ulbList"] =
      "Add at least one ULB entry when total number of ULBs is greater than zero.";
  }

  // Section 1.4 validations
  const section14 = data.section1_4;
  if (!isValidInteger(section14.totalULBs)) {
    errors["section1_4.totalULBs"] = "Enter a valid non-negative integer.";
  }

  section14.bondList.forEach((bond, index) => {
    const basePath = `section1_4.bondList.${index}`;
    if (!bond.bondType) {
      errors[`${basePath}.bondType`] = "Bond type is required.";
    }
    if (!bond.cityName) {
      errors[`${basePath}.cityName`] = "City name is required.";
    }
    if (!bond.issuingAuthority) {
      errors[`${basePath}.issuingAuthority`] = "Issuing authority is required.";
    } else if (bond.issuingAuthority.length > 100) {
      errors[`${basePath}.issuingAuthority`] =
        "Issuing authority must be 100 characters or fewer.";
    }
    if (!isNonNegativeDecimal(bond.value) || !hasMaxTwoDecimals(bond.value)) {
      errors[`${basePath}.value`] =
        "Enter a non-negative amount with up to two decimal places.";
    }
  });

  if (section14.totalULBs > 0 && section14.bondList.length === 0) {
    errors["section1_4.bondList"] =
      "Add at least one bond entry when total number of ULBs is greater than zero.";
  }

  // Section 1.5 validations
  const section15 = data.section1_5;
  const hasIntermediary = section15.hasIntermediary;

  if (
    !hasIntermediary ||
    (hasIntermediary !== "yes" && hasIntermediary !== "no")
  ) {
    errors["section1_5.hasIntermediary"] = "Please select Yes or No.";
  } else if (hasIntermediary === "yes") {
    if (!section15.ffiArray || section15.ffiArray.length === 0) {
      errors["section1_5.ffiArray"] =
        "Add at least one financial intermediary when selecting Yes.";
    } else {
      section15.ffiArray.forEach((intermediary, index) => {
        if (!intermediary.organisationName) {
          errors[`section1_5.ffiArray.${index}.organisationName`] =
            "Organisation name is required.";
        }
        if (!intermediary.organisationType) {
          errors[`section1_5.ffiArray.${index}.organisationType`] =
            "Organisation type is required.";
        }
        if (!isValidYear(intermediary.yearEstablished)) {
          errors[`section1_5.ffiArray.${index}.yearEstablished`] =
            "Enter a valid year in YYYY format";
        }
        if (
          !isNonNegativeDecimal(intermediary.totalFunding) ||
          !hasMaxTwoDecimals(intermediary.totalFunding)
        ) {
          errors[`section1_5.ffiArray.${index}.totalFunding`] =
            "Enter a non-negative amount with up to two decimal places.";
        }
        if (!intermediary.website || !isValidUrl(intermediary.website)) {
          errors[`section1_5.ffiArray.${index}.website`] =
            "Enter a valid website URL.";
        }
      });
    }
  } else if (hasIntermediary === "no") {
    if (!section15.comment || section15.comment.trim() === "") {
      errors["section1_5.comment"] =
        "Provide a comment explaining why no intermediary is available.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
