import { storageService } from "@/services/storage.service";
// Removed mock data import - using actual API data
import type { SubmissionFormData } from "@/features/submission/types";

export interface SubmissionWithData {
  id: string;
  title: string;
  status: string;
  submittedBy: {
    name: string;
    location: string;
  };
  submissionDate: string;
  deadline: string;
  category: string;
  progress: number;
  documentsCount: number;
  daysPending: number;
  formData?: Partial<SubmissionFormData>;
}

/**
 * Get submission by ID with form data from localStorage if available
 * Note: This function should be updated to use actual API data instead of mock data
 */
export const getSubmissionWithData = (
  submissionId: string
): SubmissionWithData | undefined => {
  // TODO: Replace with actual API call
  // const submission = await apiService.getSubmission(submissionId);
  // For now, return undefined to avoid using mock data
  return undefined;
};

/**
 * Update submission form data in localStorage
 */
export const updateSubmissionData = (
  submissionId: string,
  formData: Partial<SubmissionFormData>
): void => {
  const storageKey = `review_form_data_${submissionId}`;
  storageService.set(storageKey, formData);
};

/**
 * Clear submission edits from localStorage
 */
export const clearSubmissionData = (submissionId: string): void => {
  const storageKey = `review_form_data_${submissionId}`;
  storageService.remove(storageKey);
};

/**
 * Check if submission has local edits
 */
export const hasLocalEdits = (submissionId: string): boolean => {
  const storageKey = `review_form_data_${submissionId}`;
  const savedData = storageService.get(storageKey);
  return savedData !== null;
};
