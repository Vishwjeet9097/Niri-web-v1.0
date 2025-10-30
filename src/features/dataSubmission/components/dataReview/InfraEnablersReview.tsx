import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Upload, Plus, Trash2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { FileUploadSection } from "@/features/submission/components/FileUploadSection";
import { hasInfraEnablersData, getSectionsWithData } from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";

interface InfraEnablersReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}

export const InfraEnablersReview = ({ submissionId, formData, submission, isPreview = false }: InfraEnablersReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(formData);

  
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
  const hasData = hasInfraEnablersData({ infraEnablers: formDataState });
  const sectionsWithData = getSectionsWithData({ infraEnablers: formDataState }, 'infraEnablers');

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
                <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section4_1?.allEligible === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formDataState?.section4_1?.allEligible === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div>
              <Label>Website Link</Label>
              <Input value={formDataState?.section4_1?.websiteLink || ""} readOnly />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formDataState?.section4_1?.file ? (
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
                <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section4_2?.available === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formDataState?.section4_2?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formDataState?.section4_2?.file ? (
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
                <span className="text-primary">4.2 -</span> Availability & Use of State/UT PMG <span className="font-normal text-xs text-muted-foreground ml-1">(5 marks per 1%)</span>{" "}
              </span>
              {renderActionButtons("4.2")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Availability and Use of EaseMPR?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section4_2?.available === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formDataState?.section4_2?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formDataState?.section4_2?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formDataState.section4_2.file.fileName || "Evidence document"}</span>
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

        {/* Section 4.3 */}
        {sectionsWithData.includes('section4_3') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.3 -</span> Adoption of PM GatiShakti <span className="font-normal text-xs text-muted-foreground ml-1">(10 marks per 1%)</span>{" "}
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
              <Label className="mb-3 block">A₁ - Number of Projects*</Label>
              <Input 
                value={formDataState?.section4_3?.numberOfProjects || ""} 
                readOnly 
                className="w-[200px]"
              />
            </div>

            <div>
              <Label className="mb-3 block">Adoption of PM GatiShakti?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section4_3?.adopted === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formDataState?.section4_3?.adopted === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formDataState?.section4_3?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formDataState.section4_3.file.fileName || "PM GatiShakti document"}</span>
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
            </div>

        </SectionCard>
        )}

        {/* Section 4.4 */}
        {sectionsWithData.includes('section4_4') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.4 -</span> Adoption of ADR <span className="font-normal text-xs text-muted-foreground ml-1">(5 marks per 1%)</span>{" "}
              </span>
              {renderActionButtons("4.4")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Adoption of Alternate Dispute Resolution (ADR)?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${formDataState?.section4_4?.adopted === "yes"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
                  }`}>
                  {formDataState?.section4_4?.adopted === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formDataState?.section4_4?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formDataState.section4_4.file.fileName || "ADR document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload ADR orders/notification
            </p>
            </div>

        </SectionCard>
        )}

        {/* Section 4.5 */}
        {sectionsWithData.includes('section4_5') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.5 -</span>Innovative Practices <span className="font-normal text-xs text-muted-foreground ml-1">(10 marks per practice)</span>{" "}
              </span>
              {renderActionButtons("4.5")}
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
            {formDataState?.section4_5 ? (
              <div className="">
                <div className="space-y-4 w-[70%]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Practice Name</Label>
                      <Input value={formDataState.section4_5.practiceName || ""} readOnly />
                    </div>
                    <div>
                      <Label>Impact</Label>
                      <Input value={formDataState.section4_5.impact || ""} readOnly />
                    </div>
                  </div>
                  <div>
                    <Label>Implemented</Label>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${formDataState.section4_5.implemented === "yes"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                        }`}>
                        {formDataState.section4_5.implemented === "yes" ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Uploaded File</Label>
                      {formDataState.section4_5.file ? (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">{formDataState.section4_5.file.fileName || "Practice document"}</span>
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
          <CardContent className="pt-6 space-y-3">
            {Array.isArray(formDataState?.section4_6) && formDataState.section4_6.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Officer Name</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Program Name</TableHead>
                      <TableHead>Training Type</TableHead>
                      <TableHead>Organiser</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formDataState.section4_6.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.officerName || "-"}</TableCell>
                        <TableCell>{item.designation || "-"}</TableCell>
                        <TableCell>{item.programName || "-"}</TableCell>
                        <TableCell>{item.trainingType || "-"}</TableCell>
                        <TableCell>{item.organiser || "-"}</TableCell>
                        <TableCell className="text-right">{item.marksObtained ?? "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No capacity building data available
              </div>
            )}

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
