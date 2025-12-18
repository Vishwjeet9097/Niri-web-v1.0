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
import {
  MessageSquare,
  Upload,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  CheckCircle,
  X,
  Check,
  Edit3,
  Eye,
  Download,
} from "lucide-react";
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
import {
  hasInfraEnablersData,
  getSectionsWithData,
} from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import {
  computeStepProgress,
  STEP_SECTIONS,
} from "@/features/submission/utils/progress";
import { useEditableSectionStore } from "@/utils/EditableSection";
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { validateInfraEnablers } from "@/features/submission/validation/infraEnablersValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { Badge } from "@/components/ui/badge";
import {
  IMPACT_OPTIONS,
  TRAINING_TYPE_OPTIONS,
} from "@/features/submission/constants/steps";

interface InfraEnablersReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
}

export const InfraEnablersReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
  assignedIndicators = [],
  isNodalOfficer = false,
}: InfraEnablersReviewProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(formData);
  const { assignedIndicators: hookAssignedIndicators } = useIndicatorAccess();
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Helper function to get error message for a field
  const getFieldError = (fieldPath: string): string | undefined => {
    return validationErrors[fieldPath];
  };

  // Use submissionState for the hook so it gets updated comments
  // Merge submission prop updates with local submissionState
  const currentSubmission = submissionState || submission;
  const { saveMessage, getMessage, getComments, getAllComments } =
    useSectionMessages(submissionId, currentSubmission);

  // Sync submissionState when submission prop changes from parent
  useEffect(() => {
    if (submission) {
      setSubmissionState(submission);
    }
  }, [submission]);

  // Store original formDataState snapshot when edit mode starts (for cancel functionality)
  const [originalFormDataSnapshot, setOriginalFormDataSnapshot] =
    useState<any>(null);
  // Flag to prevent useEffect from overriding cancel restore
  const isRestoringRef = useRef(false);
  // Counter to force remount of Select components on cancel
  const [selectResetKey, setSelectResetKey] = useState(0);

  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveSectionId, setPendingSaveSectionId] = useState<
    string | null
  >(null);

  // State for Send Back and Accept confirmation dialogs
  const [showSendBackDialog, setShowSendBackDialog] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [pendingActionSectionId, setPendingActionSectionId] = useState<
    string | null
  >(null);

  // State to track if comment modal was opened from MOSPI_APPROVER "Sent Back" button
  // (Accept no longer requires comment, so it directly shows confirmation)
  const [isMospiApproverSentBack, setIsMospiApproverSentBack] = useState(false);

  // Helper to extract original name from UUID-prefixed fileName for existing files
  const extractOriginalName = (fileName: string, originalName?: string): string => {
    if (originalName && originalName.trim()) return originalName;
    
    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
    
    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, '');
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }
    
    return fileName;
  };

  // Helper functions for file access
  function readAccessTokenFromLocalStorage(): string | undefined {
    try {
      const raw = localStorage.getItem("niri_app:auth_tokens");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed?.value?.accessToken;
    } catch (e) {
      console.warn("Failed to read auth token from localStorage", e);
      return undefined;
    }
  }

  async function fetchSignedUrl(
    filePath: string,
    token?: string
  ): Promise<string> {
    if (!filePath) throw new Error("Missing filePath");

    const encoded = encodeURIComponent(filePath);
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
    const url = `${base.replace(/\/$/, "")}/file/url/${encoded}`;

    const accessToken = token ?? readAccessTokenFromLocalStorage();
    if (!accessToken) throw new Error("No auth token available. Please login.");

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      const signed =
        json?.data?.signedUrl ?? json?.signedUrl ?? json?.url ?? null;
      if (!signed)
        throw new Error(
          `Signed URL not found in response: ${text.slice(0, 300)}`
        );
      return signed;
    } catch (err) {
      const trimmed = text.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      throw new Error(
        `Unexpected response when fetching signed URL: ${text.slice(0, 300)}`
      );
    }
  }

  function isProbablyUrl(s: string) {
    return typeof s === "string" && /^https?:\/\//i.test(s);
  }

  // Loading state for file operations
  const [fileLoading, setFileLoading] = useState<Record<string, boolean>>({});

  // Handler functions for viewing and downloading files
  const handleViewFile = async (file: any, fileKey: string) => {
    // If file has a direct fileUrl, use it
    if (file.fileUrl) {
      window.open(file.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // If file has filePath, fetch signed URL
    if (file.filePath || file.file) {
      setFileLoading((s) => ({ ...s, [fileKey]: true }));
      try {
        const filePath = file.filePath || file.file;
        const signed = await fetchSignedUrl(filePath);
        if (!isProbablyUrl(signed)) {
          console.error("Signed URL is not a valid URL:", signed);
          alert("Received invalid file URL. Check console/network tab.");
          return;
        }
        window.open(signed, "_blank", "noopener,noreferrer");
      } catch (err: any) {
        console.error(err);
        alert("Failed to open file: " + (err.message || err));
      } finally {
        setFileLoading((s) => ({ ...s, [fileKey]: false }));
      }
      return;
    }

    alert("File path or URL missing.");
  };

  const handleDownloadFile = async (file: any, fileKey: string) => {
    // If file has a direct fileUrl, download it
    if (file.fileUrl) {
      const a = document.createElement("a");
      a.href = file.fileUrl;
      a.download = file.originalName || file.fileName || "file";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // If file has filePath, use backend download endpoint
    if (file.filePath || file.file) {
      setFileLoading((s) => ({ ...s, [fileKey]: true }));
      let blobUrl: string | null = null;
      try {
        const filePath = file.filePath || file.file;
        const encoded = encodeURIComponent(filePath);
        const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const downloadUrl = `${base.replace(/\/$/, "")}/file/download/${encoded}`;

        const accessToken = readAccessTokenFromLocalStorage();
        if (!accessToken) {
          throw new Error("No auth token available. Please login.");
        }

        const response = await fetch(downloadUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = file.originalName || file.fileName || "file";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err: any) {
        console.error(err);
        alert("Download failed: " + (err.message || err));
      } finally {
        if (blobUrl) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl!);
          }, 100);
        }
        setFileLoading((s) => ({ ...s, [fileKey]: false }));
      }
      return;
    }

    alert("File path or URL missing.");
  };
  const [mospiSentBackSectionId, setMospiSentBackSectionId] = useState<
    string | null
  >(null);

  // State to track if comment modal was opened from STATE_APPROVER "Send Back" button
  const [isStateApproverSentBack, setIsStateApproverSentBack] = useState(false);
  const [stateApproverSentBackSectionId, setStateApproverSentBackSectionId] =
    useState<string | null>(null);

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
      const authUser = localStorage.getItem("niri_app:auth_user");
      if (authUser) {
        const user = JSON.parse(authUser);
        return user.value?.role;
      }
    } catch (error) {
      console.error("Error reading user role:", error);
    }
    return null;
  };

  //State for edit button
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();

  // Helper function to check if section should be editable based on mospi_status for STATE_APPROVER
  const shouldBeEditable = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[InfraEnablersReview] shouldBeEditable(${sectionId}):`, {
      userRole,
      isNodalOfficer,
      isStateApprover,
      submissionStatus,
      isCurrentlyEditable: isEditable(sectionId),
    });

    // For NODAL_OFFICER, check submission status
    if (isNodalOfficer) {
      // NODAL_OFFICER can only edit when status is DRAFT or RETURNED_FROM_STATE
      const statusAllowsEditing =
        submissionStatus === "DRAFT" ||
        submissionStatus === "RETURNED_FROM_STATE";
      const result = statusAllowsEditing ? isEditable(sectionId) : false;
      console.log(`[InfraEnablersReview] NODAL_OFFICER shouldBeEditable:`, {
        sectionId,
        submissionStatus,
        statusAllowsEditing,
        isCurrentlyEditable: isEditable(sectionId),
        result,
        reason: !statusAllowsEditing
          ? `Status ${submissionStatus} does not allow editing`
          : result
          ? "Section is in edit mode"
          : "Section is not in edit mode",
      });
      if (!statusAllowsEditing) {
        return false;
      }
      // If status allows editing, check if section is in edit mode
      return isEditable(sectionId);
    }

    // For STATE_APPROVER, check submission status first
    if (isStateApprover) {
      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      // Should NOT have editing access when status is SUBMITTED_TO_MOSPI_REVIEWER or SUBMITTED_TO_MOSPI_APPROVER
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (state && state[sectionKey]) || (formData && formData[sectionKey]);
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

      // If mospi_status is ACCEPTED, section should NOT be editable
      if (mospiStatus === "ACCEPTED") {
        return false;
      }
      // If mospi_status is REVERTED, section CAN be edited
      // But it's only editable if it's currently in edit mode (isEditable returns true)
      if (mospiStatus === "REVERTED") {
        return isEditable(sectionId);
      }
      // If mospi_status is not set, allow editing if in edit mode (for initial state editing)
      return isEditable(sectionId);
    }

    // For other roles or when mospi_status is not set, use existing isEditable logic
    return isEditable(sectionId);
  };

  // Handle edit mode start - store original state snapshot
  // Helper function to check if section CAN be edited (permission check, not state check)
  const canEditSection = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[InfraEnablersReview] canEditSection(${sectionId}):`, {
      userRole,
      isNodalOfficer,
      isStateApprover,
      submissionStatus,
      submissionId: submission?.id,
    });

    // For NODAL_OFFICER, check submission status
    if (isNodalOfficer) {
      // NODAL_OFFICER can only edit when status is DRAFT or RETURNED_FROM_STATE
      const canEdit =
        submissionStatus === "DRAFT" ||
        submissionStatus === "RETURNED_FROM_STATE";
      console.log(`[InfraEnablersReview] NODAL_OFFICER canEdit check:`, {
        sectionId,
        submissionStatus,
        canEdit,
        reason: canEdit
          ? "Status allows editing"
          : `Status ${submissionStatus} does not allow editing (needs DRAFT or RETURNED_FROM_STATE)`,
      });
      return canEdit;
    }

    if (isStateApprover) {
      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (state && state[sectionKey]) || (formData && formData[sectionKey]);
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

      // If mospi_status is ACCEPTED, section CANNOT be edited
      if (mospiStatus === "ACCEPTED") {
        return false;
      }
      // If mospi_status is REVERTED, section CAN be edited
      if (mospiStatus === "REVERTED") {
        return true;
      }
    }

    // For other roles or when mospi_status is not set, allow editing
    return true;
  };

  const handleEditStart = (sectionId: string) => {
    console.log(
      `[InfraEnablersReview] handleEditStart called for section ${sectionId}`
    );
    const userRole = getUserRole();
    const submissionStatus = submission?.status;

    // Check if section CAN be edited (permission check)
    const canEdit = canEditSection(sectionId);
    console.log(
      `[InfraEnablersReview] handleEditStart - canEditSection result:`,
      {
        sectionId,
        userRole,
        submissionStatus,
        canEdit,
      }
    );

    if (!canEdit) {
      console.warn(
        `[InfraEnablersReview] ❌ Cannot edit section ${sectionId} - Permission denied`,
        {
          userRole,
          submissionStatus,
          reason: "canEditSection returned false",
        }
      );
      return;
    }

    console.log(
      `[InfraEnablersReview] ✅ Starting edit mode for section ${sectionId}`
    );
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
      setSelectResetKey((prev) => prev + 1);

      // Close and reset "Add Project" form for section 4.3
      if (sectionId === "4.3") {
        setShowAddProjectForm(false);
        setNewProject({
          projectName: "",
          sector: "",
          file: null,
        });
      }

      // Close and reset "Add Practice" form for section 4.5
      if (sectionId === "4.5") {
        setShowAddPracticeForm(false);
        setNewPractice({
          practiceName: "",
          impact: "",
          file: null,
        });
      }

      // Close and reset "Add Capacity Entry" form for section 4.6
      if (sectionId === "4.6") {
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
      if (sectionId === "4.3") {
        setShowAddProjectForm(false);
        setNewProject({
          projectName: "",
          sector: "",
          file: null,
        });
      }
      if (sectionId === "4.5") {
        setShowAddPracticeForm(false);
        setNewPractice({
          practiceName: "",
          impact: "",
          file: null,
        });
      }
      if (sectionId === "4.6") {
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
        setSubmissionState((prev) => ({
          ...prev,
          indicatorComment: comments,
          updatedAt: new Date().toISOString(),
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

    window.addEventListener(
      "niri-comment-updated",
      handleCommentUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-comment-updated",
        handleCommentUpdate as EventListener
      );
    };
  }, [submissionId]);

  // Check if this section has any data
  const hasData = hasInfraEnablersData({ infraEnablers: state });
  let sectionsWithData = getSectionsWithData(
    { infraEnablers: state },
    "infraEnablers"
  );

  // For preview mode with assigned indicators, always include assigned sections even if they have no data
  // This ensures assigned indicators are visible in preview, regardless of data presence
  if (
    isPreview &&
    isNodalOfficer &&
    assignedIndicators &&
    assignedIndicators.length > 0
  ) {
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
  // Only include sections that have meaningful data - don't show empty/unsubmitted indicators
  // This ensures state approvers only see indicators that were actually saved/submitted by nodal officers
  if (
    (!isPreview || (isPreview && !isNodalOfficer)) &&
    state &&
    typeof state === "object"
  ) {
    const allPossibleSections = [
      "section4_1",
      "section4_2",
      "section4_3",
      "section4_4",
      "section4_5",
      "section4_6",
    ];
    const existingSections = allPossibleSections.filter((sectionKey) => {
      // Check if section key exists in state
      if (!(sectionKey in state)) {
        return false;
      }

      const section = state[sectionKey];

      // Check if section has meaningful data (not just empty object, null, or empty array)
      if (!section || typeof section !== "object") return false;

      // For array-based sections, check if array has data
      if (Array.isArray(section)) {
        return (
          section.length > 0 &&
          section.some((item) => {
            if (!item || typeof item !== "object") return false;
            return (
              Object.keys(item).length > 0 &&
              Object.values(item).some(
                (val) => val !== null && val !== undefined && val !== ""
              )
            );
          })
        );
      }

      // For object sections, check if they have any meaningful values
      return Object.values(section).some((val) => {
        if (val === null || val === undefined || val === "") return false;
        if (Array.isArray(val) && val.length === 0) return false;
        if (typeof val === "object" && Object.keys(val).length === 0)
          return false;
        return true;
      });
    });

    // Merge existing sections with sectionsWithData, avoiding duplicates
    sectionsWithData = Array.from(
      new Set([...sectionsWithData, ...existingSections])
    );
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
    // Reset STATE_APPROVER Sent Back flags when modal closes
    setIsStateApproverSentBack(false);
    setStateApproverSentBackSectionId(null);
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
      const shouldShowSentBackConfirmation =
        (isMospiApproverSentBack && mospiSentBackSectionId) ||
        (isStateApproverSentBack && stateApproverSentBackSectionId);

      // If this was opened from MOSPI_APPROVER or STATE_APPROVER "Sent Back" button, show confirmation dialog
      if (shouldShowSentBackConfirmation) {
        // Store section ID before resetting flags
        const sectionIdToUse =
          mospiSentBackSectionId || stateApproverSentBackSectionId;
        setPendingActionSectionId(sectionIdToUse);
        // Reset the flags
        setIsMospiApproverSentBack(false);
        setMospiSentBackSectionId(null);
        setIsStateApproverSentBack(false);
        setStateApproverSentBackSectionId(null);
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
    console.log(
      `[InfraEnablersReview] onSaveSection called for section ${sectionId}`
    );
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";

    console.log(`[InfraEnablersReview] onSaveSection - User info:`, {
      userRole,
      isNodalOfficer,
      sectionId,
    });

    // Check if this is a resubmission of a sent-back indicator
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const sectionData = formDataState && formDataState[sectionKey];
    const currentStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any).status
        : sectionData.status
      : undefined;
    const upperStatus = (currentStatus || "").toUpperCase();
    const isReverted = upperStatus === "REVERTED";

    console.log(`[InfraEnablersReview] onSaveSection - Status check:`, {
      sectionKey,
      sectionData,
      currentStatus,
      upperStatus,
      isReverted,
      formDataStateKeys: formDataState ? Object.keys(formDataState) : [],
    });

    // If NODAL_OFFICER and status is REVERTED (sent back), show confirmation dialog first
    if (isNodalOfficer && isReverted) {
      console.log(
        `[InfraEnablersReview] ✅ Showing save confirmation dialog for REVERTED indicator`
      );
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    console.log(
      `[InfraEnablersReview] ✅ Proceeding with direct save (not REVERTED or not NODAL_OFFICER)`
    );
    // For non-NODAL_OFFICER users or non-REVERTED status, proceed with submit directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    console.log(
      `[InfraEnablersReview] performSave called for section ${sectionId}`
    );
    try {
      // Map visual section id to payload section key (e.g. "4.1" -> "section4_1")
      const payloadSection = `section${sectionId.replace(".", "_")}`;
      console.log(
        `[InfraEnablersReview] performSave - Starting save process:`,
        {
          sectionId,
          payloadSection,
        }
      );

      // Use the local formData state (formDataState) to build fields for this section
      let fields: Record<string, any>[] = [];

      // Check if user is NODAL_OFFICER or STATE_APPROVER to preserve status
      const userRole = getUserRole();
      const isNodalOfficer = userRole === "NODAL_OFFICER";
      const isStateApprover = userRole === "STATE_APPROVER";

      switch (sectionId) {
        case "4.1":
          // Use local state for section 4.1 data
          console.log("Section_4_1 state", state?.section4_1);
          fields = [
            {
              allEligible: state?.section4_1?.allEligible ?? null,
              websiteLink: state?.section4_1?.websiteLink ?? null,
              file: state?.section4_1?.file ?? null,
              comment: state?.section4_1?.comment ?? null,
            },
          ];
          break;

        case "4.2":
          // Use local state for section 4.2 data
          console.log("Section_4_2 state", state?.section4_2);
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
            file:
              typeof file.file === "string"
                ? file.file
                : file.filePath || file.fileUrl || null,
            fileName: file.fileName,
            originalName: (file as any)?.originalName || file.fileName,
            fileSize: file.fileSize,
            uploadedAt: file.uploadedAt,
            filePath: file.filePath,
            fileUrl: file.fileUrl,
            mimeType: file.mimeType,
          }));

          fields = [
            {
              available: state?.section4_2?.available ?? null,
              files: files4_2,
              file: toSingleFile(section4_2Files),
              websiteLink: state?.section4_2?.websiteLink ?? null,
              comment: state?.section4_2?.comment ?? null,
            },
          ];
          break;

        case "4.3":
          // Use local state for section 4.3 data
          console.log("Section_4_3 state", state?.section4_3);
          const projects4_3 = (state?.section4_3?.projects || []).map(
            (project: any) => ({
              id: project.id,
              projectName: project.projectName ?? null,
              sector: project.sector ?? null,
              file: project.file ?? null,
            })
          );
          fields = [
            {
              adopted: state?.section4_3?.adopted ?? null,
              projects: projects4_3,
              comment: state?.section4_3?.comment ?? null,
            },
          ];
          break;

        case "4.4":
          // Use local state for section 4.4 data
          console.log("Section_4_4 state", state?.section4_4);
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
            file:
              typeof file.file === "string"
                ? file.file
                : file.filePath || file.fileUrl || null,
            fileName: file.fileName,
            originalName: (file as any)?.originalName || file.fileName,
            fileSize: file.fileSize,
            uploadedAt: file.uploadedAt,
            filePath: file.filePath,
            fileUrl: file.fileUrl,
            mimeType: file.mimeType,
          }));

          fields = [
            {
              adopted: state?.section4_4?.adopted ?? null,
              files: files4_4,
              file: toSingleFile(section4_4Files),
              marksObtained: state?.section4_4?.marksObtained ?? null,
              comment: state?.section4_4?.comment ?? null,
            },
          ];
          break;

        case "4.5":
          // Use local state for section 4.5 data
          console.log("Section_4_5 state", state?.section4_5);
          const practices4_5 = (state?.section4_5?.practices || []).map(
            (practice: any) => ({
              id: practice.id,
              practiceName: practice.practiceName ?? null,
              impact: practice.impact ?? null,
              file: practice.file ?? null,
            })
          );
          fields = [
            {
              implemented: state?.section4_5?.implemented ?? null,
              practices: practices4_5,
              comment: state?.section4_5?.comment ?? null,
            },
          ];
          break;

        case "4.6":
          // Use local state for section 4.6 data
          console.log("Section_4_6 state", state?.section4_6);
          fields = [
            {
              capacityArray: (state?.section4_6?.capacityArray || []).map(
                (item: any) => ({
                  officerName: item?.officerName ?? null,
                  designation: item?.designation ?? null,
                  programName: item?.programName ?? null,
                  trainingType: item?.trainingType ?? null,
                  organiser: item?.organiser ?? null,
                })
              ),
              participated: state?.section4_6?.participated ?? null,
              comment: state?.section4_6?.comment ?? null,
            },
          ];
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      // Get current status from formDataState
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = formDataState && formDataState[sectionKey];
      const currentStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;
      const upperStatus = (currentStatus || "").toUpperCase();

      // If NODAL_OFFICER, check current status and set RESUBMITTED only if status was REVERTED
      if (isNodalOfficer && fields.length > 0) {
        // Only set RESUBMITTED if the indicator was previously REVERTED (sent back)
        if (upperStatus === "REVERTED") {
          // Add status to the first field object
          fields[0] = {
            ...fields[0],
            status: "RESUBMITTED",
          };
        }
      }

      // If STATE_APPROVER, preserve RESUBMITTED status when saving edits
      if (
        isStateApprover &&
        fields.length > 0 &&
        upperStatus === "RESUBMITTED"
      ) {
        // Preserve RESUBMITTED status when STATE_APPROVER saves edits
        fields[0] = {
          ...fields[0],
          status: "RESUBMITTED",
        };
      }

      // Validate form data before saving
      const fullData = {
        section4_1: formDataState?.section4_1 || { allEligible: "", websiteLink: "" },
        section4_2: formDataState?.section4_2 || { available: "", file: null },
        section4_3: formDataState?.section4_3 || { adopted: "", file: null, projects: [] },
        section4_4: formDataState?.section4_4 || { adopted: "", file: null },
        section4_5: formDataState?.section4_5 || { implemented: "", practiceName: "", impact: "", file: null },
        section4_6: formDataState?.section4_6 || { participated: "", capacityArray: [] },
      };

      const effectiveAssignedIndicators = assignedIndicators.length > 0 
        ? assignedIndicators 
        : (hookAssignedIndicators.length > 0 ? hookAssignedIndicators : undefined);

      const validationResult = validateInfraEnablers(fullData, {
        allowedIndicators: effectiveAssignedIndicators,
      });

      // Filter validation errors to only include the section being saved
      const sectionErrors: Record<string, string> = {};
      const sectionPrefix = `section${sectionId.replace(".", "_")}`;
      Object.keys(validationResult.errors).forEach((errorKey) => {
        if (errorKey.startsWith(sectionPrefix)) {
          sectionErrors[errorKey] = validationResult.errors[errorKey];
        }
      });

      // Only block save if there are errors in the section being saved
      if (Object.keys(sectionErrors).length > 0) {
        setValidationErrors((prev) => ({ ...prev, ...sectionErrors }));
        console.warn("Validation failed for section", sectionId, sectionErrors);
        // Errors are displayed inline in the UI, no need for alert
        return;
      } else {
        // Clear errors for this section only
        setValidationErrors((prev) => {
          const filtered = { ...prev };
          Object.keys(filtered).forEach((key) => {
            if (key.startsWith(sectionPrefix)) {
              delete filtered[key];
            }
          });
          return filtered;
        });
      }

      console.log(
        `[InfraEnablersReview] performSave - Calling handleSaveSection API...`,
        {
          submissionId,
          category: "infraEnablers",
          section: payloadSection,
          fieldsCount: fields.length,
          fieldsWithStatus: fields[0]?.status,
        }
      );
      const saveResult = await handleSaveSection({
        submissionId,
        category: "infraEnablers",
        section: payloadSection,
        fields,
      });
      console.log(
        `[InfraEnablersReview] ✅ performSave - API call successful:`,
        saveResult
      );

      // If NODAL_OFFICER, update local state to reflect RESUBMITTED status only if it was REVERTED
      if (isNodalOfficer) {
        // Only update to RESUBMITTED if the indicator was previously REVERTED (sent back)
        if (upperStatus === "REVERTED") {
          // Update formDataState to set status to RESUBMITTED
          setFormDataState((prev: any) => {
            if (!prev) return prev;
            const updated = { ...prev };
            if (updated[sectionKey]) {
              updated[sectionKey] = {
                ...updated[sectionKey],
                status: "RESUBMITTED",
              };
            }
            return updated;
          });
        }
      }

      // If STATE_APPROVER, preserve RESUBMITTED status in local state after save
      if (isStateApprover && upperStatus === "RESUBMITTED") {
        // Preserve RESUBMITTED status in local state
        setFormDataState((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          if (updated[sectionKey]) {
            updated[sectionKey] = {
              ...updated[sectionKey],
              status: "RESUBMITTED",
            };
          }
          return updated;
        });
      }

      // Disable editing after successful save
      setEditable(sectionId, false);
      // Clear the snapshot since save was successful
      setOriginalFormDataSnapshot(null);

      console.log(
        `[InfraEnablersReview] ✅ performSave - Save completed, editing disabled for section ${sectionId}`
      );
    } catch (error) {
      console.error(
        `[InfraEnablersReview] ❌ performSave - Error saving section ${sectionId}:`,
        error
      );
      throw error; // Re-throw so handleConfirmSave can catch it
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    console.log(`[InfraEnablersReview] handleConfirmSave called:`, {
      pendingSaveSectionId,
    });
    if (pendingSaveSectionId) {
      console.log(
        `[InfraEnablersReview] ✅ Confirmed - calling performSave for section ${pendingSaveSectionId}`
      );
      try {
        await performSave(pendingSaveSectionId);
        console.log(`[InfraEnablersReview] ✅ Save completed successfully`);
        setShowSaveDialog(false);
        setPendingSaveSectionId(null);
      } catch (error) {
        console.error(`[InfraEnablersReview] ❌ Save failed:`, error);
        // Don't close dialog on error so user can try again
      }
    } else {
      console.warn(
        `[InfraEnablersReview] ⚠️ handleConfirmSave called but no pendingSaveSectionId`
      );
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSaveSectionId(null);
  };

  // Actual function that performs the status update
  const performIndicatorStatus = async (sectionId: string, status: boolean) => {
    const userRole = getUserRole();
    const isMospiApprover = userRole === "MOSPI_APPROVER";

    // For MOSPI_APPROVER, use mospi_status field instead of status
    const payload: any = {
      submissionId,
      category: "infraEnablers",
      section: `section${sectionId.replace(".", "_")}`,
      status: status,
    };

    // If MOSPI_APPROVER, add mospi_status field
    if (isMospiApprover) {
      payload.mospi_status = status ? "ACCEPTED" : "REVERTED";
    }

    try {
      await apiService.indicatorStatus(payload);
      // Update local formData to trigger re-render of action buttons
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const statusField = isMospiApprover ? "mospi_status" : "status";
      const statusValue = status ? "ACCEPTED" : "REVERTED";

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
          } else if (sectionData && typeof sectionData === "object") {
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
      console.log(
        `✅ Indicator ${
          isMospiApprover ? "mospi_" : ""
        }status updated successfully`
      );

      // Dispatch custom event to notify other components (e.g., UnifiedReviewPage) that indicator status was updated
      if (isMospiApprover) {
        window.dispatchEvent(
          new CustomEvent("niri-indicator-status-updated", {
            detail: { sectionId, status: statusValue },
          })
        );
      }
    } catch (error) {
      console.error(
        `❌ Failed to update indicator ${
          isMospiApprover ? "mospi_" : ""
        }status:`,
        error
      );
    }
  };

  // Wrapper function that checks for STATE_APPROVER and shows dialog if needed
  const onIndicatorStatus = async (sectionId: string, status: boolean) => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";

    // Check if submission is from STATE_APPROVER
    const isSubmissionFromStateApprover =
      submission?.user?.role === "STATE_APPROVER" ||
      submission?.currentOwnerRole === "STATE_APPROVER";

    // If STATE_APPROVER is trying to send back their own indicator, prevent it
    if (isStateApprover && !status && isSubmissionFromStateApprover) {
      console.log(
        `[InfraEnablersReview] STATE_APPROVER cannot send back their own indicator ${sectionId}`
      );
      return; // Don't show dialog, just return
    }

    // If STATE_APPROVER is accepting their own indicator, show confirmation dialog
    if (isStateApprover && status && isSubmissionFromStateApprover) {
      console.log(
        `[InfraEnablersReview] STATE_APPROVER accepting their own indicator ${sectionId} - showing confirmation dialog`
      );
      setPendingActionSectionId(sectionId);
      setShowAcceptDialog(true);
      return;
    }

    if (isStateApprover && !isSubmissionFromStateApprover) {
      // Show appropriate dialog based on action (only for NODAL_OFFICER submissions)
      setPendingActionSectionId(sectionId);
      if (status) {
        // Accept action
        setShowAcceptDialog(true);
      } else {
        // Send Back action (only for NODAL_OFFICER submissions)
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
          const authUser = localStorage.getItem("niri_app:auth_user");
          if (authUser) {
            const user = JSON.parse(authUser);
            return user.value?.role;
          }
        } catch (error) {
          console.error("Error reading user role:", error);
        }
        return null;
      };
      const userRole = getUserRole();
      const isMospiApprover = userRole === "MOSPI_APPROVER";

      // For MOSPI_APPROVER, update mospi_status to REVERTED
      // For other roles (STATE_APPROVER), use regular status update
      // Both use performIndicatorStatus, which handles the role check internally
      await performIndicatorStatus(pendingActionSectionId, false);

      setShowSendBackDialog(false);
      setPendingActionSectionId(null);
      // Ensure comment modal is closed
      setActiveSection(null);
      // Reset any flags
      setIsStateApproverSentBack(false);
      setStateApproverSentBackSectionId(null);
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
          const authUser = localStorage.getItem("niri_app:auth_user");
          if (authUser) {
            const user = JSON.parse(authUser);
            return user.value?.role;
          }
        } catch (error) {
          console.error("Error reading user role:", error);
        }
        return null;
      };
      const userRole = getUserRole();
      const isMospiApprover = userRole === "MOSPI_APPROVER";
      const isStateApprover = userRole === "STATE_APPROVER";

      // If STATE_APPROVER is accepting, check if there's a comment that needs to be saved first
      // This ensures comments are preserved when accepting indicators with "No" selection
      if (isStateApprover) {
        const sectionKey = `section${pendingActionSectionId.replace(".", "_")}`;
        const sectionData = state?.[sectionKey];
        const hasComment =
          sectionData?.comment && sectionData.comment.trim() !== "";

        // If there's a comment, save it first before accepting
        if (hasComment) {
          console.log(
            `💬 [Accept] Saving comment for indicator ${pendingActionSectionId} before accepting`
          );
          try {
            await performSave(pendingActionSectionId);
            console.log(
              `✅ [Accept] Comment saved successfully for indicator ${pendingActionSectionId}`
            );
          } catch (error) {
            console.error(
              `❌ [Accept] Failed to save comment for indicator ${pendingActionSectionId}:`,
              error
            );
            // Continue with acceptance even if comment save fails
          }
        }
      }

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

  const toFileArray = (
    value: FileUpload | FileUpload[] | null | undefined
  ): FileUpload[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  // Helper functions to handle file updates
  const handleFileUpdate = async (
    sectionId: string,
    updatedValue: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const previousSection = state?.[sectionKey] || {};
    const targetKey = ["4.2", "4.4"].includes(sectionId) ? "files" : "file";

    // For sections that use 'files' array, ensure we always work with arrays
    let filesArray: FileUpload[] = [];
    if (targetKey === "files") {
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

    const normalizedValue = targetKey === "files" ? filesArray : updatedValue;

    const updatedSection =
      targetKey === "files"
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
    if (["4.2", "4.4"].includes(sectionId)) {
      try {
        // Ensure files array is properly formatted for API
        const filesForPayload = filesArray.map((file) => ({
          id: file.id,
          file: file.file, // This should be the stored path (string)
          fileName: file.fileName,
          originalName: (file as any)?.originalName || file.fileName,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt,
          filePath: file.filePath,
          fileUrl: file.fileUrl,
          mimeType: file.mimeType,
        }));

        const fields =
          sectionId === "4.2"
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

        console.log(
          "📤 Saving files for section",
          sectionId,
          "with payload:",
          fields
        );

        await handleSaveSection({
          submissionId,
          category: "infraEnablers",
          section: sectionKey,
          fields,
        });

        if (filesArray.length === 0) {
          await onIndicatorStatus(sectionId, false);
        }
      } catch (error) {
        console.error(
          "Failed to auto-save files for section",
          sectionId,
          error
        );
      }
    }
  };

  // Helper functions to handle field updates
  const handleFieldUpdate = (
    sectionId: string,
    fieldName: string,
    value: any
  ) => {
    setFormDataState((prev: any) => {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      return {
        ...prev,
        [sectionKey]: {
          ...prev?.[sectionKey],
          [fieldName]: value,
        },
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
  const handleProjectFieldUpdate = (
    index: number,
    fieldName: string,
    value: any
  ) => {
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

  // Handle removing project from section 4.3
  const handleRemoveProject = (id: string) => {
    setFormDataState((prev: any) => {
      const projects = (prev?.section4_3?.projects || []).filter(
        (project: any) => project.id !== id
      );
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
  const handleProjectFileUpdate = (
    index: number,
    updatedFile: FileUpload | null
  ) => {
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
  const handlePracticeFieldUpdate = (
    index: number,
    fieldName: string,
    value: any
  ) => {
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
  const handlePracticeFileUpdate = (
    index: number,
    updatedFile: FileUpload | null
  ) => {
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

  // Handle removing practice from section 4.5
  const handleRemovePractice = (id: string) => {
    setFormDataState((prev: any) => {
      const practices = (prev?.section4_5?.practices || []).filter(
        (practice: any) => practice.id !== id
      );
      return {
        ...prev,
        section4_5: {
          ...(prev?.section4_5 || {}),
          practices,
        },
      };
    });
  };

  // Handle removing capacity entry from section 4.6
  const handleRemoveCapacityEntry = (id: string) => {
    setFormDataState((prev: any) => {
      const current = prev?.section4_6?.capacityArray;
      const rows = Array.isArray(current) 
        ? current.filter((item: any) => item.id !== id)
        : [];
      return {
        ...prev,
        section4_6: {
          ...(prev?.section4_6 || {}),
          capacityArray: rows,
        },
      };
    });
  };

  // Helper to update table row items for section 4.6
  const handleTableFieldUpdate = (
    rowIndex: number,
    fieldName: string,
    value: any
  ) => {
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

  // Helper function to render MOSPI_REVIEWER comments for MOSPI_APPROVER
  const renderMOSPIReviewerComments = (sectionId: string) => {
    const getUserRole = () => {
      try {
        const authUser = localStorage.getItem("niri_app:auth_user");
        if (authUser) {
          const user = JSON.parse(authUser);
          const role = user.value?.role;
          // Normalize role string (trim whitespace, convert to uppercase for comparison)
          return role ? String(role).trim() : null;
        }
      } catch (error) {
        console.error("Error reading user role:", error);
      }
      return null;
    };
    const userRole = getUserRole();
    const isMospiApprover = userRole === "MOSPI_APPROVER";
    if (!isMospiApprover) return null;

    const comments = getComments(sectionId);
    if (!comments || comments.length === 0) return null;

    const mospiReviewerComments = comments.filter((comment: any) => {
      const commentRole = comment.role || comment.userRole || "";
      return commentRole.toUpperCase() === "MOSPI_REVIEWER";
    });

    if (mospiReviewerComments.length === 0) return null;

    // Sort by timestamp (newest first) and get the last (most recent) comment
    const sortedComments = mospiReviewerComments.sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA; // Descending order (newest first)
    });
    const lastComment = sortedComments[0]; // Get the most recent comment

    return (
      <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
        <p className="text-sm font-semibold text-green-900 mb-2">
          MoSPI Reviewer Comment:
        </p>
        <div className="mb-2 last:mb-0">
          <p className="text-sm text-green-800">
            {(lastComment as any).text ||
              (lastComment as any).message ||
              (lastComment as any).comment}
          </p>
          {lastComment.timestamp && (
            <p className="text-xs text-green-600 mt-1">
              {new Date(lastComment.timestamp).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    );
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
        const authUser = localStorage.getItem("niri_app:auth_user");
        if (authUser) {
          const user = JSON.parse(authUser);
          return user.value?.role;
        }
      } catch (error) {
        console.error("Error reading user role:", error);
      }
      return null;
    };
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const isStateApprover = userRole === "STATE_APPROVER";
    const isMospiReviewer = userRole === "MOSPI_REVIEWER";
    const isMospiApprover = userRole === "MOSPI_APPROVER";

    // Hide all action buttons if STATE_APPROVER is viewing a submission that's with MoSPI Reviewer or MoSPI Approver
    const submissionStatus = submission?.status;
    if (
      isStateApprover &&
      (submissionStatus === "SUBMITTED_TO_MOSPI_REVIEWER" ||
        submissionStatus === "SUBMITTED_TO_MOSPI_APPROVER")
    ) {
      return null;
    }

    // Hide all action buttons (Edit, Send Back, Accept) if submission is APPROVED
    // Only show Timeline button for viewing comments
    if (submissionStatus === "APPROVED") {
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
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData = state && state[sectionKey];
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

      if (mospiStatus === "ACCEPTED") {
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

      if (mospiStatus === "REVERTED") {
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
            disabled={shouldBeEditable(sectionId)}
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
            disabled={shouldBeEditable(sectionId)}
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
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    // Check both state and formData to ensure we get the correct status after refresh
    const sectionData =
      (state && state[sectionKey]) || (formData && formData[sectionKey]);
    // Handle both array and object sections
    const sectionStatus = Array.isArray(sectionData)
      ? (sectionData as any)?.status
      : sectionData?.status;

    // Debug logging
    console.log(`[InfraEnablersReview] Section ${sectionId}:`, {
      sectionKey,
      sectionStatus,
      isStateApprover,
      hasStateData: !!(state && state[sectionKey]),
      hasFormData: !!(formData && formData[sectionKey]),
      stateData: state && state[sectionKey],
      formDataData: formData && formData[sectionKey],
    });

    // Check if indicator has been submitted (SUBMITTED, RESUBMITTED, or ACCEPTED)
    // REVERTED is excluded because user can resubmit after being sent back
    const isSubmitted =
      sectionStatus === "SUBMITTED" ||
      sectionStatus === "RESUBMITTED" ||
      sectionStatus === "ACCEPTED";

    if (sectionStatus === "ACCEPTED") {
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

    // For STATE_APPROVER, check mospi_status to determine if section should be editable
    if (isStateApprover) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (state && state[sectionKey]) || (formData && formData[sectionKey]);
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

      // If mospi_status is ACCEPTED, show as accepted and non-editable
      if (mospiStatus === "ACCEPTED") {
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
    }

    // For STATE_APPROVER, show "Re Submitted" badge if status is RESUBMITTED
    if (isStateApprover && sectionStatus === "RESUBMITTED") {
      console.log(
        `[InfraEnablersReview] RESUBMITTED block hit for section ${sectionId}`
      );
      return (
        <div className="flex gap-2">
          {!shouldBeEditable(sectionId) ? (
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
                disabled={false} // Enable save for editing RESUBMITTED indicators
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
              disabled={shouldBeEditable(sectionId)} // Disable Accept during editing
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

    if (sectionStatus === "REVERTED") {
      // If nodal officer and status is REVERTED, show Edit button + Sent Back badge
      if (isNodalOfficer) {
        return (
          <div className="flex gap-2">
            {!shouldBeEditable(sectionId) ? (
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
                  disabled={false} // Can resubmit after being sent back
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

    // For NODAL_OFFICER, show "Resubmitted" badge if status is RESUBMITTED
    if (isNodalOfficer && sectionStatus === "RESUBMITTED") {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 bg-yellow-100 text-yellow-700 cursor-default"
            disabled
          >
            <CheckCircle className="w-4 h-4" />
            Resubmitted
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

    // For NODAL_OFFICER, show "Under Review" badge if status is SUBMITTED_TO_STATE or null/undefined
    if (
      isNodalOfficer &&
      (sectionStatus === "SUBMITTED_TO_STATE" || !sectionStatus)
    ) {
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

    // For NODAL_OFFICER, if status is not REVERTED, ACCEPTED, RESUBMITTED, or SUBMITTED_TO_STATE, don't show any buttons
    if (
      isNodalOfficer &&
      sectionStatus !== "REVERTED" &&
      sectionStatus !== "ACCEPTED" &&
      sectionStatus !== "RESUBMITTED" &&
      sectionStatus !== "SUBMITTED_TO_STATE"
    ) {
      return null;
    }

    return (
      <div className="flex gap-2">
        {!shouldBeEditable(sectionId) ? (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => handleEditStart(sectionId)}
            disabled={(() => {
              // For STATE_APPROVER, disable edit button if mospi_status is ACCEPTED
              if (isStateApprover) {
                const sectionKey = `section${sectionId.replace(".", "_")}`;
                const sectionData =
                  (state && state[sectionKey]) ||
                  (formData && formData[sectionKey]);
                const mospiStatus = Array.isArray(sectionData)
                  ? (sectionData as any)?.mospi_status
                  : sectionData?.mospi_status;
                return mospiStatus === "ACCEPTED";
              }
              return false;
            })()}
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
              disabled={isSubmitted}
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

        {/* Hide Send Back button if STATE_APPROVER is viewing their own submission */}
        {(() => {
          // Check if submission is from STATE_APPROVER
          const isSubmissionFromStateApprover =
            submission?.user?.role === "STATE_APPROVER" ||
            submission?.currentOwnerRole === "STATE_APPROVER";

          // Hide Send Back if current user is STATE_APPROVER AND submission is from STATE_APPROVER
          const shouldShowSendBack = !(
            isStateApprover && isSubmissionFromStateApprover
          );

          console.log(
            `[InfraEnablersReview] Section ${sectionId} - Send Back visibility:`,
            {
              shouldShowSendBack,
              isStateApprover,
              isSubmissionFromStateApprover,
              sectionStatus,
              submissionUserRole: submission?.user?.role,
              currentOwnerRole: submission?.currentOwnerRole,
            }
          );
          return shouldShowSendBack;
        })() && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              // Track that this was opened from STATE_APPROVER "Send Back" button
              if (isStateApprover) {
                setIsStateApproverSentBack(true);
                setStateApproverSentBackSectionId(sectionId);
              }
              handleOpenModal(sectionId);
            }}
            disabled={shouldBeEditable(sectionId)}
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
            disabled={shouldBeEditable(sectionId)}
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
        <p className="text-muted-foreground">
          No Infra Enablers data available for review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData(
            { infraEnablers: state },
            "infraEnablers"
          );
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
        {sectionsWithData.includes("section4_1") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.1 -</span> Eligible
                    Infrastructure Projects{" "}
                  </span>
                  {renderActionButtons("4.1")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.1")}
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
                <Label className="mb-3 block">
                  All Eligible Infra Projects on NIP Portal?*
                </Label>
                {shouldBeEditable("4.1") ? (
                  <RadioGroup
                    value={state?.section4_1?.allEligible || ""}
                    onValueChange={(value) =>
                      handleFieldUpdate("4.1", "allEligible", value)
                    }
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section4_1?.allEligible === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section4_1?.allEligible === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {state?.section4_1?.allEligible === "yes" && (
                <div>
                  <Label>Website Link</Label>
                  <Input
                    value={state?.section4_1?.websiteLink || ""}
                    readOnly={!shouldBeEditable("4.1")}
                    className={
                      shouldBeEditable("4.1") ? "bg-white" : "bg-gray-50"
                    }
                    onChange={(e) =>
                      handleFieldUpdate("4.1", "websiteLink", e.target.value)
                    }
                  />
                </div>
              )}

              {state?.section4_1?.allEligible === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("4.1") ? (
                    <Textarea
                      value={state?.section4_1?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.1", "comment", e.target.value)
                      }
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
                  isEditable={shouldBeEditable('4.1')}
                  submissionId={submissionId}
                  onFilesChange={(updatedFile) => handleFileUpdate('4.1', updatedFile)}
                  label="Uploaded File"
                  multiple={false}
                />
              </div>
            )} */}

              {/* <p className="text-xs text-muted-foreground">
              Annex 9: Self-certification required
            </p> */}
            </div>
          </SectionCard>
        )}

        {/* Section 4.2 */}
        {sectionsWithData.includes("section4_2") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.2 -</span> Availability &
                    Use of State/UT PMG{" "}
                    <span className="font-normal text-xs text-muted-foreground ml-1">
                      (5 marks per 1%)
                    </span>{" "}
                  </span>
                  {renderActionButtons("4.2")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.2")}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">
                  Availability and Use of EaseMPR?*
                </Label>
                {shouldBeEditable("4.2") ? (
                  <RadioGroup
                    value={state?.section4_2?.available || ""}
                    onValueChange={(value) =>
                      handleFieldUpdate("4.2", "available", value)
                    }
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section4_2?.available === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section4_2?.available === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {state?.section4_2?.available === "yes" && (
                <div>
                  <EditableFileDisplay
                    files={
                      state?.section4_2?.files ??
                      (state?.section4_2?.file ? [state.section4_2.file] : null)
                    }
                    isEditable={shouldBeEditable("4.2")}
                    submissionId={submissionId}
                    onFilesChange={(updatedFiles) =>
                      handleFileUpdate("4.2", updatedFiles)
                    }
                    label="Uploaded File"
                    multiple={true}
                  />
                </div>
              )}

              {state?.section4_2?.available === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("4.2") ? (
                    <Textarea
                      value={state?.section4_2?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.2", "comment", e.target.value)
                      }
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
        {sectionsWithData.includes("section4_3") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.3 -</span> Adoption of PM
                    GatiShakti{" "}
                    <span className="font-normal text-xs text-muted-foreground ml-1">
                      (10 marks per 1%)
                    </span>{" "}
                  </span>
                  {renderActionButtons("4.3")}
                </div>
              </div>
            }
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
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.3")}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">
                  Adoption of PM GatiShakti?*
                </Label>
                {shouldBeEditable("4.3") ? (
                  <RadioGroup
                    value={state?.section4_3?.adopted || ""}
                    onValueChange={(value) =>
                      handleFieldUpdate("4.3", "adopted", value)
                    }
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section4_3?.adopted === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section4_3?.adopted === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {state?.section4_3?.adopted === "yes" && (
                <>
                  {/* Projects Table */}
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Project Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Sector
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Uploaded File
                          </th>
                          {shouldBeEditable("4.3") && (
                            <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const projects = Array.isArray(
                            state?.section4_3?.projects
                          )
                            ? state.section4_3.projects
                            : [];

                          if (!projects.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={shouldBeEditable("4.3") ? 4 : 3}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No projects available
                                </td>
                              </tr>
                            );
                          }

                          return projects.map((project: any, idx: number) => (
                            <tr key={project.id || idx} className="border-b">
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("4.3") ? (
                                  <Input
                                    value={project.projectName || ""}
                                    onChange={(e) =>
                                      handleProjectFieldUpdate(
                                        idx,
                                        "projectName",
                                        e.target.value
                                      )
                                    }
                                    className="w-full"
                                    placeholder="Enter project name"
                                  />
                                ) : (
                                  project.projectName || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("4.3") ? (
                                  <Dropdown
                                    value={project.sector || ""}
                                    onChange={(value) =>
                                      handleProjectFieldUpdate(
                                        idx,
                                        "sector",
                                        value
                                      )
                                    }
                                    options={dropdownValues.sector.map(
                                      (opt) => ({ label: opt, value: opt })
                                    )}
                                    placeholder="Select sector"
                                  />
                                ) : (
                                  project.sector || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("4.3") ? (
                                  <div className="space-y-1.5">
                                    {project.file ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                        title={
                                          extractOriginalName(
                                            project.file.fileName || "",
                                            (project.file as any)?.originalName
                                          ) || "Unknown file"
                                        }
                                      >
                                        <Upload className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">
                                          {extractOriginalName(
                                            project.file.fileName || "",
                                            (project.file as any)?.originalName
                                          ) || "Unknown file"}
                                        </span>
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
                                      <span className="text-muted-foreground text-xs">
                                        No file
                                      </span>
                                    )}
                                    <div className="flex items-center">
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={async (e) => {
                                          const selectedFile =
                                            e.target.files?.[0];
                                          if (selectedFile) {
                                            // Upload file immediately (same as create submission)
                                            try {
                                              const response =
                                                await apiService.uploadFile(
                                                  submissionId,
                                                  selectedFile
                                                );
                                              const fileData =
                                                response?.data || response;

                                              const newFile: FileUpload = {
                                                id:
                                                  fileData.id ??
                                                  crypto.randomUUID(),
                                                file: null, // File not stored locally when backend handles upload
                                                fileName:
                                                  fileData.fileName ||
                                                  fileData.filename ||
                                                  selectedFile.name,
                                                fileSize: Number(
                                                  fileData.fileSize ??
                                                    fileData.size ??
                                                    selectedFile.size ??
                                                    0
                                                ),
                                                uploadedAt: Number(
                                                  fileData.uploadedAt ??
                                                    Date.now()
                                                ),
                                                filePath:
                                                  fileData.filePath ??
                                                  fileData.file ??
                                                  fileData.url ??
                                                  fileData.path,
                                                fileUrl:
                                                  fileData.fileUrl ||
                                                  fileData.url,
                                                mimeType: fileData.mimeType,
                                              };

                                              await handleProjectFileUpdate(
                                                idx,
                                                newFile
                                              );
                                              e.target.value = ""; // Reset input
                                            } catch (error: any) {
                                              console.error(
                                                "Failed to upload file:",
                                                error
                                              );
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
                                        onClick={() =>
                                          document
                                            .getElementById(
                                              `file-input-4.3-${idx}`
                                            )
                                            ?.click()
                                        }
                                        className="h-6 px-2 text-xs"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                ) : project.file ? (
                                  <div className="flex items-center gap-1">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                      title={
                                        extractOriginalName(
                                          project.file.fileName || "",
                                          (project.file as any)?.originalName
                                        ) || "Unknown file"
                                      }
                                    >
                                      <Upload className="w-3 h-3" />
                                      <span className="truncate">
                                        {extractOriginalName(
                                          project.file.fileName || "",
                                          (project.file as any)?.originalName
                                        ) || "Unknown file"}
                                      </span>
                                    </Badge>
                                    {(() => {
                                      const fileKey = `4.3-${idx}`;
                                      const isLoading = !!fileLoading[fileKey];
                                      const hasFileAccess = !!(project.file.filePath || project.file.file || project.file.fileUrl);
                                      return hasFileAccess ? (
                                        <>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewFile(project.file, fileKey)}
                                            disabled={isLoading}
                                            className="h-7 w-7 p-0"
                                            title="View file"
                                          >
                                            <Eye className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadFile(project.file, fileKey)}
                                            disabled={isLoading}
                                            className="h-7 w-7 p-0"
                                            title="Download file"
                                          >
                                            <Download className="w-3 h-3" />
                                          </Button>
                                        </>
                                      ) : null;
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    No file
                                  </span>
                                )}
                              </td>
                              {shouldBeEditable("4.3") && (
                                <td className="py-3 px-4 text-sm font-normal">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleRemoveProject(project.id || idx.toString())}
                                    className="text-red-500 hover:text-red-700 border-none bg-none"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Button - Only visible when adopted is "yes" and in edit mode */}
                  {shouldBeEditable("4.3") && !showAddProjectForm && (
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
                  {showAddProjectForm && shouldBeEditable("4.3") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">Add New Project</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Project Name</Label>
                          <Input
                            value={newProject.projectName}
                            onChange={(e) =>
                              setNewProject({
                                ...newProject,
                                projectName: e.target.value,
                              })
                            }
                            className="bg-white"
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <Label>Sector</Label>
                          <Dropdown
                            value={newProject.sector}
                            onChange={(value) =>
                              setNewProject({ ...newProject, sector: value })
                            }
                            options={dropdownValues.sector.map((opt) => ({
                              label: opt,
                              value: opt,
                            }))}
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
                              setNewProject({
                                ...newProject,
                                file: updatedFile as FileUpload | null,
                              });
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

              {state?.section4_3?.adopted === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("4.3") ? (
                    <Textarea
                      value={state?.section4_3?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.3", "comment", e.target.value)
                      }
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
        {sectionsWithData.includes("section4_4") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.4 -</span> Adoption of ADR{" "}
                    <span className="font-normal text-xs text-muted-foreground ml-1">
                      (5 marks per 1%)
                    </span>{" "}
                  </span>
                  {renderActionButtons("4.4")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.4")}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">
                  Adoption of Alternate Dispute Resolution (ADR)?*
                </Label>
                {shouldBeEditable("4.4") ? (
                  <RadioGroup
                    value={state?.section4_4?.adopted || ""}
                    onValueChange={(value) =>
                      handleFieldUpdate("4.4", "adopted", value)
                    }
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section4_4?.adopted === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section4_4?.adopted === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {state?.section4_4?.adopted === "yes" && (
                <div>
                  <EditableFileDisplay
                    files={
                      state?.section4_4?.files ??
                      (state?.section4_4?.file ? [state.section4_4.file] : null)
                    }
                    isEditable={shouldBeEditable("4.4")}
                    submissionId={submissionId}
                    onFilesChange={(updatedFiles) =>
                      handleFileUpdate("4.4", updatedFiles)
                    }
                    label="Uploaded File"
                    multiple={true}
                  />
                </div>
              )}

              {state?.section4_4?.adopted === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("4.4") ? (
                    <Textarea
                      value={state?.section4_4?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.4", "comment", e.target.value)
                      }
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
        {sectionsWithData.includes("section4_5") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.5 -</span>Innovative
                    Practices{" "}
                    <span className="font-normal text-xs text-muted-foreground ml-1">
                      (10 marks per practice)
                    </span>{" "}
                  </span>
                  {renderActionButtons("4.5")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.5")}
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
                {shouldBeEditable("4.5") ? (
                  <RadioGroup
                    value={state?.section4_5?.implemented || ""}
                    onValueChange={(value) =>
                      handleFieldUpdate("4.5", "implemented", value)
                    }
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section4_5?.implemented === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section4_5?.implemented === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {state?.section4_5?.implemented === "yes" && (
                <>
                  {/* Practices Table */}
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Practice Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Impact
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Uploaded File
                          </th>
                          {shouldBeEditable("4.5") && (
                            <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const practices = Array.isArray(
                            state?.section4_5?.practices
                          )
                            ? state.section4_5.practices
                            : [];

                          if (!practices.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={shouldBeEditable("4.5") ? 4 : 3}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No practices available
                                </td>
                              </tr>
                            );
                          }

                          return practices.map((practice: any, idx: number) => (
                            <tr key={practice.id || idx} className="border-b">
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("4.5") ? (
                                  <Input
                                    value={practice.practiceName || ""}
                                    onChange={(e) =>
                                      handlePracticeFieldUpdate(
                                        idx,
                                        "practiceName",
                                        e.target.value
                                      )
                                    }
                                    className="w-full"
                                    placeholder="Enter practice name"
                                  />
                                ) : (
                                  practice.practiceName || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("4.5") ? (
                                  <Dropdown
                                    resetKey={idx}
                                    value={practice.impact || ""}
                                    onChange={(value) =>
                                      handlePracticeFieldUpdate(
                                        idx,
                                        "impact",
                                        value
                                      )
                                    }
                                    options={IMPACT_OPTIONS.map((opt) => ({
                                      label: opt,
                                      value: opt,
                                    }))}
                                    placeholder="Select impact"
                                  />
                                ) : (
                                  practice.impact || "N/A"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("4.5") ? (
                                  <div className="space-y-1.5">
                                    {practice.file ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                        title={
                                          extractOriginalName(
                                            practice.file.fileName || "",
                                            (practice.file as any)?.originalName
                                          ) || "Unknown file"
                                        }
                                      >
                                        <Upload className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">
                                          {extractOriginalName(
                                            practice.file.fileName || "",
                                            (practice.file as any)?.originalName
                                          ) || "Unknown file"}
                                        </span>
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
                                      <span className="text-muted-foreground text-xs">
                                        No file
                                      </span>
                                    )}
                                    <div className="flex items-center">
                                      <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={async (e) => {
                                          const selectedFile =
                                            e.target.files?.[0];
                                          if (selectedFile) {
                                            // Upload file immediately (same as create submission)
                                            try {
                                              const response =
                                                await apiService.uploadFile(
                                                  submissionId,
                                                  selectedFile
                                                );
                                              const fileData =
                                                response?.data || response;

                                              const newFile: FileUpload = {
                                                id:
                                                  fileData.id ??
                                                  crypto.randomUUID(),
                                                file: null, // File not stored locally when backend handles upload
                                                fileName:
                                                  fileData.fileName ||
                                                  fileData.filename ||
                                                  selectedFile.name,
                                                fileSize: Number(
                                                  fileData.fileSize ??
                                                    fileData.size ??
                                                    selectedFile.size ??
                                                    0
                                                ),
                                                uploadedAt: Number(
                                                  fileData.uploadedAt ??
                                                    Date.now()
                                                ),
                                                filePath:
                                                  fileData.filePath ??
                                                  fileData.file ??
                                                  fileData.url ??
                                                  fileData.path,
                                                fileUrl:
                                                  fileData.fileUrl ||
                                                  fileData.url,
                                                mimeType: fileData.mimeType,
                                              };

                                              await handlePracticeFileUpdate(
                                                idx,
                                                newFile
                                              );
                                              e.target.value = ""; // Reset input
                                            } catch (error: any) {
                                              console.error(
                                                "Failed to upload file:",
                                                error
                                              );
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
                                        onClick={() =>
                                          document
                                            .getElementById(
                                              `file-input-4.5-${idx}`
                                            )
                                            ?.click()
                                        }
                                        className="h-6 px-2 text-xs"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                ) : practice.file ? (
                                  <div className="flex items-center gap-1">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                      title={
                                        extractOriginalName(
                                          practice.file.fileName || "",
                                          (practice.file as any)?.originalName
                                        ) || "Unknown file"
                                      }
                                    >
                                      <Upload className="w-3 h-3" />
                                      <span className="truncate">
                                        {extractOriginalName(
                                          practice.file.fileName || "",
                                          (practice.file as any)?.originalName
                                        ) || "Unknown file"}
                                      </span>
                                    </Badge>
                                    {(() => {
                                      const fileKey = `4.5-${idx}`;
                                      const isLoading = !!fileLoading[fileKey];
                                      const hasFileAccess = !!(practice.file.filePath || practice.file.file || practice.file.fileUrl);
                                      return hasFileAccess ? (
                                        <>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewFile(practice.file, fileKey)}
                                            disabled={isLoading}
                                            className="h-7 w-7 p-0"
                                            title="View file"
                                          >
                                            <Eye className="w-3 h-3" />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadFile(practice.file, fileKey)}
                                            disabled={isLoading}
                                            className="h-7 w-7 p-0"
                                            title="Download file"
                                          >
                                            <Download className="w-3 h-3" />
                                          </Button>
                                        </>
                                      ) : null;
                                    })()}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    No file
                                  </span>
                                )}
                              </td>
                              {shouldBeEditable("4.5") && (
                                <td className="py-3 px-4 text-sm font-normal">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleRemovePractice(practice.id || idx.toString())}
                                    className="text-red-500 hover:text-red-700 border-none bg-none"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Practice Button - Only visible when in edit mode */}
                  {shouldBeEditable("4.5") && !showAddPracticeForm && (
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
                  {showAddPracticeForm && shouldBeEditable("4.5") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">Add New Practice</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Practice Name</Label>
                          <Input
                            value={newPractice.practiceName}
                            onChange={(e) =>
                              setNewPractice({
                                ...newPractice,
                                practiceName: e.target.value,
                              })
                            }
                            className="bg-white"
                            placeholder="Enter practice name"
                          />
                        </div>
                        <div>
                          <Label>Impact</Label>
                          <Dropdown
                            value={newPractice.impact}
                            onChange={(value) =>
                              setNewPractice({ ...newPractice, impact: value })
                            }
                            options={IMPACT_OPTIONS.map((opt) => ({
                              label: opt,
                              value: opt,
                            }))}
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
                              setNewPractice({
                                ...newPractice,
                                file: updatedFile as FileUpload | null,
                              });
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

              {state?.section4_5?.implemented === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("4.5") ? (
                    <Textarea
                      value={state?.section4_5?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.5", "comment", e.target.value)
                      }
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

              <p className="text-xs text-muted-foreground">Annex 10</p>
            </div>
          </SectionCard>
        )}

        {/* Section 4.6 */}
        {sectionsWithData.includes("section4_6") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.6 -</span> Capacity
                    Building - Officer Participation{" "}
                  </span>
                  {renderActionButtons("4.6")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.6")}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">
                  Capacity Building – Officer Participation*
                </Label>
                {shouldBeEditable("4.6") ? (
                  <RadioGroup
                    value={state?.section4_6?.participated || ""}
                    onValueChange={(value) => {
                      handleFieldUpdate("4.6", "participated", value);
                      if (value === "yes") {
                        handleFieldUpdate("4.6", "comment", "");
                      } else {
                        handleFieldUpdate("4.6", "capacityArray", []);
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section4_6?.participated === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section4_6?.participated === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
              </div>

              {state?.section4_6?.participated === "yes" && (
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                          Officer Name
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Designation
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Program Name
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Type
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Organiser
                        </th>
                        {shouldBeEditable("4.6") && (
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const capacityArray = Array.isArray(
                          state?.section4_6?.capacityArray
                        )
                          ? state.section4_6.capacityArray
                          : [];

                        if (!capacityArray.length) {
                          return (
                            <tr>
                              <td
                                colSpan={shouldBeEditable("4.6") ? 6 : 5}
                                className="py-8 text-center text-muted-foreground"
                              >
                                No capacity building data available
                              </td>
                            </tr>
                          );
                        }

                        return capacityArray.map((item: any, idx: number) => (
                          <tr key={item.id || idx} className="border-b">
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("4.6") ? (
                                <Input
                                  value={item.officerName || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "officerName",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                  placeholder="Enter officer name"
                                />
                              ) : (
                                item.officerName || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("4.6") ? (
                                <Input
                                  value={item.designation || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "designation",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                  placeholder="Enter designation"
                                />
                              ) : (
                                item.designation || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("4.6") ? (
                                <Input
                                  value={item.programName || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "programName",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                  placeholder="Enter program name"
                                />
                              ) : (
                                item.programName || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("4.6") ? (
                                <Dropdown
                                  resetKey={idx}
                                  value={item.trainingType || ""}
                                  onChange={(value) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "trainingType",
                                      value
                                    )
                                  }
                                  options={TRAINING_TYPE_OPTIONS.map((opt) => ({
                                    label: opt,
                                    value: opt,
                                  }))}
                                  placeholder="Select training type"
                                />
                              ) : (
                                item.trainingType || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("4.6") ? (
                                <Input
                                  value={item.organiser || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "organiser",
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                  placeholder="Enter organiser"
                                />
                              ) : (
                                item.organiser || "N/A"
                              )}
                            </td>
                            {shouldBeEditable("4.6") && (
                              <td className="py-3 px-4 text-sm font-normal">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleRemoveCapacityEntry(item.id || idx.toString())}
                                  className="text-red-500 hover:text-red-700 border-none bg-none"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {state?.section4_6?.participated === "no" && (
                <div>
                  <Label className="mb-2 block">Comments (Reason)</Label>
                  {shouldBeEditable("4.6") ? (
                    <Textarea
                      value={state?.section4_6?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.6", "comment", e.target.value)
                      }
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
              {state?.section4_6?.participated === "yes" &&
                shouldBeEditable("4.6") &&
                !showAddCapacityForm && (
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
              {state?.section4_6?.participated === "yes" &&
                showAddCapacityForm &&
                shouldBeEditable("4.6") && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">
                      Add New Capacity Building Entry
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Officer Name</Label>
                        <Input
                          value={newCapacityEntry.officerName}
                          onChange={(e) =>
                            setNewCapacityEntry({
                              ...newCapacityEntry,
                              officerName: e.target.value,
                            })
                          }
                          className="bg-white"
                          placeholder="Enter officer name"
                        />
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <Input
                          value={newCapacityEntry.designation}
                          onChange={(e) =>
                            setNewCapacityEntry({
                              ...newCapacityEntry,
                              designation: e.target.value,
                            })
                          }
                          className="bg-white"
                          placeholder="Enter designation"
                        />
                      </div>
                      <div>
                        <Label>Program Name</Label>
                        <Input
                          value={newCapacityEntry.programName}
                          onChange={(e) =>
                            setNewCapacityEntry({
                              ...newCapacityEntry,
                              programName: e.target.value,
                            })
                          }
                          className="bg-white"
                          placeholder="Enter program name"
                        />
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Dropdown
                          value={newCapacityEntry.trainingType}
                          onChange={(value) =>
                            setNewCapacityEntry({
                              ...newCapacityEntry,
                              trainingType: value,
                            })
                          }
                          options={TRAINING_TYPE_OPTIONS.map((opt) => ({
                            label: opt,
                            value: opt,
                          }))}
                          placeholder="Select training type"
                        />
                      </div>
                      <div>
                        <Label>Organiser</Label>
                        <Input
                          value={newCapacityEntry.organiser}
                          onChange={(e) =>
                            setNewCapacityEntry({
                              ...newCapacityEntry,
                              organiser: e.target.value,
                            })
                          }
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
          return userRole === "MOSPI_REVIEWER"
            ? "comment"
            : "indicator_comment";
        })()}
        onSendBack={
          // For MOSPI_REVIEWER, don't call onSendBack (no status updates needed)
          getUserRole() === "MOSPI_REVIEWER"
            ? undefined
            : // Pass onSendBack callback to prevent auto-close when we need to show confirmation
            // For MOSPI_APPROVER Sent Back, we'll show confirmation in handleSaveMessage
            // Accept no longer requires comment, so it's not included here
            // For other cases, use the normal flow
            isMospiApproverSentBack
            ? async () => {
                // This prevents auto-close - handleSaveMessage will handle closing and showing confirmation
                console.log(
                  "MOSPI_APPROVER Sent Back - showing confirmation in handleSaveMessage"
                );
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
        key={`timeline-${timelineSection}-${
          getAllComments().length
        }-${Date.now()}`} // Force re-render when comments change
      />

      {/* Confirmation Dialog for NODAL_OFFICER Save */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save this indicator? This will resubmit
              it to the State Approver.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSave}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>
              Confirm & Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog for STATE_APPROVER and MOSPI_APPROVER Send Back */}
      <AlertDialog
        open={showSendBackDialog}
        onOpenChange={setShowSendBackDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send Back</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const getUserRole = () => {
                  try {
                    const authUser = localStorage.getItem("niri_app:auth_user");
                    if (authUser) {
                      const user = JSON.parse(authUser);
                      return user.value?.role;
                    }
                  } catch (error) {
                    console.error("Error reading user role:", error);
                  }
                  return null;
                };
                const userRole = getUserRole();
                const isMospiApprover = userRole === "MOSPI_APPROVER";

                return isMospiApprover
                  ? "Are you sure you want to send this section back to the State Approver? This action will mark the section as REVERTED."
                  : "Are you sure you want to send back this section? On send back, this will be returned to the Nodal Officer for corrections.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSendBack}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSendBack}>
              Confirm & Send Back
            </AlertDialogAction>
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
                    const authUser = localStorage.getItem("niri_app:auth_user");
                    if (authUser) {
                      const user = JSON.parse(authUser);
                      return user.value?.role;
                    }
                  } catch (error) {
                    console.error("Error reading user role:", error);
                  }
                  return null;
                };
                const userRole = getUserRole();
                const isMospiApprover = userRole === "MOSPI_APPROVER";

                return isMospiApprover
                  ? "Are you sure you want to accept this section? This action will mark the section as ACCEPTED and finalize the review."
                  : "Are you sure you want to accept this section? Now it is moved to the Reviewer. No further action can be taken after accept.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>
              Confirm & Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
