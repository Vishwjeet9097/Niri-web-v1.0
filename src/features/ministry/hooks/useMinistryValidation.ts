import { useState, useCallback } from "react";
import { validateField } from "../utils/validation";
import type { AssignedIndicator } from "../components/FormBuilder/types";

interface UseMinistryValidationProps {
  formData: Record<string, any>;
  assignedIndicators: AssignedIndicator[];
}

export function useMinistryValidation({
  formData,
  assignedIndicators,
}: UseMinistryValidationProps) {
  const [validationErrors, setValidationErrorsState] = useState<Record<string, string>>({});
  
  // Wrapper to maintain the same API
  const setValidationErrors = setValidationErrorsState;

  const validateFieldOnChange = useCallback((path: string, value: any, field: any) => {
    if (!field) return;
    
    const sectionKey = path.split('.')[0];
    const sectionData = formData[sectionKey] || {};
    
    let yesNoValue: string | null = null;
    if (sectionData && typeof sectionData === 'object') {
      Object.keys(sectionData).forEach((key) => {
        const val = sectionData[key];
        if (val === 'yes' || val === 'no' || val === 'Yes' || val === 'No') {
          yesNoValue = String(val).toLowerCase();
        }
      });
    }
    
    if (assignedIndicators.length > 0) {
      for (const indicatorObj of assignedIndicators) {
        const indicatorName = Object.keys(indicatorObj)[0];
        const sections = indicatorObj[indicatorName];
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];
          const sectionId = section.sNo?.replace('.', '_');
          const expectedSectionKey = `section${sectionId}`;
          
          if (expectedSectionKey === sectionKey && section.inputs) {
            const yesNoField = section.inputs.find((f: any) => 
              f.label?.toLowerCase().includes('yes/no') || f.label === 'Yes/No'
            );
            if (yesNoField) {
              yesNoValue = (sectionData[yesNoField.id] || '').toLowerCase().trim() || null;
              break;
            }
          }
        }
        if (yesNoValue !== null) break;
      }
    }
    
    const error = validateField(field, value, path, yesNoValue);
    
    setValidationErrorsState((prev) => {
      const hadError = prev[path] !== undefined;
      const newErrors = { ...prev };
      
      if (error) {
        newErrors[path] = error;
        if (!hadError) {
          console.log(`❌ Setting error for ${path}:`, error);
        }
      } else {
        if (hadError) {
          console.log(`✅ Clearing error for ${path} - field is now valid`);
        }
        delete newErrors[path];
      }
      
      return newErrors;
    });
  }, [formData, assignedIndicators]);

  const clearFieldError = useCallback((path: string) => {
    setValidationErrorsState((prev) => {
      if (prev[path]) {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      }
      return prev;
    });
  }, []);

  const getFieldErrorMemoized = useCallback((path: string) => {
    if (validationErrors && validationErrors[path]) {
      return validationErrors[path];
    }
    return undefined;
  }, [validationErrors]);

  const setValidationErrorsForSection = useCallback((errors: Record<string, string>) => {
    setValidationErrorsState((prev) => {
      // Merge new errors with existing ones, but new errors take precedence
      return { ...prev, ...errors };
    });
  }, []);

  const clearValidationErrorsForSection = useCallback((sectionKey: string) => {
    setValidationErrorsState((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith(sectionKey)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  }, []);

  return {
    validationErrors,
    validateFieldOnChange,
    clearFieldError,
    getFieldErrorMemoized,
    setValidationErrorsForSection,
    clearValidationErrorsForSection,
    setValidationErrors,
  };
}

