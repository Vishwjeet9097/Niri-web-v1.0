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
    // Check if this is a calculated/percentage field (always show errors for these if they exist)
    const isCalculatedField = fieldPath.includes("allocationToGSDP") || fieldPath.includes("capexActualsToGSDP");
    
    // For calculated fields, always check indicatorValidationErrors first (real-time errors)
    // These fields are read-only and errors are set programmatically, so always show if error exists
    if (isCalculatedField && indicatorValidationErrors[fieldPath]) {
      return indicatorValidationErrors[fieldPath];
    }
    
    // If validating a specific indicator, show errors for that indicator's fields
    if (validatingIndicator) {
      const sectionPrefix = `section${validatingIndicator.replace(".", "_")}`;
      if (fieldPath.startsWith(sectionPrefix)) {
        // For calculated/read-only fields (like percentages), check indicatorValidationErrors first
        // These fields might not be in validationErrors until validation runs
        if (indicatorValidationErrors[fieldPath]) {
          return indicatorValidationErrors[fieldPath];
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
    
    // For calculated/read-only fields (like percentages), check indicatorValidationErrors first
    // These might have real-time errors that aren't in validationErrors yet
    if (isCalculatedField && indicatorValidationErrors[fieldPath]) {
      return indicatorValidationErrors[fieldPath];
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

  return {
    touchedFields,
    validatingIndicator,
    setValidatingIndicator,
    markFieldAsTouched,
    getFieldError,
    markIndicatorFieldsAsTouched,
    clearValidatingIndicator,
    clearValidFieldErrors,
  };
}

