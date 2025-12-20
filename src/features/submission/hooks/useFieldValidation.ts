import { useState, useCallback } from 'react';

/**
 * Hook for managing field validation state and error display logic.
 * Tracks which fields have been touched (interacted with) and controls
 * when validation errors should be displayed.
 */
export function useFieldValidation() {
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [validatingIndicator, setValidatingIndicator] = useState<string | null>(null);

  /**
   * Mark a field as touched when user interacts with it
   */
  const markFieldAsTouched = useCallback((path: string) => {
    setTouchedFields((prev) => new Set(prev).add(path));
  }, []);

  /**
   * Get error message for a field, respecting touched state and indicator validation.
   * Automatically clears errors when fields become valid.
   */
  const getFieldError = useCallback((
    fieldPath: string,
    validationErrors: Record<string, string>,
    indicatorValidationErrors: Record<string, string>,
    showValidationErrors: boolean
  ): string | undefined => {
    // Check if this is a calculated/percentage field
    const isCalculatedField = fieldPath.includes("allocationToGSDP") || fieldPath.includes("capexActualsToGSDP");
    
    // If validating a specific indicator, show errors for that indicator's fields
    if (validatingIndicator) {
      const sectionPrefix = `section${validatingIndicator.replace(".", "_")}`;
      if (fieldPath.startsWith(sectionPrefix)) {
        // For calculated fields, check validationErrors first (from validation file)
        // These are updated in real-time via useMemo when formData changes
        if (isCalculatedField && validationErrors[fieldPath] && touchedFields.has(fieldPath)) {
          return validationErrors[fieldPath];
        }
        // Check current validation state - if field is now valid, don't show error
        // This automatically clears errors when user enters valid values
        if (!validationErrors[fieldPath]) {
          // Field is valid now, return undefined to clear the error
          return undefined;
        }
        // Field still has error, return it
        return validationErrors[fieldPath];
      }
      return undefined; // Don't show errors for other indicators
    }
    
    // For form-level validation, only show errors for touched fields
    if (!showValidationErrors) return undefined;
    
    // For calculated fields, show errors if field is touched (validation file handles the logic)
    if (isCalculatedField && validationErrors[fieldPath] && touchedFields.has(fieldPath)) {
      return validationErrors[fieldPath];
    }
    
    if (!touchedFields.has(fieldPath)) return undefined;

    // Return error only if it exists (if field is valid, this will be undefined)
    // This automatically clears errors when fields become valid
    return validationErrors[fieldPath];
  }, [validatingIndicator, touchedFields]);

  /**
   * Mark all fields with errors in a specific indicator as touched
   * This is called when submitting an indicator and validation fails
   */
  const markIndicatorFieldsAsTouched = useCallback((
    indicatorCode: string,
    validationErrors: Record<string, string>
  ) => {
    const sectionPrefix = `section${indicatorCode.replace(".", "_")}`;
    const indicatorFields = Object.keys(validationErrors).filter((key) =>
      key.startsWith(sectionPrefix)
    );
    setTouchedFields((prev) => {
      const newSet = new Set(prev);
      indicatorFields.forEach((field) => newSet.add(field));
      return newSet;
    });
  }, []);

  /**
   * Clear the validating indicator state
   */
  const clearValidatingIndicator = useCallback(() => {
    setValidatingIndicator(null);
  }, []);

  /**
   * Clear errors for fields that are now valid
   * This helps keep indicatorValidationErrors in sync with current validation state
   */
  const clearValidFieldErrors = useCallback((
    currentValidationErrors: Record<string, string>,
    setIndicatorValidationErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    setIndicatorValidationErrors((prev) => {
      const updated = { ...prev };
      // Remove errors for fields that are now valid
      Object.keys(updated).forEach((fieldPath) => {
        if (!currentValidationErrors[fieldPath]) {
          delete updated[fieldPath];
        }
      });
      return updated;
    });
  }, []);

  /**
   * Create an onChange handler that automatically marks the field as touched
   * This centralizes the logic for marking fields as touched when user interacts with them
   * 
   * @param fieldPath - The path of the field (e.g., "section1_1.capitalAllocation")
   * @param originalOnChange - The original onChange handler to call after marking as touched
   * @returns A new onChange handler that marks the field as touched and calls the original handler
   */
  const createOnChangeHandler = useCallback((
    fieldPath: string,
    originalOnChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      markFieldAsTouched(fieldPath);
      if (originalOnChange) {
        originalOnChange(e);
      }
    };
  }, [markFieldAsTouched]);

  /**
   * Create an onBlur handler that automatically marks the field as touched
   * This centralizes the logic for marking fields as touched when user leaves the field
   * 
   * @param fieldPath - The path of the field (e.g., "section1_1.capitalAllocation")
   * @param originalOnBlur - The original onBlur handler to call after marking as touched
   * @returns A new onBlur handler that marks the field as touched and calls the original handler
   */
  const createOnBlurHandler = useCallback((
    fieldPath: string,
    originalOnBlur?: () => void
  ) => {
    return () => {
      markFieldAsTouched(fieldPath);
      if (originalOnBlur) {
        originalOnBlur();
      }
    };
  }, [markFieldAsTouched]);

  /**
   * Create an onValueChange handler for Select components that automatically marks the field as touched
   * 
   * @param fieldPath - The path of the field (e.g., "section1_1.year")
   * @param originalOnValueChange - The original onValueChange handler to call after marking as touched
   * @returns A new onValueChange handler that marks the field as touched and calls the original handler
   */
  const createOnValueChangeHandler = useCallback((
    fieldPath: string,
    originalOnValueChange?: (value: string) => void
  ) => {
    return (value: string) => {
      markFieldAsTouched(fieldPath);
      if (originalOnValueChange) {
        originalOnValueChange(value);
      }
    };
  }, [markFieldAsTouched]);

  return {
    touchedFields,
    validatingIndicator,
    setValidatingIndicator,
    markFieldAsTouched,
    getFieldError,
    markIndicatorFieldsAsTouched,
    clearValidatingIndicator,
    clearValidFieldErrors,
    createOnChangeHandler,
    createOnBlurHandler,
    createOnValueChangeHandler,
  };
}

