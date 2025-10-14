import { useState, useEffect, useCallback } from "react";
import { storageService } from "@/services/storage.service";
import type { SubmissionFormData } from "@/features/submission/types";

const getStorageKey = (submissionId: string) =>
  `review_form_data_${submissionId}`;
const AUTO_SAVE_DELAY = 1000; // Auto-save after 1 second of inactivity

export const useReviewFormPersistence = (submissionId: string) => {
  const [formData, setFormData] = useState<Partial<SubmissionFormData>>(() => {
    const saved = storageService.get<Partial<SubmissionFormData>>(
      getStorageKey(submissionId)
    );
    return saved || {};
  });

  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Auto-save to localStorage
  useEffect(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      storageService.set(getStorageKey(submissionId), formData);
      console.log(
        `Auto-saved review data for submission ${submissionId}`,
        formData
      );
    }, AUTO_SAVE_DELAY);

    setAutoSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData, submissionId]);

  const updateFormData = useCallback((stepKey: string, data: any) => {
    setFormData((prev) => ({
      ...prev,
      [stepKey]: data,
    }));
  }, []);

  const clearFormData = useCallback(() => {
    storageService.remove(getStorageKey(submissionId));
    setFormData({});
  }, [submissionId]);

  const getStepData = useCallback(
    (stepKey: string) => {
      return formData[stepKey as keyof SubmissionFormData] || {};
    },
    [formData]
  );

  const saveFormData = useCallback(() => {
    storageService.set(getStorageKey(submissionId), formData);
    console.log(`Manually saved review data for submission ${submissionId}`);
  }, [formData, submissionId]);

  const getFormData = useCallback(() => {
    return formData;
  }, [formData]);

  return {
    formData,
    updateFormData,
    clearFormData,
    getStepData,
    saveFormData,
    getFormData,
  };
};
