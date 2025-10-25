import { useState, useCallback } from "react";
import { notificationService } from "@/services/notification.service";

interface ValidationResult {
  isValid: boolean;
  missingSections: string[];
}

interface UseFormValidationOptions {
  onValidationSuccess?: () => void;
  onValidationError?: (missingSections: string[]) => void;
}

export const useFormValidation = (options: UseFormValidationOptions = {}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidationResult, setLastValidationResult] =
    useState<ValidationResult | null>(null);

  const validateForm = useCallback(
    async (formData: any): Promise<boolean> => {
      // Validation disabled - always return true to allow form submission
      setLastValidationResult({ isValid: true, missingSections: [] });
      options.onValidationSuccess?.();
      return true;
    },
    [options]
  );

  const validateAndProceed = useCallback(
    async (formData: any, onSuccess: () => void) => {
      const isValid = await validateForm(formData);
      if (isValid) {
        onSuccess();
      }
    },
    [validateForm]
  );

  return {
    validateForm,
    validateAndProceed,
    isValidating,
    lastValidationResult,
  };
};
