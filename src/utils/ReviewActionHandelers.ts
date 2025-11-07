import { apiService } from '@/services/api.service';
import { notificationService } from '@/services/notification.service';

export interface SaveSectionPayload {
  submissionId: string;
  category: string;
  section: string;
  fields: Record<string, any>[];
}

export const handleSaveSection = async (payload: SaveSectionPayload) => {
  try {
    const result = await apiService.updateIndicator({
      submissionId: payload.submissionId,
      category: payload.category,
      section: payload.section,
      fields: payload.fields
    });

    notificationService.success('Section updated successfully');
    return result;
  } catch (error) {
    console.error('Failed to save section:', error);
    notificationService.error('Failed to save section');
    throw error;
  }
};