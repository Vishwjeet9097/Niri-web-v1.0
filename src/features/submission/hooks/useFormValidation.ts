import { useState, useCallback } from "react";
import { validateFormData } from "@/utils/formDataTransformer";
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
      if (isValidating) {
        return false;
      }

      setIsValidating(true);

      try {
        // Check if formData is empty or null
        if (!formData || Object.keys(formData).length === 0) {
          notificationService.error(
            "No form data found. Please go back and fill the form sections.",
            "Empty Form"
          );
          return false;
        }

        const validation = validateFormData(formData);
        setLastValidationResult(validation);

        if (!validation.isValid) {
          // Create user-friendly section names
          const sectionNames: { [key: string]: string } = {
            infraFinancing: "Infrastructure Financing",
            infraDevelopment: "Infrastructure Development",
            pppDevelopment: "PPP Development",
            infraEnablers: "Infrastructure Enablers",
          };

          const missingSectionNames = validation.missingSections.map(
            (section) => sectionNames[section] || section
          );

          // Show detailed error message
          const errorMessage = `Please complete the following sections before proceeding:\n\n${missingSectionNames
            .map((name) => `• ${name}`)
            .join(
              "\n"
            )}\n\nPlease go back to the respective sections and fill in the required data.`;

          notificationService.error(errorMessage, "Incomplete Form");

          options.onValidationError?.(validation.missingSections);
          return false;
        }

        options.onValidationSuccess?.();
        return true;
      } catch (error) {
        notificationService.error(
          "An error occurred during validation. Please try again.",
          "Validation Error"
        );
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [isValidating, options]
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
