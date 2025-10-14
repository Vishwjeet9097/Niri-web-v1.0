import { useState, useEffect, useCallback, useRef } from "react";
import { storageService } from "@/services/storage.service";
import type { SubmissionFormData } from "@/features/submission/types";

const getStorageKey = (submissionId: string) =>
  `review_form_data_${submissionId}`;
const AUTO_SAVE_DELAY = 500; // Reduced delay for better responsiveness

export const useReviewFormPersistence = (submissionId: string) => {
  // Use ref to track if we've initialized from submission data
  const initializedFromSubmission = useRef(false);

  const [formData, setFormData] = useState<Partial<SubmissionFormData>>(() => {
    const saved = storageService.get<Partial<SubmissionFormData>>(
      getStorageKey(submissionId)
    );
    console.log("🔍 Initial form data from localStorage:", saved);
    return saved || {};
  });

  // Change tracking system with more granular tracking
  const [changeTracker, setChangeTracker] = useState({
    infraFinancing: { changed: false, lastModified: null, fields: {} },
    infraDevelopment: { changed: false, lastModified: null, fields: {} },
    pppDevelopment: { changed: false, lastModified: null, fields: {} },
    infraEnablers: { changed: false, lastModified: null, fields: {} },
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

  // Initialize from submission data (only once)
  const initializeFromSubmission = useCallback(
    (submissionData: Partial<SubmissionFormData>) => {
      if (initializedFromSubmission.current) {
        console.log("🔄 Already initialized from submission, skipping");
        return;
      }

      const existingData = storageService.get<Partial<SubmissionFormData>>(
        getStorageKey(submissionId)
      );

      // Only initialize if localStorage is empty
      if (!existingData || Object.keys(existingData).length === 0) {
        console.log("🔄 Initializing from submission data:", submissionData);
        setFormData(submissionData);
        storageService.set(getStorageKey(submissionId), submissionData);
        initializedFromSubmission.current = true;
      } else {
        console.log("🔄 Using existing localStorage data:", existingData);
        setFormData(existingData);
        initializedFromSubmission.current = true;
      }
    },
    [submissionId]
  );

  const updateFormData = useCallback(
    (stepKey: string, data: unknown) => {
      setFormData((prev) => {
        // Check if data is actually different to prevent unnecessary updates
        const currentData = prev[stepKey as keyof SubmissionFormData];
        if (JSON.stringify(currentData) === JSON.stringify(data)) {
          console.log(`📝 No changes detected for ${stepKey}, skipping update`);
          return prev;
        }

        const updated = {
          ...prev,
          [stepKey]: data,
        };

        // Track changes with field-level granularity
        setChangeTracker((prevTracker) => ({
          ...prevTracker,
          [stepKey]: {
            changed: true,
            lastModified: new Date().toISOString(),
            fields: {
              ...prevTracker[stepKey as keyof typeof prevTracker].fields,
              ...(data as Record<string, unknown>),
            },
          },
        }));

        // Immediately save to localStorage to prevent data loss
        storageService.set(getStorageKey(submissionId), updated);
        console.log(`💾 Immediately saved ${stepKey} data:`, data);
        console.log(`📝 Marked ${stepKey} as changed`);

        return updated;
      });
    },
    [submissionId]
  );

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

  // Professional merge function
  const getMergedData = useCallback(
    (originalData: any) => {
      const merged = {
        infraFinancing: changeTracker.infraFinancing.changed
          ? formData.infraFinancing
          : originalData?.infraFinancing,
        infraDevelopment: changeTracker.infraDevelopment.changed
          ? formData.infraDevelopment
          : originalData?.infraDevelopment,
        pppDevelopment: changeTracker.pppDevelopment.changed
          ? formData.pppDevelopment
          : originalData?.pppDevelopment,
        infraEnablers: changeTracker.infraEnablers.changed
          ? formData.infraEnablers
          : originalData?.infraEnablers,
      };

      console.log("🔄 Professional merge result:", merged);
      console.log("📊 Change summary:", changeTracker);

      return merged;
    },
    [formData, changeTracker]
  );

  return {
    formData,
    updateFormData,
    clearFormData,
    getStepData,
    saveFormData,
    getFormData,
    getMergedData,
    changeTracker,
    initializeFromSubmission,
  };
};
