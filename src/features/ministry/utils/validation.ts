/**
 * Validation utilities for Ministry Approver forms
 */

export interface ValidationError {
  [fieldPath: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError;
}

/**
 * Validates if a text field contains only alphabets and spaces
 * Allows: letters (a-z, A-Z), spaces, hyphens, apostrophes
 */
export const validateAlphabetsOnly = (value: any): boolean => {
  if (!value || typeof value !== 'string') return true; // Empty values handled by required validation
  const trimmed = value.trim();
  if (trimmed === '') return true; // Empty handled by required
  // Allow letters, spaces, hyphens, apostrophes, and common punctuation
  return /^[a-zA-Z\s\-'.,()]+$/.test(trimmed);
};

/**
 * Validates if a number field contains only numbers
 * Allows: digits, decimal points, negative signs
 */
export const validateNumbersOnly = (value: any): boolean => {
  if (!value && value !== 0) return true; // Empty values handled by required validation
  const str = String(value).trim();
  if (str === '') return true; // Empty handled by required
  // Allow numbers, decimal points, and negative signs
  return /^-?\d+(\.\d+)?$/.test(str);
};

/**
 * Validates if a field is required and not empty
 */
export const validateRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '';
  }
  if (typeof value === 'number') {
    // Allow 0 as a valid number
    return !isNaN(value) && value !== null && value !== undefined;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return true;
};

/**
 * Validates a single field based on its type and rules
 */
export const validateField = (
  field: any,
  value: any,
  fieldPath: string
): string | undefined => {
  // All fields are mandatory
  const isRequired = true;
  
  // Required validation
  if (isRequired && !validateRequired(value)) {
    return `${field.label} is required.`;
  }

  // Skip other validations if field is empty and not required
  if (!isRequired && (value === null || value === undefined || value === '')) {
    return undefined;
  }

  // Type-specific validation
  switch (field.dataType) {
    case 'string':
      // Skip validation for Yes/No fields, Comment fields, and URLs
      const isYesNo = field.label?.toLowerCase().includes('yes/no') || field.label === 'Yes/No';
      const isComment = field.label?.toLowerCase().includes('comment') || 
                       field.label?.toLowerCase().includes('objective') ||
                       field.label?.toLowerCase().includes('description');
      const isUrl = field.label?.toLowerCase().includes('website') ||
                    field.label?.toLowerCase().includes('url') ||
                    field.label?.toLowerCase().includes('link');
      
      if (isYesNo || isComment || isUrl) {
        // These fields can have any string content
        return undefined;
      }
      
      // For other string fields, validate alphabets only
      if (value && !validateAlphabetsOnly(value)) {
        return `${field.label} should contain only text or alphabets.`;
      }
      break;

    case 'number':
      if (value && !validateNumbersOnly(value)) {
        return `${field.label} should contain only numbers.`;
      }
      // Additional validation: check if it's a valid number
      if (value && isNaN(Number(value))) {
        return `${field.label} must be a valid number.`;
      }
      break;

    case 'dropdown':
      // Dropdown validation is handled by the component itself
      if (isRequired && !value) {
        return `${field.label} is required.`;
      }
      break;

    case 'file':
      // File validation
      if (isRequired && !value) {
        return `${field.label} is required.`;
      }
      break;

    default:
      break;
  }

  return undefined;
};

/**
 * Validates all fields in a section
 */
export const validateSection = (
  section: any,
  sectionKey: string,
  formData: Record<string, any>
): ValidationError => {
  const errors: ValidationError = {};
  const sectionData = formData[sectionKey] || {};

  // Validate direct input fields
  if (section.inputs && Array.isArray(section.inputs)) {
    section.inputs.forEach((field: any) => {
      const fieldPath = `${sectionKey}.${field.id}`;
      const fieldValue = sectionData[field.id];
      
      // All fields are mandatory
      const fieldWithRequired = {
        ...field,
        validationRules: {
          ...field.validationRules,
          required: true
        }
      };
      
      const error = validateField(fieldWithRequired, fieldValue, fieldPath);
      if (error) {
        errors[fieldPath] = error;
      }
    });
  }

  // Validate subsection fields
  if (section.subsection && Array.isArray(section.subsection) && section.subsection.length > 0) {
    section.subsection.forEach((subsection: any) => {
      const subsectionName = Object.keys(subsection)[0];
      const subsectionData = subsection[subsectionName];
      const items = sectionData[subsectionName] || [];

      // Check if subsection has items
      const yesNoField = section.inputs?.find((f: any) => 
        f.label?.toLowerCase().includes('yes/no') || f.label === 'Yes/No'
      );
      const yesNoValue = yesNoField 
        ? (sectionData[yesNoField.id] || '').toLowerCase().trim()
        : null;
      
      // If Yes/No field exists and is "yes", at least one item is required
      if (yesNoField && yesNoValue === 'yes' && (!Array.isArray(items) || items.length === 0)) {
        errors[`${sectionKey}.${subsectionName}`] = `At least one ${subsectionName} entry is required.`;
      }
      
      // If no Yes/No field exists, subsection is always required (at least one item)
      if (!yesNoField && (!Array.isArray(items) || items.length === 0)) {
        errors[`${sectionKey}.${subsectionName}`] = `At least one ${subsectionName} entry is required.`;
      }

      // Validate each subsection item if items exist
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((item: any, index: number) => {
          if (subsectionData.inputs && Array.isArray(subsectionData.inputs)) {
            subsectionData.inputs.forEach((field: any) => {
              const fieldPath = `${sectionKey}.${subsectionName}[${index}].${field.id}`;
              const fieldValue = item[field.id];
              
              // All fields are mandatory
              const fieldWithRequired = {
                ...field,
                validationRules: {
                  ...field.validationRules,
                  required: true
                }
              };
              
              const error = validateField(fieldWithRequired, fieldValue, fieldPath);
              if (error) {
                errors[fieldPath] = error;
              }
            });
          }
        });
      }
    });
  }

  return errors;
};

/**
 * Validates an entire indicator (all sections in an indicator)
 */
export const validateIndicator = (
  indicator: any,
  formData: Record<string, any>
): ValidationResult => {
  const errors: ValidationError = {};
  const indicatorName = Object.keys(indicator)[0];
  const sections = indicator[indicatorName];

  if (Array.isArray(sections)) {
    sections.forEach((sectionObj: any) => {
      const sectionName = Object.keys(sectionObj)[0];
      const section = sectionObj[sectionName];
      const sectionKey = `section${section.sNo.replace('.', '_')}`;
      
      const sectionErrors = validateSection(section, sectionKey, formData);
      Object.assign(errors, sectionErrors);
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates all indicators in the form
 */
export const validateAllIndicators = (
  indicators: any[],
  formData: Record<string, any>
): ValidationResult => {
  const errors: ValidationError = {};

  indicators.forEach((indicator) => {
    const indicatorResult = validateIndicator(indicator, formData);
    Object.assign(errors, indicatorResult.errors);
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

