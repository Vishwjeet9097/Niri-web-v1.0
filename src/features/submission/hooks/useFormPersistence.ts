import { useState, useEffect, useCallback } from "react";
import { storageService } from "@/services/storage.service";
import type { SubmissionFormData } from "../types";

const STORAGE_KEY = "submission_form_data";
const AUTO_SAVE_DELAY = 1000; // Auto-save after 1 second of inactivity

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

        storageService.set(STORAGE_KEY, completeFormData);
      }
    }, AUTO_SAVE_DELAY);

    return () => {
      clearTimeout(timeout);
    };
  }, [formData]);

  const updateFormData = useCallback((stepKey: string, data: unknown) => {
    // Only update if data has actually changed
    setFormData((prev) => {
      const currentData = prev[stepKey as keyof SubmissionFormData];

      // Check if data is actually different
      if (JSON.stringify(currentData) === JSON.stringify(data)) {
        return prev; // No change, return same object
      }

      const updated = {
        ...prev,
        [stepKey]: data,
      };

      // Immediately save to localStorage to prevent data loss
      const completeFormData = {
        infraFinancing: updated.infraFinancing || {},
        infraDevelopment: updated.infraDevelopment || {},
        pppDevelopment: updated.pppDevelopment || {},
        infraEnablers: updated.infraEnablers || {},
        ...updated,
      };
      storageService.set(STORAGE_KEY, completeFormData);
      console.log(`Immediately saved ${stepKey} data in normal flow:`, data);

      return updated;
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
