import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Upload, Plus, Trash2, Clock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { FileUploadSection } from "@/features/submission/components/FileUploadSection";
import { hasInfraEnablersData, getSectionsWithData } from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";

interface InfraEnablersReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}

export const InfraEnablersReview = ({ submissionId, formData, submission, isPreview = false }: InfraEnablersReviewReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);

  
  // Real-time update listener
  useEffect(() => {
    const handleCommentUpdate = async (event: CustomEvent) => {
      const { submissionId: eventSubmissionId, comments } = event.detail;
      if (eventSubmissionId === submissionId) {
        // Force re-render by updating a dummy state
        // 1. Update submission with fresh comments data
        setSubmission(prev => ({
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
            setSubmission(freshSubmission);
            
            // Update form data with fresh data
            if (freshSubmission.formData) {
              setFormData(freshSubmission.formData);
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
  const hasData = hasInfraEnablersData({ infraEnablers: formData });
  const sectionsWithData = getSectionsWithData({ infraEnablers: formData }, 'infraEnablers');

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
          setSubmissionData(updatedSubmission);
          
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
      "4.1": "4.1 - All Eligible Infra Projects on NIP Portal",
      "4.2": "4.2 - Availability & Use of State/UT PMG",
      "4.3": "4.3 - Adoption of PM GatiShakti",
      "4.4": "4.4 - Adoption of ADR",
      "4.5": "4.5 - Innovative Practices",
      "4.6": "4.6 - Capacity Building - Officer Participation",
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
        <p className="text-muted-foreground">No Infra Enablers data available for review</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Section 4.1 */}
        {sectionsWithData.includes('section4_1') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.1 -</span> Eligible Infrastructure Projects{" "}
              </span>
              {renderActionButtons("4.1")}
            </div>
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
                onClick={() => handleOpenModal("4.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
          <div className="flex flex-col gap-4 w-[40%]">
            <div>
              <Label className="mb-3 block">All Eligible Infra Projects on NIP Portal?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formData?.section4_1?.allEligible === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formData?.section4_1?.allEligible === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div>
              <Label>Website Link</Label>
              <Input value={formData?.section4_1?.websiteLink || ""} readOnly />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section4_1?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section4_1.file.fileName || "Self-certification document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Annex 9: Self-certification required
            </p>

            <div>
              <Label className="mb-3 block">Availability and Use of EaseMPR?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formData?.section4_2?.available === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formData?.section4_2?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section4_2?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section4_2.file.fileName || "Evidence document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload Evidence/Certificate/File
            </p>
            </div>

        </SectionCard>
        )}

        {/* Section 4.2 */}
        {sectionsWithData.includes('section4_2') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.2 -</span> Adoption of PM GatiShakti <span className="font-normal text-xs text-muted-foreground ml-1">(5 marks per 1%)</span>{" "}
              </span>
              {renderActionButtons("4.2")}
            </div>
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
                onClick={() => handleOpenModal("4.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Adoption of PM GatiShakti?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formData?.section4_2?.adopted === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formData?.section4_2?.adopted === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section4_2?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section4_2.file.fileName || "PM GatiShakti document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload GatiShakti evidence
            </p>

            <div>
              <Label className="mb-3 block">Adoption of Alternate Dispute Resolution (ADR)?*</Label>
              <RadioGroup defaultValue="yes" className="flex gap-6 items-center">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="adr-yes" />
                  <Label className="mb-0" htmlFor="adr-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="adr-no" />
                  <Label className="mb-0" htmlFor="adr-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-4">
              {/* {!isPreview && (   <Button variant="" size="sm" className="gap-2"> */}
              <FileUploadSection className="w-4 h-4" />

              {/* </Button>
              <span className="text-sm text-muted-foreground">No file chosen</span> */}
            </div>

            <p className="text-xs text-muted-foreground">
              Upload ADR orders/notification
            </p>
            </div>

        </SectionCard>
        )}

        {/* Section 4.3 */}
        {sectionsWithData.includes('section4_3') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.3 -</span>Innovative Practices <span className="font-normal text-xs text-muted-foreground ml-1">(10 marks per practice)</span>{" "}
              </span>
              {renderActionButtons("4.3")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button> )}
            </div>
          </CardHeader> */}
          <div className="space-y-4">
            {formData?.section4_5 ? (
              <div className="">
                <div className="space-y-4 w-[70%]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Practice Name</Label>
                      <Input value={formData.section4_5.practiceName || ""} readOnly />
                    </div>
                    <div>
                      <Label>Impact</Label>
                      <Input value={formData.section4_5.impact || ""} readOnly />
                    </div>
                  </div>
                  <div>
                    <Label>Implemented</Label>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${formData.section4_5.implemented === "yes"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}>
                        {formData.section4_5.implemented === "yes" ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Uploaded File</Label>
                      {formData.section4_5.file ? (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">{formData.section4_5.file.fileName || "Practice document"}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No file uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No innovative practices data available
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Upload RMB orders/Awards
            </p>

            {!isPreview && (
              <Button variant="outline" size="sm" className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add More Practice
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              Annex 10
            </p>
            </div>

        </SectionCard>
        )}

        {/* Section 4.4 */}
        {sectionsWithData.includes('section4_4') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.4 -</span>Capacity Building - Officer Participation <span className="font-normal text-xs text-muted-foreground ml-1">(1 marks per officer)</span>{" "}
              </span>
              {renderActionButtons("4.4")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                4.4 - Capacity Building - Officer Participation (1 marks per officer)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>

            )}
            </div>
          </CardHeader> */}
          <CardContent className="pt-6">
            <div className="space-y-4">
              {formData?.section4_6?.map((item: any, index: number) => (
                <div key={item.id || index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Officer Name</Label>
                      <Input value={item.officerName || ""} readOnly />
                    </div>
                    <div>
                      <Label>Designation</Label>
                      <Input value={item.designation || ""} readOnly />
                    </div>
                    <div>
                      <Label>Program Name</Label>
                      <Input value={item.programName || ""} readOnly />
                    </div>
                    <div>
                      <Label>Organiser</Label>
                      <Input value={item.organiser || ""} readOnly />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>Training Type</Label>
                    <Input value={item.trainingType || ""} readOnly />
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No capacity building data available
                  </div>
                )}

              <p className="text-xs text-muted-foreground">
                Annex 11
              </p>

            </div>
          </CardContent>
        </SectionCard>
        )}

        {/* Section 4.5 */}
        {sectionsWithData.includes('section4_5') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.5 -</span> Innovative Practices{" "}
              </span>
              {renderActionButtons("4.5")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-4">
              No innovative practices data available
            </div>
            <p className="text-xs text-muted-foreground">
              Upload evidence of innovative practices
            </p>

          </CardContent>
        </SectionCard>
        )}

        {/* Section 4.6 */}
        {sectionsWithData.includes('section4_6') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.6 -</span> Capacity Building - Officer Participation{" "}
              </span>
              {renderActionButtons("4.6")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-4">
              No capacity building data available
            </div>
            <p className="text-xs text-muted-foreground">
              Upload capacity building participation data
            </p>

          </CardContent>
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
