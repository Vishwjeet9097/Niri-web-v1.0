import { useState, useCallback, useEffect } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/config/environment";
import { notificationService } from "@/services/NotificationBus";
import { transformFormDataForSubmission } from "@/utils/formDataTransformer";
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { apiService } from "@/services/api.service";

interface UseIndicatorSubmissionOptions {
  category: "infraFinancing" | "infraDevelopment" | "pppDevelopment" | "infraEnablers";
  formData: any;
  assignedIndicators?: string[];
  isNodalOfficer?: boolean;
  onAllSubmitted?: () => void;
}

interface SubmissionState {
  submittingIndicators: Record<string, boolean>;
  submittedIndicators: Record<string, boolean>;
}

export const useIndicatorSubmission = ({
  category,
  formData,
  assignedIndicators = [],
  isNodalOfficer = false,
  onAllSubmitted,
}: UseIndicatorSubmissionOptions) => {
  const { toast } = useToast();
  
  const [submittingIndicators, setSubmittingIndicators] = useState<Record<string, boolean>>({});
  const [submittedIndicators, setSubmittedIndicators] = useState<Record<string, boolean>>({});

  // Get or resolve submission UUID
  const getSubmissionId = useCallback(async (): Promise<string | null> => {
    // Check if submission already exists
    const editingSubmissionId = localStorage.getItem("editing_submission_id");
    const isEditModeActive = localStorage.getItem("is_edit_mode") === "true";
    
    // Check for existing submission ID in localStorage (for new submissions after first save)
    const existingSubmissionData = localStorage.getItem("niri_app:submission_draft");
    let existingSubmissionId = editingSubmissionId;
    
    if (!existingSubmissionId && existingSubmissionData) {
      try {
        const parsed = JSON.parse(existingSubmissionData);
        existingSubmissionId = parsed.submissionId || null;
      } catch (e) {
        console.warn("Could not parse submission draft:", e);
      }
    }

    // If we have a reference number (SUB-YYYY-XXXXXX), fetch the submission to get the UUID (id)
    if (existingSubmissionId && existingSubmissionId.startsWith("SUB-")) {
      console.log(`🔍 Reference number detected: ${existingSubmissionId}`);
      console.log(`   Fetching submission to get UUID (id from submissions table)...`);
      try {
        const submission = await apiService.getSubmission(existingSubmissionId);
        if (submission?.id) {
          existingSubmissionId = submission.id;
          console.log(`✅ Resolved submission UUID:`);
          console.log(`   - id (UUID): ${submission.id}`);
          console.log(`   - submission_id (Reference): ${submission.submissionId}`);
          console.log(`   Using id (UUID) for update operations`);
          localStorage.setItem("editing_submission_id", existingSubmissionId);
        }
      } catch (error) {
        console.error("❌ Failed to fetch submission:", error);
        throw new Error("Could not resolve submission ID. Please try again.");
      }
    } else if (existingSubmissionId) {
      console.log(`✅ Already have UUID: ${existingSubmissionId}`);
    }

    console.log(`📋 Final submission ID (UUID): ${existingSubmissionId}`);
    return existingSubmissionId;
  }, []);

  // Prepare fields for submission based on indicator
  const prepareFields = useCallback((indicatorCode: string, sectionData: any): Record<string, any>[] => {
    // This will be customized per category in the component
    // Return the fields array structure
    return [];
  }, []);

  // Handle indicator submission
  const handleIndicatorSubmit = useCallback(async (
    indicatorCode: string,
    prepareFieldsFn: (code: string, data: any) => Record<string, any>[]
  ) => {
    setSubmittingIndicators((prev) => ({ ...prev, [indicatorCode]: true }));

    try {
      console.log(`🚀 Preparing indicator ${indicatorCode} submission...`);

      // Get the token
      const tokenData = JSON.parse(
        localStorage.getItem("niri_app:auth_tokens") || "{}"
      );
      const token = tokenData?.value?.accessToken;

      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Get submission ID
      const existingSubmissionId = await getSubmissionId();

      // Map indicator code to section key
      const sectionKey = `section${indicatorCode.replace('.', '_')}`;
      const sectionData = (formData as any)[sectionKey];
      
      // Prepare fields based on indicator code using custom function
      const fields = prepareFieldsFn(indicatorCode, sectionData);
      
      console.log(`📋 Fields for indicator ${indicatorCode}:`, fields);

      // If submission exists, update it
      if (existingSubmissionId) {
        console.log(`🔄 Updating existing submission: ${existingSubmissionId}`);
        console.log(`📤 Update payload:`, {
          submissionId: existingSubmissionId,
          category: category,
          section: sectionKey,
          fields: fields
        });
        
        await handleSaveSection({
          submissionId: existingSubmissionId,
          category: category,
          section: sectionKey,
          fields: fields
        });

        console.log(`✅ Indicator ${indicatorCode} updated successfully`);

        // Mark as submitted
        setSubmittedIndicators((prev) => ({ ...prev, [indicatorCode]: true }));

        notificationService.success(
          `Indicator ${indicatorCode} Updated`,
          `Section ${indicatorCode} has been successfully updated in the database.`
        );

        toast({
          title: "Success",
          description: `Indicator ${indicatorCode} updated successfully`,
        });

      } else {
        // No existing submission - create new one with FormData
        console.log(`📝 Creating new submission for indicator ${indicatorCode}`);

        let fullCategoryData: any = { [category]: {} };
        fullCategoryData[category][sectionKey] = sectionData;

        // Transform the data
        const transformedSubmission = transformFormDataForSubmission(
          fullCategoryData,
          "SUBMITTED_TO_STATE"
        );

        // Prepare FormData
        const formDataObj = new FormData();
        
        // Add indicator metadata to transformed submission
        const submissionPayload = {
          ...transformedSubmission,
          indicatorCode: indicatorCode,
          category: category,
          isPartialSubmission: true,
        };
        
        formDataObj.append("submission", JSON.stringify(submissionPayload));

        // Append all files properly for Multer
        const appendAllFiles = (obj: any, parentKey = "") => {
          if (!obj || typeof obj !== "object") return;

          Object.entries(obj).forEach(([key, value]) => {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;

            // Case 1: direct File
            if (value instanceof File) {
              console.log("📎 Appending file:", fullKey, value.name);
              formDataObj.append(fullKey, value);
            }
            // Case 2: nested file.file
            else if (value && typeof value === "object" && "file" in value && value.file instanceof File) {
              console.log("📎 Appending nested file:", fullKey, value.file.name);
              formDataObj.append(fullKey, value.file);
            } else if (value && typeof value === "object" && "file" in value && value.file && typeof value.file === "object" && "file" in value.file && value.file.file instanceof File) {
              console.log("📎 Appending deeply nested file:", fullKey, (value.file as any).file.name);
              formDataObj.append(fullKey, (value.file as any).file);
            }
            // Recurse deeper for arrays/objects
            else if (Array.isArray(value)) {
              value.forEach((item, i) => appendAllFiles(item, `${fullKey}[${i}]`));
            } else if (typeof value === "object") {
              appendAllFiles(value, fullKey);
            }
          });
        };

        appendAllFiles(sectionData);

        // Debug: confirm files attached
        console.group(`🧾 Final FormData contents for indicator ${indicatorCode}:`);
        for (const [key, val] of formDataObj.entries()) {
          console.log(`➡️ ${key}:`, val instanceof File ? `File(${val.name})` : val);
        }
        console.groupEnd();

        // Send
        const url = `${config.apiBaseUrl}/submission`;
        console.log(`🚀 Creating new submission for indicator ${indicatorCode} to:`, url);

        const response = await axios.post(url, formDataObj, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(`✅ Indicator ${indicatorCode} submitted successfully:`, response.data);

        // Store the submission UUID (id) for future updates
        const responseData = response.data?.data || response.data;
        const submissionUUID = responseData?.id || responseData?.submissionId;
        
        if (submissionUUID) {
          localStorage.setItem("niri_app:submission_draft", JSON.stringify({
            submissionId: submissionUUID,
            timestamp: new Date().toISOString()
          }));
          localStorage.setItem("editing_submission_id", submissionUUID);
          console.log(`💾 Stored submission UUID: ${submissionUUID}`);
        } else {
          console.warn('⚠️ No submission ID returned from API:', response.data);
        }

        // Mark as submitted
        setSubmittedIndicators((prev) => ({ ...prev, [indicatorCode]: true }));

        notificationService.success(
          `Indicator ${indicatorCode} Submitted`,
          `Section ${indicatorCode} has been successfully saved to the database.`
        );

        toast({
          title: "Success",
          description: `Indicator ${indicatorCode} submitted successfully`,
        });
      }

    } catch (error: any) {
      console.error(`❌ Failed to submit indicator ${indicatorCode}:`, error);
      console.error(`❌ Error response:`, error.response?.data);
      console.error(`❌ Error details:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        stack: error.response?.data?.stack
      });
      
      const errorMessage = error.response?.data?.message || error.message || "Failed to submit indicator";
      
      notificationService.error(
        `Submission Failed`,
        `Failed to submit indicator ${indicatorCode}: ${errorMessage}`
      );

      toast({
        title: "Error",
        description: `Failed to submit indicator ${indicatorCode}`,
        variant: "destructive",
      });
    } finally {
      setSubmittingIndicators((prev) => ({ ...prev, [indicatorCode]: false }));
    }
  }, [category, formData, getSubmissionId, toast]);

  // Auto-navigate when all indicators are submitted
  useEffect(() => {
    const indicatorsToCheck = isNodalOfficer 
      ? assignedIndicators 
      : Object.keys(formData).map(key => key.replace('section', '').replace('_', '.')); // Extract indicator codes

    const allSubmitted = indicatorsToCheck.every(
      (indicator) => submittedIndicators[indicator] === true
    );

    if (allSubmitted && indicatorsToCheck.length > 0 && onAllSubmitted) {
      console.log("✅ All indicators submitted! Triggering callback...");
      
      notificationService.success(
        "All Indicators Submitted",
        `All ${category} indicators have been submitted. Proceeding to next step.`
      );

      toast({
        title: "Success",
        description: "All indicators submitted successfully. Moving to next step.",
      });

      setTimeout(() => {
        onAllSubmitted();
      }, 1500);
    }
  }, [submittedIndicators, isNodalOfficer, assignedIndicators, formData, category, onAllSubmitted, toast]);

  return {
    submittingIndicators,
    submittedIndicators,
    handleIndicatorSubmit,
  };
};
