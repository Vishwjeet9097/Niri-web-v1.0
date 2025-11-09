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
import { MessageSquare, Upload, Plus, Trash2, Clock, RotateCcw, CheckCircle, X, Check, Edit3 } from "lucide-react";
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
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { computeStepProgress, STEP_SECTIONS } from "@/features/submission/utils/progress";
import { useEditableSectionStore } from '@/utils/EditableSection';
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";

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

  //State for edit button 
  const { setEditable, isEditable, clearAllEditing } = useEditableSectionStore();

  // Type assertion for formDataState to avoid TypeScript errors
  const state = formDataState as any;

  // Sync formDataState when formData prop changes
  useEffect(() => {
    if (formData) {
      setFormDataState((formData as any)?.infraEnablers || formData);
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
              setFormDataState(freshSubmission.formData.infraEnablers);
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
  }, [submissionId]);  // Check if this section has any data
  const hasData = hasInfraEnablersData({ infraEnablers: state });
  const sectionsWithData = getSectionsWithData({ infraEnablers: state }, 'infraEnablers');

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
            setFormDataState((updatedSubmission as any).formData.infraEnablers);
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
      "4.1": "4.1 - All Eligible Infra Projects on NIP Portal",
      "4.2": "4.2 - Availability & Use of State/UT PMG",
      "4.3": "4.3 - Adoption of PM GatiShakti",
      "4.4": "4.4 - Adoption of ADR",
      "4.5": "4.5 - Innovative Practices",
      "4.6": "4.6 - Capacity Building - Officer Participation",
    };
    return titles[sectionId] || sectionId;
  };

  const onSaveSection = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key (e.g. "4.1" -> "section4_1")
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Use the local formData state (formDataState) to build fields for this section
      let fields: Record<string, any>[] = [];

      switch (sectionId) {
        case '4.1':
          // Use local state for section 4.1 data
          console.log("Section_4_1 state", state?.section4_1)
          fields = [{
            allEligible: state?.section4_1?.allEligible ?? null,
            websiteLink: state?.section4_1?.websiteLink ?? null,
            file: state?.section4_1?.file ?? null
          }];
          break;

        case '4.2':
          // Use local state for section 4.2 data
          console.log("Section_4_2 state", state?.section4_2)
          fields = [{
            available: state?.section4_2?.available ?? null,
            files: Array.isArray(state?.section4_2?.files)
              ? state.section4_2.files
              : state?.section4_2?.files
              ? [state.section4_2.files]
              : state?.section4_2?.file
              ? [state.section4_2.file]
              : [],
            file: toSingleFile(state?.section4_2?.files ?? state?.section4_2?.file ?? null),
          }];
          break;

        case '4.3':
          // Use local state for section 4.3 data
          console.log("Section_4_3 state", state?.section4_3)
          fields = [{
            numberOfProjects: state?.section4_3?.numberOfProjects ?? null,
            adopted: state?.section4_3?.adopted ?? null,
            file: state?.section4_3?.file ?? null
          }];
          break;

        case '4.4':
          // Use local state for section 4.4 data
          console.log("Section_4_4 state", state?.section4_4)
          fields = [{
            adopted: state?.section4_4?.adopted ?? null,
            files: Array.isArray(state?.section4_4?.files)
              ? state.section4_4.files
              : state?.section4_4?.files
              ? [state.section4_4.files]
              : state?.section4_4?.file
              ? [state.section4_4.file]
              : [],
            file: toSingleFile(state?.section4_4?.files ?? state?.section4_4?.file ?? null),
            marksObtained: state?.section4_4?.marksObtained ?? null,
          }];
          break;

        case '4.5':
          // Use local state for section 4.5 data
          console.log("Section_4_5 state", state?.section4_5)
          fields = [{
            practiceName: state?.section4_5?.practiceName ?? null,
            impact: state?.section4_5?.impact ?? null,
            implemented: state?.section4_5?.implemented ?? null,
            file: state?.section4_5?.file ?? null
          }];
          break;

        case '4.6':
          // Use local state for section 4.6 data
          console.log("Section_4_6 state", state?.section4_6);
          fields = [
            {
              capacityArray: (state?.section4_6?.capacityArray || []).map((item: any) => ({
                officerName: item?.officerName ?? null,
                designation: item?.designation ?? null,
                programName: item?.programName ?? null,
                trainingType: item?.trainingType ?? null,
                organiser: item?.organiser ?? null,
                marksObtained: item?.marksObtained ?? null,
              })),
            },
          ];
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      await handleSaveSection({
        submissionId,
        category: 'infraEnablers',
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
      category: 'infraEnablers',
      section: `section${sectionId.replace('.', '_')}`,
      status: status,
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

  const toSingleFile = (
    value: FileUpload | FileUpload[] | null | undefined
  ): FileUpload | null => {
    if (Array.isArray(value)) {
      return value.length > 0 ? (value[0] as FileUpload) : null;
    }
    return value ?? null;
  };

  const toFileArray = (value: FileUpload | FileUpload[] | null | undefined): FileUpload[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  // Helper functions to handle file updates
  const handleFileUpdate = async (
    sectionId: string,
    updatedValue: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace('.', '_')}`;
    const previousSection = state?.[sectionKey] || {};
    const targetKey = ['4.2', '4.4'].includes(sectionId) ? 'files' : 'file';
    const filesArray = toFileArray(updatedValue);
    const normalizedValue =
      targetKey === 'files' ? filesArray : updatedValue;

    const updatedSection =
      targetKey === 'files'
        ? {
            ...previousSection,
            files: filesArray,
            file: toSingleFile(filesArray),
          }
        : {
            ...previousSection,
            [targetKey]: normalizedValue,
          };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    if (['4.2', '4.4'].includes(sectionId)) {
      try {
        const fields =
          sectionId === '4.2'
            ? [
                {
                  available: updatedSection?.available ?? null,
                files: filesArray,
                },
              ]
            : [
                {
                  adopted: updatedSection?.adopted ?? null,
                files: filesArray,
                  marksObtained: updatedSection?.marksObtained ?? null,
                },
              ];

        await handleSaveSection({
          submissionId,
          category: 'infraEnablers',
          section: sectionKey,
          fields,
        });
        if (targetKey === 'files' && filesArray.length === 0) {
          await onIndicatorStatus(sectionId, false);
        }
      } catch (error) {
        console.error('Failed to auto-save files for section', sectionId, error);
      }
    }
  };

  // Helper functions to handle field updates
  const handleFieldUpdate = (sectionId: string, fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      return {
        ...prev,
        [sectionKey]: {
          ...prev?.[sectionKey],
          [fieldName]: value
        }
      };
    });
  };

  // Helper to update table row items for section 4.6
  const handleTableFieldUpdate = (rowIndex: number, fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      const current = prev?.section4_6?.capacityArray;
      const rows = Array.isArray(current) ? [...current] : [];
      const currentRow = { ...(rows[rowIndex] || {}) };
      currentRow[fieldName] = value;
      rows[rowIndex] = currentRow;
      return {
        ...prev,
        section4_6: {
          ...(prev?.section4_6 || {}),
          capacityArray: rows,
        },
      };
    });
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
        <p className="text-muted-foreground">No Infra Enablers data available for review</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData({ infraEnablers: state }, 'infraEnablers');
          const assignedIndicators = STEP_SECTIONS.infraEnablers
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { infraEnablers: state } as any,
            "infraEnablers",
            { assignedIndicators }
          );
          return (
            <ProgressHeader
              title="Infra Enablers"
              description="Data related to infra enablers and budget allocation"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}
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
              {isEditable('4.1') ? (
                <RadioGroup
                  value={state?.section4_1?.allEligible || ""}
                  onValueChange={(value) => handleFieldUpdate('4.1', 'allEligible', value)}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="4.1-yes" />
                    <Label htmlFor="4.1-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="4.1-no" />
                    <Label htmlFor="4.1-no">No</Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section4_1?.allEligible === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section4_1?.allEligible === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            <div>
              <Label>Website Link</Label>
              <Input 
                value={state?.section4_1?.websiteLink || ""} 
                readOnly={!isEditable('4.1')}
                className={isEditable('4.1') ? 'bg-white' : 'bg-gray-50'}
                onChange={(e) => handleFieldUpdate('4.1', 'websiteLink', e.target.value)}
              />
            </div>

            {/* {(formDataState?.section4_1?.allEligible === "yes") && (
              <div>
                <EditableFileDisplay
                  files={formDataState?.section4_1?.file || null}
                  isEditable={isEditable('4.1')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFile) => handleFileUpdate('4.1', updatedFile)}
                  label="Uploaded File"
                  multiple={false}
                />
              </div>
            )} */}

            <p className="text-xs text-muted-foreground">
              Annex 9: Self-certification required
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
              {isEditable('4.2') ? (
                <RadioGroup
                  value={state?.section4_2?.available || ""}
                  onValueChange={(value) => handleFieldUpdate('4.2', 'available', value)}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="4.2-yes" />
                    <Label htmlFor="4.2-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="4.2-no" />
                    <Label htmlFor="4.2-no">No</Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section4_2?.available === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section4_2?.available === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            {(state?.section4_2?.available === "yes") && (
              <div>
                <EditableFileDisplay
                  files={state?.section4_2?.files ?? state?.section4_2?.file ?? null}
                  isEditable={isEditable('4.2')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFile) => handleFileUpdate('4.2', updatedFile)}
                  label="Uploaded File"
                  multiple={false}
                />
              </div>
            )}

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
                value={state?.section4_3?.numberOfProjects || ""} 
                readOnly={!isEditable('4.3')}
                className={`w-[200px] ${isEditable('4.3') ? 'bg-white' : 'bg-gray-50'}`}
                onChange={(e) => handleFieldUpdate('4.3', 'numberOfProjects', e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-3 block">Adoption of PM GatiShakti?*</Label>
              {isEditable('4.3') ? (
                <RadioGroup
                  value={state?.section4_3?.adopted || ""}
                  onValueChange={(value) => handleFieldUpdate('4.3', 'adopted', value)}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="4.3-yes" />
                    <Label htmlFor="4.3-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="4.3-no" />
                    <Label htmlFor="4.3-no">No</Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section4_3?.adopted === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section4_3?.adopted === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            <div>
              <EditableFileDisplay
                files={state?.section4_3?.file || null}
                isEditable={isEditable('4.3')}
                submissionId={submissionId}
                onFilesChange={(updatedFile) => handleFileUpdate('4.3', updatedFile)}
                label="Uploaded File"
                multiple={false}
              />
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
              {isEditable('4.4') ? (
                <RadioGroup
                  value={state?.section4_4?.adopted || ""}
                  onValueChange={(value) => handleFieldUpdate('4.4', 'adopted', value)}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="4.4-yes" />
                    <Label htmlFor="4.4-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="4.4-no" />
                    <Label htmlFor="4.4-no">No</Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section4_4?.adopted === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section4_4?.adopted === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            {state?.section4_4?.adopted === "yes" && (
              <div>
                <EditableFileDisplay
                  files={state?.section4_4?.files ?? state?.section4_4?.file ?? null}
                  isEditable={isEditable('4.4')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFile) => handleFileUpdate('4.4', updatedFile)}
                  label="Uploaded File"
                  multiple={false}
                />
              </div>
            )}

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
            {state?.section4_5 ? (
              <div className="">
                <div className="space-y-4 w-[70%]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Practice Name</Label>
                      <Input 
                        value={state.section4_5.practiceName || ""} 
                        readOnly={!isEditable('4.5')}
                        className={isEditable('4.5') ? 'bg-white' : 'bg-gray-50'}
                        onChange={(e) => handleFieldUpdate('4.5', 'practiceName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Impact</Label>
                      <Input 
                        value={state.section4_5.impact || ""} 
                        readOnly={!isEditable('4.5')}
                        className={isEditable('4.5') ? 'bg-white' : 'bg-gray-50'}
                        onChange={(e) => handleFieldUpdate('4.5', 'impact', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Implemented</Label>
                    {isEditable('4.5') ? (
                      <RadioGroup
                        value={state.section4_5.implemented || ""}
                        onValueChange={(value) => handleFieldUpdate('4.5', 'implemented', value)}
                        className="flex flex-row gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="4.5-yes" />
                          <Label htmlFor="4.5-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="4.5-no" />
                          <Label htmlFor="4.5-no">No</Label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm ${state.section4_5.implemented === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}>
                          {state.section4_5.implemented === "yes" ? "Yes" : "No"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <EditableFileDisplay
                      files={state.section4_5.file || null}
                      isEditable={isEditable('4.5')}
                      submissionId={submissionId}
                      onFilesChange={(updatedFile) => handleFileUpdate('4.5', updatedFile)}
                      label="Uploaded File"
                      multiple={false}
                    />
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
            {Array.isArray(state?.section4_6?.capacityArray) && state.section4_6.capacityArray.length > 0 ? (
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
                    {state.section4_6.capacityArray.map((item: any, index: number) => (
                      <TableRow key={item.id || index}>
                        <TableCell className="font-medium">
                          {isEditable('4.6') ? (
                            <Input
                              value={item.officerName || ""}
                              onChange={(e) => handleTableFieldUpdate(index, 'officerName', e.target.value)}
                            />
                          ) : (
                            item.officerName || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditable('4.6') ? (
                            <Input
                              value={item.designation || ""}
                              onChange={(e) => handleTableFieldUpdate(index, 'designation', e.target.value)}
                            />
                          ) : (
                            item.designation || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditable('4.6') ? (
                            <Input
                              value={item.programName || ""}
                              onChange={(e) => handleTableFieldUpdate(index, 'programName', e.target.value)}
                            />
                          ) : (
                            item.programName || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditable('4.6') ? (
                            <Input
                              value={item.trainingType || ""}
                              onChange={(e) => handleTableFieldUpdate(index, 'trainingType', e.target.value)}
                            />
                          ) : (
                            item.trainingType || "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditable('4.6') ? (
                            <Input
                              value={item.organiser || ""}
                              onChange={(e) => handleTableFieldUpdate(index, 'organiser', e.target.value)}
                            />
                          ) : (
                            item.organiser || "-"
                          )}
                        </TableCell>
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
