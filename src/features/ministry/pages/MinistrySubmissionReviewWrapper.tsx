import { useEffect, useState, useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { DynamicFormBuilder } from "../components/FormBuilder";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { getDropdownOptions } from "../constants/dropdownMappings";
import { getMinistrySubmissionDetailsForReview, getMinistrySubmissionDetailsConsolidated } from "@/services/ministry.service";
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
import { MinistryCommentDialog } from "../components/modals/MinistryCommentDialog";

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
  const [assignedIndicators, setAssignedIndicators] = useState<AssignedIndicator[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submissionId, setSubmissionId] = useState<string | null>(submission?.id || null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [selectedSectionForComment, setSelectedSectionForComment] = useState<{
    submissionIndicatorId: string;
    sectionTitle: string;
  } | null>(null);

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
      const targetSubmissionId = submission?.id || submission?.submissionId || propSubmissionId;
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

        console.log("📋 Loading consolidated submission data for review, submissionId:", targetSubmissionId);
        response = await getMinistrySubmissionDetailsConsolidated(targetSubmissionId);
      } else {
        // Use existing API with userId
        // Prioritize submissionId from submission object
        
        //Need to use this now.
        //const targetUserId = submission?.id;
        
        if (!targetSubmissionId && !targetUserId) {
          console.error("No submission ID or user ID available for review");
          toast({
            title: "Error",
            description: "Submission ID or User ID is required to load submission data.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        console.log("📋 Loading submission data for review, submissionId:", targetSubmissionId, "userId:", targetUserId);
        response = await getMinistrySubmissionDetailsForReview(targetSubmissionId, targetUserId);
      }

      if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log("✅ Loaded submission indicators for review:", response.data.length);
        console.log("📋 Assigned indicators structure:", JSON.stringify(response.data, null, 2));
        setAssignedIndicators(response.data);
        
        const initialFormData = transformApiResponseToFormData(response.data, {});
        console.log("📋 Transformed formData:", Object.keys(initialFormData));
        // Log subsection entries for debugging
        Object.keys(initialFormData).forEach(sectionKey => {
          const sectionData = initialFormData[sectionKey];
          if (sectionData && typeof sectionData === 'object') {
            Object.keys(sectionData).forEach(key => {
              if (Array.isArray(sectionData[key])) {
                console.log(`📋 Section ${sectionKey}.${key}: ${sectionData[key].length} entries`, sectionData[key]);
              }
            });
          }
        });
        setFormData(initialFormData);
        
        // Extract submission ID - prioritize from response, then from submission object
        if (useConsolidatedApi) {
          // For consolidated API, use the submissionId from response or prop
          const extractedId = response.submissionId || propSubmissionId || submission?.id;
          if (extractedId) {
            setSubmissionId(extractedId);
          }
        } else {
          let extractedId = response.submissionId || targetSubmissionId;
          if (!extractedId && targetUserId) {
            extractedId = await extractSubmissionId(response, targetUserId, toast);
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
        description: error?.message || "Failed to load submission data for review.",
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
    
    console.log("📋 Extracted categories (ordered):", orderedCategories.map(cat => Object.keys(cat)[0]));
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
      const sectionKey = `section${section.sNo.replace('.', '_')}`;
      
      if (formData[sectionKey] && Object.keys(formData[sectionKey]).length > 0) {
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
        <p className="text-muted-foreground">No indicators found for this submission</p>
      </div>
    );
  }

  // Category descriptions
  const categoryDescriptions: Record<string, string> = {
    "Infra Financing": "Data related to infrastructure financing and budget allocation",
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

                  {/* DynamicFormBuilder for current category - REVIEW MODE */}
                  <div className="mt-4 sm:mt-6">
                    <DynamicFormBuilder
                      indicators={[categoryIndicator]}
                      formData={formData}
                      onChange={() => {}} // No-op in review mode
                      mode="review" // KEY: Set to review mode
                      disabled={true} // Disable all interactions
                      submissionId={submissionId || undefined}
                      getFieldError={() => undefined} // No validation errors in review
                      getDropdownOptions={getDropdownOptions}
                      // No submit handlers needed in review mode
                      isIndicatorSubmitted={() => true} // All indicators shown as submitted in review
                      submittingIndicator={null}
                      validationErrors={{}}
                      onValidateField={() => {}} // No validation in review
                      onClearFieldError={() => {}} // No error clearing in review
                      renderSectionActionButtons={(sectionId, sectionName, indicatorCode) => {
                        // Find the section object to get submissionIndicatorId
                        let sectionSubmissionIndicatorId: string | null = null;
                        
                        // Search through assignedIndicators to find the section
                        for (const indicatorObj of assignedIndicators) {
                          const categoryName = Object.keys(indicatorObj)[0];
                          const sections = indicatorObj[categoryName];
                          if (Array.isArray(sections)) {
                            for (const sectionObject of sections) {
                              const sectionKey = Object.keys(sectionObject)[0];
                              const section = sectionObject[sectionKey] as any; // Type assertion to access submissionIndicatorId
                              if (section.sNo === indicatorCode) {
                                sectionSubmissionIndicatorId = section.submissionIndicatorId || null;
                                break;
                              }
                            }
                            if (sectionSubmissionIndicatorId) break;
                          }
                        }
                        
                        // Render role-based action buttons for each section
                        if (user?.role === "MINISTRY_APPROVER") {
                          return (
                            <MinistryApproverActionButtons
                              sectionId={sectionId}
                              onAccept={() => {
                                // TODO: Implement accept action
                                toast({
                                  title: "Accept",
                                  description: `Accept action for section ${sectionId}`,
                                });
                              }}
                              onSendToMospi={() => {
                                // TODO: Implement send to MoSPI action
                                toast({
                                  title: "Send to MoSPI",
                                  description: `Send section ${sectionId} to MoSPI`,
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
                        if (user?.role === "MOSPI_REVIEWER") {
                          return (
                            <MospiReviewerActionButtons
                              sectionId={sectionId}
                              onAddComment={() => {
                                if (sectionSubmissionIndicatorId) {
                                  setSelectedSectionForComment({
                                    submissionIndicatorId: sectionSubmissionIndicatorId,
                                    sectionTitle: sectionName || sectionId,
                                  });
                                  setCommentDialogOpen(true);
                                } else {
                                  toast({
                                    title: "Error",
                                    description: "Submission indicator ID not found for this section",
                                    variant: "destructive",
                                  });
                                }
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

      {/* Comment Dialog */}
      <MinistryCommentDialog
        isOpen={commentDialogOpen}
        onClose={() => {
          setCommentDialogOpen(false);
          setSelectedSectionForComment(null);
        }}
        onSuccess={() => {
          // Optionally refresh data or show success message
          console.log("Comment added successfully");
        }}
        sectionTitle={selectedSectionForComment?.sectionTitle}
        submissionIndicatorId={selectedSectionForComment?.submissionIndicatorId || ""}
      />
    </div>
  );
}

