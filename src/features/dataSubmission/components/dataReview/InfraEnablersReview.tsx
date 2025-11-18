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
import { useState, useEffect, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { FileUploadSection } from "@/features/submission/components/FileUploadSection";
import { hasInfraEnablersData, getSectionsWithData } from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import { computeStepProgress, STEP_SECTIONS } from "@/features/submission/utils/progress";
import { useEditableSectionStore } from '@/utils/EditableSection';
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { Badge } from "@/components/ui/badge";
import { IMPACT_OPTIONS, TRAINING_TYPE_OPTIONS } from "@/features/submission/constants/steps";

interface InfraEnablersReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
}

export const InfraEnablersReview = ({ submissionId, formData, submission, isPreview = false, assignedIndicators = [], isNodalOfficer = false }: InfraEnablersReviewProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(formData);
  
  // Use submissionState for the hook so it gets updated comments
  // Merge submission prop updates with local submissionState
  const currentSubmission = submissionState || submission;
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, currentSubmission);
  
  // Sync submissionState when submission prop changes from parent
  useEffect(() => {
    if (submission) {
      setSubmissionState(submission);
    }
  }, [submission]);
  
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
  
  // State to track if comment modal was opened from MOSPI_APPROVER "Sent Back" button
  // (Accept no longer requires comment, so it directly shows confirmation)
  const [isMospiApproverSentBack, setIsMospiApproverSentBack] = useState(false);
  const [mospiSentBackSectionId, setMospiSentBackSectionId] = useState<string | null>(null);

  // State for adding new project in section 4.3
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    projectName: "",
    sector: "",
    file: null as FileUpload | null,
  });

  // State for adding new practice in section 4.5
  const [showAddPracticeForm, setShowAddPracticeForm] = useState(false);
  const [newPractice, setNewPractice] = useState({
    practiceName: "",
    impact: "",
    file: null as FileUpload | null,
  });

  // State for adding new capacity building entry in section 4.6
  const [showAddCapacityForm, setShowAddCapacityForm] = useState(false);
  const [newCapacityEntry, setNewCapacityEntry] = useState({
    officerName: "",
    designation: "",
    programName: "",
    organiser: "",
    trainingType: "",
  });

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

  //State for edit button 
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
      
      // Close and reset "Add Project" form for section 4.3
      if (sectionId === '4.3') {
        setShowAddProjectForm(false);
        setNewProject({
          projectName: "",
          sector: "",
          file: null,
        });
      }
      
      // Close and reset "Add Practice" form for section 4.5
      if (sectionId === '4.5') {
        setShowAddPracticeForm(false);
        setNewPractice({
          practiceName: "",
          impact: "",
          file: null,
        });
      }
      
      // Close and reset "Add Capacity Entry" form for section 4.6
      if (sectionId === '4.6') {
        setShowAddCapacityForm(false);
        setNewCapacityEntry({
          officerName: "",
          designation: "",
          programName: "",
          organiser: "",
          trainingType: "",
        });
      }
      
      // Reset the flag after React has processed the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isRestoringRef.current = false;
        });
      });
    } else {
      setEditable(sectionId, false);
      // Still close forms even if no snapshot exists
      if (sectionId === '4.3') {
        setShowAddProjectForm(false);
        setNewProject({
          projectName: "",
          sector: "",
          file: null,
        });
      }
      if (sectionId === '4.5') {
        setShowAddPracticeForm(false);
        setNewPractice({
          practiceName: "",
          impact: "",
          file: null,
        });
      }
      if (sectionId === '4.6') {
        setShowAddCapacityForm(false);
        setNewCapacityEntry({
          officerName: "",
          designation: "",
          programName: "",
          organiser: "",
          trainingType: "",
        });
      }
    }
  };

  // Type assertion for formDataState to avoid TypeScript errors
  const state = formDataState as any;

  // Sync formDataState when formData prop changes (but not when restoring from cancel)
  useEffect(() => {
    if (formData && !isRestoringRef.current) {
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
  }, [submissionId]);
  
  // Check if this section has any data
  const hasData = hasInfraEnablersData({ infraEnablers: state });
  let sectionsWithData = getSectionsWithData({ infraEnablers: state }, 'infraEnablers');
  
  // For preview mode with assigned indicators, always include assigned sections even if they have no data
  // This ensures assigned indicators are visible in preview, regardless of data presence
  if (isPreview && isNodalOfficer && assignedIndicators && assignedIndicators.length > 0) {
    const assignedSectionKeys: string[] = [];
    const indicatorToSectionMap: Record<string, string> = {
      "4.1": "section4_1",
      "4.2": "section4_2",
      "4.3": "section4_3",
      "4.4": "section4_4",
      "4.5": "section4_5",
      "4.6": "section4_6",
    };
    
    assignedIndicators.forEach((indicator) => {
      const sectionKey = indicatorToSectionMap[indicator];
      if (sectionKey && !sectionsWithData.includes(sectionKey)) {
        assignedSectionKeys.push(sectionKey);
      }
    });
    
    sectionsWithData = [...sectionsWithData, ...assignedSectionKeys];
  }
  
  // For review mode (not preview) OR preview mode for non-nodal officers (e.g., state approver viewing aggregate):
  // Include all sections that exist in formData
  // This ensures state approvers and other reviewers see all sections submitted by nodal officers
  // This includes sections even if they don't have meaningful data (e.g., empty objects)
  if ((!isPreview || (isPreview && !isNodalOfficer)) && state && typeof state === 'object') {
    const allPossibleSections = ["section4_1", "section4_2", "section4_3", "section4_4", "section4_5", "section4_6"];
    const existingSections = allPossibleSections.filter(sectionKey => {
      // Check if section key exists in state (even if value is null, empty object, or empty array)
      return sectionKey in state;
    });
    
    // Merge existing sections with sectionsWithData, avoiding duplicates
    sectionsWithData = Array.from(new Set([...sectionsWithData, ...existingSections]));
  }

  const handleOpenModal = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseModal = () => {
    setActiveSection(null);
    // Reset MOSPI_APPROVER Sent Back flags when modal closes
    // (Accept no longer uses comment modal, so no need to reset Accept flags)
    setIsMospiApproverSentBack(false);
    setMospiSentBackSectionId(null);
  };

  const handleOpenTimeline = (sectionId: string) => {
    setTimelineSection(sectionId);
  };

  const handleCloseTimeline = () => {
    setTimelineSection(null);
  };

  const handleSaveMessage = async (updatedSubmission: unknown) => {
    // MessageModal already saved the comment, so we just need to update state and check flags
    if (updatedSubmission) {
      // Update submission and form data so UI remains intact
      setSubmissionState(updatedSubmission);
      if ((updatedSubmission as any).formData) {
        setFormDataState((updatedSubmission as any).formData.infraEnablers);
      }

      // Check flags BEFORE closing modal to determine if we need to show confirmation
      const shouldShowSentBackConfirmation = isMospiApproverSentBack && mospiSentBackSectionId;

      // If this was opened from MOSPI_APPROVER "Sent Back" button, show confirmation dialog
      if (shouldShowSentBackConfirmation) {
        // Store section ID before resetting flags
        const sectionIdToUse = mospiSentBackSectionId;
        setPendingActionSectionId(sectionIdToUse);
        // Reset the flags
        setIsMospiApproverSentBack(false);
        setMospiSentBackSectionId(null);
        // Close the comment modal
        setActiveSection(null);
        // Show confirmation dialog
        setTimeout(() => {
          setShowSendBackDialog(true);
        }, 100);
        return;
      }

      // For regular comments (not from Sent Back), just update timeline if needed
      if (activeSection && timelineSection === activeSection) {
        setTimelineSection(null);
        setTimeout(() => {
          setTimelineSection(activeSection);
        }, 100);
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
      // Map visual section id to payload section key (e.g. "4.1" -> "section4_1")
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Use the local formData state (formDataState) to build fields for this section
      let fields: Record<string, any>[] = [];

      // Check if user is NODAL_OFFICER to add status to payload
      const userRole = getUserRole();
      const isNodalOfficer = userRole === 'NODAL_OFFICER';

      switch (sectionId) {
        case '4.1':
          // Use local state for section 4.1 data
          console.log("Section_4_1 state", state?.section4_1)
          fields = [{
            allEligible: state?.section4_1?.allEligible ?? null,
            websiteLink: state?.section4_1?.websiteLink ?? null,
            file: state?.section4_1?.file ?? null,
            comment: state?.section4_1?.comment ?? null,
          }];
          break;

        case '4.2':
          // Use local state for section 4.2 data
          console.log("Section_4_2 state", state?.section4_2)
          const section4_2Files = Array.isArray(state?.section4_2?.files)
            ? state.section4_2.files
            : state?.section4_2?.files
            ? [state.section4_2.files]
            : state?.section4_2?.file
            ? [state.section4_2.file]
            : [];
          
          // Format files for payload - ensure file property is string path
          const files4_2 = section4_2Files.map((file: FileUpload) => ({
            id: file.id,
            file: typeof file.file === 'string' ? file.file : file.filePath || file.fileUrl || null,
            fileName: file.fileName,
            fileSize: file.fileSize,
            uploadedAt: file.uploadedAt,
            filePath: file.filePath,
            fileUrl: file.fileUrl,
            mimeType: file.mimeType,
          }));
          
          fields = [{
            available: state?.section4_2?.available ?? null,
            files: files4_2,
            file: toSingleFile(section4_2Files),
            websiteLink: state?.section4_2?.websiteLink ?? null,
            comment: state?.section4_2?.comment ?? null,
          }];
          break;

        case '4.3':
          // Use local state for section 4.3 data
          console.log("Section_4_3 state", state?.section4_3)
          const projects4_3 = (state?.section4_3?.projects || []).map((project: any) => ({
            id: project.id,
            projectName: project.projectName ?? null,
            sector: project.sector ?? null,
            file: project.file ?? null,
          }));
          fields = [{
            adopted: state?.section4_3?.adopted ?? null,
            projects: projects4_3,
            comment: state?.section4_3?.comment ?? null,
          }];
          break;

        case '4.4':
          // Use local state for section 4.4 data
          console.log("Section_4_4 state", state?.section4_4)
          const section4_4Files = Array.isArray(state?.section4_4?.files)
            ? state.section4_4.files
            : state?.section4_4?.files
            ? [state.section4_4.files]
            : state?.section4_4?.file
            ? [state.section4_4.file]
            : [];
          
          // Format files for payload - ensure file property is string path
          const files4_4 = section4_4Files.map((file: FileUpload) => ({
            id: file.id,
            file: typeof file.file === 'string' ? file.file : file.filePath || file.fileUrl || null,
            fileName: file.fileName,
            fileSize: file.fileSize,
            uploadedAt: file.uploadedAt,
            filePath: file.filePath,
            fileUrl: file.fileUrl,
            mimeType: file.mimeType,
          }));
          
          fields = [{
            adopted: state?.section4_4?.adopted ?? null,
            files: files4_4,
            file: toSingleFile(section4_4Files),
            marksObtained: state?.section4_4?.marksObtained ?? null,
            comment: state?.section4_4?.comment ?? null,
          }];
          break;

        case '4.5':
          // Use local state for section 4.5 data
          console.log("Section_4_5 state", state?.section4_5)
          const practices4_5 = (state?.section4_5?.practices || []).map((practice: any) => ({
            id: practice.id,
            practiceName: practice.practiceName ?? null,
            impact: practice.impact ?? null,
            file: practice.file ?? null,
          }));
          fields = [{
            implemented: state?.section4_5?.implemented ?? null,
            practices: practices4_5,
            comment: state?.section4_5?.comment ?? null,
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
              })),
              participated: state?.section4_6?.participated ?? null,
              comment: state?.section4_6?.comment ?? null,
            },
          ];
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
        category: 'infraEnablers',
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
    const userRole = getUserRole();
    const isMospiApprover = userRole === 'MOSPI_APPROVER';
    
    // For MOSPI_APPROVER, use mospi_status field instead of status
    const payload: any = {
      submissionId,
      category: 'infraEnablers',
      section: `section${sectionId.replace('.', '_')}`,
      status: status,
    };
    
    // If MOSPI_APPROVER, add mospi_status field
    if (isMospiApprover) {
      payload.mospi_status = status ? 'ACCEPTED' : 'REVERTED';
    }
    
    try {
      await apiService.indicatorStatus(payload);
      // Update local formData to trigger re-render of action buttons
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      const statusField = isMospiApprover ? 'mospi_status' : 'status';
      const statusValue = status ? 'ACCEPTED' : 'REVERTED';
      
      // Defensive: update formDataState if section exists
      if (formDataState && (formDataState as any)[sectionKey] !== undefined) {
        setFormDataState((prev: any) => {
          const sectionData = prev?.[sectionKey];
          // Handle both array and object sections
          if (Array.isArray(sectionData)) {
            // For array sections, add status property to the array (JavaScript allows this)
            const updatedArray = [...sectionData];
            (updatedArray as any)[statusField] = statusValue;
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
                [statusField]: statusValue,
              },
            };
          }
          return prev;
        });
      }
      console.log(`✅ Indicator ${isMospiApprover ? 'mospi_' : ''}status updated successfully`);
      
      // Dispatch custom event to notify other components (e.g., UnifiedReviewPage) that indicator status was updated
      if (isMospiApprover) {
        window.dispatchEvent(new CustomEvent('niri-indicator-status-updated', {
          detail: { sectionId, status: statusValue }
        }));
      }
    } catch (error) {
      console.error(`❌ Failed to update indicator ${isMospiApprover ? 'mospi_' : ''}status:`, error);
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
      // Check if user is MOSPI_APPROVER
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
      const isMospiApprover = userRole === 'MOSPI_APPROVER';
      
      // For MOSPI_APPROVER, update mospi_status to REVERTED
      // For other roles (STATE_APPROVER), use regular status update
      // Both use performIndicatorStatus, which handles the role check internally
      await performIndicatorStatus(pendingActionSectionId, false);
      
      setShowSendBackDialog(false);
      setPendingActionSectionId(null);
      // Comment modal is already closed before showing confirmation dialog
    }
  };

  const handleCancelSendBack = () => {
    setShowSendBackDialog(false);
    setPendingActionSectionId(null);
  };

  // Handle Accept confirmation
  const handleConfirmAccept = async () => {
    if (pendingActionSectionId) {
      // Check if user is MOSPI_APPROVER
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
      const isMospiApprover = userRole === 'MOSPI_APPROVER';
      
      // For MOSPI_APPROVER, update mospi_status to ACCEPTED
      // For other roles (STATE_APPROVER), use regular status update
      // Both use performIndicatorStatus, which handles the role check internally
      await performIndicatorStatus(pendingActionSectionId, true);
      
      setShowAcceptDialog(false);
      setPendingActionSectionId(null);
      // Comment modal is already closed before showing confirmation dialog
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptDialog(false);
    setPendingActionSectionId(null);
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
    
    // For sections that use 'files' array, ensure we always work with arrays
    let filesArray: FileUpload[] = [];
    if (targetKey === 'files') {
      // If updatedValue is null, set empty array
      if (updatedValue === null) {
        filesArray = [];
      } 
      // If it's already an array, use it
      else if (Array.isArray(updatedValue)) {
        filesArray = updatedValue;
      } 
      // If it's a single file, convert to array
      else {
        filesArray = [updatedValue];
      }
    }
    
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

    // Update local state
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Auto-save for sections 4.2 and 4.4
    if (['4.2', '4.4'].includes(sectionId)) {
      try {
        // Ensure files array is properly formatted for API
        const filesForPayload = filesArray.map((file) => ({
          id: file.id,
          file: file.file, // This should be the stored path (string)
          fileName: file.fileName,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt,
          filePath: file.filePath,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
        }));

        const fields =
          sectionId === '4.2'
            ? [
                {
                  available: updatedSection?.available ?? null,
                  files: filesForPayload, // Send array of file objects
                },
              ]
            : [
                {
                  adopted: updatedSection?.adopted ?? null,
                  files: filesForPayload, // Send array of file objects
                  marksObtained: updatedSection?.marksObtained ?? null,
                },
              ];

        console.log('📤 Saving files for section', sectionId, 'with payload:', fields);
        
        await handleSaveSection({
          submissionId,
          category: 'infraEnablers',
          section: sectionKey,
          fields,
        });
        
        if (filesArray.length === 0) {
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

  // Handle adding new project to section 4.3
  const handleAddNewProject = () => {
    setFormDataState((prev: any) => {
      const current = prev?.section4_3?.projects || [];
      const newProjectWithId = {
        ...newProject,
        id: `project-${Date.now()}`,
      };
      return {
        ...prev,
        section4_3: {
          ...(prev?.section4_3 || {}),
          projects: [...current, newProjectWithId],
        },
      };
    });
    // Reset form
    setNewProject({
      projectName: "",
      sector: "",
      file: null,
    });
    setShowAddProjectForm(false);
  };

  // Handle cancel adding new project
  const handleCancelAddProject = () => {
    setNewProject({
      projectName: "",
      sector: "",
      file: null,
    });
    setShowAddProjectForm(false);
  };

  // Handle updating project fields in section 4.3
  const handleProjectFieldUpdate = (index: number, fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      const projects = [...(prev?.section4_3?.projects || [])];
      projects[index] = {
        ...projects[index],
        [fieldName]: value,
      };
      return {
        ...prev,
        section4_3: {
          ...(prev?.section4_3 || {}),
          projects,
        },
      };
    });
  };

  // Handle updating project file in section 4.3
  const handleProjectFileUpdate = (index: number, updatedFile: FileUpload | null) => {
    setFormDataState((prev: any) => {
      const projects = [...(prev?.section4_3?.projects || [])];
      projects[index] = {
        ...projects[index],
        file: updatedFile,
      };
      return {
        ...prev,
        section4_3: {
          ...(prev?.section4_3 || {}),
          projects,
        },
      };
    });
  };

  // Handle adding new practice to section 4.5
  const handleAddNewPractice = () => {
    setFormDataState((prev: any) => {
      const current = prev?.section4_5?.practices || [];
      const newPracticeWithId = {
        ...newPractice,
        id: `practice-${Date.now()}`,
      };
      return {
        ...prev,
        section4_5: {
          ...(prev?.section4_5 || {}),
          practices: [...current, newPracticeWithId],
        },
      };
    });
    // Reset form
    setNewPractice({
      practiceName: "",
      impact: "",
      file: null,
    });
    setShowAddPracticeForm(false);
  };

  // Handle cancel adding new practice
  const handleCancelAddPractice = () => {
    setNewPractice({
      practiceName: "",
      impact: "",
      file: null,
    });
    setShowAddPracticeForm(false);
  };

  // Handle updating practice fields in section 4.5
  const handlePracticeFieldUpdate = (index: number, fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      const practices = [...(prev?.section4_5?.practices || [])];
      practices[index] = {
        ...practices[index],
        [fieldName]: value,
      };
      return {
        ...prev,
        section4_5: {
          ...(prev?.section4_5 || {}),
          practices,
        },
      };
    });
  };

  // Handle updating practice file in section 4.5
  const handlePracticeFileUpdate = (index: number, updatedFile: FileUpload | null) => {
    setFormDataState((prev: any) => {
      const practices = [...(prev?.section4_5?.practices || [])];
      practices[index] = {
        ...practices[index],
        file: updatedFile,
      };
      return {
        ...prev,
        section4_5: {
          ...(prev?.section4_5 || {}),
          practices,
        },
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

  // Handle adding new capacity building entry to section 4.6
  const handleAddNewCapacityEntry = () => {
    setFormDataState((prev: any) => {
      const current = prev?.section4_6?.capacityArray || [];
      const newEntryWithId = {
        ...newCapacityEntry,
        id: `capacity-${Date.now()}`,
      };
      return {
        ...prev,
        section4_6: {
          ...(prev?.section4_6 || {}),
          capacityArray: [...current, newEntryWithId],
        },
      };
    });
    // Reset form
    setNewCapacityEntry({
      officerName: "",
      designation: "",
      programName: "",
      organiser: "",
      trainingType: "",
    });
    setShowAddCapacityForm(false);
  };

  // Handle cancel adding new capacity building entry
  const handleCancelAddCapacityEntry = () => {
    setNewCapacityEntry({
      officerName: "",
      designation: "",
      programName: "",
      organiser: "",
      trainingType: "",
    });
    setShowAddCapacityForm(false);
  };


  const renderActionButtons = (sectionId: string) => {
    // Don't show action buttons in preview mode
    if (isPreview) {
      return null;
    }

    const comments = getComments(sectionId);
    const commentCount = comments ? comments.length : 0;
    
    // Check if user is NODAL_OFFICER from localStorage - MUST CHECK ROLE FIRST
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
    const isMospiReviewer = userRole === 'MOSPI_REVIEWER';
    const isMospiApprover = userRole === 'MOSPI_APPROVER';
    
    // Hide all action buttons if STATE_APPROVER is viewing a submission that's with MoSPI Reviewer
    const submissionStatus = submission?.status;
    if (isStateApprover && submissionStatus === 'SUBMITTED_TO_MOSPI_REVIEWER') {
      return null;
    }
    
    // Hide all action buttons (Edit, Send Back, Accept) if submission is APPROVED
    // Only show Timeline button for viewing comments
    if (submissionStatus === 'APPROVED') {
      return (
        <div className="flex gap-2">
          {commentCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          )}
        </div>
      );
    }
    
    // For MOSPI_REVIEWER, show Add Comment and Timeline buttons
    if (isMospiReviewer) {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleOpenModal(sectionId)}
          >
            <MessageSquare className="w-4 h-4" />
            Add Comment
          </Button>
          {commentCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
              Timeline ({commentCount})
            </Button>
          )}
        </div>
      );
    }
    
    // For MOSPI_APPROVER, show Sent Back and Accepted buttons (using mospi_status only)
    if (isMospiApprover) {
      // Check mospi_status instead of status for MOSPI_APPROVER
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      const sectionData = state && state[sectionKey];
      const mospiStatus = Array.isArray(sectionData) 
        ? (sectionData as any)?.mospi_status 
        : sectionData?.mospi_status;
      
      if (mospiStatus === 'ACCEPTED') {
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
      }
      
      if (mospiStatus === 'REVERTED') {
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
      }
      
      // Show Sent Back and Accepted buttons for MOSPI_APPROVER (when mospi_status is null/undefined)
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              // For MOSPI_APPROVER, send back action: 
              // 1. Set flag to track this is a "Sent Back" action
              // 2. Open comment modal first
              setIsMospiApproverSentBack(true);
              setMospiSentBackSectionId(sectionId);
              handleOpenModal(sectionId);
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Sent Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              // For MOSPI_APPROVER, accept action: 
              // Show confirmation dialog directly (no comment required)
              setPendingActionSectionId(sectionId);
              setShowAcceptDialog(true);
            }}
          >
            <CheckCircle className="w-4 h-4" />
            Accept
          </Button>
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
    }

    // For all other roles, check status field as before
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
    }
    
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
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-7 px-2 text-xs"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <MessageSquare className="w-3 h-3" />
            View Comments ({commentCount})
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

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 h-7 px-2 text-xs"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-3 h-3" />
          Timeline ({commentCount})
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

            {(state?.section4_1?.allEligible === "yes") && (
              <div>
                <Label>Website Link</Label>
                <Input 
                  value={state?.section4_1?.websiteLink || ""} 
                  readOnly={!isEditable('4.1')}
                  className={isEditable('4.1') ? 'bg-white' : 'bg-gray-50'}
                  onChange={(e) => handleFieldUpdate('4.1', 'websiteLink', e.target.value)}
                />
              </div>
            )}

            {(state?.section4_1?.allEligible === "no") && (
              <div>
                <Label className="mb-2 block">Comment</Label>
                {isEditable('4.1') ? (
                  <Textarea
                    value={state?.section4_1?.comment || ""}
                    onChange={(e) => handleFieldUpdate('4.1', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section4_1?.comment || "No comment provided"}
                  </div>
                )}
              </div>
            )}

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
                  files={state?.section4_2?.files ?? (state?.section4_2?.file ? [state.section4_2.file] : null)}
                  isEditable={isEditable('4.2')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFiles) => handleFileUpdate('4.2', updatedFiles)}
                  label="Uploaded File"
                  multiple={true}
                />
              </div>
            )}

            {(state?.section4_2?.available === "no") && (
              <div>
                <Label className="mb-2 block">Comment</Label>
                {isEditable('4.2') ? (
                  <Textarea
                    value={state?.section4_2?.comment || ""}
                    onChange={(e) => handleFieldUpdate('4.2', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section4_2?.comment || "No comment provided"}
                  </div>
                )}
              </div>
            )}
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

            {(state?.section4_3?.adopted === "yes") && (
              <>
                {/* Projects Table */}
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Project Name</th>
                        <th className="py-3 px-4 text-left text-sm font-normal">Sector</th>
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Uploaded File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const projects = Array.isArray(state?.section4_3?.projects)
                          ? state.section4_3.projects
                          : [];

                        if (!projects.length) {
                          return (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-muted-foreground">
                                No projects available
                              </td>
                            </tr>
                          );
                        }

                        return projects.map((project: any, idx: number) => (
                          <tr key={project.id || idx} className="border-b">
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable('4.3') ? (
                                <Input
                                  value={project.projectName || ""}
                                  onChange={(e) => handleProjectFieldUpdate(idx, 'projectName', e.target.value)}
                                  className="w-full"
                                  placeholder="Enter project name"
                                />
                              ) : (
                                project.projectName || 'N/A'
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable('4.3') ? (
                                <Dropdown
                                  value={project.sector || ""}
                                  onChange={(value) => handleProjectFieldUpdate(idx, 'sector', value)}
                                  options={dropdownValues.sector}
                                  placeholder="Select sector"
                                />
                              ) : (
                                project.sector || 'N/A'
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable('4.3') ? (
                                <div className="space-y-1.5">
                                  {project.file ? (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                      title={project.file.fileName || 'Unknown file'}
                                    >
                                      <Upload className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{project.file.fileName || 'Unknown file'}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleProjectFileUpdate(idx, null);
                                        }}
                                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                      </button>
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">No file</span>
                                  )}
                                  <div className="flex items-center">
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      onChange={async (e) => {
                                        const selectedFile = e.target.files?.[0];
                                        if (selectedFile) {
                                          // Upload file immediately (same as create submission)
                                          try {
                                            const response = await apiService.uploadFile(submissionId, selectedFile);
                                            const fileData = response?.data || response;
                                            
                                            const newFile: FileUpload = {
                                              id: fileData.id ?? crypto.randomUUID(),
                                              file: null, // File not stored locally when backend handles upload
                                              fileName: fileData.fileName || fileData.filename || selectedFile.name,
                                              fileSize: Number(fileData.fileSize ?? fileData.size ?? selectedFile.size ?? 0),
                                              uploadedAt: Number(fileData.uploadedAt ?? Date.now()),
                                              filePath: fileData.filePath ?? fileData.file ?? fileData.url ?? fileData.path,
                                              fileUrl: fileData.fileUrl || fileData.url,
                                              mimeType: fileData.mimeType,
                                            };
                                            
                                            await handleProjectFileUpdate(idx, newFile);
                                            e.target.value = ''; // Reset input
                                          } catch (error: any) {
                                            console.error('Failed to upload file:', error);
                                          }
                                        }
                                      }}
                                      className="hidden"
                                      id={`file-input-4.3-${idx}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById(`file-input-4.3-${idx}`)?.click()}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                project.file ? (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                    title={project.file.fileName || 'Unknown file'}
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span className="truncate">{project.file.fileName || 'Unknown file'}</span>
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No file</span>
                                )
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Add More Button - Only visible when adopted is "yes" and in edit mode */}
                {isEditable('4.3') && !showAddProjectForm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                    onClick={() => setShowAddProjectForm(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add More
                  </Button>
                )}

                {/* Add Project Form - Only visible when showAddProjectForm is true */}
                {showAddProjectForm && isEditable('4.3') && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Add New Project</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Project Name</Label>
                        <Input 
                          value={newProject.projectName} 
                          onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
                          className="bg-white"
                          placeholder="Enter project name"
                        />
                      </div>
                      <div>
                        <Label>Sector</Label>
                        <Dropdown
                          value={newProject.sector}
                          onChange={(value) => setNewProject({...newProject, sector: value})}
                          options={dropdownValues.sector}
                          placeholder="Select sector"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Upload File</Label>
                        <EditableFileDisplay
                          files={newProject.file}
                          isEditable={true}
                          submissionId={submissionId}
                          onFilesChange={(updatedFile) => {
                            setNewProject({...newProject, file: updatedFile as FileUpload | null});
                          }}
                          label=""
                          multiple={false}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddNewProject}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Save Project
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelAddProject}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {(state?.section4_3?.adopted === "no") && (
              <div>
                <Label className="mb-2 block">Comment</Label>
                {isEditable('4.3') ? (
                  <Textarea
                    value={state?.section4_3?.comment || ""}
                    onChange={(e) => handleFieldUpdate('4.3', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section4_3?.comment || "No comment provided"}
                  </div>
                )}
              </div>
            )}

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
                  files={state?.section4_4?.files ?? (state?.section4_4?.file ? [state.section4_4.file] : null)}
                  isEditable={isEditable('4.4')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFiles) => handleFileUpdate('4.4', updatedFiles)}
                  label="Uploaded File"
                  multiple={true}
                />
              </div>
            )}

            {(state?.section4_4?.adopted === "no") && (
              <div>
                <Label className="mb-2 block">Comment</Label>
                {isEditable('4.4') ? (
                  <Textarea
                    value={state?.section4_4?.comment || ""}
                    onChange={(e) => handleFieldUpdate('4.4', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section4_4?.comment || "No comment provided"}
                  </div>
                )}
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
            <div>
              <Label className="mb-3 block">Implemented?*</Label>
              {isEditable('4.5') ? (
                <RadioGroup
                  value={state?.section4_5?.implemented || ""}
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
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section4_5?.implemented === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section4_5?.implemented === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            {(state?.section4_5?.implemented === "yes") && (
              <>
                {/* Practices Table */}
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Practice Name</th>
                        <th className="py-3 px-4 text-left text-sm font-normal">Impact</th>
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Uploaded File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const practices = Array.isArray(state?.section4_5?.practices)
                          ? state.section4_5.practices
                          : [];

                        if (!practices.length) {
                          return (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-muted-foreground">
                                No practices available
                              </td>
                            </tr>
                          );
                        }

                        return practices.map((practice: any, idx: number) => (
                          <tr key={practice.id || idx} className="border-b">
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable('4.5') ? (
                                <Input
                                  value={practice.practiceName || ""}
                                  onChange={(e) => handlePracticeFieldUpdate(idx, 'practiceName', e.target.value)}
                                  className="w-full"
                                  placeholder="Enter practice name"
                                />
                              ) : (
                                practice.practiceName || 'N/A'
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable('4.5') ? (
                                <Dropdown
                                  value={practice.impact || ""}
                                  onChange={(value) => handlePracticeFieldUpdate(idx, 'impact', value)}
                                  options={IMPACT_OPTIONS}
                                  placeholder="Select impact"
                                />
                              ) : (
                                practice.impact || 'N/A'
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {isEditable('4.5') ? (
                                <div className="space-y-1.5">
                                  {practice.file ? (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                      title={practice.file.fileName || 'Unknown file'}
                                    >
                                      <Upload className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{practice.file.fileName || 'Unknown file'}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handlePracticeFileUpdate(idx, null);
                                        }}
                                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                      </button>
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">No file</span>
                                  )}
                                  <div className="flex items-center">
                                    <input
                                      type="file"
                                      accept=".pdf,.doc,.docx"
                                      onChange={async (e) => {
                                        const selectedFile = e.target.files?.[0];
                                        if (selectedFile) {
                                          // Upload file immediately (same as create submission)
                                          try {
                                            const response = await apiService.uploadFile(submissionId, selectedFile);
                                            const fileData = response?.data || response;
                                            
                                            const newFile: FileUpload = {
                                              id: fileData.id ?? crypto.randomUUID(),
                                              file: null, // File not stored locally when backend handles upload
                                              fileName: fileData.fileName || fileData.filename || selectedFile.name,
                                              fileSize: Number(fileData.fileSize ?? fileData.size ?? selectedFile.size ?? 0),
                                              uploadedAt: Number(fileData.uploadedAt ?? Date.now()),
                                              filePath: fileData.filePath ?? fileData.file ?? fileData.url ?? fileData.path,
                                              fileUrl: fileData.fileUrl || fileData.url,
                                              mimeType: fileData.mimeType,
                                            };
                                            
                                            await handlePracticeFileUpdate(idx, newFile);
                                            e.target.value = ''; // Reset input
                                          } catch (error: any) {
                                            console.error('Failed to upload file:', error);
                                          }
                                        }
                                      }}
                                      className="hidden"
                                      id={`file-input-4.5-${idx}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById(`file-input-4.5-${idx}`)?.click()}
                                      className="h-6 px-2 text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                practice.file ? (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                    title={practice.file.fileName || 'Unknown file'}
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span className="truncate">{practice.file.fileName || 'Unknown file'}</span>
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No file</span>
                                )
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Add More Practice Button - Only visible when in edit mode */}
                {isEditable('4.5') && !showAddPracticeForm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                    onClick={() => setShowAddPracticeForm(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Add More Practice
                  </Button>
                )}

                {/* Add Practice Form - Only visible when showAddPracticeForm is true */}
                {showAddPracticeForm && isEditable('4.5') && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Add New Practice</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Practice Name</Label>
                        <Input 
                          value={newPractice.practiceName} 
                          onChange={(e) => setNewPractice({...newPractice, practiceName: e.target.value})}
                          className="bg-white"
                          placeholder="Enter practice name"
                        />
                      </div>
                      <div>
                        <Label>Impact</Label>
                        <Dropdown
                          value={newPractice.impact}
                          onChange={(value) => setNewPractice({...newPractice, impact: value})}
                          options={IMPACT_OPTIONS}
                          placeholder="Select impact"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label>Upload File</Label>
                        <EditableFileDisplay
                          files={newPractice.file}
                          isEditable={true}
                          submissionId={submissionId}
                          onFilesChange={(updatedFile) => {
                            setNewPractice({...newPractice, file: updatedFile as FileUpload | null});
                          }}
                          label=""
                          multiple={false}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddNewPractice}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Save Practice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelAddPractice}
                        className="flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {(state?.section4_5?.implemented === "no") && (
              <div>
                <Label className="mb-2 block">Comment</Label>
                {isEditable('4.5') ? (
                  <Textarea
                    value={state?.section4_5?.comment || ""}
                    onChange={(e) => handleFieldUpdate('4.5', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section4_5?.comment || "No comment provided"}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Upload RMB orders/Awards
            </p>

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
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Capacity Building – Officer Participation*</Label>
              {isEditable('4.6') ? (
                <RadioGroup
                  value={state?.section4_6?.participated || ""}
                  onValueChange={(value) => {
                    handleFieldUpdate('4.6', 'participated', value);
                    if (value === "yes") {
                      handleFieldUpdate('4.6', 'comment', '');
                    } else {
                      handleFieldUpdate('4.6', 'capacityArray', []);
                    }
                  }}
                  className="flex flex-row gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="4.6-yes" />
                    <Label htmlFor="4.6-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="4.6-no" />
                    <Label htmlFor="4.6-no">No</Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${state?.section4_6?.participated === "yes"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                    }`}>
                    {state?.section4_6?.participated === "yes" ? "Yes" : "No"}
                  </span>
                </div>
              )}
            </div>

            {(state?.section4_6?.participated === "yes") && (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#DDE3F9]">
                    <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Officer Name</th>
                    <th className="py-3 px-4 text-left text-sm font-normal">Designation</th>
                    <th className="py-3 px-4 text-left text-sm font-normal">Program Name</th>
                    <th className="py-3 px-4 text-left text-sm font-normal">Training Type</th>
                    <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Organiser</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const capacityArray = Array.isArray(state?.section4_6?.capacityArray)
                      ? state.section4_6.capacityArray
                      : [];

                    if (!capacityArray.length) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No capacity building data available
                          </td>
                        </tr>
                      );
                    }

                    return capacityArray.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">
                          {isEditable('4.6') ? (
                            <Input
                              value={item.officerName || ""}
                              onChange={(e) => handleTableFieldUpdate(idx, 'officerName', e.target.value)}
                              className="w-full"
                              placeholder="Enter officer name"
                            />
                          ) : (
                            item.officerName || 'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-normal">
                          {isEditable('4.6') ? (
                            <Input
                              value={item.designation || ""}
                              onChange={(e) => handleTableFieldUpdate(idx, 'designation', e.target.value)}
                              className="w-full"
                              placeholder="Enter designation"
                            />
                          ) : (
                            item.designation || 'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-normal">
                          {isEditable('4.6') ? (
                            <Input
                              value={item.programName || ""}
                              onChange={(e) => handleTableFieldUpdate(idx, 'programName', e.target.value)}
                              className="w-full"
                              placeholder="Enter program name"
                            />
                          ) : (
                            item.programName || 'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-normal">
                          {isEditable('4.6') ? (
                            <Dropdown
                              value={item.trainingType || ""}
                              onChange={(value) => handleTableFieldUpdate(idx, 'trainingType', value)}
                              options={TRAINING_TYPE_OPTIONS}
                              placeholder="Select training type"
                            />
                          ) : (
                            item.trainingType || 'N/A'
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-normal">
                          {isEditable('4.6') ? (
                            <Input
                              value={item.organiser || ""}
                              onChange={(e) => handleTableFieldUpdate(idx, 'organiser', e.target.value)}
                              className="w-full"
                              placeholder="Enter organiser"
                            />
                          ) : (
                            item.organiser || 'N/A'
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            )}

            {(state?.section4_6?.participated === "no") && (
              <div>
                <Label className="mb-2 block">Comments (Reason)</Label>
                {isEditable('4.6') ? (
                  <Textarea
                    value={state?.section4_6?.comment || ""}
                    onChange={(e) => handleFieldUpdate('4.6', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section4_6?.comment || "No comment provided"}
                  </div>
                )}
              </div>
            )}

            {/* Add More Button - Only visible when in edit mode and "yes" is selected */}
            {state?.section4_6?.participated === "yes" && isEditable('4.6') && !showAddCapacityForm && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                onClick={() => setShowAddCapacityForm(true)}
              >
                <Plus className="w-4 h-4" />
                Add More
              </Button>
            )}

            {/* Add Capacity Entry Form - Only visible when showAddCapacityForm is true and "yes" is selected */}
            {state?.section4_6?.participated === "yes" && showAddCapacityForm && isEditable('4.6') && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">Add New Capacity Building Entry</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Officer Name</Label>
                    <Input 
                      value={newCapacityEntry.officerName} 
                      onChange={(e) => setNewCapacityEntry({...newCapacityEntry, officerName: e.target.value})}
                      className="bg-white"
                      placeholder="Enter officer name"
                    />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input 
                      value={newCapacityEntry.designation} 
                      onChange={(e) => setNewCapacityEntry({...newCapacityEntry, designation: e.target.value})}
                      className="bg-white"
                      placeholder="Enter designation"
                    />
                  </div>
                  <div>
                    <Label>Program Name</Label>
                    <Input 
                      value={newCapacityEntry.programName} 
                      onChange={(e) => setNewCapacityEntry({...newCapacityEntry, programName: e.target.value})}
                      className="bg-white"
                      placeholder="Enter program name"
                    />
                  </div>
                  <div>
                    <Label>Training Type</Label>
                    <Dropdown
                      value={newCapacityEntry.trainingType}
                      onChange={(value) => setNewCapacityEntry({...newCapacityEntry, trainingType: value})}
                      options={TRAINING_TYPE_OPTIONS}
                      placeholder="Select training type"
                    />
                  </div>
                  <div>
                    <Label>Organiser</Label>
                    <Input 
                      value={newCapacityEntry.organiser} 
                      onChange={(e) => setNewCapacityEntry({...newCapacityEntry, organiser: e.target.value})}
                      className="bg-white"
                      placeholder="Enter organiser"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddNewCapacityEntry}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Entry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelAddCapacityEntry}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Upload capacity building participation data
            </p>
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
        commentType={(() => {
          const userRole = getUserRole();
          return userRole === 'MOSPI_REVIEWER' ? 'comment' : 'indicator_comment';
        })()}
        onSendBack={
          // For MOSPI_REVIEWER, don't call onSendBack (no status updates needed)
          getUserRole() === 'MOSPI_REVIEWER'
            ? undefined
            : // Pass onSendBack callback to prevent auto-close when we need to show confirmation
              // For MOSPI_APPROVER Sent Back, we'll show confirmation in handleSaveMessage
              // Accept no longer requires comment, so it's not included here
              // For other cases, use the normal flow
              isMospiApproverSentBack
              ? async () => {
                  // This prevents auto-close - handleSaveMessage will handle closing and showing confirmation
                  console.log("MOSPI_APPROVER Sent Back - showing confirmation in handleSaveMessage");
                }
              : (sectionId) => onIndicatorStatus(sectionId, false)
        }
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

      {/* Confirmation Dialog for STATE_APPROVER and MOSPI_APPROVER Send Back */}
      <AlertDialog open={showSendBackDialog} onOpenChange={setShowSendBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Back</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
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
                const isMospiApprover = userRole === 'MOSPI_APPROVER';
                
                return isMospiApprover
                  ? "Are you sure you want to send this section back to the State Approver? This action will mark the section as REVERTED."
                  : "Are you sure you want to send back this section? On send back, this will be returned to the Nodal Officer for corrections.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSendBack}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSendBack}>Confirm & Send Back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER and MOSPI_APPROVER Accept */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Accept</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
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
                const isMospiApprover = userRole === 'MOSPI_APPROVER';
                
                return isMospiApprover
                  ? "Are you sure you want to accept this section? This action will mark the section as ACCEPTED and finalize the review."
                  : "Are you sure you want to accept this section? Now it is moved to the Reviewer. No further action can be taken after accept.";
              })()}
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
