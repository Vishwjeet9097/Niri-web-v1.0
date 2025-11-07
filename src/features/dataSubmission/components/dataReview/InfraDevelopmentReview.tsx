import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Upload, Plus, Clock, RotateCcw, CheckCircle, X, Check, Edit3 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { hasInfraDevelopmentData, getSectionsWithData } from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { computeStepProgress, STEP_SECTIONS } from "@/features/submission/utils/progress";
import { useEditableSectionStore } from '@/utils/EditableSection';
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";

interface InfraDevelopmentReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}

export const InfraDevelopmentReview = ({ submissionId, formData, submission, isPreview = false }: InfraDevelopmentReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(formData);
 
  //State for edit button 
  const { setEditable, isEditable, clearAllEditing } = useEditableSectionStore();
  
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
            
            // Update form data with fresh data (only this section's slice)
            if (freshSubmission.formData) {
              setFormDataState(freshSubmission.formData.infraDevelopment);
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
  const hasData = hasInfraDevelopmentData({ infraDevelopment: formDataState });
  const sectionsWithData = getSectionsWithData({ infraDevelopment: formDataState }, 'infraDevelopment');

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
        const updatedSubmission: unknown = await saveMessage(activeSection, message);
        if (updatedSubmission) {
          // Update submission and form data so UI remains intact
          setSubmissionState(updatedSubmission);
          if ((updatedSubmission as any).formData) {
            setFormDataState((updatedSubmission as any).formData.infraDevelopment);
          }

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
      "2.1": "2.1 - Availability of Infrastructure Act/Policy",
      "2.2": "2.2 - Availability of Specialised Entity",
      "2.3": "2.3 - Availability of Sector Infra Development Plan",
      "2.4": "2.4 - Availability of Investment Ready Project Pipeline",
      "2.5": "2.5 - Availability of Asset Monetization Pipeline",
    };
    return titles[sectionId] || sectionId;
  };

// Changes by Harsh

// ...existing code...

  const onSaveSection = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key (e.g. "2.1" -> "section2_1")
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Use the local formData state (formDataState) to build fields for this section
      let fields: Record<string, any>[] = [];

      switch (sectionId) {
        case '2.1':
          // section2_1 items: { sector, files[] }
          fields = (formDataState?.section2_1 || []).map((item: any) => ({
            sector: item?.sector ?? null,
            files: item?.files ?? []
          }));
          break;

        case '2.2':
          // section2_2 items: { sector, files[] }
          fields = (formDataState?.section2_2 || []).map((item: any) => ({
            sector: item?.sector ?? null,
            files: item?.files ?? []
          }));
          break;

        case '2.3':
          // section2_3 items: { sector, files[] }
          fields = (formDataState?.section2_3 || []).map((item: any) => ({
            sector: item?.sector ?? null,
            files: item?.files ?? []
          }));
          break;

        case '2.4':
          // section2_4 items: { projectName, dprFile? }
          fields = (formDataState?.section2_4 || []).map((item: any) => ({
            projectName: item?.projectName ?? null,
            dprFile: item?.dprFile ?? null
          }));
          break;

        case '2.5':
          // section2_5 table rows: { projectName, sector, type, ownership, estimatedMonetization }
          fields = (formDataState?.section2_5 || []).map((item: any) => ({
            projectName: item?.projectName ?? null,
            sector: item?.sector ?? null,
            type: item?.type ?? null,
            ownership: item?.ownership ?? null,
            estimatedMonetization: item?.estimatedMonetization ?? null
          }));
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      await handleSaveSection({
        submissionId,
        category: 'infraDevelopment', // updated category for this file
        section: payloadSection,
        fields
      });

      // Disable editing after successful save
      setEditable(sectionId, false);
    } catch (error) {
      console.error('Error saving section:', error);
    }
  };

  const onIndicatorStatus = async (sectionId: string, status: boolean) => {
    const payload = {
      submissionId,
      category: 'infraDevelopment', // updated category for this file
      section: `section${sectionId.replace('.', '_')}`,
      status: status, // API expects `accepted` boolean
    };
    try {
      await apiService.indicatorStatus(payload);
      console.log("✅ Indicator status updated successfully");
    } catch (error) {
      console.error("❌ Failed to update indicator status:", error);
    }
  };

  // Helper functions to handle file updates
  const handleFilesUpdate = (sectionId: string, itemIndex: number, updatedFiles: FileUpload | FileUpload[] | null) => {
    setFormDataState((prev: any) => {
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      const sectionData = [...(prev?.[sectionKey] || [])];
      
      if (sectionData[itemIndex]) {
        if (sectionId === '2.4') {
          // Section 2.4 has single file (dprFile)
          sectionData[itemIndex] = {
            ...sectionData[itemIndex],
            dprFile: updatedFiles ? (Array.isArray(updatedFiles) ? updatedFiles[0] : updatedFiles) : null
          };
        } else {
          // Sections 2.1, 2.2, 2.3 have files array
          sectionData[itemIndex] = {
            ...sectionData[itemIndex],
            files: Array.isArray(updatedFiles) ? updatedFiles : (updatedFiles ? [updatedFiles] : [])
          };
        }
      }
      
      return {
        ...prev,
        [sectionKey]: sectionData
      };
    });
  };


  const renderActionButtons = (sectionId: string) => {
  // Don't show action buttons in preview mode
  if (isPreview) {
    return null;
  }

  const comments = getComments(sectionId);
  const commentCount = comments ? comments.length : 0;
  // Debug logging removed for performance

  // Old Code
  // return (
  //   <div className="flex gap-2">
  //     <Button
  //       variant="outline"
  //       size="sm"
  //       className="flex items-center gap-1"
  //       onClick={() => handleOpenModal(sectionId)}
  //     >
  //       <MessageSquare className="w-4 h-4" />
  //       Add Comment
  //     </Button>
  //     <Button
  //       variant="outline"
  //       size="sm"
  //       className="flex items-center gap-1"
  //       onClick={() => handleOpenTimeline(sectionId)}
  //     >
  //       <Clock className="w-4 h-4" />
  //       Timeline ({commentCount})
  //     </Button>
  //   </div>
  // );


  return (
    <div className="flex gap-2">
      {!isEditable(sectionId) ? (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setEditable(sectionId, true)}
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => onSaveSection(sectionId)}
          >
            <Check className="w-4 h-4" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setEditable(sectionId, false)}
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </>
      )}


      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={() => handleOpenTimeline(sectionId)}
      >
        <RotateCcw className="w-4 h-4" />
        Send Back ({commentCount})
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => onIndicatorStatus(sectionId, true)}
      >
        <CheckCircle className="w-4 h-4" />
        Accept
      </Button>
      

    </div>
  );
};

  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No Infra Development data available for review</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData({ infraDevelopment: formDataState }, 'infraDevelopment');
          const assignedIndicators = STEP_SECTIONS.infraDevelopment
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { infraDevelopment: formDataState } as any,
            "infraDevelopment",
            { assignedIndicators }
          );
          return (
            <ProgressHeader
              title="Infrastructure Development"
              description="Physical infrastructure development and completion metrics."
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}
        {/* Section 2.1 */}
        {sectionsWithData.includes('section2_1') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.1 -</span> Availability of Infrastructure Act/Policy{" "}
              </span>
              {renderActionButtons("2.1")}
            </div>
          </div>}
          subtitle="Annex 4: Provide link and funding details"
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

              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {formDataState?.section2_1?.map((item: any, index: number) => (
                <div key={item.id || index} className="border rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Input value={item.sector || ""} 
                      readOnly={!isEditable('2.1')}
                      className={isEditable('2.1') ? 'bg-white' : 'bg-gray-50'}
                      />
                    </div>

                    <div>
                      <EditableFileDisplay
                        files={item.files || []}
                        isEditable={isEditable('2.1')}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) => handleFilesUpdate('2.1', index, updatedFiles)}
                        label="Uploaded Files"
                        multiple={true}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No infrastructure act/policy data available
                  </div>
                )}

              <p className="text-xs text-muted-foreground">
                Upload copy of Act/Policy
              </p>

              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0 ">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Sector</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Uploaded File</th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">File Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formDataState?.section2_1?.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm font-normal">
                          {item.files && item.files.length > 0 ? (
                            item.files.map((file: any, fileIndex: number) => (
                              <div key={fileIndex} className="flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span className="text-sm">{file.fileName || 'Unknown file'}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground">No files uploaded</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || 'N/A'}</td>
                      </tr>
                    )) || (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-muted-foreground">
                            No data available
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>

              {/* <p className="text-xs text-muted-foreground">
                Annex 7: Provide VGF/IIPDF details
              </p> */}
            </div>

        </SectionCard>
        )}

        {/* Section 2.2 */}
        {sectionsWithData.includes('section2_2') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.2 -</span> Availability of Specialised Entity{" "}
              </span>
              {renderActionButtons("2.2")}
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
                
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {formDataState?.section2_2?.map((item: any, index: number) => (
                <div key={item.id || index} className="border rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Input 
                        value={item.sector || ""} 
                        readOnly={!isEditable('2.2')}
                        className={isEditable('2.2') ? 'bg-white' : 'bg-gray-50'}
                      />
                    </div>

                    <div>
                      <EditableFileDisplay
                        files={item.files || []}
                        isEditable={isEditable('2.2')}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) => handleFilesUpdate('2.2', index, updatedFiles)}
                        label="Uploaded Files"
                        multiple={true}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No specialised entity data available
                  </div>
                )}
              <p className="text-sm text-muted-foreground">Upload OPM/SPC</p>
            </div>

        </SectionCard>
        )}

        {/* Section 2.3 */}
        {sectionsWithData.includes('section2_3') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.3 -</span> Availability of Sector Infra Development Plan{" "}
              </span>
              {renderActionButtons("2.3")}
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
                onClick={() => handleOpenModal("2.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {formDataState?.section2_3?.map((item: any, index: number) => (
                <div key={item.id || index} className="border rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Input 
                        value={item.sector || ""} 
                        readOnly={!isEditable('2.3')}
                        className={isEditable('2.3') ? 'bg-white' : 'bg-gray-50'}
                      />
                    </div>

                    <div>
                      <EditableFileDisplay
                        files={item.files || []}
                        isEditable={isEditable('2.3')}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) => handleFilesUpdate('2.3', index, updatedFiles)}
                        label="Uploaded Files"
                        multiple={true}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No sector infra development plan data available
                  </div>
                )}
              <p className="text-sm text-muted-foreground">Upload plan</p>
            </div>

        </SectionCard>
        )}

        {/* Section 2.4 */}
        {sectionsWithData.includes('section2_4') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.4 -</span> Availability of Investment Ready Project Pipeline{" "}
              </span>
              {renderActionButtons("2.4")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.4 - Availability of Investment Ready Project Pipeline
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {formDataState?.section2_4?.map((item: any, index: number) => (
                <div key={item.id || index} className="border rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <Label>Project Name</Label>
                      <Input 
                        value={item.projectName || ""} 
                        readOnly={!isEditable('2.4')}
                        className={isEditable('2.4') ? 'bg-white' : 'bg-gray-50'}
                      />
                    </div>

                    <div>
                      <EditableFileDisplay
                        files={item.dprFile || null}
                        isEditable={isEditable('2.4')}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) => handleFilesUpdate('2.4', index, updatedFiles)}
                        label="Upload DPR/Feasibility Report"
                        multiple={false}
                      />
                    </div>
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No investment ready project pipeline data available
                  </div>
                )}
              <p className="text-sm text-muted-foreground">
                Annex 8: Upload DPR/Feasibility Report
              </p>
            </div>

        </SectionCard>
        )}

        {/* Section 2.5 */}
        {sectionsWithData.includes('section2_5') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.5 -</span> Availability of Asset Monetization Pipeline{" "}
              </span>
              {renderActionButtons("2.5")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 Availability of Asset Monetization Pipeline
              </CardTitle>
              {!isPreview && (
                <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.5")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Project/Asset Name</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Select Sector</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Select Type</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Asset Ownership</th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Estimated Monetization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formDataState?.section2_5?.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">{item.projectName || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.type || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.ownership || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.estimatedMonetization ? `₹ ${item.estimatedMonetization} Crores` : ""}</td>
                      </tr>
                    )) || (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No asset monetization pipeline data available
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
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
