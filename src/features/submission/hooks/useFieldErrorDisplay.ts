/**
 * Centralized hook for displaying field errors across all components.
 * Works in both create mode (submission pages) and edit mode (review components).
 * 
 * This hook provides a unified interface for:
 * - Getting error messages for fields
 * - Rendering error messages
 * - Applying validation styling
 */

import React, { useMemo, useCallback } from 'react';
import { getFieldErrorMessage } from '../utils/fieldErrorMessages';
import { getInputValidationClass as getInputValidationClassUtil } from '../utils/validationStyles';

export interface UseFieldErrorDisplayOptions {
  /**
   * Validation errors from validation files
   */
  validationErrors: Record<string, string>;
  
  /**
   * Indicator-specific validation errors (for real-time validation)
   */
  indicatorValidationErrors?: Record<string, string>;
  
  /**
   * Whether to show validation errors (controlled by showValidationErrors state)
   */
  showValidationErrors: boolean;
  
  /**
   * Function to check if a field has been touched (from useFieldValidation hook)
   */
  isFieldTouched?: (fieldPath: string) => boolean;
  
  /**
   * Whether we're in indicator validation mode (showing errors for specific indicator)
   */
  validatingIndicator?: string | null;
}

/**
 * Hook for displaying field errors in a centralized and dynamic way
 * Can be used in both create mode and edit mode components
 */
export function useFieldErrorDisplay(options: UseFieldErrorDisplayOptions) {
  const {
    validationErrors,
    indicatorValidationErrors = {},
    showValidationErrors,
    isFieldTouched,
    validatingIndicator,
  } = options;

  /**
   * Get error message for a field path
   * Handles priority: validation error > field-specific message > default message
   */
  const getFieldError = useCallback((fieldPath: string): string | undefined => {
      // Check if this is a calculated/percentage field (always show errors for these if they exist)
      const isCalculatedField = fieldPath.includes("allocationToGSDP") || fieldPath.includes("capexActualsToGSDP");
      
      // If validating a specific indicator, show errors for that indicator's fields
      if (validatingIndicator) {
        const sectionPrefix = `section${validatingIndicator.replace(".", "_")}`;
        if (fieldPath.startsWith(sectionPrefix)) {
          // For calculated fields, check validationErrors first (from validation file)
          if (isCalculatedField && validationErrors[fieldPath] && isFieldTouched?.(fieldPath)) {
            return getFieldErrorMessage(fieldPath, validationErrors[fieldPath]);
          }
          // Check current validation state - if field is now valid, don't show error
          if (!validationErrors[fieldPath]) {
            return undefined;
          }
          // Field still has error, return it
          return getFieldErrorMessage(fieldPath, validationErrors[fieldPath]);
        }
        return undefined; // Don't show errors for other indicators
      }
      
      // For form-level validation, only show errors for touched fields
      if (!showValidationErrors) return undefined;
      
      // For calculated fields, show errors if field is touched
      if (isCalculatedField && validationErrors[fieldPath] && isFieldTouched?.(fieldPath)) {
        return getFieldErrorMessage(fieldPath, validationErrors[fieldPath]);
      }
      
      // Check if field should show error (must be touched if isFieldTouched is provided)
      if (isFieldTouched && !isFieldTouched(fieldPath)) {
        return undefined;
      }
      
      // Check validationErrors first (from validation files - highest priority)
      // Only check indicatorValidationErrors if validationErrors doesn't have it
      // This prevents duplicate error messages
      if (validationErrors[fieldPath]) {
        return getFieldErrorMessage(fieldPath, validationErrors[fieldPath]);
      }
      
      // Check indicatorValidationErrors only if not in validationErrors (real-time errors)
      if (indicatorValidationErrors[fieldPath]) {
        return getFieldErrorMessage(fieldPath, indicatorValidationErrors[fieldPath]);
      }
      
      return undefined;
  }, [validationErrors, indicatorValidationErrors, showValidationErrors, isFieldTouched, validatingIndicator]);

  /**
   * Get validation styling class for a field
   */
  const getInputValidationClass = useCallback((fieldPath: string): string => {
    const hasError = !!getFieldError(fieldPath);
    return getInputValidationClassUtil(hasError, showValidationErrors);
  }, [getFieldError, showValidationErrors]);

  /**
   * Render error message component for a field
   */
  const renderFieldError = useCallback((fieldPath: string, className?: string): React.ReactNode => {
    const error = getFieldError(fieldPath);
    if (!error) return null;
    
    return React.createElement(
      'p',
      { className: className || "text-xs text-destructive mt-1" },
      error
    );
  }, [getFieldError]);

  return {
    getFieldError,
    getInputValidationClass,
    renderFieldError,
  };
}

