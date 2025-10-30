import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Upload, Plus, Clock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { hasPPPDevelopmentData, getSectionsWithData } from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { computeStepProgress, STEP_SECTIONS } from "@/features/submission/utils/progress";

interface PPPDevelopmentReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}

export const PPPDevelopmentReview = ({ submissionId, formData, submission, isPreview = false }: PPPDevelopmentReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionStateData] = useState(formData);
  const [submissionState, setSubmissionStateState] = useState(submission);
  const [formDataState, setFormDataStateState] = useState(formData);

  
  // Real-time update listener
  useEffect(() => {
    const handleCommentUpdate = async (event: CustomEvent) => {
      const { submissionId: eventSubmissionId, comments } = event.detail;
      if (eventSubmissionId === submissionId) {
        // Force re-render by updating a dummy state
        // 1. Update submission with fresh comments data
        setSubmissionState(prev => ({
          ...prev,
          indicatorComment: comments,
          updatedAt: new Date().toISOString()
        }));
        
        // 2. Refresh complete submission data (same as first load)
        try {
          console.log("🔄 Refreshing complete submission data...");
          const freshSubmission = await apiService.getSubmission(submissionId);
          
          if (freshSubmission) {
            // Update submission state with fresh data
            setSubmissionState(freshSubmission);
            
            // Update form data with fresh data
            if (freshSubmission.formData) {
              setFormDataState(freshSubmission.formData);
            }
            
            console.log("✅ Fresh submission data loaded:", freshSubmission);
          }
        } catch (error) {
          console.error("❌ Failed to refresh submission data:", error);
        }
      }
    };

    window.addEventListener('niri-comment-updated', handleCommentUpdate as EventListener);
    
    return () => {
      window.removeEventListener('niri-comment-updated', handleCommentUpdate as EventListener);
    };
  }, [submissionId]);// Check if this section has any data
  const hasData = hasPPPDevelopmentData({ pppDevelopment: formData });
  const sectionsWithData = getSectionsWithData({ pppDevelopment: formData }, 'pppDevelopment');

  const handleOpenModal = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseModal = () => {
    setActiveSection(null);
  };

  const handleOpenTimeline = (sectionId: string) => {
    setTimelineSection(sectionId);
  };

  const handleCloseTimeline = () => {
    setTimelineSection(null);
  };

  const handleSaveMessage = async (message: string) => {
    if (activeSection) {
      try {
        const updatedSubmission = await saveMessage(activeSection, message);
        if (updatedSubmission) {
          // Update form data with fresh API response
          setSubmissionStateData(updatedSubmission);
          
          // Force timeline refresh if modal is open for same section
          if (timelineSection === activeSection) {
            setTimelineSection(null);
            setTimeout(() => {
              setTimelineSection(activeSection);
            }, 100);
          }
        }
      } catch (error) {
        console.error("Error saving message:", error);
      }
    }
  };

  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      "3.1": "3.1 - Availability of Infrastructure Act/Policy",
      "3.2": "3.2 - Functional PPP Cell/Unit",
      "3.3": "3.3 - Proposals Submitted under VGF/IIPDF",
      "3.4": "3.4 - Proportion of TPC of PPP Projects",
    };
    return titles[sectionId] || sectionId;
  };


  const renderActionButtons = (sectionId: string) => {
    // Don't show action buttons in preview mode
    if (isPreview) {
      return null;
    }
    
    const comments = getComments(sectionId);
    const commentCount = comments ? comments.length : 0;
    // Debug logging removed for performance

    return (
      <div className="flex gap-2">
        {!isPreview && (
          <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenModal(sectionId)}
        >
          <MessageSquare className="w-4 h-4" />
          Add Comment
        </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-4 h-4" />
          Timeline ({commentCount})
        </Button>
      </div>
    );
  };
  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No PPP Development data available for review</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData({ pppDevelopment: formData }, 'pppDevelopment');
          const assignedIndicators = STEP_SECTIONS.pppDevelopment
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { pppDevelopment: formData } as any,
            "pppDevelopment",
            { assignedIndicators }
          );
          return (
            <ProgressHeader
              title="PPP Development"
              description="PPP policy, proposals and project pipeline status"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}
        {/* Section 3.1 */}
        {sectionsWithData.includes('section3_1') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">3.1 -</span> Availability of Infrastructure Act/Policy{" "}
            </span>
            {!isPreview && (
              <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-between absolute right-0 -top-[6px]"
              onClick={() => handleOpenModal("3.1")}
            >
              <MessageSquare className="w-4 h-4" />
              Add Comment
            </Button>
            )}
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">PPP Act/Policy Available?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section3_1?.available === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formDataState?.section3_1?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formDataState?.section3_1?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section3_1.file.fileName || "Act/Policy document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload copy of Act/Policy
            </p>
            </div>

        </SectionCard>
        )}

        {/* Section 3.2 */}
        {sectionsWithData.includes('section3_2') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">3.2 -</span> Availability of Functional PPP Cell/Unit{" "}
            </span>
            {!isPreview && (
              <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-between absolute right-0 -top-[6px]"
              onClick={() => handleOpenModal("3.2")}
            >
              <MessageSquare className="w-4 h-4" />
              Add Comment
            </Button>
            )}
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.2 - Functional PPP Cell/Unit
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">Functional State/UT PPP Cell/Unit*</Label>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section3_2?.available === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {formDataState?.section3_2?.available === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Uploaded File</Label>
                  {formDataState?.section3_2?.file ? (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">{formData.section3_2.file.fileName || "PPP Cell document"}</span>
                      <span className="text-sm text-green-600">✓</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No file uploaded</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Upload notification or mandate
              </p>
            </div>

        </SectionCard>
        )}

        {/* Section 3.3 */}
        {sectionsWithData.includes('section3_3') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">3.3 -</span> Proposals Submitted under VGF/IIPDF{" "}
            </span>
            {!isPreview && (
              <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-between absolute right-0 -top-[6px]"
              onClick={() => handleOpenModal("3.3")}
            >
              <MessageSquare className="w-4 h-4" />
              Add Comment
            </Button>
            )}
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.3 - Proposals Submitted under VGF/IIPDF
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0 ">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Project Name</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Sector</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Type</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Submission Date</th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Uploaded File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formDataState?.section3_3?.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">{item.projectName || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.type || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.submissionDate || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">
                          {item.file ? (
                            <div className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">{item.file.fileName || "File"}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No file</span>
                          )}
                        </td>
                      </tr>
                    )) || (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No VGF/IIPDF proposals data available
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>

              {!isPreview && (
                <Button variant="outline" size="sm" className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
              )}

              {/* <p className="text-xs text-muted-foreground">
                Annex 7: Provide VGF/IIPDF details
              </p> */}
            </div>

        </SectionCard>
        )}

        {/* Section 3.4 */}
        {sectionsWithData.includes('section3_4') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">3.4 -</span> Proportion of TPC of PPP Projects{" "}
            </span>
            {!isPreview && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-between absolute right-0 -top-[6px]"
                onClick={() => handleOpenModal("3.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            )}
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.4 - Proportion of TPC of PPP Projects
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {formDataState?.section3_4?.projects && formDataState.section3_4.projects.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {formDataState.section3_4.projects.map((project: any, idx: number) => (
                    <div key={project.id || idx} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Project {idx + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Name of PPP/Bankable Projects</Label>
                          <Input value={project.nameOfProject || ""} readOnly />
                        </div>
                        <div>
                          <Label>NIP ID</Label>
                          <Input value={project.nipId || ""} readOnly />
                        </div>
                        <div>
                          <Label>Funding Source</Label>
                          <Input value={project.fundingSource || ""} readOnly />
                        </div>
                        <div>
                          <Label>Infrastructure Sector</Label>
                          <Input value={project.infrastructureSector || ""} readOnly />
                        </div>
                        <div>
                          <Label>Date of Award</Label>
                          <Input value={project.dateOfAward ? new Date(project.dateOfAward).toLocaleDateString() : ""} readOnly />
                        </div>
                        <div>
                          <Label>% of Capex funded by non-Govt sources</Label>
                          <Input value={project.capexPercentage || ""} readOnly />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No PPP Projects data available
                </div>
              )}
            </div>
        </SectionCard>
        )}
      </div>

      <MessageModal
        isOpen={activeSection !== null}
        onClose={handleCloseModal}
        onSave={handleSaveMessage}
        sectionTitle={activeSection ? getSectionTitle(activeSection) : ""}
        sectionId={activeSection || ""}
        submissionId={submissionId}
        existingMessage=""
      />

      <TimelineModal
        isOpen={timelineSection !== null}
        onClose={handleCloseTimeline}
        sectionId={timelineSection || ""}
        sectionTitle={timelineSection ? getSectionTitle(timelineSection) : ""}
        comments={getAllComments()}
        key={`timeline-${timelineSection}-${getAllComments().length}-${Date.now()}`} // Force re-render when comments change
      />
    </>
  );
};
