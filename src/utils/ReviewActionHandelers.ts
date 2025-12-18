import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";

export interface SaveSectionPayload {
  submissionId: string;
  category: string;
  section: string;
  fields: Record<string, any>[];
}

export const handleSaveSection = async (payload: SaveSectionPayload) => {
  console.log(`[handleSaveSection] 🚀 Starting save operation:`, {
    submissionId: payload.submissionId,
    category: payload.category,
    section: payload.section,
    fieldsCount: payload.fields.length,
    fields: payload.fields,
  });

  try {
    console.log(`[handleSaveSection] 📡 Calling API: updateIndicator`);
    const result = await apiService.updateIndicator({
      submissionId: payload.submissionId,
      category: payload.category,
      section: payload.section,
      fields: payload.fields,
    });

    console.log(`[handleSaveSection] ✅ API call successful:`, result);
    notificationService.success("Section updated successfully");
    return result;
  } catch (error: any) {
    console.error(`[handleSaveSection] ❌ API call failed:`, {
      error,
      errorMessage: error?.message,
      errorResponse: error?.response?.data,
      errorStatus: error?.response?.status,
      payload: {
        submissionId: payload.submissionId,
        category: payload.category,
        section: payload.section,
      },
    });
    notificationService.error("Failed to save section");
    throw error;
  }
};
