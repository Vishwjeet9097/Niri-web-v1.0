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
    console.log('🔧 handleSaveSection received payload with fields:', payload.fields?.length);
    
    // Check if File instances are present
    const checkForFiles = (obj: any, path = ''): void => {
      if (obj instanceof File) {
        console.log('🎯 Found File at path:', path, 'Size:', obj.size);
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => checkForFiles(item, `${path}[${idx}]`));
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          checkForFiles(value, path ? `${path}.${key}` : key);
        });
      }
    };
    
    checkForFiles(payload.fields, 'fields');
    
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