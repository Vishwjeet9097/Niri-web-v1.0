import { useState, useEffect, useCallback } from "react";
import { storageService } from "@/services/storage.service";
import type { SubmissionFormData } from "../types";

const STORAGE_KEY = "submission_form_data";
const AUTO_SAVE_DELAY = 1000; // Auto-save after 1 second of inactivity

/**
 * Sanitizes data by removing File instances while preserving filePath/fileUrl metadata.
 * File instances cannot be serialized to JSON, but filePath/fileUrl can be used later
 * to retrieve files from the backend.
 * 
 * Strategy:
 * - File instances: Remove (they exist only in React state/memory)
 * - filePath/fileUrl: Preserve (JSON-safe metadata for viewing files later)
 * - FileUpload objects with filePath: Keep all metadata (already uploaded)
 * - FileUpload objects with File but no filePath: Keep metadata, remove File (will upload on submission)
 */
const sanitizeForStorage = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  // Direct File instance - cannot serialize, return null (shouldn't happen in formData structure)
  if (data instanceof File || data instanceof Blob) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForStorage(item));
  }

  // Handle FileUpload-like objects (objects with file, fileName, etc.)
  const isFileUploadLike = 
    typeof data === "object" &&
    ("file" in data || "fileName" in data || "filePath" in data);

  if (isFileUploadLike) {
    const fileUpload = data as any;
    
    // If it has filePath/fileUrl, it's already uploaded - keep all metadata
    if (fileUpload.filePath || fileUpload.fileUrl) {
      return {
        ...fileUpload,
        // Remove File instance if present, keep filePath/fileUrl
        file: fileUpload.file instanceof File ? null : fileUpload.file,
      };
    }
    
    // If it has a File instance but no filePath, it's not uploaded yet
    // Keep metadata but remove File instance (it exists in React state)
    if (fileUpload.file instanceof File || fileUpload.file instanceof Blob) {
      return {
        id: fileUpload.id,
        fileName: fileUpload.fileName || fileUpload.file?.name,
        fileSize: fileUpload.fileSize || fileUpload.file?.size,
        uploadedAt: fileUpload.uploadedAt,
        mimeType: fileUpload.mimeType || fileUpload.file?.type,
        file: null, // Remove File instance
        // Don't include filePath/fileUrl if they don't exist
      };
    }
    
    // Already sanitized or no File instance - return as-is
    return fileUpload;
  }

  // Handle regular nested objects
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip File/Blob instances directly
    if (value instanceof File || value instanceof Blob) {
      continue; // Skip File instances - they should be in FileUpload objects
    } else {
      sanitized[key] = sanitizeForStorage(value);
    }
  }

  return sanitized;
};

/**
 * Compares two values while ignoring File instances (they exist only in React state).
 * Used to prevent unnecessary re-renders and saves when only File instances change.
 */
const isDataEqualIgnoringFiles = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  
  // Compare sanitized versions (File instances are removed)
  try {
    return JSON.stringify(sanitizeForStorage(a)) === JSON.stringify(sanitizeForStorage(b));
  } catch {
    return false;
  }
};

export const useFormPersistence = () => {
  const [formData, setFormData] = useState<Partial<SubmissionFormData>>(() => {
    const saved = storageService.get<Partial<SubmissionFormData>>(STORAGE_KEY);
    return saved || {};
  });
  const [isResubmit, setIsResubmit] = useState(false);

  // Check for editing submission data on mount
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    const isEditMode = localStorage.getItem("is_edit_mode") === "true";

    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);

        // Check if this is edit mode or resubmit
        if (isEditMode || submissionData.status === "RETURNED_FROM_STATE") {
          setIsResubmit(true);
        }

        // Transform backend data to form data format
        if (submissionData.formData) {
          setFormData(submissionData.formData);
        }

        // Don't remove editing_submission here - let individual components handle it
        // localStorage.removeItem("editing_submission");
      } catch (error) {
        console.error("Error parsing editing submission data:", error);
      }
    }
  }, []);

  // Auto-save to localStorage with proper debouncing (fixed infinite loop)
  // Sanitize before saving to remove File instances (they exist only in React state)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // Only save if formData has meaningful content
      if (Object.keys(formData).length > 0) {
        // Ensure all required sections exist with default structure
        const completeFormData = {
          infraFinancing: formData.infraFinancing || {},
          infraDevelopment: formData.infraDevelopment || {},
          pppDevelopment: formData.pppDevelopment || {},
          infraEnablers: formData.infraEnablers || {},
          ...formData,
        };

        // Sanitize to remove File instances before saving (preserves filePath/fileUrl metadata)
        const sanitizedData = sanitizeForStorage(completeFormData);
        storageService.set(STORAGE_KEY, sanitizedData);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      clearTimeout(timeout);
    };
  }, [formData]);

  const updateFormData = useCallback((stepKey: string, data: unknown) => {
    // Only update if data has actually changed (ignoring File instances)
    setFormData((prev) => {
      const currentData = prev[stepKey as keyof SubmissionFormData];

      // Check if data is actually different (ignoring File instances for comparison)
      if (isDataEqualIgnoringFiles(currentData, data)) {
        return prev; // No change, return same object
      }

      const updated = {
        ...prev,
        [stepKey]: data,
      };

      // Immediately save to localStorage to prevent data loss
      // Sanitize before saving to remove File instances (preserves filePath/fileUrl metadata)
      const completeFormData = {
        infraFinancing: updated.infraFinancing || {},
        infraDevelopment: updated.infraDevelopment || {},
        pppDevelopment: updated.pppDevelopment || {},
        infraEnablers: updated.infraEnablers || {},
        ...updated,
      };
      
      const sanitizedData = sanitizeForStorage(completeFormData);
      storageService.set(STORAGE_KEY, sanitizedData);
      console.log(`💾 Saved ${stepKey} to localStorage (File instances preserved in React state only)`);

      return updated; // Return unsanitized data with File instances for React state
    });
  }, []);

  const clearFormData = useCallback(() => {
    storageService.remove(STORAGE_KEY);
    setFormData({});
  }, []);

  const getStepData = useCallback(
    (stepKey: string) => {
      return formData[stepKey as keyof SubmissionFormData] || {};
    },
    [formData]
  );

  return {
    formData,
    updateFormData,
    clearFormData,
    getStepData,
    isResubmit,
  };
};
