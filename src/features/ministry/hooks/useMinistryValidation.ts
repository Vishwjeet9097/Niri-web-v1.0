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
    
    // Use the latest formData from the closure - it should be updated by the time validation runs
    // But we need to check it again after a small delay if it's a file field being cleared
    const sectionKey = path.split('.')[0];
    let sectionData = formData[sectionKey] || {};
    
    let yesNoValue: string | null = null;
    if (sectionData && typeof sectionData === 'object') {
      Object.keys(sectionData).forEach((key) => {
        const val = sectionData[key];
        if (val === 'yes' || val === 'no' || val === 'Yes' || val === 'No') {
          yesNoValue = String(val).toLowerCase();
        }
      });
    }
    
    // Check if this is a file field and "No document available" is checked
    const isFileField = field.dataType === 'file' || 
                       field.uiComponent === 'File' ||
                       field.label?.toLowerCase().includes('upload file') ||
                       field.label?.toLowerCase().includes('upload');
    
    console.log(`🔍 [VALIDATION] Validating field: ${path}, isFileField: ${isFileField}, value:`, value);
    
    let shouldSkipFileValidation = false;
    if (isFileField) {
      console.log(`🔍 [VALIDATION] File field detected: ${path}, checking for "No document available"`);
      // Check if this is a subsection field (path contains [index])
      const subsectionMatch = path.match(/^(.+)\.([^.]+)\[(\d+)\]\.(.+)$/);
      
      if (subsectionMatch) {
        // This is a subsection field
        const [, subsectionSectionKey, subsectionName, indexStr, fieldId] = subsectionMatch;
        const index = parseInt(indexStr, 10);
        const subsectionData = formData[subsectionSectionKey]?.[subsectionName];
        const item = Array.isArray(subsectionData) ? subsectionData[index] : null;
        
        if (item && assignedIndicators.length > 0) {
          for (const indicatorObj of assignedIndicators) {
            const indicatorName = Object.keys(indicatorObj)[0];
            const sections = indicatorObj[indicatorName];
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              const section = sectionObj[sectionName];
              const sectionId = section.sNo?.replace('.', '_');
              const expectedSectionKey = `section${sectionId}`;
              
              if (expectedSectionKey === subsectionSectionKey && section.subsections) {
                // Find the subsection
                const subsection = section.subsections.find((sub: any) => {
                  const subName = Object.keys(sub)[0];
                  return subName === subsectionName;
                });
                
                if (subsection) {
                  const subsectionData = subsection[subsectionName];
                  if (subsectionData?.inputs) {
                    const noDocAvailableField = subsectionData.inputs.find((f: any) => 
                      (f.label?.toLowerCase().includes('no document available') ||
                       f.label?.toLowerCase() === 'no document available') &&
                      f.id !== field.id
                    );
                if (noDocAvailableField) {
                  const noDocAvailableValue = item[noDocAvailableField.id] || '';
                  console.log(`🔍 [VALIDATION] Subsection - Found "No document available" field: ${noDocAvailableField.id}, value: "${noDocAvailableValue}"`);
                  if (noDocAvailableValue === 'No document available') {
                    console.log(`✅ [VALIDATION] Subsection - Skipping file validation (No document available is checked)`);
                    shouldSkipFileValidation = true;
                    break;
                  }
                }
                  }
                }
              }
            }
            if (shouldSkipFileValidation) break;
          }
        }
      } else {
        // This is a direct section field
        if (sectionData && typeof sectionData === 'object' && assignedIndicators.length > 0) {
          for (const indicatorObj of assignedIndicators) {
            const indicatorName = Object.keys(indicatorObj)[0];
            const sections = indicatorObj[indicatorName];
            for (const sectionObj of sections) {
              const sectionName = Object.keys(sectionObj)[0];
              const section = sectionObj[sectionName];
              const sectionId = section.sNo?.replace('.', '_');
              const expectedSectionKey = `section${sectionId}`;
              
              if (expectedSectionKey === sectionKey && section.inputs) {
                const noDocAvailableField = section.inputs.find((f: any) => 
                  (f.label?.toLowerCase().includes('no document available') ||
                   f.label?.toLowerCase() === 'no document available') &&
                  f.id !== field.id
                );
                if (noDocAvailableField) {
                  const noDocAvailableValue = sectionData[noDocAvailableField.id] || '';
                  console.log(`🔍 [VALIDATION] Direct section - Found "No document available" field: ${noDocAvailableField.id}, value: "${noDocAvailableValue}"`);
                  console.log(`🔍 [VALIDATION] Direct section - sectionData keys:`, Object.keys(sectionData));
                  console.log(`🔍 [VALIDATION] Direct section - sectionData:`, sectionData);
                  if (noDocAvailableValue === 'No document available') {
                    console.log(`✅ [VALIDATION] Direct section - Skipping file validation (No document available is checked)`);
                    shouldSkipFileValidation = true;
                    break;
                  } else {
                    console.log(`❌ [VALIDATION] Direct section - "No document available" value mismatch. Expected: "No document available", Got: "${noDocAvailableValue}"`);
                  }
                } else {
                  console.log(`⚠️ [VALIDATION] Direct section - "No document available" field not found in section.inputs`);
                }
              }
            }
            if (shouldSkipFileValidation) break;
          }
        }
      }
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
    
    // If "No document available" is checked, skip file validation (file is not required)
    let error: string | undefined;
    if (shouldSkipFileValidation) {
      console.log(`✅ [VALIDATION] Skipping file validation for ${path} - "No document available" is checked`);
      error = undefined; // No error - file is not required
      // Immediately clear the error
      setValidationErrorsState((prev) => {
        if (prev[path]) {
          const newErrors = { ...prev };
          delete newErrors[path];
          console.log(`✅ [VALIDATION] Clearing error for ${path} - "No document available" is checked`);
          return newErrors;
        }
        return prev;
      });
    } else {
      console.log(`🔍 [VALIDATION] Running normal validation for ${path}`);
      error = validateField(field, value, path, yesNoValue);
      if (error) {
        console.log(`❌ [VALIDATION] Validation error for ${path}:`, error);
      }
      
      // If this is a file field being cleared (value is null) and we got an error,
      // don't set the error - the component's error clearing logic will handle it
      // The "No document available" check is handled by the component, so we skip validation here
      if (isFileField && value === null && error) {
        console.log(`🔍 [VALIDATION] File field cleared with error, skipping error setting - component will handle "No document available" logic`);
        // Don't set the error - let the component's logic handle it
        error = undefined;
      }
      
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
    }
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

