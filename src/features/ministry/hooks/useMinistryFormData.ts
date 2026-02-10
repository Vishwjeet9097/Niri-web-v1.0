import { useCallback, useEffect, useRef } from "react";
import { useFormPersistence } from "@/features/submission/hooks/useFormPersistence";
import { getCategoryFromSectionId } from "../utils/formDataTransformer";

interface UseMinistryFormDataProps {
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isInitialLoadRef: React.MutableRefObject<boolean>;
  prevFormDataRef: React.MutableRefObject<Record<string, any>>;
  clearFieldError?: (path: string) => void;
}

export function useMinistryFormData({
  formData,
  setFormData,
  isInitialLoadRef,
  prevFormDataRef,
  clearFieldError,
}: UseMinistryFormDataProps) {
  const {
    formData: persistedFormData,
    updateFormData,
  } = useFormPersistence();

  // Handle field changes
  const handleFieldChange = useCallback((path: string, value: any) => {
    console.log("🔄 handleFieldChange called - path:", path, "value type:", typeof value === 'function' ? 'function' : typeof value);
    
    setFormData((prev) => {
      const keys = path.split('.');
      const sectionKey = keys[0];
      
      const newSectionData = prev[sectionKey] ? { ...prev[sectionKey] } : {};
      
      let currentForValue: any = newSectionData;
      for (let i = 1; i < keys.length - 1; i++) {
        const key = keys[i];
        currentForValue = currentForValue[key] || {};
      }
      
      const finalKey = keys[keys.length - 1];
      const currentValue = currentForValue[finalKey];
      
      const actualValue = typeof value === 'function' 
        ? value(currentValue)
        : value;
      
      if (typeof value === 'function') {
        console.log("🔄 Function update detected, current value:", currentValue, "new value:", actualValue);
      }
      
      let current: any = newSectionData;
      for (let i = 1; i < keys.length - 1; i++) {
        const key = keys[i];
        if (key.includes('[') && key.includes(']')) {
          const arrayKey = key.substring(0, key.indexOf('['));
          const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
          if (!current[arrayKey]) current[arrayKey] = [];
          current[arrayKey] = [...current[arrayKey]];
          if (!current[arrayKey][index]) current[arrayKey][index] = {};
          current = current[arrayKey][index];
        } else {
          current[key] = current[key] ? { ...current[key] } : {};
          current = current[key];
        }
      }
      
      if (finalKey.includes('[') && finalKey.includes(']')) {
        const arrayKey = finalKey.substring(0, finalKey.indexOf('['));
        const index = parseInt(finalKey.substring(finalKey.indexOf('[') + 1, finalKey.indexOf(']')));
        if (!current[arrayKey]) current[arrayKey] = [];
        const newArray = [...current[arrayKey]];
        newArray[index] = actualValue;
        current[arrayKey] = newArray;
        console.log("🔧 Set array item:", arrayKey, "[", index, "] =", actualValue);
      } else {
        const oldValue = current[finalKey];
        current[finalKey] = actualValue;
        console.log("🔧 Set direct value:", finalKey, "old length:", Array.isArray(oldValue) ? oldValue.length : 'N/A', "new length:", Array.isArray(actualValue) ? actualValue.length : 'N/A');
      }
      
      const newData = {
        ...prev,
        [sectionKey]: newSectionData
      };
      
      console.log("🔧 Returning newData:", newData);
      return newData;
    });
    
    // Clear validation error for this field when user changes it
    if (clearFieldError) {
      clearFieldError(path);
    }
  }, [setFormData, clearFieldError]);

  // Sync formData to persistence with debouncing
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevFormDataRef.current = { ...formData };
      return;
    }
    
    const prevStr = JSON.stringify(prevFormDataRef.current);
    const currentStr = JSON.stringify(formData);
    const hasChanged = prevStr !== currentStr;
    
    if (!hasChanged) {
      console.log("⏭️ FormData unchanged, skipping sync");
      return;
    }
    
    console.log("🔄 FormData changed, will sync to persistence after debounce");
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      console.log("💾 Syncing formData to persistence...");
      
      const categoryData: Record<string, Record<string, any>> = {
        infraFinancing: {},
        infraDevelopment: {},
        pppDevelopment: {},
        infraEnablers: {},
      };
      
      Object.keys(formData).forEach((key) => {
        if (key.startsWith('section')) {
          const sectionId = key.replace('section', '').replace('_', '.');
          const category = getCategoryFromSectionId(sectionId);
          if (category && categoryData[category]) {
            const sectionData = JSON.parse(JSON.stringify(formData[key]));
            categoryData[category][key] = sectionData;
          }
        } else if (['infraFinancing', 'infraDevelopment', 'pppDevelopment', 'infraEnablers'].includes(key)) {
          categoryData[key] = { ...categoryData[key], ...formData[key] };
        }
      });
      
      Object.entries(categoryData).forEach(([category, data]) => {
        if (Object.keys(data).length > 0) {
          const existingCategoryData = persistedFormData[category as keyof typeof persistedFormData] || {};
          const mergedData = JSON.parse(JSON.stringify({
            ...existingCategoryData,
            ...data,
          }));
          
          Object.keys(data).forEach((sectionKey) => {
            if (sectionKey.startsWith('section')) {
              mergedData[sectionKey] = JSON.parse(JSON.stringify(data[sectionKey]));
            }
          });
          
          console.log(`💾 Syncing category ${category} with ${Object.keys(mergedData).length} sections`);
          updateFormData(category, mergedData);
        }
      });
      
      prevFormDataRef.current = { ...formData };
      console.log("✅ FormData synced to persistence");
    }, 500);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [formData, updateFormData, isInitialLoadRef, prevFormDataRef, persistedFormData]);

  return {
    handleFieldChange,
  };
}

