import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Upload,
  Plus,
  Clock,
  Edit3,
  Check,
  X,
  RotateCcw,
  CheckCircle,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
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
import {
  hasPPPDevelopmentData,
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
import { validatePPPDevelopment } from "@/features/submission/validation/pppDevelopmentValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import {
  SECTOR_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/features/submission/constants/steps";

interface PPPDevelopmentReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
}

export const PPPDevelopmentReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
  assignedIndicators = [],
  isNodalOfficer = false,
}: PPPDevelopmentReviewProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);

  // Normalization function for PPP Development data
  const normalizePPPDevelopment = (data: any) => {
    if (!data) return data;
    const normalized: any = { ...data };

    // Ensure section3_3 has VGFArray structure
    if (normalized.section3_3) {
      const section = normalized.section3_3;
      const status =
        (section && section.status) ||
        (Array.isArray(section) ? (section as any).status : undefined);

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
    formData &&
      typeof formData === "object" &&
      (formData as any)?.section3_1 !== undefined
      ? formData
      : (formData as any)?.pppDevelopment ?? formData
  );

  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(initialFormData);
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
  const [mospiSentBackSectionId, setMospiSentBackSectionId] = useState<
    string | null
  >(null);

  // State to track if comment modal was opened from STATE_APPROVER "Send Back" button
  const [isStateApproverSentBack, setIsStateApproverSentBack] = useState(false);
  const [stateApproverSentBackSectionId, setStateApproverSentBackSectionId] =
    useState<string | null>(null);

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

  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();

  // Helper function to check if section should be editable based on mospi_status for STATE_APPROVER
  const shouldBeEditable = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[PPPDevelopmentReview] shouldBeEditable(${sectionId}):`, {
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
      console.log(`[PPPDevelopmentReview] NODAL_OFFICER shouldBeEditable:`, {
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
        (formDataState && formDataState[sectionKey]) ||
        (formData && formData[sectionKey]);
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

    console.log(`[PPPDevelopmentReview] canEditSection(${sectionId}):`, {
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
      console.log(`[PPPDevelopmentReview] NODAL_OFFICER canEdit check:`, {
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
        (formDataState && formDataState[sectionKey]) ||
        (formData && formData[sectionKey]);
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
      `[PPPDevelopmentReview] handleEditStart called for section ${sectionId}`
    );
    const userRole = getUserRole();
    const submissionStatus = submission?.status;

    // Check if section CAN be edited (permission check)
    const canEdit = canEditSection(sectionId);
    console.log(
      `[PPPDevelopmentReview] handleEditStart - canEditSection result:`,
      {
        sectionId,
        userRole,
        submissionStatus,
        canEdit,
      }
    );

    if (!canEdit) {
      console.warn(
        `[PPPDevelopmentReview] ❌ Cannot edit section ${sectionId} - Permission denied`,
        {
          userRole,
          submissionStatus,
          reason: "canEditSection returned false",
        }
      );
      return;
    }

    console.log(
      `[PPPDevelopmentReview] ✅ Starting edit mode for section ${sectionId}`
    );
    // Store a deep copy of current formDataState
    setOriginalFormDataSnapshot(JSON.parse(JSON.stringify(formDataState)));
    setEditable(sectionId, true);
  };

  // Handle cancel - restore original state
  const handleCancel = (sectionId: string) => {
    if (originalFormDataSnapshot) {
      isRestoringRef.current = true;
      // Create a fresh deep copy to ensure React detects the change
      const restoredState = JSON.parse(
        JSON.stringify(originalFormDataSnapshot)
      );
      setFormDataState(restoredState);
      setOriginalFormDataSnapshot(null);
      setEditable(sectionId, false);
      // Increment reset key to force Select components to remount
      setSelectResetKey((prev) => prev + 1);
      // Increment refresh key to force component re-render
      setRefreshKey((prev) => prev + 1);

      // Close and reset "Add More Project" forms for section 3.3
      if (sectionId === "3.3") {
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
      if (sectionId === "3.4") {
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
      setRefreshKey((prev) => prev + 1);
      // Still close forms even if no snapshot exists
      if (sectionId === "3.3") {
        setShowAddVGFForm(false);
        setNewVGFItem({
          projectName: "",
          sector: "",
          type: "",
          submissionDate: "",
          file: null,
        });
      }
      if (sectionId === "3.4") {
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
  const hasData = hasPPPDevelopmentData({ pppDevelopment: formDataState });
  let sectionsWithData = getSectionsWithData(
    { pppDevelopment: formDataState },
    "pppDevelopment"
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
  // Only include sections that have meaningful data - don't show empty/unsubmitted indicators
  // This ensures state approvers only see indicators that were actually saved/submitted by nodal officers
  if (
    (!isPreview || (isPreview && !isNodalOfficer)) &&
    formDataState &&
    typeof formDataState === "object"
  ) {
    const allPossibleSections = [
      "section3_1",
      "section3_2",
      "section3_3",
      "section3_4",
    ];
    const existingSections = allPossibleSections.filter((sectionKey) => {
      // Check if section key exists in formDataState
      if (!(sectionKey in formDataState)) {
        return false;
      }

      const section = formDataState[sectionKey];

      // Check if section has meaningful data (not just empty object, null, or empty array)
      if (!section || typeof section !== "object") return false;

      // For section 3.1 and 3.2, check if they have files, available field, or comment
      if (sectionKey === "section3_1" || sectionKey === "section3_2") {
        const hasAvailable = section.available && section.available !== "";
        const hasFiles =
          (Array.isArray(section.files) && section.files.length > 0) ||
          (section.file && section.file !== null);
        const hasComment = section.comment && section.comment !== "";
        return hasAvailable || hasFiles || hasComment;
      }

      // For section 3.3, check if VGFArray has data
      if (sectionKey === "section3_3") {
        return (
          Array.isArray(section.VGFArray) &&
          section.VGFArray.length > 0 &&
          section.VGFArray.some((item) => {
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

      // For section 3.4, check if projects array has data
      if (sectionKey === "section3_4") {
        return (
          Array.isArray(section.projects) &&
          section.projects.length > 0 &&
          section.projects.some((item) => {
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

      // For other sections, check if they have any meaningful values
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

  const toFileArray = (
    value: FileUpload | FileUpload[] | null | undefined
  ): FileUpload[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  // Helper function to handle field updates
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

  // Helper function to handle file updates
  const handleFileUpdate = async (
    sectionId: string,
    updatedValue: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const previousSection = state?.[sectionKey] || {};
    const targetKey = "file"; // Section 3.1 uses 'file' (singular), same as 3.2
    const filesArray = toFileArray(updatedValue);
    // For single file sections (3.1, 3.2), use the first file or null
    const normalizedValue = Array.isArray(updatedValue) && updatedValue.length > 0 
      ? updatedValue[0] 
      : (Array.isArray(updatedValue) ? null : updatedValue);

    const updatedSection = {
      ...previousSection,
      [targetKey]: normalizedValue,
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Auto-save for file changes
    if (sectionId === "3.1") {
      try {
        const fields = [
          {
            available: updatedSection?.available ?? null,
            file: normalizedValue,
            comment: updatedSection?.comment ?? null,
          },
        ];

        await handleSaveSection({
          submissionId,
          category: "pppDevelopment",
          section: sectionKey,
          fields,
        });

        if (!normalizedValue) {
          await onIndicatorStatus(sectionId, false);
        }
      } catch (error) {
        console.error(
          "Failed to auto-save files for section",
          sectionId,
          error
        );
      }
    } else if (sectionId === "3.2") {
      try {
        const fields = [
          {
            available: updatedSection?.available ?? null,
            file: normalizedValue,
          },
        ];

        await handleSaveSection({
          submissionId,
          category: "pppDevelopment",
          section: sectionKey,
          fields,
        });
      } catch (error) {
        console.error(
          "Failed to auto-save files for section",
          sectionId,
          error
        );
      }
    }
  };

  // Helper to update table row items for section 3.3
  const handleTableFieldUpdate = (
    rowIndex: number,
    fieldName: string,
    value: any
  ) => {
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
  const handleProjectFieldUpdate = (
    projectIndex: number,
    fieldName: string,
    value: any
  ) => {
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

  // Handle removing entry from section 3.3
  const handleRemoveVGFEntry = (id: string) => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_3?.VGFArray;
      const rows = Array.isArray(current) 
        ? current.filter((item: any) => item.id !== id)
        : [];
      return {
        ...prev,
        section3_3: {
          ...(prev?.section3_3 || {}),
          VGFArray: rows,
        },
      };
    });
  };

  // Handle removing entry from section 3.4
  const handleRemoveProjectEntry = (id: string) => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_4?.projects;
      const projects = Array.isArray(current) 
        ? current.filter((item: any) => item.id !== id)
        : [];
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
        dateOfAward: newProject.dateOfAward
          ? new Date(newProject.dateOfAward).toISOString()
          : null,
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
        submissionDate: newVGFItem.submissionDate
          ? new Date(newVGFItem.submissionDate).toISOString()
          : null,
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
    console.log(
      `[PPPDevelopmentReview] onSaveSection called for section ${sectionId}`
    );
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";

    console.log(`[PPPDevelopmentReview] onSaveSection - User info:`, {
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

    console.log(`[PPPDevelopmentReview] onSaveSection - Status check:`, {
      sectionKey,
      sectionData,
      currentStatus,
      upperStatus,
      isReverted,
    });

    // If NODAL_OFFICER and status is REVERTED (sent back), show confirmation dialog first
    if (isNodalOfficer && isReverted) {
      console.log(
        `[PPPDevelopmentReview] ✅ Showing save confirmation dialog for REVERTED indicator`
      );
      setPendingSaveSectionId(sectionId);
      setShowSaveDialog(true);
      return;
    }

    console.log(
      `[PPPDevelopmentReview] ✅ Proceeding with direct save (not REVERTED or not NODAL_OFFICER)`
    );
    // For non-NODAL_OFFICER users or non-REVERTED status, proceed with submit directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    console.log(
      `[PPPDevelopmentReview] performSave called for section ${sectionId}`
    );
    try {
      // Map visual section id to payload section key (e.g. "3.1" -> "section3_1")
      const payloadSection = `section${sectionId.replace(".", "_")}`;
      console.log(
        `[PPPDevelopmentReview] performSave - Starting save process:`,
        {
          sectionId,
          payloadSection,
        }
      );

      // Use the local formData state to build fields for this section
      let fields: Record<string, any>[] = [];

      // Check if user is NODAL_OFFICER or STATE_APPROVER to preserve status
      const userRole = getUserRole();
      const isNodalOfficer = userRole === "NODAL_OFFICER";
      const isStateApprover = userRole === "STATE_APPROVER";

      switch (sectionId) {
        case "3.1":
          fields = [
            {
              available: state?.section3_1?.available ?? null,
              file: state?.section3_1?.file ?? null,
              comment: state?.section3_1?.comment ?? null,
            },
          ];
          break;

        case "3.2":
          fields = [
            {
              available: state?.section3_2?.available ?? null,
              file: state?.section3_2?.file ?? null,
              comment: state?.section3_2?.comment ?? null,
            },
          ];
          break;

        case "3.3":
          fields = [
            {
              VGFArray: (state?.section3_3?.VGFArray || []).map(
                (item: any) => ({
                  projectName: item?.projectName ?? null,
                  sector: item?.sector ?? null,
                  type: item?.type ?? null,
                  submissionDate: item?.submissionDate ?? null,
                  file: item?.file ?? null,
                  marksObtained: item?.marksObtained ?? null,
                })
              ),
            },
          ];
          break;

        case "3.4":
          fields = [
            {
              totalProjectsAwarded:
                state?.section3_4?.totalProjectsAwarded ?? null,
              totalProjectCostAwarded:
                state?.section3_4?.totalProjectCostAwarded ?? null,
              projects: (state?.section3_4?.projects || []).map(
                (project: any) => ({
                  nameOfProject: project?.nameOfProject ?? null,
                  nipId: project?.nipId ?? null,
                  fundingSource: project?.fundingSource ?? null,
                  infrastructureSector: project?.infrastructureSector ?? null,
                  dateOfAward: project?.dateOfAward ?? null,
                  capexPercentage: project?.capexPercentage ?? null,
                  totalProjectCost: project?.totalProjectCost ?? null,
                })
              ),
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
        section3_1: formDataState?.section3_1 || { available: "", file: null },
        section3_2: formDataState?.section3_2 || { available: "", file: null },
        section3_3: formDataState?.section3_3 || [],
        section3_4: formDataState?.section3_4 || { projects: [] },
      };

      const effectiveAssignedIndicators = assignedIndicators.length > 0 
        ? assignedIndicators 
        : (hookAssignedIndicators.length > 0 ? hookAssignedIndicators : undefined);

      const validationResult = validatePPPDevelopment(fullData, {
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
        `[PPPDevelopmentReview] performSave - Calling handleSaveSection API...`,
        {
          submissionId,
          category: "pppDevelopment",
          section: payloadSection,
          fieldsCount: fields.length,
          fieldsWithStatus: fields[0]?.status,
        }
      );
      const saveResult = await handleSaveSection({
        submissionId,
        category: "pppDevelopment",
        section: payloadSection,
        fields,
      });
      console.log(
        `[PPPDevelopmentReview] ✅ performSave - API call successful:`,
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
        `[PPPDevelopmentReview] ✅ performSave - Save completed, editing disabled for section ${sectionId}`
      );
    } catch (error) {
      console.error(
        `[PPPDevelopmentReview] ❌ performSave - Error saving section ${sectionId}:`,
        error
      );
      throw error; // Re-throw so handleConfirmSave can catch it
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    console.log(`[PPPDevelopmentReview] handleConfirmSave called:`, {
      pendingSaveSectionId,
    });
    if (pendingSaveSectionId) {
      console.log(
        `[PPPDevelopmentReview] ✅ Confirmed - calling performSave for section ${pendingSaveSectionId}`
      );
      try {
        await performSave(pendingSaveSectionId);
        console.log(`[PPPDevelopmentReview] ✅ Save completed successfully`);
        setShowSaveDialog(false);
        setPendingSaveSectionId(null);
      } catch (error) {
        console.error(`[PPPDevelopmentReview] ❌ Save failed:`, error);
        // Don't close dialog on error so user can try again
      }
    } else {
      console.warn(
        `[PPPDevelopmentReview] ⚠️ handleConfirmSave called but no pendingSaveSectionId`
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
      category: "pppDevelopment",
      section: `section${sectionId.replace(".", "_")}`,
      status,
    };

    // If MOSPI_APPROVER, add mospi_status field
    if (isMospiApprover) {
      payload.mospi_status = status ? "ACCEPTED" : "REVERTED";
    }

    try {
      await apiService.indicatorStatus(payload);
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const statusField = isMospiApprover ? "mospi_status" : "status";
      const statusValue = status ? "ACCEPTED" : "REVERTED";

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
        `[PPPDevelopmentReview] STATE_APPROVER cannot send back their own indicator ${sectionId}`
      );
      return; // Don't show dialog, just return
    }

    // If STATE_APPROVER is accepting their own indicator, show confirmation dialog
    if (isStateApprover && status && isSubmissionFromStateApprover) {
      console.log(
        `[PPPDevelopmentReview] STATE_APPROVER accepting their own indicator ${sectionId} - showing confirmation dialog`
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
      const sectionData = state ? state[sectionKey] : undefined;
      const mospiStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.mospi_status
          : sectionData?.mospi_status
        : undefined;

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
    const sectionStatus = sectionData
      ? Array.isArray(sectionData)
        ? (sectionData as any).status
        : sectionData.status
      : undefined;

    // Debug logging
    console.log(`[PPPDevelopmentReview] Section ${sectionId}:`, {
      sectionKey,
      sectionStatus,
      isStateApprover,
      hasStateData: !!(state && state[sectionKey]),
      hasFormData: !!(formData && formData[sectionKey]),
      stateData: state && state[sectionKey],
      formDataData: formData && formData[sectionKey],
    });

    // For STATE_APPROVER, check mospi_status to determine if section should be editable
    if (isStateApprover) {
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

    // For STATE_APPROVER, show "Re Submitted" badge if status is RESUBMITTED
    if (isStateApprover && sectionStatus === "RESUBMITTED") {
      console.log(
        `[PPPDevelopmentReview] RESUBMITTED block hit for section ${sectionId}`
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
                disabled={(() => {
                  // For STATE_APPROVER, disable edit button if mospi_status is ACCEPTED
                  if (isStateApprover) {
                    const sectionKey = `section${sectionId.replace(".", "_")}`;
                    const sectionData =
                      (formDataState && formDataState[sectionKey]) ||
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
            `[PPPDevelopmentReview] Section ${sectionId} - Send Back visibility:`,
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
          No PPP Development data available for review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData(
            { pppDevelopment: formData },
            "pppDevelopment"
          );
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
        {sectionsWithData.includes("section3_1") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.1 -</span> Availability of
                    Infrastructure Act/Policy{" "}
                  </span>
                  {renderActionButtons("3.1")}
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
                onClick={() => handleOpenModal("3.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
              )}
            </div>
          </CardHeader> */}
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.1")}
            <div className="space-y-4">
              <div>
                <Label className="mb-3 block">PPP Act/Policy Available?*</Label>
                {shouldBeEditable("3.1") ? (
                  <RadioGroup
                    value={state?.section3_1?.available || ""}
                    onValueChange={(value) => {
                      handleFieldUpdate("3.1", "available", value);
                      // Clear validation error when user selects
                      if (getFieldError("section3_1.available")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section3_1.available"];
                          return updated;
                        });
                      }
                    }}
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section3_1?.available === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section3_1?.available === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
                {getFieldError("section3_1.available") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section3_1.available")}</p>
                )}
              </div>

              {state?.section3_1?.available === "yes" && (
                <div>
                  <EditableFileDisplay
                    files={state?.section3_1?.file ?? null}
                    isEditable={shouldBeEditable("3.1")}
                    submissionId={submissionId}
                    onFilesChange={(updatedFile) => {
                      handleFileUpdate("3.1", updatedFile);
                      // Clear validation error when file is uploaded
                      if (getFieldError("section3_1.file")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section3_1.file"];
                          return updated;
                        });
                      }
                    }}
                    label="Uploaded File"
                    multiple={false}
                  />
                  {getFieldError("section3_1.file") && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError("section3_1.file")}</p>
                  )}
                </div>
              )}

              {state?.section3_1?.available === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("3.1") ? (
                    <Textarea
                      value={state?.section3_1?.comment || ""}
                      onChange={(e) => {
                        handleFieldUpdate("3.1", "comment", e.target.value);
                        // Clear validation error when user starts typing
                        if (getFieldError("section3_1.comment")) {
                          setValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated["section3_1.comment"];
                            return updated;
                          });
                        }
                      }}
                      placeholder="Please provide a comment..."
                      className={
                        getFieldError("section3_1.comment")
                          ? "min-h-[100px] border-red-500"
                          : "min-h-[100px]"
                      }
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section3_1?.comment || "No comment provided"}
                    </div>
                  )}
                  {getFieldError("section3_1.comment") && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError("section3_1.comment")}</p>
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
        {sectionsWithData.includes("section3_2") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.2 -</span> Availability of
                    Functional PPP Cell/Unit{" "}
                  </span>
                  {renderActionButtons("3.2")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.2")}
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
                <Label className="mb-3 block">
                  Functional State/UT PPP Cell/Unit*
                </Label>
                {shouldBeEditable("3.2") ? (
                  <RadioGroup
                    value={state?.section3_2?.available || ""}
                    onValueChange={(value) => {
                      handleFieldUpdate("3.2", "available", value);
                      // Clear validation error when user selects
                      if (getFieldError("section3_2.available")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section3_2.available"];
                          return updated;
                        });
                      }
                    }}
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
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section3_2?.available === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {state?.section3_2?.available === "yes" ? "Yes" : "No"}
                    </span>
                  </div>
                )}
                {getFieldError("section3_2.available") && (
                  <p className="text-sm text-red-500 mt-1">{getFieldError("section3_2.available")}</p>
                )}
              </div>

              {state?.section3_2?.available === "yes" && (
                <div>
                  <EditableFileDisplay
                    files={state?.section3_2?.file ?? null}
                    isEditable={shouldBeEditable("3.2")}
                    submissionId={submissionId}
                    onFilesChange={(updatedFile) => {
                      handleFileUpdate("3.2", updatedFile);
                      // Clear validation error when file is uploaded
                      if (getFieldError("section3_2.file")) {
                        setValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section3_2.file"];
                          return updated;
                        });
                      }
                    }}
                    label="Uploaded File"
                    multiple={false}
                  />
                  {getFieldError("section3_2.file") && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError("section3_2.file")}</p>
                  )}
                </div>
              )}

              {state?.section3_2?.available === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("3.2") ? (
                    <Textarea
                      value={state?.section3_2?.comment || ""}
                      onChange={(e) => {
                        handleFieldUpdate("3.2", "comment", e.target.value);
                        // Clear validation error when user starts typing
                        if (getFieldError("section3_2.comment")) {
                          setValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated["section3_2.comment"];
                            return updated;
                          });
                        }
                      }}
                      placeholder="Please provide a comment..."
                      className={
                        getFieldError("section3_2.comment")
                          ? "min-h-[100px] border-red-500"
                          : "min-h-[100px]"
                      }
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section3_2?.comment || "No comment provided"}
                    </div>
                  )}
                  {getFieldError("section3_2.comment") && (
                    <p className="text-sm text-red-500 mt-1">{getFieldError("section3_2.comment")}</p>
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
        {sectionsWithData.includes("section3_3") && (
          <SectionCard
            key={`section-3.3-${refreshKey}`}
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.3 -</span> Proposals
                    Submitted under VGF/IIPDF{" "}
                  </span>
                  {renderActionButtons("3.3")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.3")}
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
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                        Project Name
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Sector
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Type
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Submission Date
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Uploaded File
                      </th>
                      {shouldBeEditable("3.3") && (
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody
                    key={`vgf-table-body-${selectResetKey}-${refreshKey}-${
                      state?.section3_3?.VGFArray?.length || 0
                    }`}
                  >
                    {(() => {
                      const VGFArray = Array.isArray(
                        state?.section3_3?.VGFArray
                      )
                        ? state.section3_3.VGFArray
                        : [];

                      if (!VGFArray.length) {
                        return (
                          <tr>
                            <td
                              colSpan={shouldBeEditable("3.3") ? 6 : 5}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No VGF/IIPDF proposals data available
                            </td>
                          </tr>
                        );
                      }

                      return VGFArray.map((item: any, index: number) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.3") ? (
                              <div>
                                <Input
                                  value={item.projectName || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      index,
                                      "projectName",
                                      e.target.value
                                    )
                                  }
                                  className={
                                    getFieldError(`section3_3.VGFArray.${index}.projectName`)
                                      ? "w-full border-red-500"
                                      : "w-full"
                                  }
                                />
                                {getFieldError(`section3_3.VGFArray.${index}.projectName`) && (
                                  <p className="text-sm text-red-500 mt-1">{getFieldError(`section3_3.VGFArray.${index}.projectName`)}</p>
                                )}
                              </div>
                            ) : (
                              item.projectName || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.3") ? (
                              <div>
                                <Select
                                  key={`sector-${index}-${selectResetKey}`}
                                  value={item.sector || ""}
                                  onValueChange={(value) =>
                                    handleTableFieldUpdate(index, "sector", value)
                                  }
                                >
                                  <SelectTrigger className={
                                    getFieldError(`section3_3.VGFArray.${index}.sector`)
                                      ? "w-full border-red-500"
                                      : "w-full"
                                  }>
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
                                {getFieldError(`section3_3.VGFArray.${index}.sector`) && (
                                  <p className="text-sm text-red-500 mt-1">{getFieldError(`section3_3.VGFArray.${index}.sector`)}</p>
                                )}
                              </div>
                            ) : (
                              item.sector || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.3") ? (
                              <div>
                                <Select
                                  key={`type-${index}-${selectResetKey}`}
                                  value={item.type || ""}
                                  onValueChange={(value) =>
                                    handleTableFieldUpdate(index, "type", value)
                                  }
                                >
                                  <SelectTrigger className={
                                    getFieldError(`section3_3.VGFArray.${index}.type`)
                                      ? "w-full border-red-500"
                                      : "w-full"
                                  }>
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
                                {getFieldError(`section3_3.VGFArray.${index}.type`) && (
                                  <p className="text-sm text-red-500 mt-1">{getFieldError(`section3_3.VGFArray.${index}.type`)}</p>
                                )}
                              </div>
                            ) : (
                              item.type || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.3") ? (
                              <div>
                                <Input
                                  type="date"
                                  value={
                                    item.submissionDate
                                      ? new Date(item.submissionDate)
                                          .toISOString()
                                          .split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      index,
                                      "submissionDate",
                                      e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : null
                                    )
                                  }
                                  className={
                                    getFieldError(`section3_3.VGFArray.${index}.submissionDate`)
                                      ? "w-full border-red-500"
                                      : "w-full"
                                  }
                                />
                                {getFieldError(`section3_3.VGFArray.${index}.submissionDate`) && (
                                  <p className="text-sm text-red-500 mt-1">{getFieldError(`section3_3.VGFArray.${index}.submissionDate`)}</p>
                                )}
                              </div>
                            ) : item.submissionDate ? (
                              new Date(item.submissionDate).toLocaleDateString()
                            ) : (
                              ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.3") ? (
                              <div className="space-y-1.5">
                                {item.file ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                    title={
                                      extractOriginalName(
                                        item.file.fileName || "",
                                        (item.file as any)?.originalName
                                      ) || "Unknown file"
                                    }
                                  >
                                    <Upload className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {extractOriginalName(
                                        item.file.fileName || "",
                                        (item.file as any)?.originalName
                                      ) || "Unknown file"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleTableFieldUpdate(
                                          index,
                                          "file",
                                          null
                                        );
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
                                      const selectedFile = e.target.files?.[0];
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
                                            originalName: selectedFile.name || fileData.originalName || fileData.data?.originalName, // Preserve original file name
                                            fileSize: Number(
                                              fileData.fileSize ??
                                                fileData.size ??
                                                selectedFile.size ??
                                                0
                                            ),
                                            uploadedAt: Number(
                                              fileData.uploadedAt ?? Date.now()
                                            ),
                                            filePath:
                                              fileData.filePath ??
                                              fileData.file ??
                                              fileData.url ??
                                              fileData.path,
                                            fileUrl:
                                              fileData.fileUrl || fileData.url,
                                            mimeType: fileData.mimeType,
                                          };

                                          await handleTableFieldUpdate(
                                            index,
                                            "file",
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
                                    id={`file-input-3.3-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `file-input-3.3-${index}`
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
                            ) : item.file ? (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                  title={(item.file as any).originalName || item.file.fileName || "Unknown file"}
                                >
                                  <Upload className="w-3 h-3" />
                                  <span className="truncate">
                                    {(item.file as any).originalName || item.file.fileName || "Unknown file"}
                                  </span>
                                </Badge>
                                {(() => {
                                  const fileKey = `3.3-${index}`;
                                  const isLoading = !!fileLoading[fileKey];
                                  const hasFileAccess = !!(item.file.filePath || item.file.file || item.file.fileUrl);
                                  return hasFileAccess ? (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewFile(item.file, fileKey)}
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
                                        onClick={() => handleDownloadFile(item.file, fileKey)}
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
                          {shouldBeEditable("3.3") && (
                            <td className="py-3 px-4 text-sm font-normal">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleRemoveVGFEntry(item.id || index.toString())}
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

              {/* Add More Project Button - Only visible when in edit mode */}
              {isEditable("3.3") && !showAddVGFForm && (
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
              {showAddVGFForm && isEditable("3.3") && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">
                    Add New VGF/IIPDF Proposal
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Project Name</Label>
                      <Input
                        value={newVGFItem.projectName}
                        onChange={(e) =>
                          setNewVGFItem({
                            ...newVGFItem,
                            projectName: e.target.value,
                          })
                        }
                        className="bg-white"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <Label>Sector</Label>
                      <Select
                        value={newVGFItem.sector}
                        onValueChange={(value) =>
                          setNewVGFItem({ ...newVGFItem, sector: value })
                        }
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
                        onValueChange={(value) =>
                          setNewVGFItem({ ...newVGFItem, type: value })
                        }
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
                        onChange={(e) =>
                          setNewVGFItem({
                            ...newVGFItem,
                            submissionDate: e.target.value,
                          })
                        }
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
                          setNewVGFItem({
                            ...newVGFItem,
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
        {sectionsWithData.includes("section3_4") && (
          <SectionCard
            key={`section-3.4-${refreshKey}`}
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.4 -</span> Proportion of
                    TPC of PPP Projects{" "}
                  </span>
                  {renderActionButtons("3.4")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.4")}
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
                  {isEditable("3.4") ? (
                    <div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={state?.section3_4?.totalProjectsAwarded || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow non-negative integers
                          if (value === "" || /^\d+$/.test(value)) {
                            handleSection3_4FieldUpdate(
                              "totalProjectsAwarded",
                              value
                            );
                          }
                        }}
                        className={
                          getFieldError("section3_4.totalProjectsAwarded")
                            ? "bg-white border-red-500"
                            : "bg-white"
                        }
                        placeholder="Enter total projects awarded"
                      />
                      {getFieldError("section3_4.totalProjectsAwarded") && (
                        <p className="text-sm text-red-500 mt-1">{getFieldError("section3_4.totalProjectsAwarded")}</p>
                      )}
                    </div>
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
                  {isEditable("3.4") ? (
                    <div>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={state?.section3_4?.totalProjectCostAwarded || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers and decimal point
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            handleSection3_4FieldUpdate(
                              "totalProjectCostAwarded",
                              value
                            );
                          }
                        }}
                        className={
                          getFieldError("section3_4.totalProjectCostAwarded")
                            ? "bg-white border-red-500"
                            : "bg-white"
                        }
                        placeholder="Enter total project cost awarded"
                      />
                      {getFieldError("section3_4.totalProjectCostAwarded") && (
                        <p className="text-sm text-red-500 mt-1">{getFieldError("section3_4.totalProjectCostAwarded")}</p>
                      )}
                    </div>
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
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                        Name of Project
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        NIP ID
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Funding Source
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Infrastructure Sector
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Date of Award
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        % Capex
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Total Project Cost
                      </th>
                      {shouldBeEditable("3.4") && (
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody
                    key={`projects-table-body-${selectResetKey}-${refreshKey}-${
                      state?.section3_4?.projects?.length || 0
                    }`}
                  >
                    {(() => {
                      const projects = Array.isArray(
                        state?.section3_4?.projects
                      )
                        ? state.section3_4.projects
                        : [];

                      if (!projects.length) {
                        return (
                          <tr>
                            <td
                              colSpan={shouldBeEditable("3.4") ? 8 : 7}
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
                            {shouldBeEditable("3.4") ? (
                              <Input
                                value={project.nameOfProject || ""}
                                onChange={(e) =>
                                  handleProjectFieldUpdate(
                                    idx,
                                    "nameOfProject",
                                    e.target.value
                                  )
                                }
                                className="w-full"
                              />
                            ) : (
                              project.nameOfProject || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.4") ? (
                              <Input
                                value={project.nipId || ""}
                                onChange={(e) =>
                                  handleProjectFieldUpdate(
                                    idx,
                                    "nipId",
                                    e.target.value
                                  )
                                }
                                className="w-full"
                              />
                            ) : (
                              project.nipId || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.4") ? (
                              <Input
                                value={project.fundingSource || ""}
                                onChange={(e) =>
                                  handleProjectFieldUpdate(
                                    idx,
                                    "fundingSource",
                                    e.target.value
                                  )
                                }
                                className="w-full"
                              />
                            ) : (
                              project.fundingSource || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.4") ? (
                              <Select
                                key={`infrastructureSector-${idx}-${selectResetKey}`}
                                value={project.infrastructureSector || ""}
                                onValueChange={(value) =>
                                  handleProjectFieldUpdate(
                                    idx,
                                    "infrastructureSector",
                                    value
                                  )
                                }
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
                              project.infrastructureSector || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.4") ? (
                              <Input
                                type="date"
                                value={
                                  project.dateOfAward
                                    ? new Date(project.dateOfAward)
                                        .toISOString()
                                        .split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  handleProjectFieldUpdate(
                                    idx,
                                    "dateOfAward",
                                    e.target.value
                                      ? new Date(e.target.value).toISOString()
                                      : null
                                  )
                                }
                                className="w-full"
                              />
                            ) : project.dateOfAward ? (
                              new Date(project.dateOfAward).toLocaleDateString()
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.4") ? (
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                max="100"
                                value={project.capexPercentage || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers and decimal point
                                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                    handleProjectFieldUpdate(
                                      idx,
                                      "capexPercentage",
                                      value
                                    );
                                  }
                                }}
                                className="w-full"
                                placeholder="Enter percentage"
                              />
                            ) : (
                              project.capexPercentage || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("3.4") ? (
                              <Input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={project.totalProjectCost || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers and decimal point
                                  if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                    handleProjectFieldUpdate(
                                      idx,
                                      "totalProjectCost",
                                      value
                                    );
                                  }
                                }}
                                className="w-full"
                                placeholder="Enter cost"
                              />
                            ) : (
                              project.totalProjectCost || "N/A"
                            )}
                          </td>
                          {shouldBeEditable("3.4") && (
                            <td className="py-3 px-4 text-sm font-normal">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleRemoveProjectEntry(project.id || idx.toString())}
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

              {/* Add More Project Button - Only visible when in edit mode */}
              {isEditable("3.4") && !showAddProjectForm && (
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
              {showAddProjectForm && isEditable("3.4") && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Add New Project</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name of PPP/Bankable Projects</Label>
                      <Input
                        value={newProject.nameOfProject}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            nameOfProject: e.target.value,
                          })
                        }
                        className="bg-white"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <Label>NIP ID</Label>
                      <Input
                        value={newProject.nipId}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            nipId: e.target.value,
                          })
                        }
                        className="bg-white"
                        placeholder="Enter NIP ID"
                      />
                    </div>
                    <div>
                      <Label>Funding Source</Label>
                      <Input
                        value={newProject.fundingSource}
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            fundingSource: e.target.value,
                          })
                        }
                        className="bg-white"
                        placeholder="Enter funding source"
                      />
                    </div>
                    <div>
                      <Label>Infrastructure Sector</Label>
                      <Select
                        value={newProject.infrastructureSector}
                        onValueChange={(value) =>
                          setNewProject({
                            ...newProject,
                            infrastructureSector: value,
                          })
                        }
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
                        onChange={(e) =>
                          setNewProject({
                            ...newProject,
                            dateOfAward: e.target.value,
                          })
                        }
                        className="bg-white"
                      />
                    </div>
                    <div>
                      <Label>% of Capex funded by non-Govt sources</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        max="100"
                        value={newProject.capexPercentage}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers and decimal point
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setNewProject({
                              ...newProject,
                              capexPercentage: value,
                            });
                          }
                        }}
                        className="bg-white"
                        placeholder="Enter percentage (0-100)"
                      />
                    </div>
                    <div>
                      <Label>Total Project Cost</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={newProject.totalProjectCost}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow numbers and decimal point
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            setNewProject({
                              ...newProject,
                              totalProjectCost: value,
                            });
                          }
                        }}
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
          return userRole === "MOSPI_REVIEWER"
            ? "comment"
            : "indicator_comment";
        })()}
        onSendBack={
          // For MOSPI_REVIEWER, don't call onSendBack (no status updates needed)
          (() => {
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
            return getUserRole() === "MOSPI_REVIEWER";
          })()
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
              it to the State Approver.{" "}
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
