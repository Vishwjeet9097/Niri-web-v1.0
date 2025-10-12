import { apiService } from "./api.service";
import { notificationService } from "./notification.service";
import { transformFormDataToNiriSubmission } from "@/utils/formToNiriTransformer";

export interface DraftSubmission {
  submissionId: string;
  formData: any;
  stepName: string;
  lastSaved: string;
}

export class DraftService {
  private static instance: DraftService;
  private draftSubmissions: Map<string, DraftSubmission> = new Map();

  static getInstance(): DraftService {
    if (!DraftService.instance) {
      DraftService.instance = new DraftService();
    }
    return DraftService.instance;
  }

  /**
   * Save draft to backend API
   */
  async saveDraft(
    submissionId: string,
    formData: any,
    stepName: string,
    userId?: string,
    stateUt?: string
  ): Promise<boolean> {
    try {
      console.log(`💾 Saving draft for step: ${stepName}`, {
        submissionId,
        formData,
      });

      // Transform form data to NIRI format
      let niriSubmission;
      if (userId && stateUt) {
        niriSubmission = transformFormDataToNiriSubmission(
          formData,
          userId,
          stateUt
        );
        niriSubmission.submission_status = "DRAFT";
      } else {
        // Fallback to original format if user info not available
        niriSubmission = {
          ...formData,
          status: "DRAFT",
          lastSavedStep: stepName,
          lastSavedAt: new Date().toISOString(),
        };
      }

      // Call backend API to save draft
      const response = await apiService.updateSubmission(
        submissionId,
        niriSubmission
      );

      // Store locally for quick access
      const draftSubmission: DraftSubmission = {
        submissionId,
        formData,
        stepName,
        lastSaved: new Date().toISOString(),
      };

      this.draftSubmissions.set(submissionId, draftSubmission);

      // Show success notification
      notificationService.success(
        `Draft saved successfully for ${stepName}`,
        "Draft Saved",
        {
          details: {
            stepName,
            submissionId,
            timestamp: draftSubmission.lastSaved,
          },
        }
      );

      return true;
    } catch (error: any) {
      console.error("❌ Failed to save draft:", error);

      // Show error notification
      notificationService.error(
        error.message || "Failed to save draft. Please try again.",
        "Draft Save Failed",
        {
          details: {
            stepName,
            submissionId,
            error: error.message,
          },
        }
      );

      return false;
    }
  }

  /**
   * Create new draft submission
   */
  async createDraft(
    formData: any,
    stepName: string,
    userId?: string,
    stateUt?: string
  ): Promise<string | null> {
    try {
      console.log(`🆕 Creating new draft for step: ${stepName}`, { formData });

      // Generate unique submission ID
      const submissionId = `DRAFT-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

      // Transform form data to NIRI format
      let niriSubmission;
      if (userId && stateUt) {
        niriSubmission = transformFormDataToNiriSubmission(
          formData,
          userId,
          stateUt
        );
        niriSubmission.submission_status = "DRAFT";
      } else {
        // Fallback to original format if user info not available
        niriSubmission = {
          submissionId,
          ...formData,
          status: "DRAFT",
          lastSavedStep: stepName,
          lastSavedAt: new Date().toISOString(),
        };
      }

      // Call backend API to create draft submission
      const response = await apiService.createSubmission(niriSubmission);

      // Store locally
      const draftSubmission: DraftSubmission = {
        submissionId,
        formData,
        stepName,
        lastSaved: new Date().toISOString(),
      };

      this.draftSubmissions.set(submissionId, draftSubmission);

      // Show success notification
      notificationService.success(
        `New draft created for ${stepName}`,
        "Draft Created",
        {
          details: {
            stepName,
            submissionId,
            timestamp: draftSubmission.lastSaved,
          },
        }
      );

      return submissionId;
    } catch (error: any) {
      console.error("❌ Failed to create draft:", error);

      // Show error notification
      notificationService.error(
        error.message || "Failed to create draft. Please try again.",
        "Draft Creation Failed",
        {
          details: {
            stepName,
            error: error.message,
          },
        }
      );

      return null;
    }
  }

  /**
   * Load draft from backend
   */
  async loadDraft(submissionId: string): Promise<DraftSubmission | null> {
    try {
      console.log(`📂 Loading draft: ${submissionId}`);

      // Try to get from backend first
      const response = await apiService.getSubmission(submissionId);

      if (response && response.status === "DRAFT") {
        const draftSubmission: DraftSubmission = {
          submissionId,
          formData: response.formData,
          stepName: response.lastSavedStep || "unknown",
          lastSaved: response.lastSavedAt || new Date().toISOString(),
        };

        this.draftSubmissions.set(submissionId, draftSubmission);
        return draftSubmission;
      }

      return null;
    } catch (error: any) {
      console.error("❌ Failed to load draft:", error);

      // Fallback to local storage
      const localDraft = this.draftSubmissions.get(submissionId);
      if (localDraft) {
        notificationService.warning(
          "Using locally saved draft data",
          "Draft Loaded",
          {
            details: {
              submissionId,
              stepName: localDraft.stepName,
              lastSaved: localDraft.lastSaved,
            },
          }
        );
        return localDraft;
      }

      return null;
    }
  }

  /**
   * Get all draft submissions
   */
  async getAllDrafts(): Promise<DraftSubmission[]> {
    try {
      const response = await apiService.getSubmissions(1, 100, "DRAFT");
      return response.map((submission: any) => ({
        submissionId: submission.submissionId,
        formData: submission.formData,
        stepName: submission.lastSavedStep || "unknown",
        lastSaved: submission.lastSavedAt || submission.updatedAt,
      }));
    } catch (error: any) {
      console.error("❌ Failed to get drafts:", error);
      return Array.from(this.draftSubmissions.values());
    }
  }

  /**
   * Delete draft
   */
  async deleteDraft(submissionId: string): Promise<boolean> {
    try {
      await apiService.deleteSubmission(submissionId);
      this.draftSubmissions.delete(submissionId);

      notificationService.success(
        "Draft deleted successfully",
        "Draft Deleted"
      );

      return true;
    } catch (error: any) {
      console.error("❌ Failed to delete draft:", error);
      notificationService.error(
        error.message || "Failed to delete draft",
        "Delete Failed"
      );
      return false;
    }
  }

  /**
   * Get local draft by ID
   */
  getLocalDraft(submissionId: string): DraftSubmission | null {
    return this.draftSubmissions.get(submissionId) || null;
  }

  /**
   * Clear all local drafts
   */
  clearLocalDrafts(): void {
    this.draftSubmissions.clear();
  }
}

// Export singleton instance
export const draftService = DraftService.getInstance();
