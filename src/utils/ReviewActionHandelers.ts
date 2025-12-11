import { apiService } from '@/services/api.service';
import { notificationService } from '@/services/notification.service';

export interface SaveSectionPayload {
  submissionId: string;
  category: string;
  section: string;
  fields: Record<string, any>[];
  successMessage?: string; // Optional custom success message
  errorMessage?: string; // Optional custom error message
}

export const handleSaveSection = async (payload: SaveSectionPayload) => {
  try {
    const result = await apiService.updateIndicator({
      submissionId: payload.submissionId,
      category: payload.category,
      section: payload.section,
      fields: payload.fields
    });

    notificationService.success(payload.successMessage || 'Section updated successfully');
    return result;
  } catch (error) {
    console.error('Failed to save section:', error);
    notificationService.error(payload.errorMessage || 'Failed to save section');
    throw error;
  }
};