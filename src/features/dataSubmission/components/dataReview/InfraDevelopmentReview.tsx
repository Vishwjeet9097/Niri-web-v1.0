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

const toFileArray = (value: FileUpload | FileUpload[] | null | undefined): FileUpload[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toSingleFile = (value: FileUpload | FileUpload[] | null | undefined): FileUpload | null => {
  if (Array.isArray(value)) {
    return value.length > 0 ? (value[0] as FileUpload) : null;
  }
  return value ?? null;
};

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

  const normalizeInfraDevelopment = (data: any) => {
    if (!data || typeof data !== "object") return data;
    const normalized: any = { ...data };

    const ensureArraySection = (
      sectionKey: string,
      arrayKey: string,
      transformItem?: (item: any) => any
    ) => {
      const section = normalized[sectionKey];
      const status =
        (section && section.status) ||
        (Array.isArray(section) ? (section as any).status : undefined);

      let items: any[] = [];
      if (Array.isArray(section?.[arrayKey])) {
        items = section[arrayKey];
      } else if (Array.isArray(section)) {
        items = section;
      } else if (section && Array.isArray(section[arrayKey])) {
        items = section[arrayKey];
      }

      const normalizedItems = Array.isArray(items)
        ? items.map((item) => (transformItem ? transformItem(item) : item))
        : [];

      normalized[sectionKey] = {
        ...(section && !Array.isArray(section) ? section : {}),
        [arrayKey]: normalizedItems,
        ...(status !== undefined ? { status } : {}),
      };
    };

    const mapFilesArray = (item: any) => ({
      ...item,
      files: Array.isArray(item?.files) ? item.files : toFileArray(item?.files),
    });

    ensureArraySection("section2_1", "infraActArray", mapFilesArray);
    ensureArraySection("section2_2", "specializedEntityArray", mapFilesArray);
    ensureArraySection("section2_3", "infraDevelopmentArray", mapFilesArray);
    ensureArraySection("section2_4", "investmentReadyArray", (item) => ({
      ...item,
      dprFile: toSingleFile(item?.dprFile),
    }));
    ensureArraySection("section2_5", "assetMonetizationArray");

    return normalized;
  };

  // Type assertion for formDataState to avoid TypeScript errors
  const state = (formDataState as any) || {};

  // Sync formDataState when formData prop changes
  useEffect(() => {
    if (formData) {
      setFormDataState(normalizeInfraDevelopment((formData as any)?.infraDevelopment || formData));
    }
  }, [formData]);
  
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
              setFormDataState(
                normalizeInfraDevelopment(freshSubmission.formData.infraDevelopment)
              );
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
  }, [submissionId]);
  
  // Check if this section has any data
  const hasData = hasInfraDevelopmentData({ infraDevelopment: state });
  const sectionsWithData = getSectionsWithData({ infraDevelopment: state }, 'infraDevelopment');

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

  const buildSectionFields = (
    sectionId: string,
    sourceState: any = state
  ): Record<string, any>[] => {
    switch (sectionId) {
      case '2.1': {
        const infraActArray = Array.isArray(sourceState?.section2_1?.infraActArray)
          ? sourceState.section2_1.infraActArray
          : [];
        return [
          {
            infraActArray: infraActArray.map((item: any) => ({
              id: item?.id ?? null,
              sector: item?.sector ?? null,
              files: toFileArray(item?.files),
            })),
          },
        ];
      }

      case '2.2': {
        const specializedEntityArray = Array.isArray(sourceState?.section2_2?.specializedEntityArray)
          ? sourceState.section2_2.specializedEntityArray
          : [];
        return [
          {
            specializedEntityArray: specializedEntityArray.map((item: any) => ({
              id: item?.id ?? null,
              sector: item?.sector ?? null,
              files: toFileArray(item?.files),
            })),
          },
        ];
      }

      case '2.3': {
        const infraDevelopmentArray = Array.isArray(sourceState?.section2_3?.infraDevelopmentArray)
          ? sourceState.section2_3.infraDevelopmentArray
          : [];
        return [
          {
            infraDevelopmentArray: infraDevelopmentArray.map((item: any) => ({
              id: item?.id ?? null,
              sector: item?.sector ?? null,
              files: toFileArray(item?.files),
            })),
          },
        ];
      }

      case '2.4': {
        const investmentReadyArray = Array.isArray(sourceState?.section2_4?.investmentReadyArray)
          ? sourceState.section2_4.investmentReadyArray
          : [];
        return [
          {
            investmentReadyArray: investmentReadyArray.map((item: any) => ({
              id: item?.id ?? null,
              projectName: item?.projectName ?? null,
              dprFile: toSingleFile(item?.dprFile),
            })),
          },
        ];
      }

      case '2.5': {
        const assetMonetizationArray = Array.isArray(sourceState?.section2_5?.assetMonetizationArray)
          ? sourceState.section2_5.assetMonetizationArray
          : [];
        return [
          {
            assetMonetizationArray: assetMonetizationArray.map((item: any) => ({
              id: item?.id ?? null,
              projectName: item?.projectName ?? null,
              sector: item?.sector ?? null,
              type: item?.type ?? null,
              ownership: item?.ownership ?? null,
              estimatedMonetization: item?.estimatedMonetization ?? null,
            })),
          },
        ];
      }

      default:
        return [];
    }
  };

// Changes by Harsh

// ...existing code...

  const onSaveSection = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key (e.g. "2.1" -> "section2_1")
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Use the local formData state (formDataState) to build fields for this section
      const fields = buildSectionFields(sectionId);

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
      // Update local formData to trigger re-render of action buttons
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      // Defensive: update formDataState if section exists
      if (formDataState && (formDataState as any)[sectionKey] !== undefined) {
        setFormDataState((prev: any) => {
          const sectionData = prev?.[sectionKey];
          // Handle both array and object sections
          if (Array.isArray(sectionData)) {
            // For array sections, add status property to the array (JavaScript allows this)
            const updatedArray = [...sectionData];
            (updatedArray as any).status = status ? 'ACCEPTED' : 'REVERTED';
            return {
              ...prev,
              [sectionKey]: updatedArray,
            };
          } else if (sectionData && typeof sectionData === 'object') {
            // For object sections, add/update status property
            return {
              ...prev,
              [sectionKey]: {
                ...sectionData,
                status: status ? 'ACCEPTED' : 'REVERTED',
              },
            };
          }
          return prev;
        });
      }
      console.log("✅ Indicator status updated successfully");
    } catch (error) {
      console.error("❌ Failed to update indicator status:", error);
    }
  };

  // Helper functions to handle file updates
  const handleFilesUpdate = async (
    sectionId: string,
    itemIndex: number,
    updatedFiles: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace('.', '_')}`;
    const currentSection = state?.[sectionKey];
    const currentStatus = currentSection ? (currentSection as any).status : undefined;

    let nextSection: any = null;

    const buildArrayUpdate = (arrayKey: string) => {
      const existingArray = Array.isArray(currentSection?.[arrayKey])
        ? currentSection[arrayKey]
        : [];

      if (!existingArray[itemIndex]) {
        return null;
      }

      const updatedArray = [...existingArray];
      updatedArray[itemIndex] = {
        ...updatedArray[itemIndex],
        files: toFileArray(updatedFiles),
      };

      return {
        ...(currentSection && !Array.isArray(currentSection) ? currentSection : {}),
        [arrayKey]: updatedArray,
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
    };

    switch (sectionId) {
      case '2.1':
        nextSection = buildArrayUpdate('infraActArray');
        break;
      case '2.2':
        nextSection = buildArrayUpdate('specializedEntityArray');
        break;
      case '2.3':
        nextSection = buildArrayUpdate('infraDevelopmentArray');
        break;
      case '2.4': {
        const existingArray = Array.isArray(currentSection?.investmentReadyArray)
          ? currentSection.investmentReadyArray
          : [];

        if (!existingArray[itemIndex]) {
          return;
        }

        const updatedArray = [...existingArray];
        updatedArray[itemIndex] = {
          ...updatedArray[itemIndex],
          dprFile: toSingleFile(updatedFiles),
        };

        nextSection = {
          ...(currentSection && !Array.isArray(currentSection) ? currentSection : {}),
          investmentReadyArray: updatedArray,
          ...(currentStatus !== undefined ? { status: currentStatus } : {}),
        };
        break;
      }
      default:
        return;
    }

    if (!nextSection) {
      return;
    }

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: nextSection,
    }));

    const nextState = {
      ...state,
      [sectionKey]: nextSection,
    };

    try {
      const fields = buildSectionFields(sectionId, nextState);

      await handleSaveSection({
        submissionId,
        category: 'infraDevelopment',
        section: sectionKey,
        fields,
      });

      let shouldRevert = false;

      switch (sectionId) {
        case '2.1':
          shouldRevert = nextSection.infraActArray.every(
            (item: any) => !Array.isArray(item?.files) || item.files.length === 0
          );
          break;
        case '2.2':
          shouldRevert = nextSection.specializedEntityArray.every(
            (item: any) => !Array.isArray(item?.files) || item.files.length === 0
          );
          break;
        case '2.3':
          shouldRevert = nextSection.infraDevelopmentArray.every(
            (item: any) => !Array.isArray(item?.files) || item.files.length === 0
          );
          break;
        case '2.4':
          shouldRevert = nextSection.investmentReadyArray.every(
            (item: any) => !item?.dprFile
          );
          break;
        default:
          break;
      }

      if (shouldRevert) {
        await onIndicatorStatus(sectionId, false);
      }
    } catch (error) {
      console.error('Failed to auto-save files for section', sectionId, error);
    }
  };


  const renderActionButtons = (sectionId: string) => {
  // Don't show action buttons in preview mode
  if (isPreview) {
    return null;
  }

  // Check if section status is ACCEPTED
  const sectionKey = `section${sectionId.replace('.', '_')}`;
  const sectionData = state && state[sectionKey];
  // Handle both array and object sections
  const sectionStatus = Array.isArray(sectionData) 
    ? (sectionData as any)?.status 
    : sectionData?.status;
  if (sectionStatus === 'ACCEPTED') {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-green-100 text-green-700 cursor-default"
          disabled
        >
          <CheckCircle className="w-4 h-4" />
          Accepted
        </Button>
      </div>
    );
  }

  const comments = getComments(sectionId);
  const commentCount = comments ? comments.length : 0;
  
  // Check if user is NODAL_OFFICER from localStorage
  const getUserRole = () => {
    try {
      const authUser = localStorage.getItem('niri_app:auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.value?.role;
      }
    } catch (error) {
      console.error('Error reading user role:', error);
    }
    return null;
  };
  const userRole = getUserRole();
  const isNodalOfficer = userRole === 'NODAL_OFFICER';
  
  if (sectionStatus === 'REVERTED') {
    // If nodal officer and status is REVERTED, show Edit button + Sent Back badge
    if (isNodalOfficer) {
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
            className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
            disabled
          >
            <RotateCcw className="w-4 h-4" />
            Sent Back
          </Button>
        </div>
      );
    }
    
    // For reviewers/approvers, show only the disabled Sent Back button
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
          disabled
        >
          <RotateCcw className="w-4 h-4" />
          Sent Back
        </Button>
      </div>
    );
  }

  // Debug logging removed for performance

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
        onClick={() => handleOpenModal(sectionId)}
      >
        <RotateCcw className="w-4 h-4" />
        Send Back
      </Button>

      {/* <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={() => handleOpenTimeline(sectionId)}
      >
        <Clock className="w-4 h-4" />
        Timeline ({commentCount})
      </Button> */}

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
          const sections = getSectionsWithData({ infraDevelopment: state }, 'infraDevelopment');
          const assignedIndicators = STEP_SECTIONS.infraDevelopment
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { infraDevelopment: state } as any,
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
              {(() => {
                const infraActArray = Array.isArray(state?.section2_1?.infraActArray)
                  ? state.section2_1.infraActArray
                  : [];

                if (!infraActArray.length) {
                  return (
                    <div className="text-center text-muted-foreground py-4">
                      No infrastructure act/policy data available
                    </div>
                  );
                }

                return infraActArray.map((item: any, index: number) => (
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
                ));
              })()}

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
                    {(() => {
                      const infraActArray = Array.isArray(state?.section2_1?.infraActArray)
                        ? state.section2_1.infraActArray
                        : [];

                      if (!infraActArray.length) {
                        return (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                              No data available
                            </td>
                          </tr>
                        );
                      }

                      return infraActArray.map((item: any, index: number) => (
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
                      ));
                    })()}
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
              {(() => {
                const specializedEntityArray = Array.isArray(state?.section2_2?.specializedEntityArray)
                  ? state.section2_2.specializedEntityArray
                  : [];

                if (!specializedEntityArray.length) {
                  return (
                    <div className="text-center text-muted-foreground py-4">
                      No specialised entity data available
                    </div>
                  );
                }

                return specializedEntityArray.map((item: any, index: number) => (
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
              ));
              })()}
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
              {(() => {
                const infraDevelopmentArray = Array.isArray(state?.section2_3?.infraDevelopmentArray)
                  ? state.section2_3.infraDevelopmentArray
                  : [];

                if (!infraDevelopmentArray.length) {
                  return (
                    <div className="text-center text-muted-foreground py-4">
                      No sector infra development plan data available
                    </div>
                  );
                }

                return infraDevelopmentArray.map((item: any, index: number) => (
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
              ));
              })()}
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
              {(() => {
                const investmentReadyArray = Array.isArray(state?.section2_4?.investmentReadyArray)
                  ? state.section2_4.investmentReadyArray
                  : [];

                if (!investmentReadyArray.length) {
                  return (
                    <div className="text-center text-muted-foreground py-4">
                      No investment ready project pipeline data available
                    </div>
                  );
                }

                return investmentReadyArray.map((item: any, index: number) => (
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
              ));
              })()}
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
                    {(() => {
                      const assetMonetizationArray = Array.isArray(state?.section2_5?.assetMonetizationArray)
                        ? state.section2_5.assetMonetizationArray
                        : [];

                      if (!assetMonetizationArray.length) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              No asset monetization pipeline data available
                            </td>
                          </tr>
                        );
                      }

                      return assetMonetizationArray.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">{item.projectName || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.type || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.ownership || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.estimatedMonetization ? `₹ ${item.estimatedMonetization} Crores` : ""}</td>
                      </tr>
                      ));
                    })()}
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
        onSendBack={(sectionId) => onIndicatorStatus(sectionId, false)}
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
