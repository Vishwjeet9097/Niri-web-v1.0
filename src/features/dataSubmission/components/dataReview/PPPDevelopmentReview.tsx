import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Upload, Plus, Clock, Edit3, Check, X, RotateCcw, CheckCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef, useMemo } from "react";
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
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
  isStateApprover?: boolean; // Whether the user is a state approver
}

export const PPPDevelopmentReview = ({ submissionId, formData, submission, isPreview = false, assignedIndicators = [], isNodalOfficer = false, isStateApprover = false }: PPPDevelopmentReviewProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  
  // Helper function to normalize file objects (handles nested file.file structures)
  const normalizeFileObject = (fileObj: any): any => {
    if (!fileObj) return fileObj;
    
    // If file has a nested file.file structure and the outer doesn't have filePath, use the nested one
    if (fileObj.file && typeof fileObj.file === 'object' && !fileObj.filePath && fileObj.file.filePath) {
      return {
        ...fileObj.file,
        // Preserve outer id if nested doesn't have one
        id: fileObj.file.id ?? fileObj.id,
      };
    }
    
    return fileObj;
  };

  // Normalization function for PPP Development data
  const normalizePPPDevelopment = (data: any) => {
    if (!data) return data;
    const normalized: any = { ...data };

    // Normalize section3_1 files (handle both 'file' and 'files' properties, and nested file.file structures)
    if (normalized.section3_1) {
      // Handle case where files are stored in 'file' (singular) property
      if (normalized.section3_1.file && !normalized.section3_1.files) {
        const file = normalized.section3_1.file;
        if (Array.isArray(file)) {
          normalized.section3_1.files = file.map(normalizeFileObject);
        } else if (file) {
          normalized.section3_1.files = [normalizeFileObject(file)];
        }
      }
      // Handle case where files are stored in 'files' (plural) property
      else if (normalized.section3_1.files) {
        const files = normalized.section3_1.files;
        if (Array.isArray(files)) {
          normalized.section3_1.files = files.map(normalizeFileObject);
        } else if (files) {
          normalized.section3_1.files = [normalizeFileObject(files)];
        }
      }
    }

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
  // Refresh key to force component re-render on cancel
  const [refreshKey, setRefreshKey] = useState(0);
  
  // State for adding new project in section 3.4
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    nameOfProject: "",
    nipId: "",
    fundingSource: "",
    infrastructureSector: "",
    dateOfAward: "",
    capexPercentage: "",
    totalProjectCost: "",
  });

  // State for adding new VGF proposal in section 3.3
  const [showAddVGFForm, setShowAddVGFForm] = useState(false);
  const [newVGFItem, setNewVGFItem] = useState({
    projectName: "",
    sector: "",
    type: "",
    submissionDate: "",
    file: null as FileUpload | null,
  });

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

  // Helper function to check user role
  const getUserRole = () => {
    try {
      const authUser = localStorage.getItem('niri_app:auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        const role = user.value?.role;
        // Normalize role string (trim whitespace, convert to uppercase for comparison)
        return role ? String(role).trim() : null;
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
      // Create a fresh deep copy to ensure React detects the change
      const restoredState = JSON.parse(JSON.stringify(originalFormDataSnapshot));
      setFormDataState(restoredState);
      setOriginalFormDataSnapshot(null);
      setEditable(sectionId, false);
      // Increment reset key to force Select components to remount
      setSelectResetKey(prev => prev + 1);
      // Increment refresh key to force component re-render
      setRefreshKey(prev => prev + 1);
      
      // Close and reset "Add More Project" forms for section 3.3
      if (sectionId === '3.3') {
        setShowAddVGFForm(false);
        setNewVGFItem({
          projectName: "",
          sector: "",
          type: "",
          submissionDate: "",
          file: null,
        });
      }
      
      // Close and reset "Add More Project" forms for section 3.4
      if (sectionId === '3.4') {
        setShowAddProjectForm(false);
        setNewProject({
          nameOfProject: "",
          nipId: "",
          fundingSource: "",
          infrastructureSector: "",
          dateOfAward: "",
          capexPercentage: "",
          totalProjectCost: "",
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
      // Increment refresh key even if no snapshot exists
      setRefreshKey(prev => prev + 1);
      // Still close forms even if no snapshot exists
      if (sectionId === '3.3') {
        setShowAddVGFForm(false);
        setNewVGFItem({
          projectName: "",
          sector: "",
          type: "",
          submissionDate: "",
          file: null,
        });
      }
      if (sectionId === '3.4') {
        setShowAddProjectForm(false);
        setNewProject({
          nameOfProject: "",
          nipId: "",
          fundingSource: "",
          infrastructureSector: "",
          dateOfAward: "",
          capexPercentage: "",
          totalProjectCost: "",
        });
      }
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
  }, [submissionId]);
  
  // Check if this section has any data
  const hasData = hasPPPDevelopmentData({ pppDevelopment: formDataState });
  let sectionsWithData = getSectionsWithData({ pppDevelopment: formDataState }, 'pppDevelopment');
  
  // For preview mode with assigned indicators, always include assigned sections even if they have no data
  // This ensures assigned indicators are visible in preview, regardless of data presence
  if (isPreview && isNodalOfficer && assignedIndicators && assignedIndicators.length > 0) {
    const assignedSectionKeys: string[] = [];
    const indicatorToSectionMap: Record<string, string> = {
      "3.1": "section3_1",
      "3.2": "section3_2",
      "3.3": "section3_3",
      "3.4": "section3_4",
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
  if ((!isPreview || (isPreview && !isNodalOfficer))) {
    const allPossibleSections = ["section3_1", "section3_2", "section3_3", "section3_4"];
    const submissionFormData = (submission as any)?.formData?.pppDevelopment || {};
    const stateToCheck = formDataState || submissionFormData;
    
    const existingSections = allPossibleSections.filter(sectionKey => {
      // Check if section key exists in formDataState or submission formData (even if value is null, empty object, or empty array)
      return sectionKey in stateToCheck || sectionKey in submissionFormData;
    });
    
    // Merge existing sections with sectionsWithData, avoiding duplicates
    sectionsWithData = Array.from(new Set([...sectionsWithData, ...existingSections]));
    console.log("🔍 [PPPDevelopmentReview] Review/preview mode (non-nodal) - showing all existing sections:", sectionsWithData);
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

  // Memoize onSendBack callback to ensure it updates when isMospiApproverSentBack changes
  const onSendBackCallback = useMemo(() => {
    const userRole = getUserRole();
    const normalizedRole = userRole?.toUpperCase();
    const isMospiReviewer = normalizedRole === 'MOSPI_REVIEWER';
    const isMospiApprover = normalizedRole === 'MOSPI_APPROVER';
    
    console.log('🔍 useMemo onSendBack - Debug Info:', {
      userRole,
      normalizedRole,
      isMospiReviewer,
      isMospiApprover,
      isMospiApproverSentBack,
      activeSection,
      willReturnUndefined: isMospiReviewer || (isMospiApprover && isMospiApproverSentBack)
    });
    
    // Don't pass onSendBack for MOSPI_REVIEWER or MOSPI_APPROVER (when isMospiApproverSentBack is true)
    // For MOSPI_APPROVER, handleSaveMessage will handle everything directly without confirmation dialog
    if (isMospiReviewer) {
      console.log('✅ useMemo: Returning undefined for MOSPI_REVIEWER');
      return undefined;
    }
    if (isMospiApprover && isMospiApproverSentBack) {
      console.log('✅ useMemo: Returning undefined for MOSPI_APPROVER (isMospiApproverSentBack=true)');
      return undefined;
    }
    // For STATE_APPROVER and other roles, pass onSendBack callback to show confirmation
    console.log('⚠️ useMemo: Returning onSendBack callback for role:', userRole);
    return (sectionId: string) => {
      console.log('⚠️ onSendBack callback called with sectionId:', sectionId);
      onIndicatorStatus(sectionId, false);
    };
  }, [isMospiApproverSentBack, activeSection]);

  const handleSaveMessage = async (updatedSubmission: unknown) => {
    // MessageModal already saved the comment, so we just need to update state and check flags
    if (updatedSubmission && typeof updatedSubmission === "object") {
      setSubmissionState(updatedSubmission);
      const updatedFormData =
        (updatedSubmission as any)?.formData?.pppDevelopment ??
        (updatedSubmission as any)?.formData ??
        formDataState;
      if (updatedFormData) {
        setFormDataState(updatedFormData);
      }

      // Check flags BEFORE closing modal to determine if we need to show confirmation
      const shouldShowSentBackConfirmation = isMospiApproverSentBack && mospiSentBackSectionId;
      const userRole = getUserRole();
      // Normalize role comparison (case-insensitive, trimmed)
      const isMospiApprover = userRole?.toUpperCase() === 'MOSPI_APPROVER';
      
      // Debug logging
      console.log('🔍 handleSaveMessage - Debug Info:', {
        shouldShowSentBackConfirmation,
        isMospiApproverSentBack,
        mospiSentBackSectionId,
        userRole,
        isMospiApprover,
        userRoleType: typeof userRole,
        userRoleValue: userRole,
        normalizedRole: userRole?.toUpperCase()
      });

      // If this was opened from MOSPI_APPROVER "Sent Back" button, directly update status without confirmation
      if (shouldShowSentBackConfirmation && isMospiApprover) {
        console.log('✅ MOSPI_APPROVER: Directly updating status to REVERTED without confirmation dialog');
        // Store section ID before resetting flags
        const sectionIdToUse = mospiSentBackSectionId;
        // Reset the flags immediately
        setIsMospiApproverSentBack(false);
        setMospiSentBackSectionId(null);
        // Close the comment modal immediately
        handleCloseModal();
        // Directly update mospi_status to REVERTED without confirmation dialog
        try {
          await performIndicatorStatus(sectionIdToUse, false);
          // Refresh submission data to get latest state from backend
          if (submissionId) {
            try {
              const refreshedSubmission = await apiService.getSubmission(submissionId);
              if (refreshedSubmission) {
                setSubmissionState(refreshedSubmission);
                if (refreshedSubmission.formData) {
                  const updatedFormData = refreshedSubmission.formData.pppDevelopment || refreshedSubmission.formData;
                  setFormDataState(updatedFormData);
                }
              }
            } catch (refreshError) {
              console.error('Failed to refresh submission:', refreshError);
              // Continue even if refresh fails - local state is already updated
            }
          }
        } catch (error) {
          console.error('Failed to update indicator status:', error);
        }
        return;
      }

      // For STATE_APPROVER, show confirmation dialog (existing behavior)
      if (shouldShowSentBackConfirmation && !isMospiApprover) {
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

  // Handle adding new project to section 3.4
  const handleAddNewProject = () => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_4?.projects || [];
      const newProjectWithId = {
        ...newProject,
        id: `project-${Date.now()}`,
        dateOfAward: newProject.dateOfAward ? new Date(newProject.dateOfAward).toISOString() : null,
      };
      return {
        ...prev,
        section3_4: {
          ...(prev?.section3_4 || {}),
          projects: [...current, newProjectWithId],
        },
      };
    });
    // Reset form
    setNewProject({
      nameOfProject: "",
      nipId: "",
      fundingSource: "",
      infrastructureSector: "",
      dateOfAward: "",
      capexPercentage: "",
      totalProjectCost: "",
    });
    setShowAddProjectForm(false);
  };

  // Handle cancel adding new project
  const handleCancelAddProject = () => {
    setNewProject({
      nameOfProject: "",
      nipId: "",
      fundingSource: "",
      infrastructureSector: "",
      dateOfAward: "",
      capexPercentage: "",
      totalProjectCost: "",
    });
    setShowAddProjectForm(false);
  };

  // Helper to update section 3.4 summary fields
  const handleSection3_4FieldUpdate = (fieldName: string, value: any) => {
    setFormDataState((prev: any) => {
      return {
        ...prev,
        section3_4: {
          ...(prev?.section3_4 || {}),
          [fieldName]: value,
        },
      };
    });
  };

  // Handle adding new VGF item to section 3.3
  const handleAddNewVGFItem = () => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_3?.VGFArray || [];
      const newVGFItemWithId = {
        ...newVGFItem,
        id: `vgf-${Date.now()}`,
        submissionDate: newVGFItem.submissionDate ? new Date(newVGFItem.submissionDate).toISOString() : null,
        file: newVGFItem.file,
      };
      return {
        ...prev,
        section3_3: {
          ...(prev?.section3_3 || {}),
          VGFArray: [...current, newVGFItemWithId],
        },
      };
    });
    // Reset form
    setNewVGFItem({
      projectName: "",
      sector: "",
      type: "",
      submissionDate: "",
      file: null,
    });
    setShowAddVGFForm(false);
  };

  // Handle cancel adding new VGF item
  const handleCancelAddVGF = () => {
    setNewVGFItem({
      projectName: "",
      sector: "",
      type: "",
      submissionDate: "",
      file: null,
    });
    setShowAddVGFForm(false);
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
            comment: state?.section3_1?.comment ?? null,
          }];
          break;

        case '3.2':
          fields = [{
            available: state?.section3_2?.available ?? null,
            file: state?.section3_2?.file ?? null,
            comment: state?.section3_2?.comment ?? null,
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
            totalProjectsAwarded: state?.section3_4?.totalProjectsAwarded ?? null,
            totalProjectCostAwarded: state?.section3_4?.totalProjectCostAwarded ?? null,
            projects: (state?.section3_4?.projects || []).map((project: any) => ({
              nameOfProject: project?.nameOfProject ?? null,
              nipId: project?.nipId ?? null,
              fundingSource: project?.fundingSource ?? null,
              infrastructureSector: project?.infrastructureSector ?? null,
              dateOfAward: project?.dateOfAward ?? null,
              capexPercentage: project?.capexPercentage ?? null,
              totalProjectCost: project?.totalProjectCost ?? null,
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
    const userRole = getUserRole();
    const isMospiApprover = userRole === 'MOSPI_APPROVER';
    const isStateApprover = userRole === 'STATE_APPROVER';
    
    // For MOSPI_APPROVER, use mospi_status field instead of status
    const payload: any = {
      submissionId,
      category: 'pppDevelopment',
      section: `section${sectionId.replace('.', '_')}`,
      status,
    };
    
    // If MOSPI_APPROVER, add mospi_status field
    if (isMospiApprover) {
      payload.mospi_status = status ? 'ACCEPTED' : 'REVERTED';
    }
    
    // If STATE_APPROVER is accepting or sending back, get sourceSubmissionId from indicatorMapping
    if (isStateApprover) {
      const fullFormData = (submission as any)?.formData || {};
      const indicatorMapping = fullFormData?._metadata?.indicatorMapping || {};
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      const mappingKey = `pppDevelopment.${sectionKey}`;
      const indicatorInfo = indicatorMapping[mappingKey];
      
      if (indicatorInfo?.sourceSubmissionId) {
        payload.sourceSubmissionId = indicatorInfo.sourceSubmissionId;
        const action = status ? 'Accept' : 'Send Back';
        console.log(`📋 [STATE_APPROVER ${action}] Adding sourceSubmissionId: ${indicatorInfo.sourceSubmissionId} for ${mappingKey}`);
      } else {
        const action = status ? 'Accept' : 'Send Back';
        console.warn(`⚠️ [STATE_APPROVER ${action}] No sourceSubmissionId found in indicatorMapping for ${mappingKey}`);
      }
    }
    
    try {
      await apiService.indicatorStatus(payload);
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      const statusField = isMospiApprover ? 'mospi_status' : 'status';
      const statusValue = status ? 'ACCEPTED' : 'REVERTED';
      
      setFormDataState((prev: any) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (next && next[sectionKey]) {
          next[sectionKey] = {
            ...next[sectionKey],
            [statusField]: statusValue,
          };
        }
        return next;
      });
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
      
      // Refresh submission data to get latest state from backend
      if (submissionId) {
        try {
          const refreshedSubmission = await apiService.getSubmission(submissionId);
          if (refreshedSubmission) {
            setSubmissionState(refreshedSubmission);
            if (refreshedSubmission.formData) {
              const updatedFormData = refreshedSubmission.formData.pppDevelopment || refreshedSubmission.formData;
              setFormDataState(updatedFormData);
            }
          }
        } catch (refreshError) {
          console.error('Failed to refresh submission:', refreshError);
          // Continue even if refresh fails - local state is already updated
        }
      }
      
      setShowAcceptDialog(false);
      setPendingActionSectionId(null);
      // Comment modal is already closed before showing confirmation dialog
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
    const submissionStatus = (submission as any)?.status;
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
      const sectionData = state ? state[sectionKey] : undefined;
      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;
      
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
        // Get sectionStatus for MOSPI_APPROVER to check if status is also REVERTED
        const sectionKeyForStatus = `section${sectionId.replace('.', '_')}`;
        const sectionDataForStatus = state ? state[sectionKeyForStatus] : undefined;
        const sectionStatusForMospi = sectionDataForStatus
          ? Array.isArray(sectionDataForStatus)
            ? (sectionDataForStatus as any).status
            : sectionDataForStatus.status
          : undefined;
        const isStatusAlsoReverted = sectionStatusForMospi === 'REVERTED';
        
        return (
          <div className="flex gap-2">
            {/* Show "Sent Back" badge if status is also REVERTED */}
            {isStatusAlsoReverted && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-red-100 text-red-700 cursor-default"
                disabled
              >
                <RotateCcw className="w-4 h-4" />
                Sent Back
              </Button>
            )}
            {/* Show "Returned from MoSPI" badge if mospi_status is REVERTED */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 font-bold cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
    const sectionData = state ? state[sectionKey] : undefined;
    const sectionStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any).status
        : sectionData.status
      : undefined;
    
    // Get mospi_status for all roles (needed to show both badges)
    const mospiStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData.mospi_status
      : undefined;
    
    // Check if status is REVERTED or mospi_status is REVERTED
    const isStatusReverted = sectionStatus === 'REVERTED';
    const isMospiStatusReverted = mospiStatus === 'REVERTED';

    // For STATE_APPROVER, handle all edge cases based on status and mospi_status combinations
    if (isStateApprover) {
      // Helper to check if mospi_status is NA/undefined
      const isMospiStatusNA = !mospiStatus || mospiStatus === 'NA' || mospiStatus === '';
      const isMospiStatusAccepted = mospiStatus === 'ACCEPTED';
      const isMospiStatusResubmitted = mospiStatus === 'RESUBMITTED';
      
      // Row 1: status=ACCEPTED, mospi_status=NA → "Under Review"
      if (sectionStatus === 'ACCEPTED' && isMospiStatusNA) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-4 h-4" />
              Timeline ({commentCount})
            </Button>
          </div>
        );
      }
      
      // Row 2: status=REVERTED, mospi_status=NA → "Sent Back"
      if (isStatusReverted && isMospiStatusNA) {
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
      
      // Row 3: status=RESUBMITTED, mospi_status=NA → "Edit, Resubmitted (Disable), Accept"
      if (sectionStatus === 'RESUBMITTED' && isMospiStatusNA) {
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => onIndicatorStatus(sectionId, true)}
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
      
      // Row 4: status=ACCEPTED, mospi_status=ACCEPTED → "Accepted(Disable)"
      if (sectionStatus === 'ACCEPTED' && isMospiStatusAccepted) {
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
      
      // Row 5: status=ACCEPTED, mospi_status=REVERTED → "Edit, Send Back, Returned From Mospi, Accept"
      if (sectionStatus === 'ACCEPTED' && isMospiStatusReverted) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenModal(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
      
      // Row 6: status=ACCEPTED, mospi_status=RESUBMITTED → "Under Review"
      if (sectionStatus === 'ACCEPTED' && isMospiStatusResubmitted) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-4 h-4" />
              Timeline ({commentCount})
            </Button>
          </div>
        );
      }
      
      // Row 7: status=REVERTED, mospi_status=ACCEPTED → "Accepted(Disable)"
      if (isStatusReverted && isMospiStatusAccepted) {
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
      
      // Row 8: status=REVERTED, mospi_status=REVERTED → "Sent Back(Disable), Returned From Mospi"
      if (isStatusReverted && isMospiStatusReverted) {
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
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
      
      // Row 9: status=REVERTED, mospi_status=RESUBMITTED → "Edit, Send Back, Returned From Mospi, Accept"
      if (isStatusReverted && isMospiStatusResubmitted) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenModal(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
      
      // Row 10: status=RESUBMITTED, mospi_status=ACCEPTED → "Accepted(Disable)"
      if (sectionStatus === 'RESUBMITTED' && isMospiStatusAccepted) {
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
      
      // Row 11: status=RESUBMITTED, mospi_status=REVERTED → "Edit, Send Back, Returned From Mospi, Accept"
      if (sectionStatus === 'RESUBMITTED' && isMospiStatusReverted) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenModal(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
      
      // Row 12: status=RESUBMITTED, mospi_status=RESUBMITTED → "Edit, Sent Back, Returned From Mospi, Accept"
      if (sectionStatus === 'RESUBMITTED' && isMospiStatusResubmitted) {
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
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
      
      // Row 13: status=NA, mospi_status=NA → "Edit, Send Back, Accept"
      if (!sectionStatus && isMospiStatusNA) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenModal(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
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
      
      // Row 14: status=NA, mospi_status=ACCEPTED → "Accepted(Disable)"
      if (!sectionStatus && isMospiStatusAccepted) {
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
      
      // Row 15: status=NA, mospi_status=REVERTED → "Edit, Send Back, Returned From Mospi, Accept"
      if (!sectionStatus && isMospiStatusReverted) {
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
              className="flex items-center gap-1"
              onClick={() => handleOpenModal(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
    }
    
    // Rule 3: For non-STATE_APPROVER roles, if status is ACCEPTED
    if (sectionStatus === 'ACCEPTED') {
      // If mospi_status = "REVERTED", show "Returned from MoSPI" badge
      if (mospiStatus === 'REVERTED') {
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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
      // Otherwise, show only "Accepted" and "Timeline"
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
    
    
    // Rule 2: If status = "REVERTED", show disabled "Sent Back" badge
    // For NODAL_OFFICER, also show Edit button
    if (isStatusReverted) {
      // If NODAL_OFFICER, show Edit button + Sent Back badge
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
            {/* Show "Returned from MoSPI" badge if mospi_status is also REVERTED */}
            {isMospiStatusReverted && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
                disabled
              >
                <RotateCcw className="w-4 h-4" />
                Returned from MoSPI
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
          </div>
        );
      }
      
      // For other roles, show only disabled "Sent Back" badge (no Edit, no Send Back button)
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
          {/* Show "Returned from MoSPI" badge if mospi_status is also REVERTED */}
          {isMospiStatusReverted && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 border-orange-300 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from MoSPI
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

        {/* Rule 1: Show Send Back if status is not RESUBMITTED for STATE_APPROVER */}
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

            {(state?.section3_1?.available === "yes") && (() => {
              // Debug logging
              console.log("🔍 [PPPDevelopmentReview] Section 3.1 files data:", {
                section3_1: state?.section3_1,
                files: state?.section3_1?.files,
                filesType: typeof state?.section3_1?.files,
                isArray: Array.isArray(state?.section3_1?.files),
                file: state?.section3_1?.file,
              });
              
              return (
                <div>
                  <EditableFileDisplay
                    files={state?.section3_1?.files ?? state?.section3_1?.file ?? null}
                    isEditable={isEditable('3.1')}
                    submissionId={submissionId}
                    onFilesChange={(updatedFiles) => handleFileUpdate('3.1', updatedFiles)}
                    label="Uploaded Files"
                    multiple={true}
                  />
                </div>
              );
            })()}

            {(state?.section3_1?.available === "no") && (
              <div>
                <Label className="mb-2 block">Comment</Label>
                {isEditable('3.1') ? (
                  <Textarea
                    value={state?.section3_1?.comment || ""}
                    onChange={(e) => handleFieldUpdate('3.1', 'comment', e.target.value)}
                    placeholder="Please provide a comment..."
                    className="min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {state?.section3_1?.comment || "No comment provided"}
                  </div>
                )}
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

              {(state?.section3_2?.available === "no") && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {isEditable('3.2') ? (
                    <Textarea
                      value={state?.section3_2?.comment || ""}
                      onChange={(e) => handleFieldUpdate('3.2', 'comment', e.target.value)}
                      placeholder="Please provide a comment..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section3_2?.comment || "No comment provided"}
                    </div>
                  )}
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
          key={`section-3.3-${refreshKey}`}
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
                  <tbody key={`vgf-table-body-${selectResetKey}-${refreshKey}-${state?.section3_3?.VGFArray?.length || 0}`}>
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
                              <div className="space-y-1.5">
                                {item.file ? (
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                    title={item.file.fileName || 'Unknown file'}
                                  >
                                    <Upload className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{item.file.fileName || 'Unknown file'}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleTableFieldUpdate(index, 'file', null);
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
                                          
                                          await handleTableFieldUpdate(index, 'file', newFile);
                                          e.target.value = ''; // Reset input
                                        } catch (error: any) {
                                          console.error('Failed to upload file:', error);
                                        }
                                      }
                                    }}
                                    className="hidden"
                                    id={`file-input-3.3-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => document.getElementById(`file-input-3.3-${index}`)?.click()}
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              item.file ? (
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                  title={item.file.fileName || 'Unknown file'}
                                >
                                  <Upload className="w-3 h-3" />
                                  <span className="truncate">{item.file.fileName || 'Unknown file'}</span>
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

              {/* Add More Project Button - Only visible when in edit mode */}
              {isEditable('3.3') && !showAddVGFForm && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowAddVGFForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
              )}

              {/* Add VGF Form - Only visible when showAddVGFForm is true */}
              {showAddVGFForm && isEditable('3.3') && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add New VGF/IIPDF Proposal</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Project Name</Label>
                      <Input 
                        value={newVGFItem.projectName} 
                        onChange={(e) => setNewVGFItem({...newVGFItem, projectName: e.target.value})}
                        className="bg-white"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <Label>Sector</Label>
                      <Select
                        value={newVGFItem.sector}
                        onValueChange={(value) => setNewVGFItem({...newVGFItem, sector: value})}
                      >
                        <SelectTrigger className="bg-white">
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
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newVGFItem.type}
                        onValueChange={(value) => setNewVGFItem({...newVGFItem, type: value})}
                      >
                        <SelectTrigger className="bg-white">
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
                    </div>
                    <div>
                      <Label>Submission Date</Label>
                      <Input
                        type="date"
                        value={newVGFItem.submissionDate}
                        onChange={(e) => setNewVGFItem({...newVGFItem, submissionDate: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Upload File</Label>
                      <EditableFileDisplay
                        files={newVGFItem.file}
                        isEditable={true}
                        submissionId={submissionId}
                        onFilesChange={(updatedFile) => {
                          setNewVGFItem({...newVGFItem, file: updatedFile as FileUpload | null});
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
                      onClick={handleAddNewVGFItem}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Proposal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelAddVGF}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
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
          key={`section-3.4-${refreshKey}`}
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
              {/* Summary Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Total Projects Awarded</Label>
                  {isEditable('3.4') ? (
                    <Input
                      value={state?.section3_4?.totalProjectsAwarded || ""}
                      onChange={(e) => handleSection3_4FieldUpdate('totalProjectsAwarded', e.target.value)}
                      className="bg-white"
                      placeholder="Enter total projects awarded"
                    />
                  ) : (
                    <Input
                      value={state?.section3_4?.totalProjectsAwarded || ""}
                      readOnly
                      className="bg-gray-50"
                    />
                  )}
                </div>
                <div>
                  <Label>Total Project Cost Awarded</Label>
                  {isEditable('3.4') ? (
                    <Input
                      value={state?.section3_4?.totalProjectCostAwarded || ""}
                      onChange={(e) => handleSection3_4FieldUpdate('totalProjectCostAwarded', e.target.value)}
                      className="bg-white"
                      placeholder="Enter total project cost awarded"
                    />
                  ) : (
                    <Input
                      value={state?.section3_4?.totalProjectCostAwarded || ""}
                      readOnly
                      className="bg-gray-50"
                    />
                  )}
                </div>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Name of Project</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">NIP ID</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Funding Source</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Infrastructure Sector</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Date of Award</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">% Capex</th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Total Project Cost</th>
                    </tr>
                  </thead>
                  <tbody key={`projects-table-body-${selectResetKey}-${refreshKey}-${state?.section3_4?.projects?.length || 0}`}>
                    {(() => {
                      const projects = Array.isArray(state?.section3_4?.projects)
                        ? state.section3_4.projects
                        : [];

                      if (!projects.length) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-muted-foreground">
                              No projects available
                            </td>
                          </tr>
                        );
                      }

                      return projects.map((project: any, idx: number) => (
                        <tr key={project.id || idx} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Input
                                value={project.nameOfProject || ""}
                                onChange={(e) => handleProjectFieldUpdate(idx, 'nameOfProject', e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              project.nameOfProject || 'N/A'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Input
                                value={project.nipId || ""}
                                onChange={(e) => handleProjectFieldUpdate(idx, 'nipId', e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              project.nipId || 'N/A'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Input
                                value={project.fundingSource || ""}
                                onChange={(e) => handleProjectFieldUpdate(idx, 'fundingSource', e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              project.fundingSource || 'N/A'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Select
                                key={`infrastructureSector-${idx}-${selectResetKey}`}
                                value={project.infrastructureSector || ""}
                                onValueChange={(value) => handleProjectFieldUpdate(idx, 'infrastructureSector', value)}
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
                              project.infrastructureSector || 'N/A'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Input
                                type="date"
                                value={project.dateOfAward 
                                  ? new Date(project.dateOfAward).toISOString().split('T')[0]
                                  : ""}
                                onChange={(e) => handleProjectFieldUpdate(idx, 'dateOfAward', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                className="w-full"
                              />
                            ) : (
                              project.dateOfAward ? new Date(project.dateOfAward).toLocaleDateString() : 'N/A'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Input
                                value={project.capexPercentage || ""}
                                onChange={(e) => handleProjectFieldUpdate(idx, 'capexPercentage', e.target.value)}
                                className="w-full"
                              />
                            ) : (
                              project.capexPercentage || 'N/A'
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {isEditable('3.4') ? (
                              <Input
                                value={project.totalProjectCost || ""}
                                onChange={(e) => handleProjectFieldUpdate(idx, 'totalProjectCost', e.target.value)}
                                className="w-full"
                                placeholder="Enter cost"
                              />
                            ) : (
                              project.totalProjectCost || 'N/A'
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Add More Project Button - Only visible when in edit mode */}
              {isEditable('3.4') && !showAddProjectForm && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowAddProjectForm(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
              )}

              {/* Add Project Form - Only visible when showAddProjectForm is true */}
              {showAddProjectForm && isEditable('3.4') && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add New Project</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name of PPP/Bankable Projects</Label>
                      <Input 
                        value={newProject.nameOfProject} 
                        onChange={(e) => setNewProject({...newProject, nameOfProject: e.target.value})}
                        className="bg-white"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <Label>NIP ID</Label>
                      <Input 
                        value={newProject.nipId} 
                        onChange={(e) => setNewProject({...newProject, nipId: e.target.value})}
                        className="bg-white"
                        placeholder="Enter NIP ID"
                      />
                    </div>
                    <div>
                      <Label>Funding Source</Label>
                      <Input 
                        value={newProject.fundingSource} 
                        onChange={(e) => setNewProject({...newProject, fundingSource: e.target.value})}
                        className="bg-white"
                        placeholder="Enter funding source"
                      />
                    </div>
                    <div>
                      <Label>Infrastructure Sector</Label>
                      <Select
                        value={newProject.infrastructureSector}
                        onValueChange={(value) => setNewProject({...newProject, infrastructureSector: value})}
                      >
                        <SelectTrigger className="bg-white">
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
                    </div>
                    <div>
                      <Label>Date of Award</Label>
                      <Input
                        type="date"
                        value={newProject.dateOfAward}
                        onChange={(e) => setNewProject({...newProject, dateOfAward: e.target.value})}
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>% of Capex funded by non-Govt sources</Label>
                      <Input 
                        value={newProject.capexPercentage} 
                        onChange={(e) => setNewProject({...newProject, capexPercentage: e.target.value})}
                        className="bg-white"
                        placeholder="Enter percentage"
                      />
                    </div>
                    <div>
                      <Label>Total Project Cost</Label>
                      <Input 
                        value={newProject.totalProjectCost} 
                        onChange={(e) => setNewProject({...newProject, totalProjectCost: e.target.value})}
                        className="bg-white"
                        placeholder="Enter total project cost"
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
          return userRole === 'MOSPI_REVIEWER' ? 'comment' : 'indicator_comment';
        })()}
        onSendBack={onSendBackCallback}
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
