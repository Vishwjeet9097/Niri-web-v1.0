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

    // Check if indicator score is in response (indicator submitted for score)
    if (result?.indicatorScore) {
      const score = result.indicatorScore;
      const indicatorCode = score.indicatorCode || payload.section.replace('section', '').replace('_', '.');
      // notificationService.success(
      //   `Section updated successfully. Score: ${score.score}/${score.maxScore} points`
      // );
      
      // Dispatch custom event with score information
      window.dispatchEvent(
        new CustomEvent("niri-submission-updated", {
          detail: {
            submissionId: payload.submissionId,
            category: payload.category,
            section: payload.section,
            indicatorScore: score,
          },
        })
      );
    } else {
      notificationService.success("Section updated successfully");

      // Dispatch custom event to notify components that submission was updated
      window.dispatchEvent(
        new CustomEvent("niri-submission-updated", {
          detail: {
            submissionId: payload.submissionId,
            category: payload.category,
            section: payload.section,
          },
        })
      );
    }

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
    // Don't show notification alert for validation errors - errors should be shown on UI
    // Check if this is a validation error from backend
    const isValidationError =
      error?.response?.data?.message?.toLowerCase().includes("validation") ||
      error?.response?.data?.message?.toLowerCase().includes("required") ||
      error?.response?.data?.message?.toLowerCase().includes("mandatory") ||
      error?.isValidationError;
    if (!isValidationError) {
      notificationService.error("Failed to save section");
    }
    throw error;
  }
};
