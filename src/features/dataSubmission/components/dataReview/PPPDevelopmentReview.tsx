import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Upload, Plus, Clock, Edit3, Check, X, RotateCcw, CheckCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useEditableSectionStore } from '@/utils/EditableSection';
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";
import { SECTOR_OPTIONS, PROJECT_TYPE_OPTIONS } from "@/features/submission/constants/steps";


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
  
  // Normalization function for PPP Development data
  const normalizePPPDevelopment = (data: any) => {
    if (!data) return data;
    const normalized: any = { ...data };

    // Ensure section3_3 has VGFArray structure
    if (normalized.section3_3) {
      const section = normalized.section3_3;
      const status = (section && section.status) || (Array.isArray(section) ? (section as any).status : undefined);
      
      let items: any[] = [];
      if (Array.isArray(section?.VGFArray)) {
        items = section.VGFArray;
      } else if (Array.isArray(section)) {
        items = section;
      }

      normalized.section3_3 = {
        ...(section && !Array.isArray(section) ? section : {}),
        VGFArray: items,
        ...(status !== undefined ? { status } : {}),
      };
    }

    return normalized;
  };

  const initialFormData = normalizePPPDevelopment(
    formData && typeof formData === "object" && (formData as any)?.section3_1 !== undefined
      ? formData
      : (formData as any)?.pppDevelopment ?? formData
  );

  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(initialFormData);
  
  // Store original formDataState snapshot when edit mode starts (for cancel functionality)
  const [originalFormDataSnapshot, setOriginalFormDataSnapshot] = useState<any>(null);
  // Flag to prevent useEffect from overriding cancel restore
  const isRestoringRef = useRef(false);
  // Counter to force remount of Select components on cancel
  const [selectResetKey, setSelectResetKey] = useState(0);

  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveSectionId, setPendingSaveSectionId] = useState<string | null>(null);

  // State for Send Back and Accept confirmation dialogs
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [pendingActionSectionId, setPendingActionSectionId] = useState<string | null>(null);

  // Helper function to check user role
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

  const { setEditable, isEditable, clearAllEditing } = useEditableSectionStore();
  
  // Handle edit mode start - store original state snapshot
  const handleEditStart = (sectionId: string) => {
    // Store a deep copy of current formDataState
    setOriginalFormDataSnapshot(JSON.parse(JSON.stringify(formDataState)));
    setEditable(sectionId, true);
  };
  
  // Handle cancel - restore original state
  const handleCancel = (sectionId: string) => {
    if (originalFormDataSnapshot) {
      isRestoringRef.current = true;
      setFormDataState(originalFormDataSnapshot);
      setOriginalFormDataSnapshot(null);
      setEditable(sectionId, false);
      // Increment reset key to force Select components to remount
      setSelectResetKey(prev => prev + 1);
      // Reset the flag after React has processed the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isRestoringRef.current = false;
        });
      });
    } else {
      setEditable(sectionId, false);
    }
  };
  
  // Alias for formDataState to match pattern used in other review components
  const state = formDataState as any;
  
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
              setFormDataState(
                normalizePPPDevelopment(
                  freshSubmission.formData.pppDevelopment ??
                  freshSubmission.formData
                )
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
  }, [submissionId]);// Check if this section has any data
  const hasData = hasPPPDevelopmentData({ pppDevelopment: formDataState });
  const sectionsWithData = getSectionsWithData({ pppDevelopment: formDataState }, 'pppDevelopment');

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
    if (!message || typeof message !== "string") {
      console.error("❌ PPPDevelopmentReview - Invalid message parameter:", message);
      return;
    }

    if (activeSection) {
      try {
        console.log("🔄 PPPDevelopmentReview - Calling saveMessage with:", {
          activeSection,
          message,
        });
        const updatedSubmission = await saveMessage(activeSection, message);
        console.log("🔄 PPPDevelopmentReview - saveMessage response:", updatedSubmission);

        if (updatedSubmission && typeof updatedSubmission === "object") {
          setSubmissionState(updatedSubmission);
          const updatedFormData =
            (updatedSubmission as any)?.formData?.pppDevelopment ??
            (updatedSubmission as any)?.formData ??
            formDataState;
          if (updatedFormData) {
            setFormDataState(updatedFormData);
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
        console.error("❌ PPPDevelopmentReview - Error saving message:", error);
      }
    } else {
      console.log("⚠️ PPPDevelopmentReview - No active section");
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

  // Helper functions for file handling
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

  // Helper function to handle field updates
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

  // Helper function to handle file updates
  const handleFileUpdate = async (
    sectionId: string,
    updatedValue: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace('.', '_')}`;
    const previousSection = state?.[sectionKey] || {};
    const targetKey = sectionId === '3.1' ? 'files' : 'file';
    const filesArray = toFileArray(updatedValue);
    const normalizedValue = targetKey === 'files' ? filesArray : updatedValue;

    const updatedSection =
      targetKey === 'files'
        ? {
            ...previousSection,
            files: filesArray,
          }
        : {
            ...previousSection,
            [targetKey]: normalizedValue,
          };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Auto-save for file changes
    if (sectionId === '3.1') {
      try {
        const fields = [{
          available: updatedSection?.available ?? null,
          files: filesArray,
        }];

        await handleSaveSection({
          submissionId,
          category: 'pppDevelopment',
          section: sectionKey,
          fields,
        });
        
        if (filesArray.length === 0) {
          await onIndicatorStatus(sectionId, false);
        }
      } catch (error) {
        console.error('Failed to auto-save files for section', sectionId, error);
      }
    } else if (sectionId === '3.2') {
      try {
        const fields = [{
          available: updatedSection?.available ?? null,
          file: normalizedValue,
        }];

        await handleSaveSection({
          submissionId,
          category: 'pppDevelopment',
          section: sectionKey,
          fields,
        });
      } catch (error) {
        console.error('Failed to auto-save files for section', sectionId, error);
      }
    }
  };

  // Helper to update table row items for section 3.3
  const handleTableFieldUpdate = (rowIndex: number, fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_3?.VGFArray;
      const rows = Array.isArray(current) ? [...current] : [];
      const currentRow = { ...(rows[rowIndex] || {}) };
      currentRow[fieldName] = value;
      rows[rowIndex] = currentRow;
      return {
        ...prev,
        section3_3: {
          ...(prev?.section3_3 || {}),
          VGFArray: rows,
        },
      };
    });
  };

  // Helper to update section 3.4 project fields
  const handleProjectFieldUpdate = (projectIndex: number, fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_4?.projects;
      const projects = Array.isArray(current) ? [...current] : [];
      const currentProject = { ...(projects[projectIndex] || {}) };
      currentProject[fieldName] = value;
      projects[projectIndex] = currentProject;
      return {
        ...prev,
        section3_4: {
          ...(prev?.section3_4 || {}),
          projects: projects,
        },
      };
    });
  };

  const onSaveSection = async (sectionId: string) => {
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === 'NODAL_OFFICER';

    // If NODAL_OFFICER, show confirmation dialog first
    if (isNodalOfficer) {
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    // For non-NODAL_OFFICER users, proceed with save directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key (e.g. "3.1" -> "section3_1")
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Use the local formData state to build fields for this section
      let fields: Record<string, any>[] = [];

      // Check if user is NODAL_OFFICER to add status to payload
      const userRole = getUserRole();
      const isNodalOfficer = userRole === 'NODAL_OFFICER';

      switch (sectionId) {
        case '3.1':
          fields = [{
            available: state?.section3_1?.available ?? null,
            files: Array.isArray(state?.section3_1?.files)
              ? state.section3_1.files
              : state?.section3_1?.files
              ? [state.section3_1.files]
              : [],
          }];
          break;

        case '3.2':
          fields = [{
            available: state?.section3_2?.available ?? null,
            file: state?.section3_2?.file ?? null,
          }];
          break;

        case '3.3':
          fields = [{
            VGFArray: (state?.section3_3?.VGFArray || []).map((item: any) => ({
              projectName: item?.projectName ?? null,
              sector: item?.sector ?? null,
              type: item?.type ?? null,
              submissionDate: item?.submissionDate ?? null,
              file: item?.file ?? null,
              marksObtained: item?.marksObtained ?? null,
            })),
          }];
          break;

        case '3.4':
          fields = [{
            projects: (state?.section3_4?.projects || []).map((project: any) => ({
              nameOfProject: project?.nameOfProject ?? null,
              nipId: project?.nipId ?? null,
              fundingSource: project?.fundingSource ?? null,
              infrastructureSector: project?.infrastructureSector ?? null,
              dateOfAward: project?.dateOfAward ?? null,
              capexPercentage: project?.capexPercentage ?? null,
            })),
          }];
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      // If NODAL_OFFICER, add status: "RESUBMITTED" to fields
      if (isNodalOfficer && fields.length > 0) {
        // Add status to the first field object
        fields[0] = {
          ...fields[0],
          status: 'RESUBMITTED',
        };
      }

      await handleSaveSection({
        submissionId,
        category: 'pppDevelopment',
        section: payloadSection,
        fields
      });

      // If NODAL_OFFICER, update local state to reflect RESUBMITTED status
      if (isNodalOfficer) {
        // Update formDataState to set status to RESUBMITTED
        const sectionKey = `section${sectionId.replace('.', '_')}`;
        setFormDataState((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated[sectionKey]) {
            updated[sectionKey] = {
              ...updated[sectionKey],
              status: 'RESUBMITTED',
            };
          }
          return updated;
        });
      }

      // Disable editing after successful save
      setEditable(sectionId, false);
      // Clear the snapshot since save was successful
      setOriginalFormDataSnapshot(null);
    } catch (error) {
      console.error('Error saving section:', error);
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    if (pendingSaveSectionId) {
      await performSave(pendingSaveSectionId);
      setShowSaveDialog(false);
      setPendingSaveSectionId(null);
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSaveSectionId(null);
  };

  // Actual function that performs the status update
  const performIndicatorStatus = async (sectionId: string, status: boolean) => {
    const payload = {
      submissionId,
      category: 'pppDevelopment',
      section: `section${sectionId.replace('.', '_')}`,
      status,
    };
    try {
      await apiService.indicatorStatus(payload);
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      setFormDataState((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (next && next[sectionKey]) {
          next[sectionKey] = {
            ...next[sectionKey],
            status: status ? 'ACCEPTED' : 'REVERTED',
          };
        }
        return next;
      });
      console.log("✅ Indicator status updated successfully");
    } catch (error) {
      console.error("❌ Failed to update indicator status:", error);
    }
  };

  // Wrapper function that checks for STATE_APPROVER and shows dialog if needed
  const onIndicatorStatus = async (sectionId: string, status: boolean) => {
    const userRole = getUserRole();
    const isStateApprover = userRole === 'STATE_APPROVER';

    if (isStateApprover) {
      // Show appropriate dialog based on action
      setPendingActionSectionId(sectionId);
      if (status) {
        // Accept action
        setShowAcceptDialog(true);
      } else {
        // Send Back action
        setShowSendBackDialog(true);
      }
      return;
    }

    // For non-STATE_APPROVER users, proceed directly
    await performIndicatorStatus(sectionId, status);
  };

  // Handle Send Back confirmation
  const handleConfirmSendBack = async () => {
    if (pendingActionSectionId) {
      await performIndicatorStatus(pendingActionSectionId, false);
      setShowSendBackDialog(false);
      setPendingActionSectionId(null);
      // Close the message modal if it's open
      setActiveSection(null);
    }
  };

  const handleCancelSendBack = () => {
    setShowSendBackDialog(false);
    setPendingActionSectionId(null);
  };

  // Handle Accept confirmation
  const handleConfirmAccept = async () => {
    if (pendingActionSectionId) {
      await performIndicatorStatus(pendingActionSectionId, true);
      setShowAcceptDialog(false);
      setPendingActionSectionId(null);
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptDialog(false);
    setPendingActionSectionId(null);
  };

 const renderActionButtons = (sectionId: string) => {
    // Don't show action buttons in preview mode
    if (isPreview) {
      return null;
    }

    const sectionKey = `section${sectionId.replace('.', '_')}`;
    const sectionData = state
      ? state[sectionKey]
      : undefined;
    const sectionStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any).status
        : sectionData.status
      : undefined;

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
    const isStateApprover = userRole === 'STATE_APPROVER';
    
    // For STATE_APPROVER, show "Re Submitted" badge if status is RESUBMITTED
    if (isStateApprover && sectionStatus === 'RESUBMITTED') {
      return (
        <div className="flex gap-2">
          {!isEditable(sectionId) ? (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => handleEditStart(sectionId)}
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
                onClick={() => handleCancel(sectionId)}
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
            disabled
          >
            <CheckCircle className="w-4 h-4" />
            Re Submitted
          </Button>
          {!isNodalOfficer && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onIndicatorStatus(sectionId, true)}
            >
              <CheckCircle className="w-4 h-4" />
              Accept
            </Button>
          )}
        </div>
      );
    }
    
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
                onClick={() => handleEditStart(sectionId)}
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
                  onClick={() => handleCancel(sectionId)}
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

    // For NODAL_OFFICER, show "Under Review" badge if status is RESUBMITTED or null/undefined
    if (isNodalOfficer && (sectionStatus === 'RESUBMITTED' || !sectionStatus)) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
            disabled
          >
            <Clock className="w-4 h-4" />
            Under Review
          </Button>
        </div>
      );
    }

    // For NODAL_OFFICER, if status is not REVERTED, ACCEPTED, or RESUBMITTED, don't show any buttons
    if (isNodalOfficer && sectionStatus !== 'REVERTED' && sectionStatus !== 'ACCEPTED' && sectionStatus !== 'RESUBMITTED') {
      return null;
    }

    return (
      <div className="flex gap-2">
        {!isEditable(sectionId) ? (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleEditStart(sectionId)}
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

        {/* Only show Send Back if status is not RESUBMITTED for STATE_APPROVER */}
        {!(isStateApprover && sectionStatus === 'RESUBMITTED') && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenModal(sectionId)}
          >
            <RotateCcw className="w-4 h-4" />
            Send Back
          </Button>
        )}

        {/* <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-4 h-4" />
          Timeline ({commentCount})
        </Button> */}

        {!isNodalOfficer && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onIndicatorStatus(sectionId, true)}
          >
            <CheckCircle className="w-4 h-4" />
            Accept
          </Button>
        )}
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
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">3.1 -</span> Availability of Infrastructure Act/Policy{" "}
              </span>
              {renderActionButtons("3.1")}
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
              {isEditable('3.1') ? (
                <RadioGroup
                  value={state?.section3_1?.available || ""}
                  onValueChange={(value) => handleFieldUpdate('3.1', 'available', value)}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="3.1-yes" />
                    <Label htmlFor="3.1-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="3.1-no" />
                    <Label htmlFor="3.1-no">No</Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section3_1?.available === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section3_1?.available === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            {(state?.section3_1?.available === "yes") && (
              <div>
                <EditableFileDisplay
                  files={state?.section3_1?.files ?? null}
                  isEditable={isEditable('3.1')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFiles) => handleFileUpdate('3.1', updatedFiles)}
                  label="Uploaded Files"
                  multiple={true}
                />
              </div>
            )}

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
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">3.2 -</span> Availability of Functional PPP Cell/Unit{" "}
              </span>
              {renderActionButtons("3.2")}
            </div>
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
                {isEditable('3.2') ? (
                  <RadioGroup
                    value={state?.section3_2?.available || ""}
                    onValueChange={(value) => handleFieldUpdate('3.2', 'available', value)}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="3.2-yes" />
                      <Label htmlFor="3.2-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="3.2-no" />
                      <Label htmlFor="3.2-no">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${state?.section3_2?.available === "yes"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                      }`}>
                      {state?.section3_2?.available === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {(state?.section3_2?.available === "yes") && (
                <div>
                  <EditableFileDisplay
                    files={state?.section3_2?.file ?? null}
                    isEditable={isEditable('3.2')}
                    submissionId={submissionId}
                    onFilesChange={(updatedFile) => handleFileUpdate('3.2', updatedFile)}
                    label="Uploaded File"
                    multiple={false}
                  />
                </div>
              )}

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
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">3.3 -</span> Proposals Submitted under VGF/IIPDF{" "}
              </span>
              {renderActionButtons("3.3")}
            </div>
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
                    {(() => {
                      const VGFArray = Array.isArray(state?.section3_3?.VGFArray)
                        ? state.section3_3.VGFArray
                        : [];

                      if (!VGFArray.length) {
                        return (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">
                              No VGF/IIPDF proposals data available
                            </td>
                          </tr>
                        );
                      }

                      return VGFArray.map((item: any, index: number) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.3') ? (
                              <Input
                                value={item.projectName || ""}
                                onChange={(e) => handleTableFieldUpdate(index, 'projectName', e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              item.projectName || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.3') ? (
                              <Select
                                key={`sector-${index}-${selectResetKey}`}
                                value={item.sector || ""}
                                onValueChange={(value) => handleTableFieldUpdate(index, 'sector', value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select sector" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SECTOR_OPTIONS.map((sector) => (
                                    <SelectItem key={sector} value={sector}>
                                      {sector}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              item.sector || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.3') ? (
                              <Select
                                key={`type-${index}-${selectResetKey}`}
                                value={item.type || ""}
                                onValueChange={(value) => handleTableFieldUpdate(index, 'type', value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PROJECT_TYPE_OPTIONS.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              item.type || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.3') ? (
                              <Input
                                type="date"
                                value={item.submissionDate 
                                  ? new Date(item.submissionDate).toISOString().split('T')[0]
                                  : ""}
                                onChange={(e) => handleTableFieldUpdate(index, 'submissionDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                className="w-full"
                              />
                            ) : (
                              item.submissionDate 
                                ? new Date(item.submissionDate).toLocaleDateString() 
                                : ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.3') ? (
                              <EditableFileDisplay
                                files={item.file ?? null}
                                isEditable={true}
                                submissionId={submissionId}
                                onFilesChange={(updatedFile) => {
                                  handleTableFieldUpdate(index, 'file', updatedFile);
                                }}
                                label=""
                                multiple={false}
                              />
                            ) : (
                              item.file ? (
                                <div className="flex items-center gap-2">
                                  <Upload className="w-4 h-4" />
                                  <span className="text-sm">{item.file.fileName || "File"}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No file</span>
                              )
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {!isPreview && isEditable('3.3') && (
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
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">3.4 -</span> Proportion of TPC of PPP Projects{" "}
              </span>
              {renderActionButtons("3.4")}
            </div>
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
              {state?.section3_4?.projects && state.section3_4.projects.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {state.section3_4.projects.map((project: any, idx: number) => (
                    <div key={project.id || idx} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Project {idx + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Name of PPP/Bankable Projects</Label>
                          <Input 
                            value={project.nameOfProject || ""} 
                            readOnly={!isEditable('3.4')}
                            className={isEditable('3.4') ? 'bg-white' : 'bg-gray-50'}
                            onChange={(e) => handleProjectFieldUpdate(idx, 'nameOfProject', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>NIP ID</Label>
                          <Input 
                            value={project.nipId || ""} 
                            readOnly={!isEditable('3.4')}
                            className={isEditable('3.4') ? 'bg-white' : 'bg-gray-50'}
                            onChange={(e) => handleProjectFieldUpdate(idx, 'nipId', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Funding Source</Label>
                          <Input 
                            value={project.fundingSource || ""} 
                            readOnly={!isEditable('3.4')}
                            className={isEditable('3.4') ? 'bg-white' : 'bg-gray-50'}
                            onChange={(e) => handleProjectFieldUpdate(idx, 'fundingSource', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Infrastructure Sector</Label>
                          {isEditable('3.4') ? (
                            <Select
                              key={`infrastructureSector-${idx}-${selectResetKey}`}
                              value={project.infrastructureSector || ""}
                              onValueChange={(value) => handleProjectFieldUpdate(idx, 'infrastructureSector', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sector" />
                              </SelectTrigger>
                              <SelectContent>
                                {SECTOR_OPTIONS.map((sector) => (
                                  <SelectItem key={sector} value={sector}>
                                    {sector}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={project.infrastructureSector || ""} readOnly className="bg-gray-50" />
                          )}
                        </div>
                        <div>
                          <Label>Date of Award</Label>
                          {isEditable('3.4') ? (
                            <Input
                              type="date"
                              value={project.dateOfAward 
                                ? new Date(project.dateOfAward).toISOString().split('T')[0]
                                : ""}
                              onChange={(e) => handleProjectFieldUpdate(idx, 'dateOfAward', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="bg-white"
                            />
                          ) : (
                            <Input 
                              value={project.dateOfAward ? new Date(project.dateOfAward).toLocaleDateString() : ""} 
                              readOnly 
                              className="bg-gray-50"
                            />
                          )}
                        </div>
                        <div>
                          <Label>% of Capex funded by non-Govt sources</Label>
                          <Input 
                            value={project.capexPercentage || ""} 
                            readOnly={!isEditable('3.4')}
                            className={isEditable('3.4') ? 'bg-white' : 'bg-gray-50'}
                            onChange={(e) => handleProjectFieldUpdate(idx, 'capexPercentage', e.target.value)}
                          />
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

      {/* Confirmation Dialog for NODAL_OFFICER Save */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save this section? This will send the data to the State Approver for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER Send Back */}
      <AlertDialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Back</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send back this section? On send back, this will be returned to the Nodal Officer for corrections.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSendBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSendBack}>Confirm & Send Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER Accept */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Accept</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to accept this section? Now it is moved to the Reviewer. No further action can be taken after accept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>Confirm & Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
