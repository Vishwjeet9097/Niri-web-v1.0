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
  // For dropdowns and other types, if value exists, it's valid
  return value !== null && value !== undefined && value !== '';
};

/**
 * Validates a single field based on its type and rules
 * @param field - The field definition
 * @param value - The field value
 * @param fieldPath - The field path (e.g., "section1_1.fieldId")
 * @param yesNoValue - Optional: The Yes/No field value ("yes" or "no") for conditional validation
 */
export const validateField = (
  field: any,
  value: any,
  fieldPath: string,
  yesNoValue?: string | null
): string | undefined => {
  // Check if this is a Comment field
  const isComment = field.label?.toLowerCase().includes('comment') || 
                   field.uiComponent === 'Text Area' ||
                   field.uiComponent === 'TextArea';
  
  // Determine if field is required based on Yes/No value
  let isRequired = true;
  
  if (yesNoValue !== undefined && yesNoValue !== null) {
    const normalizedYesNo = String(yesNoValue).toLowerCase().trim();
    if (normalizedYesNo === 'yes') {
      // When "Yes" is selected: Comment is NOT mandatory
      if (isComment) {
        isRequired = false;
      }
    } else if (normalizedYesNo === 'no') {
      // When "No" is selected: Only Comment is mandatory, other fields are NOT mandatory
      if (!isComment) {
        isRequired = false;
      }
    }
  }
  
  // Check if this is a calculated/percentage field
  const isPercentageField = field.label?.toLowerCase().includes('% capex utilization') ||
                           field.label?.toLowerCase().includes('percentage') ||
                           field.uiComponent === 'Auto-calculated field';
  
  // For calculated fields, if they have a value (including 0), skip required validation
  // The value will be calculated automatically, so if it exists, it's valid
  if (isPercentageField && (value !== null && value !== undefined && value !== '')) {
    // Value exists, skip required validation and proceed to other validations
  } else {
    // Required validation for other fields
    if (isRequired && !validateRequired(value)) {
      return `${field.label} is required.`;
    }
  }

  // Skip other validations if field is empty and not required
  if (!isRequired && (value === null || value === undefined || value === '')) {
    return undefined;
  }

  // Check if this is a dropdown field (even if dataType is 'string')
  // Dropdown fields can be identified by:
  // 1. dataType === 'dropdown'
  // 2. uiComponent === 'Dropdown' or 'dropdown'
  // 3. Has validationRules.options (dropdown options)
  // 4. Field label matches known dropdown field patterns (sector, status, etc.)
  const fieldLabelLower = field.label?.toLowerCase() || '';
  const isKnownDropdownField = fieldLabelLower.includes('sector') ||
                              fieldLabelLower.includes('status') ||
                              fieldLabelLower.includes('type') ||
                              fieldLabelLower.includes('mode') ||
                              fieldLabelLower.includes('scheme');
  
  const isDropdownField = field.dataType === 'dropdown' || 
                         field.uiComponent === 'Dropdown' ||
                         field.uiComponent === 'dropdown' ||
                         (field.validationRules?.options && Array.isArray(field.validationRules.options) && field.validationRules.options.length > 0) ||
                         isKnownDropdownField;

  // Type-specific validation
  switch (field.dataType) {
    case 'string':
      // Skip validation for Yes/No fields, Comment fields, URLs, Year fields, and Dropdown fields
      const isYesNo = field.label?.toLowerCase().includes('yes/no') || field.label === 'Yes/No';
      const isComment = field.label?.toLowerCase().includes('comment') || 
                       field.label?.toLowerCase().includes('objective') ||
                       field.label?.toLowerCase().includes('description');
      const isUrl = field.label?.toLowerCase().includes('website') ||
                    field.label?.toLowerCase().includes('url') ||
                    field.label?.toLowerCase().includes('link');
      const isYearField = field.label?.toLowerCase().includes('year') || 
                         field.label?.toLowerCase() === 'fy' ||
                         field.uiComponent === 'Year';
      
      // If it's a dropdown field (even with string dataType), skip alphabet validation
      if (isYesNo || isComment || isUrl || isYearField || isDropdownField) {
        // These fields can have any string content (Year fields accept numbers, Dropdowns have predefined values)
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
      
      // Special validation for calculation fields (must be > 0)
      const isCalculationField = field.label?.toLowerCase().includes('capital expenditure allocation') ||
                                 field.label?.toLowerCase().includes('capital expenditure actuals');
      if (isCalculationField && value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue <= 0) {
          return `${field.label} must be greater than 0.`;
        }
      }
      
      // Special validation for percentage fields (must be between 0 and 100)
      // Note: isPercentageField is already defined at the top of the function
      if (isPercentageField && value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          if (numValue < 0) {
            return `${field.label} cannot be negative.`;
          }
          if (numValue > 100) {
            return `${field.label} cannot exceed 100%.`;
          }
        }
      }
      break;

    case 'dropdown':
      // Dropdown validation: check if a value is selected
      // Value should not be empty, null, undefined, or empty string
      if (isRequired) {
        if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
          return `${field.label} is required.`;
        }
      }
      break;

    case 'file':
      // File validation
      // Check if "No document available" is set in the formData
      // Since we don't have formData here, we rely on the validation hook to handle this
      // The validation hook will skip file validation if "No document available" is checked
      if (isRequired && !value) {
        // Note: The validation hook (useMinistryValidation) will check for "No document available"
        // and skip this validation if it's set. This is just the base validation logic.
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

  // Find Yes/No field to determine validation rules
  const yesNoField = section.inputs?.find((f: any) => 
    f.label?.toLowerCase().includes('yes/no') || f.label === 'Yes/No'
  );
  const yesNoValue = yesNoField 
    ? (sectionData[yesNoField.id] || '').toLowerCase().trim()
    : null;

  // Validate direct input fields
  if (section.inputs && Array.isArray(section.inputs)) {
    section.inputs.forEach((field: any) => {
      const fieldPath = `${sectionKey}.${field.id}`;
      const fieldValue = sectionData[field.id];
      
      // Skip validation for Yes/No field itself (it's always required)
      const isYesNo = field.label?.toLowerCase().includes('yes/no') || field.label === 'Yes/No';
      if (isYesNo) {
        const fieldWithRequired = {
          ...field,
          validationRules: {
            ...field.validationRules,
            required: true
          }
        };
        // Yes/No field doesn't need yesNoValue parameter (it's the source)
        const error = validateField(fieldWithRequired, fieldValue, fieldPath, null);
        if (error) {
          errors[fieldPath] = error;
        }
        return; // Skip to next field
      }
      
      // Skip validation for "No Document Available" field - it's handled by MinistryFileUploadSection
      const isNoDocAvailable = field.label?.toLowerCase().includes('no document available') ||
                              field.label?.toLowerCase() === 'no document available';
      if (isNoDocAvailable) {
        // Check if there's a file uploaded - if file exists, "No Document Available" is not required
        // Find the associated file field
        const associatedFileField = section.inputs?.find((f: any) => 
          (f.dataType === 'file' || 
           f.uiComponent === 'File' ||
           f.label?.toLowerCase().includes('upload file') ||
           f.label?.toLowerCase().includes('upload')) &&
          f.id !== field.id
        );
        
        if (associatedFileField) {
          const fileValue = sectionData[associatedFileField.id];
          // If file is uploaded, "No Document Available" is not required - skip validation
          if (fileValue && (fileValue.filePath || fileValue.file || fileValue.fileName)) {
            return; // Skip validation - file exists, so "No Document Available" is not required
          }
        }
        // If no file exists, continue with validation (field might be required)
        // But we still skip it here as it's handled by the file upload component
        return; // Skip to next field - validation is handled by file upload component
      }
      
      // Check if this is a Comment field
      const isComment = field.label?.toLowerCase().includes('comment') ||
                       field.uiComponent === 'Text Area' ||
                       field.uiComponent === 'TextArea';
      
      // Determine if field is required based on Yes/No value
      let isFieldRequired = true;
      
      if (yesNoField && yesNoValue !== null) {
        if (yesNoValue === 'yes') {
          // When "Yes" is selected: Comment is NOT mandatory, other fields are mandatory
          if (isComment) {
            isFieldRequired = false;
          }
        } else if (yesNoValue === 'no') {
          // When "No" is selected: Only Comment is mandatory, other fields are NOT mandatory
          if (!isComment) {
            isFieldRequired = false;
          }
        }
      }
      
      // Check if this is a file field and "No document available" is checked
      const isFileField = field.dataType === 'file' || 
                         field.uiComponent === 'File' ||
                         field.label?.toLowerCase().includes('upload file') ||
                         field.label?.toLowerCase().includes('upload');
      
      if (isFileField) {
        // Find "No document available" field in the section
        const noDocAvailableField = section.inputs?.find((f: any) => 
          (f.label?.toLowerCase().includes('no document available') ||
           f.label?.toLowerCase() === 'no document available') &&
          f.id !== field.id
        );
        const noDocAvailableValue = noDocAvailableField 
          ? (sectionData[noDocAvailableField.id] || '')
          : undefined;
        
        // If "No document available" is checked, file upload is not required
        if (noDocAvailableValue === 'No document available') {
          isFieldRequired = false;
        }
        
        // If file is uploaded, file field is not required (already satisfied)
        if (fieldValue && (fieldValue.filePath || fieldValue.file || fieldValue.fileName)) {
          isFieldRequired = false;
        }
      }
      
      // Apply validation based on required status
      if (isFieldRequired) {
        const fieldWithRequired = {
          ...field,
          validationRules: {
            ...field.validationRules,
            required: true
          }
        };
        const error = validateField(fieldWithRequired, fieldValue, fieldPath, yesNoValue);
        if (error) {
          errors[fieldPath] = error;
        }
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
              
              // Skip validation for "No Document Available" field - it's handled by MinistryFileUploadSection
              const isNoDocAvailable = field.label?.toLowerCase().includes('no document available') ||
                                      field.label?.toLowerCase() === 'no document available';
              if (isNoDocAvailable) {
                // Check if there's a file uploaded - if file exists, "No Document Available" is not required
                // Find the associated file field
                const associatedFileField = subsectionData.inputs?.find((f: any) => 
                  (f.dataType === 'file' || 
                   f.uiComponent === 'File' ||
                   f.label?.toLowerCase().includes('upload file') ||
                   f.label?.toLowerCase().includes('upload')) &&
                  f.id !== field.id
                );
                
                if (associatedFileField) {
                  const fileValue = item[associatedFileField.id];
                  // If file is uploaded, "No Document Available" is not required - skip validation
                  if (fileValue && (fileValue.filePath || fileValue.file || fileValue.fileName)) {
                    return; // Skip validation - file exists, so "No Document Available" is not required
                  }
                }
                // Always skip validation for "No Document Available" field - it's handled by file upload component
                // The file upload component will handle the validation logic
                return; // Skip to next field - validation is handled by file upload component
              }
              
              // Check if this is a file field and "No document available" is checked
              const isFileField = field.dataType === 'file' || 
                                 field.uiComponent === 'File' ||
                                 field.label?.toLowerCase().includes('upload file') ||
                                 field.label?.toLowerCase().includes('upload');
              
              let isFieldRequired = true;
              
              if (isFileField) {
                // Find "No document available" field in the subsection inputs
                const noDocAvailableField = subsectionData.inputs?.find((f: any) => 
                  (f.label?.toLowerCase().includes('no document available') ||
                   f.label?.toLowerCase() === 'no document available') &&
                  f.id !== field.id
                );
                const noDocAvailableValue = noDocAvailableField 
                  ? (item[noDocAvailableField.id] || '')
                  : undefined;
                
                // If "No document available" is checked, file upload is not required
                if (noDocAvailableValue === 'No document available') {
                  isFieldRequired = false;
                }
                
                // If file is uploaded, file field is not required (already satisfied)
                if (fieldValue && (fieldValue.filePath || fieldValue.file || fieldValue.fileName)) {
                  isFieldRequired = false;
                }
              }
              
              // All fields are mandatory (unless "No document available" is checked for file fields OR file is uploaded)
              if (isFieldRequired) {
                const fieldWithRequired = {
                  ...field,
                  validationRules: {
                    ...field.validationRules,
                    required: true
                  }
                };
                
                // Pass yesNoValue for conditional validation (subsections inherit section's Yes/No value)
                const error = validateField(fieldWithRequired, fieldValue, fieldPath, yesNoValue);
                if (error) {
                  errors[fieldPath] = error;
                }
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

