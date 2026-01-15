import { useEffect, useState, useMemo, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { DynamicFormBuilder } from "../components/FormBuilder";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { getDropdownOptions } from "../constants/dropdownMappings";
import {
  getMinistrySubmissionDetailsForReview,
  getMinistrySubmissionDetailsConsolidated,
  updateMinistryIndicatorData,
  updateSubmissionIndicatorStatus,
} from "@/services/ministry.service";
import { transformApiResponseToFormData } from "../utils/formDataTransformer";
import { extractSubmissionId } from "../utils/submissionIdExtractor";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MINISTRY_SUBMISSION_STEPS } from "../constants/steps";
import type { AssignedIndicator } from "../components/FormBuilder/types";
import { useAuth } from "@/features/auth/AuthProvider";
import { MinistryApproverActionButtons } from "../components/actionButtons/MinistryApproverActionButtons";
import { MospiReviewerActionButtons } from "../components/actionButtons/MospiReviewerActionButtons";
import { MospiApproverActionButtons } from "../components/actionButtons/MospiApproverActionButtons";
import { useEditableSectionStore } from "@/utils/EditableSection";
import { useMinistryValidation } from "../hooks/useMinistryValidation";
import { validateSection } from "../utils/validation";

interface MinistrySubmissionReviewWrapperProps {
  submission: any; // The submission object from the review page
  userId?: string; // Optional: user ID to fetch data for
  useConsolidatedApi?: boolean; // If true, use consolidated API with submissionId instead of userId
  submissionId?: string; // Submission ID for consolidated API
}

export function MinistrySubmissionReviewWrapper({
  submission,
  userId,
  useConsolidatedApi = false,
  submissionId: propSubmissionId,
}: MinistrySubmissionReviewWrapperProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedIndicators, setAssignedIndicators] = useState<
    AssignedIndicator[]
  >([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(
    submission?.id || null
  );

  // Edit mode state management
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();
  const [editingSections, setEditingSections] = useState<Set<string>>(
    new Set()
  );
  const [originalFormDataSnapshots, setOriginalFormDataSnapshots] = useState<
    Record<string, any>
  >({});
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());

  // Validation hook for edit mode
  const {
    validationErrors,
    validateFieldOnChange,
    clearFieldError,
    getFieldErrorMemoized,
    setValidationErrorsForSection,
    clearValidationErrorsForSection,
  } = useMinistryValidation({
    formData,
    assignedIndicators,
  });

  // Load submission data with forReview=true
  useEffect(() => {
    loadSubmissionData();
  }, [submission?.id, userId, useConsolidatedApi, propSubmissionId]);

  const loadSubmissionData = async () => {
    try {
      setLoading(true);

      let response;

      //This condition is added by Harsh to check if the useConsolidatedApi is true and if it is true then use the consolidated API
      // Used for mospi reviewer and approver to review the submission
      // Use consolidated API if coming from MOSPI dashboard

      // Define targetSubmissionId in outer scope so it's accessible later
      const targetSubmissionId =
        submission?.id || submission?.submissionId || propSubmissionId;
      const targetUserId = userId || submission?.user?.id;

      if (useConsolidatedApi && useConsolidatedApi === true) {
        if (!targetSubmissionId) {
          console.error("No submission ID available for consolidated API");
          toast({
            title: "Error",
            description: "Submission ID is required to load submission data.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log(
          "📋 Loading consolidated submission data for review, submissionId:",
          targetSubmissionId
        );
        response = await getMinistrySubmissionDetailsConsolidated(
          targetSubmissionId
        );
      } else {
        // Use existing API with userId
        // Prioritize submissionId from submission object

        //Need to use this now.
        //const targetUserId = submission?.id;

        if (!targetSubmissionId && !targetUserId) {
          console.error("No submission ID or user ID available for review");
          toast({
            title: "Error",
            description:
              "Submission ID or User ID is required to load submission data.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log(
          "📋 Loading submission data for review, submissionId:",
          targetSubmissionId,
          "userId:",
          targetUserId
        );
        response = await getMinistrySubmissionDetailsForReview(
          targetSubmissionId,
          targetUserId
        );
      }

      if (
        response?.status &&
        response?.data &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        console.log(
          "✅ Loaded submission indicators for review:",
          response.data.length
        );
        console.log(
          "📋 Assigned indicators structure:",
          JSON.stringify(response.data, null, 2)
        );
        setAssignedIndicators(response.data);

        const initialFormData = transformApiResponseToFormData(
          response.data,
          {}
        );
        console.log("📋 Transformed formData:", Object.keys(initialFormData));
        // Log subsection entries for debugging
        Object.keys(initialFormData).forEach((sectionKey) => {
          const sectionData = initialFormData[sectionKey];
          if (sectionData && typeof sectionData === "object") {
            Object.keys(sectionData).forEach((key) => {
              if (Array.isArray(sectionData[key])) {
                console.log(
                  `📋 Section ${sectionKey}.${key}: ${sectionData[key].length} entries`,
                  sectionData[key]
                );
              }
            });
          }
        });
        // Merge with existing formData to preserve optimistic updates
        setFormData((prevFormData) => {
          const mergedFormData = { ...prevFormData };
          // Merge each section's data - server data takes precedence (it's the source of truth)
          Object.keys(initialFormData).forEach((key) => {
            if (
              prevFormData[key] &&
              typeof prevFormData[key] === "object" &&
              !Array.isArray(prevFormData[key])
            ) {
              // Merge section data, prioritizing server data (it's the source of truth after reload)
              mergedFormData[key] = {
                ...prevFormData[key],
                ...initialFormData[key],
              };
            } else {
              // If section doesn't exist in prevFormData, use the new data
              mergedFormData[key] = initialFormData[key];
            }
          });
          console.log(
            "📋 Merged formData after reload. Section keys:",
            Object.keys(mergedFormData)
          );
          return mergedFormData;
        });

        // Extract submission ID - prioritize from response, then from submission object
        if (useConsolidatedApi) {
          // For consolidated API, use the submissionId from response or prop
          const extractedId =
            response.submissionId || propSubmissionId || submission?.id;
          if (extractedId) {
            setSubmissionId(extractedId);
          }
        } else {
          let extractedId = response.submissionId || targetSubmissionId;
          if (!extractedId && targetUserId) {
            extractedId = await extractSubmissionId(
              response,
              targetUserId,
              toast
            );
          }
          if (extractedId) {
            setSubmissionId(extractedId);
          } else if (submission?.id) {
            setSubmissionId(submission.id);
          }
        }
      } else {
        console.warn("No indicators found for review");
        toast({
          title: "No Data",
          description: "No submission data found for review.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("Error loading submission data for review:", error);
      toast({
        title: "Error",
        description:
          error?.message || "Failed to load submission data for review.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Extract categories from assignedIndicators and sort them according to MINISTRY_SUBMISSION_STEPS order
  const categories = useMemo(() => {
    const categoryMap = new Map<string, AssignedIndicator>();

    assignedIndicators.forEach((indicator) => {
      const categoryName = Object.keys(indicator)[0];
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, indicator);
      }
    });

    // Sort categories according to the order defined in MINISTRY_SUBMISSION_STEPS
    // Filter out the review-submit step and get only category steps
    const categorySteps = MINISTRY_SUBMISSION_STEPS.filter(
      (step) => step.key !== "review-submit"
    );

    // Create ordered categories list based on MINISTRY_SUBMISSION_STEPS order
    const orderedCategories: AssignedIndicator[] = [];
    categorySteps.forEach((step) => {
      const categoryIndicator = categoryMap.get(step.title);
      if (categoryIndicator) {
        orderedCategories.push(categoryIndicator);
      }
    });

    // Add any categories that exist in the data but not in MINISTRY_SUBMISSION_STEPS (fallback)
    categoryMap.forEach((indicator, categoryName) => {
      const exists = orderedCategories.some(
        (cat) => Object.keys(cat)[0] === categoryName
      );
      if (!exists) {
        orderedCategories.push(indicator);
      }
    });

    console.log(
      "📋 Extracted categories (ordered):",
      orderedCategories.map((cat) => Object.keys(cat)[0])
    );
    return orderedCategories;
  }, [assignedIndicators]);

  // Calculate progress for each category
  const getCategoryProgress = (categoryIndicator: AssignedIndicator) => {
    const categoryName = Object.keys(categoryIndicator)[0];
    const sections = categoryIndicator[categoryName];

    if (!Array.isArray(sections)) {
      return { completed: 0, total: 0, progress: 0 };
    }

    let completed = 0;
    let total = sections.length;

    sections.forEach((sectionObj: any) => {
      const sectionName = Object.keys(sectionObj)[0];
      const section = sectionObj[sectionName];
      const sectionKey = `section${section.sNo.replace(".", "_")}`;

      if (
        formData[sectionKey] &&
        Object.keys(formData[sectionKey]).length > 0
      ) {
        completed++;
      }
    });

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, progress };
  };

  // Default to first category and update when categories change
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Update activeCategory when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      const firstCategoryName = Object.keys(categories[0])[0];
      setActiveCategory(firstCategoryName);
    }
  }, [categories, activeCategory]);

  // Handle edit start
  const handleEditStart = (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Starting edit for section:",
      sectionId
    );

    // Check if section is accepted - if so, prevent editing
    if (isSectionAccepted(sectionId)) {
      toast({
        title: "Cannot Edit",
        description: `Section ${sectionId} has been accepted and cannot be edited.`,
        variant: "destructive",
      });
      return;
    }

    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Store original form data snapshot
    const originalData = formData[sectionKey]
      ? JSON.parse(JSON.stringify(formData[sectionKey]))
      : {};
    setOriginalFormDataSnapshots((prev) => ({
      ...prev,
      [sectionId]: originalData,
    }));

    // Enable edit mode
    setEditable(sectionId, true);
    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      console.log(
        "[MinistrySubmissionReviewWrapper] Updated editingSections:",
        Array.from(newSet)
      );
      return newSet;
    });

    console.log(
      "[MinistrySubmissionReviewWrapper] Edit mode enabled for section:",
      sectionId
    );
    console.log(
      "[MinistrySubmissionReviewWrapper] Current editingSections:",
      Array.from(editingSections)
    );
  };

  // Handle edit cancel
  const handleEditCancel = (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Cancelling edit for section:",
      sectionId
    );
    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Restore original form data
    const originalData = originalFormDataSnapshots[sectionId];
    if (originalData) {
      setFormData((prev) => ({
        ...prev,
        [sectionKey]: originalData,
      }));
    }

    // Clear edit mode
    setEditable(sectionId, false);
    setEditingSections((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });

    // Clear snapshot
    setOriginalFormDataSnapshots((prev) => {
      const newSnapshots = { ...prev };
      delete newSnapshots[sectionId];
      return newSnapshots;
    });
  };

  // Handle save
  const handleSave = async (sectionId: string) => {
    console.log("[MinistrySubmissionReviewWrapper] Saving section:", sectionId);
    const sectionKey = `section${sectionId.replace(".", "_")}`;

    // Find the indicator and section data
    let submissionIndicatorId: string | null = null;
    let currentSection: any = null;

    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            submissionIndicatorId = (section as any).submissionIndicatorId;
            currentSection = section;
            break;
          }
        }
      }

      if (submissionIndicatorId) break;
    }

    if (!submissionIndicatorId || !currentSection) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      return;
    }

    // Get section data
    const sectionData = formData[sectionKey] || {};

    // Validate section before saving
    const sectionErrors = validateSection(currentSection, sectionKey, formData);

    // Check if there are any validation errors for this section
    const hasErrors = Object.keys(sectionErrors).length > 0;

    if (hasErrors) {
      // Set validation errors
      setValidationErrorsForSection(sectionErrors);

      toast({
        title: "Validation Error",
        description: `Please fix the errors in section ${sectionId} before saving.`,
        variant: "destructive",
      });

      // Scroll to first error field
      const firstErrorPath = Object.keys(sectionErrors)[0];
      const errorElement = document.querySelector(
        `[data-field-path="${firstErrorPath}"]`
      );
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      return;
    }

    // Clear any existing validation errors for this section
    clearValidationErrorsForSection(sectionKey);

    // Set saving state
    setSavingSections((prev) => new Set(prev).add(sectionId));

    try {
      // Call update API
      const updateResponse = await updateMinistryIndicatorData(
        submissionIndicatorId,
        sectionData,
        currentSection,
        submissionId || undefined,
        "SUBMITTED_TO_MINISTRY" // Keep status as SUBMITTED_TO_MINISTRY after edit
      );

      console.log(
        "[MinistrySubmissionReviewWrapper] Update response:",
        updateResponse
      );
      console.log(
        "[MinistrySubmissionReviewWrapper] Section data that was saved:",
        sectionData
      );
      console.log(
        "[MinistrySubmissionReviewWrapper] SectionKey:",
        sectionKey,
        "SectionId:",
        sectionId
      );

      // Update local formData immediately with the saved data (optimistic update)
      // This ensures UI shows the updated values right away
      setFormData((prevFormData) => {
        const updatedFormData = { ...prevFormData };
        // Merge the saved data with existing section data to preserve any other fields
        updatedFormData[sectionKey] = {
          ...(prevFormData[sectionKey] || {}),
          ...sectionData,
        };
        console.log(
          "[MinistrySubmissionReviewWrapper] Updated local formData for",
          sectionKey,
          ":",
          updatedFormData[sectionKey]
        );
        console.log(
          "[MinistrySubmissionReviewWrapper] Full formData keys:",
          Object.keys(updatedFormData)
        );
        // Return a new object reference to ensure React detects the state change
        return { ...updatedFormData };
      });

      // Clear edit mode
      setEditable(sectionId, false);
      setEditingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });

      // Clear snapshot
      setOriginalFormDataSnapshots((prev) => {
        const newSnapshots = { ...prev };
        delete newSnapshots[sectionId];
        return newSnapshots;
      });

      // Clear validation errors for this section after successful save
      clearValidationErrorsForSection(sectionKey);

      toast({
        title: "Success",
        description: `Section ${sectionId} updated successfully`,
      });

      // Don't reload immediately - the optimistic update should be sufficient
      // The data is already updated in the UI via the optimistic update above
      // If you need to sync with server, uncomment below (but increase delay to 2-3 seconds)
      // await new Promise((resolve) => setTimeout(resolve, 2000));
      // console.log("[MinistrySubmissionReviewWrapper] Reloading data from server after save...");
      // await loadSubmissionData();
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast({
        title: "Error",
        description: error?.message || `Failed to save section ${sectionId}`,
        variant: "destructive",
      });
    } finally {
      setSavingSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  // Helper function to get section status from assignedIndicators
  const getSectionStatus = (sectionId: string): string | null => {
    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            return (section as any).status || null;
          }
        }
      }
    }
    return null;
  };

  // Helper function to check if section is accepted
  const isSectionAccepted = (sectionId: string): boolean => {
    const status = getSectionStatus(sectionId);
    if (!status) return false;
    const upperStatus = status.toUpperCase();
    return (
      upperStatus === "ACCEPTED_BY_MINISTRY" ||
      upperStatus === "ACCEPTED_BY_MOSPI" ||
      upperStatus === "ACCEPTED"
    );
  };

  // Handle accept action
  const handleAccept = async (sectionId: string) => {
    console.log(
      "[MinistrySubmissionReviewWrapper] Accepting section:",
      sectionId
    );

    // Find the indicator and section data to get submissionIndicatorId
    let submissionIndicatorId: string | null = null;
    let currentSection: any = null;

    for (const categoryIndicator of assignedIndicators) {
      const categoryName = Object.keys(categoryIndicator)[0];
      const sections = categoryIndicator[categoryName];

      if (Array.isArray(sections)) {
        for (const sectionObj of sections) {
          const sectionName = Object.keys(sectionObj)[0];
          const section = sectionObj[sectionName];

          if (section.sNo === sectionId) {
            submissionIndicatorId = (section as any).submissionIndicatorId;
            currentSection = section;
            break;
          }
        }
      }

      if (submissionIndicatorId) break;
    }

    if (!submissionIndicatorId) {
      toast({
        title: "Error",
        description: `Could not find submission indicator for section ${sectionId}`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Call API to update status to ACCEPTED_BY_MINISTRY
      const response = await updateSubmissionIndicatorStatus(
        submissionIndicatorId,
        "ACCEPTED_BY_MINISTRY"
      );

      console.log(
        "[MinistrySubmissionReviewWrapper] Accept response:",
        response
      );

      toast({
        title: "Success",
        description: `Section ${sectionId} accepted successfully`,
      });

      // Reload submission data to reflect the updated status
      await loadSubmissionData();
    } catch (error: any) {
      console.error("Error accepting section:", error);
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          error?.message ||
          `Failed to accept section ${sectionId}`,
        variant: "destructive",
      });
    }
  };

  // Handle form data change (only when in edit mode)
  const handleFormDataChange = (path: string, value: any) => {
    // Only allow changes when section is in edit mode
    const sectionId = path
      .split(".")[0]
      .replace("section", "")
      .replace("_", ".");
    if (editingSections.has(sectionId)) {
      setFormData((prev) => {
        const newData = { ...prev };
        const keys = path.split(".");
        let current: any = newData;

        // Navigate to the parent object
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }

        // If value is a function, call it with the current value (for array updates)
        const finalKey = keys[keys.length - 1];
        if (typeof value === "function") {
          const currentValue = current[finalKey];
          current[finalKey] = value(currentValue);
        } else {
          current[finalKey] = value;
        }

        return newData;
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin mb-2" />
        <p className="text-muted-foreground">Loading submission data...</p>
      </div>
    );
  }

  if (assignedIndicators.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">
          No indicators found for this submission
        </p>
      </div>
    );
  }

  // Category descriptions
  const categoryDescriptions: Record<string, string> = {
    "Infra Financing":
      "Data related to infrastructure financing and budget allocation",
    "Infra Development": "Infrastructure development and planning data",
    "PPP Development": "PPP policy, proposals and project pipeline status",
    "Infra Enablers": "Infrastructure enablers and support systems",
  };

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        {/* Category Tabs - matching state components style */}
        {categories.length > 0 && (
          <Tabs
            value={activeCategory}
            onValueChange={setActiveCategory}
            className="w-full"
          >
            <TabsList className="mb-6 bg-transparent border-0 rounded-none p-0 h-auto gap-2 flex flex-row overflow-x-auto pb-2 w-auto">
              {categories.map((categoryIndicator) => {
                const categoryName = Object.keys(categoryIndicator)[0];
                return (
                  <TabsTrigger
                    key={categoryName}
                    value={categoryName}
                    className="!w-auto bg-white text-gray-600 border border-gray-300 rounded-md px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 hover:border-gray-400 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:hover:bg-primary/90 whitespace-nowrap h-8 flex-shrink-0"
                  >
                    {categoryName}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Category Content */}
            {categories.map((categoryIndicator) => {
              const categoryName = Object.keys(categoryIndicator)[0];
              const categoryProgress = getCategoryProgress(categoryIndicator);

              return (
                <TabsContent key={categoryName} value={categoryName}>
                  <div>
                    {/* ProgressHeader for current category */}
                    <ProgressHeader
                      title={categoryName}
                      description={categoryDescriptions[categoryName] || ""}
                      points={250}
                      completed={categoryProgress.completed}
                      total={categoryProgress.total}
                      progress={categoryProgress.progress}
                    />

                    {/* DynamicFormBuilder for current category - REVIEW MODE with EDIT support */}
                    <div className="mt-4 sm:mt-6">
                      <DynamicFormBuilder
                        indicators={[categoryIndicator]}
                        formData={formData}
                        onChange={handleFormDataChange}
                        mode="review" // Keep in review mode, but allow section-specific editing
                        disabled={false} // Don't globally disable - let form builder handle per-section
                        submissionId={submissionId || undefined}
                        getFieldError={getFieldErrorMemoized} // Use validation hook for field errors
                        getDropdownOptions={getDropdownOptions}
                        // No submit handlers needed in review mode
                        isIndicatorSubmitted={() => true} // All indicators shown as submitted in review
                        submittingIndicator={null}
                        validationErrors={validationErrors} // Pass validation errors
                        onValidateField={validateFieldOnChange} // Enable validation in edit mode
                        onClearFieldError={clearFieldError} // Enable error clearing
                        renderSectionActionButtons={(
                          sectionId,
                          sectionName,
                          indicatorCode
                        ) => {
                          // Render role-based action buttons for each section
                          if (user?.role === "MINISTRY_APPROVER") {
                            const isSectionEditing =
                              editingSections.has(sectionId);
                            const isSaving = savingSections.has(sectionId);
                            const isAccepted = isSectionAccepted(sectionId);

                            console.log(
                              "[MinistrySubmissionReviewWrapper] Rendering action buttons for MINISTRY_APPROVER:",
                              {
                                sectionId,
                                sectionName,
                                indicatorCode,
                                userId: user?.id,
                                isSectionEditing,
                                isSaving,
                                isAccepted,
                                editingSectionsArray:
                                  Array.from(editingSections),
                                hasOnSave: isSectionEditing,
                                hasOnCancel: isSectionEditing,
                                hasOnEdit: !isSectionEditing,
                              }
                            );

                            return (
                              <MinistryApproverActionButtons
                                key={`${sectionId}-${
                                  isSectionEditing ? "editing" : "viewing"
                                }`} // Force re-render when edit state changes
                                sectionId={sectionId}
                                onEdit={
                                  !isSectionEditing && !isAccepted
                                    ? () => handleEditStart(sectionId)
                                    : undefined
                                }
                                onSave={
                                  isSectionEditing
                                    ? () => handleSave(sectionId)
                                    : undefined
                                }
                                onCancel={
                                  isSectionEditing
                                    ? () => handleEditCancel(sectionId)
                                    : undefined
                                }
                                onAccept={
                                  !isSectionEditing && !isAccepted
                                    ? () => handleAccept(sectionId)
                                    : undefined
                                }
                                onSendBack={
                                  !isSectionEditing &&
                                  !isAccepted &&
                                  submission?.user?.role !== "MINISTRY_APPROVER"
                                    ? () => {
                                        console.log(
                                          "[MinistrySubmissionReviewWrapper] Send Back clicked for section:",
                                          sectionId
                                        );
                                        // TODO: Implement send back action
                                        toast({
                                          title: "Send Back",
                                          description: `Send back section ${sectionId}`,
                                        });
                                      }
                                    : undefined
                                }
                                onTimeline={() => {
                                  console.log(
                                    "[MinistrySubmissionReviewWrapper] Timeline clicked for section:",
                                    sectionId
                                  );
                                  // TODO: Implement timeline action
                                  toast({
                                    title: "Timeline",
                                    description: `View timeline for section ${sectionId}`,
                                  });
                                }}
                                timelineCount={0}
                                isAccepted={isAccepted}
                                isSaving={isSaving}
                              />
                            );
                          }
                          if (user?.role === "MOSPI_REVIEWER") {
                            return (
                              <MospiReviewerActionButtons
                                sectionId={sectionId}
                                onAddComment={() => {
                                  // TODO: Implement add comment action
                                  toast({
                                    title: "Add Comment",
                                    description: `Add comment for section ${sectionId}`,
                                  });
                                }}
                                onTimeline={() => {
                                  // TODO: Implement timeline action
                                  toast({
                                    title: "Timeline",
                                    description: `View timeline for section ${sectionId}`,
                                  });
                                }}
                                timelineCount={0}
                              />
                            );
                          }
                          if (user?.role === "MOSPI_APPROVER") {
                            return (
                              <MospiApproverActionButtons
                                sectionId={sectionId}
                                onAccept={() => {
                                  // TODO: Implement accept action
                                  toast({
                                    title: "Accept",
                                    description: `Accept action for section ${sectionId}`,
                                  });
                                }}
                                onSendBack={() => {
                                  // TODO: Implement send back action
                                  toast({
                                    title: "Send Back",
                                    description: `Send back section ${sectionId}`,
                                  });
                                }}
                                onTimeline={() => {
                                  // TODO: Implement timeline action
                                  toast({
                                    title: "Timeline",
                                    description: `View timeline for section ${sectionId}`,
                                  });
                                }}
                                timelineCount={0}
                                isAccepted={false}
                              />
                            );
                          }
                          return null;
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {categories.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No category data available for review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
