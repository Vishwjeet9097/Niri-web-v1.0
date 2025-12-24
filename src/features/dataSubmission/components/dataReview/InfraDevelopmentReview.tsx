import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Upload,
  Plus,
  Clock,
  RotateCcw,
  CheckCircle,
  X,
  Check,
  Edit3,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import {
  hasInfraDevelopmentData,
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
import { validateInfraDevelopment } from "@/features/submission/validation/infraDevelopmentValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import {
  isSubmissionFromNodalOfficer,
  isIndicatorFromNodalOfficer,
} from "@/utils/indicatorStatusUtils";
import { useFieldValidation } from "@/features/submission/hooks/useFieldValidation";
import { useFieldErrorDisplay } from "@/features/submission/hooks/useFieldErrorDisplay";
import { getInputValidationClass as getInputValidationClassUtil } from "@/features/submission/utils/validationStyles";
import { cn } from "@/lib/utils";
import { useMemo, useCallback } from "react";

const toFileArray = (
  value: FileUpload | FileUpload[] | null | undefined
): FileUpload[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const toSingleFile = (
  value: FileUpload | FileUpload[] | null | undefined
): FileUpload | null => {
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
  assignedIndicators?: string[]; // Assigned indicators for nodal officers
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
}

export const InfraDevelopmentReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
  assignedIndicators = [],
  isNodalOfficer = false,
}: InfraDevelopmentReviewProps) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const [submissionState, setSubmissionState] = useState(submission);
  const [formDataState, setFormDataState] = useState(formData);
  const { assignedIndicators: hookAssignedIndicators } = useIndicatorAccess();

  // State for edit functionality indicator wise - moved here to be available before useMemo
  const { setEditable, isEditable, clearAllEditing } =
    useEditableSectionStore();

  // Field validation hook for touch tracking
  const {
    touchedFields,
    markFieldAsTouched,
    setValidatingIndicator,
    markIndicatorFieldsAsTouched,
    clearValidatingIndicator,
    clearValidFieldErrors,
    createOnChangeHandler,
    createOnBlurHandler,
    createOnValueChangeHandler,
  } = useFieldValidation();

  // Helper to check if field is touched
  const isFieldTouched = useCallback(
    (path: string) => {
      return touchedFields.has(path);
    },
    [touchedFields]
  );

  // Real-time validation state
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [indicatorValidationErrors, setIndicatorValidationErrors] = useState<
    Record<string, string>
  >({});
  // Section-level validation error messages (shown when save fails)
  const [sectionValidationMessages, setSectionValidationMessages] = useState<
    Record<string, string>
  >({});

  // Build full form data for validation
  const fullFormDataForValidation = useMemo(() => {
    return formDataState || formData || {};
  }, [formDataState, formData]);

  // Real-time validation using useMemo
  const validation = useMemo(() => {
    const effectiveAssignedIndicators =
      assignedIndicators.length > 0
        ? assignedIndicators
        : hookAssignedIndicators.length > 0
        ? hookAssignedIndicators
        : undefined;

    return validateInfraDevelopment(fullFormDataForValidation as any, {
      allowedIndicators: effectiveAssignedIndicators,
    });
  }, [fullFormDataForValidation, assignedIndicators, hookAssignedIndicators]);

  // Field error display hook
  const { getFieldError, getInputValidationClass, renderFieldError } =
    useFieldErrorDisplay({
      validationErrors: validation.errors,
      indicatorValidationErrors,
      showValidationErrors,
      isFieldTouched,
      validatingIndicator: null,
    });

  // Clear valid field errors when validation passes
  useEffect(() => {
    clearValidFieldErrors(validation.errors, setIndicatorValidationErrors);
  }, [validation.errors, clearValidFieldErrors]);

  // Clear section validation messages in real-time when validation passes
  useEffect(() => {
    setSectionValidationMessages((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      // Check each section that has a validation message
      Object.keys(updated).forEach((sectionId) => {
        const sectionPrefix = `section${sectionId.replace(".", "_")}`;
        // Check if there are any validation errors for this section
        const hasSectionErrors = Object.keys(validation.errors).some(
          (errorKey) => errorKey.startsWith(sectionPrefix)
        );

        // If no errors for this section, clear the message
        if (!hasSectionErrors) {
          delete updated[sectionId];
          hasChanges = true;
        }
      });

      return hasChanges ? updated : prev;
    });
  }, [validation.errors]);

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
  const extractOriginalName = (
    fileName: string,
    originalName?: string
  ): string => {
    if (originalName && originalName.trim()) return originalName;

    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, "");
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
        const base =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const downloadUrl = `${base.replace(
          /\/$/,
          ""
        )}/file/download/${encoded}`;

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

  // State for Add More forms in sections 2.1, 2.2, 2.3, 2.4, and 2.5
  const [showAddForm2_1, setShowAddForm2_1] = useState(false);
  const [showAddForm2_2, setShowAddForm2_2] = useState(false);
  const [showAddForm2_3, setShowAddForm2_3] = useState(false);
  const [showAddForm2_4, setShowAddForm2_4] = useState(false);
  const [showAddForm2_5, setShowAddForm2_5] = useState(false);
  const [newEntry2_1, setNewEntry2_1] = useState({
    sector: "",
    files: [] as FileUpload[],
  });
  const [newEntry2_2, setNewEntry2_2] = useState({
    sector: "",
    files: [] as FileUpload[],
  });
  const [newEntry2_3, setNewEntry2_3] = useState({
    sector: "",
    files: [] as FileUpload[],
  });
  const [newEntry2_4, setNewEntry2_4] = useState({
    projectName: "",
    sector: "",
    status: "",
    projectSize: "",
    investmentType: "",
    dprFile: null as FileUpload | null,
  });
  const [newEntry2_5, setNewEntry2_5] = useState({
    projectName: "",
    sector: "",
    type: "",
    ownership: "",
    estimatedMonetization: "",
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

  // Helper function to check if section should be editable based on mospi_status for STATE_APPROVER
  const shouldBeEditable = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[InfraDevelopmentReview] shouldBeEditable(${sectionId}):`, {
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
      console.log(`[InfraDevelopmentReview] NODAL_OFFICER shouldBeEditable:`, {
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
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (formDataState && formDataState[sectionKey]) ||
        (formData && formData[sectionKey]);
      const sectionStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.status
        : sectionData?.status;
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

      // If section status is RESUBMITTED, allow editing if section is in edit mode
      if (sectionStatus === "RESUBMITTED") {
        return isEditable(sectionId);
      }

      // STATE_APPROVER can edit when status is DRAFT, SUBMITTED_TO_STATE, or RETURNED_FROM_MOSPI
      // Should NOT have editing access when status is SUBMITTED_TO_MOSPI_REVIEWER or SUBMITTED_TO_MOSPI_APPROVER
      if (
        submissionStatus !== "DRAFT" &&
        submissionStatus !== "SUBMITTED_TO_STATE" &&
        submissionStatus !== "RETURNED_FROM_MOSPI"
      ) {
        return false;
      }

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

  // Helper function to check if section CAN be edited (permission check, not state check)
  const canEditSection = (sectionId: string): boolean => {
    const userRole = getUserRole();
    const isStateApprover = userRole === "STATE_APPROVER";
    const isNodalOfficer = userRole === "NODAL_OFFICER";
    const submissionStatus = submission?.status;

    console.log(`[InfraDevelopmentReview] canEditSection(${sectionId}):`, {
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
      console.log(`[InfraDevelopmentReview] NODAL_OFFICER canEdit check:`, {
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

  // Handle edit mode start - store original state snapshot
  const handleEditStart = (sectionId: string) => {
    console.log(
      `[InfraDevelopmentReview] handleEditStart called for section ${sectionId}`
    );
    const userRole = getUserRole();
    const submissionStatus = submission?.status;

    // Check if section CAN be edited (permission check)
    const canEdit = canEditSection(sectionId);
    console.log(
      `[InfraDevelopmentReview] handleEditStart - canEditSection result:`,
      {
        sectionId,
        userRole,
        submissionStatus,
        canEdit,
      }
    );

    if (!canEdit) {
      console.warn(
        `[InfraDevelopmentReview] ❌ Cannot edit section ${sectionId} - Permission denied`,
        {
          userRole,
          submissionStatus,
          reason: "canEditSection returned false",
        }
      );
      return;
    }

    console.log(
      `[InfraDevelopmentReview] ✅ Starting edit mode for section ${sectionId}`
    );
    // Store a deep copy of current formDataState
    setOriginalFormDataSnapshot(JSON.parse(JSON.stringify(formDataState)));
    setEditable(sectionId, true);

    // Show all validation errors when entering edit mode
    // Build full form data for validation
    const fullData = formDataState || formData || {};

    const effectiveAssignedIndicators =
      assignedIndicators.length > 0
        ? assignedIndicators
        : hookAssignedIndicators.length > 0
        ? hookAssignedIndicators
        : undefined;

    // Run validation for the section
    const validationResult = validateInfraDevelopment(fullData as any, {
      allowedIndicators: effectiveAssignedIndicators,
    });

    // Filter validation errors to only include the section being edited
    const sectionErrors: Record<string, string> = {};
    const sectionPrefix = `section${sectionId.replace(".", "_")}`;
    Object.keys(validationResult.errors).forEach((errorKey) => {
      if (errorKey.startsWith(sectionPrefix)) {
        sectionErrors[errorKey] = validationResult.errors[errorKey];
      }
    });

    // Mark all fields in this section as touched so errors show immediately
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const sectionData =
      formDataState?.[sectionKey as keyof typeof formDataState];

    // Get all possible field paths for this section
    const allSectionFields: string[] = [];

    // Add base fields based on section
    if (sectionId === "2.1") {
      allSectionFields.push(`${sectionPrefix}.infraActArray`);
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "infraActArray" in sectionData &&
        Array.isArray((sectionData as any).infraActArray)
      ) {
        (sectionData as any).infraActArray.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.infraActArray.${index}.sector`,
            `${sectionPrefix}.infraActArray.${index}.files`
          );
        });
      }
    } else if (sectionId === "2.2") {
      allSectionFields.push(`${sectionPrefix}.specializedEntityArray`);
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "specializedEntityArray" in sectionData &&
        Array.isArray((sectionData as any).specializedEntityArray)
      ) {
        (sectionData as any).specializedEntityArray.forEach(
          (_: any, index: number) => {
            allSectionFields.push(
              `${sectionPrefix}.specializedEntityArray.${index}.sector`,
              `${sectionPrefix}.specializedEntityArray.${index}.files`
            );
          }
        );
      }
    } else if (sectionId === "2.3") {
      allSectionFields.push(
        `${sectionPrefix}.hasInfraDevelopmentPlan`,
        `${sectionPrefix}.comment`
      );
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "infraDevelopmentArray" in sectionData &&
        Array.isArray((sectionData as any).infraDevelopmentArray)
      ) {
        (sectionData as any).infraDevelopmentArray.forEach(
          (_: any, index: number) => {
            allSectionFields.push(
              `${sectionPrefix}.infraDevelopmentArray.${index}.sector`,
              `${sectionPrefix}.infraDevelopmentArray.${index}.files`
            );
          }
        );
      }
    } else if (sectionId === "2.4") {
      allSectionFields.push(
        `${sectionPrefix}.hasInvestmentReady`,
        `${sectionPrefix}.comment`
      );
    }

    // Mark all section fields as touched so errors show immediately
    allSectionFields.forEach((field) => {
      markFieldAsTouched(field);
    });
    // Also mark fields with errors from validation
    Object.keys(validationResult.errors).forEach((errorKey) => {
      if (errorKey.startsWith(sectionPrefix)) {
        markFieldAsTouched(errorKey);
      }
    });

    // Set validation errors and show them
    setShowValidationErrors(true);
    setIndicatorValidationErrors((prev) => ({ ...prev, ...sectionErrors }));

    console.log(
      `[InfraDevelopmentReview] Validation errors for section ${sectionId}:`,
      sectionErrors
    );
  };

  // Handle cancel - restore original state
  const handleCancel = async (sectionId: string) => {
    console.log(`[InfraDevelopmentReview] handleCancel called for section ${sectionId}`, {
      hasSnapshot: !!originalFormDataSnapshot,
      hasFormData: !!formData,
    });
    
    if (originalFormDataSnapshot) {
      isRestoringRef.current = true;
      // Create a fresh deep copy to ensure React detects the change
      const restoredState = JSON.parse(
        JSON.stringify(originalFormDataSnapshot)
      );
      console.log(`[InfraDevelopmentReview] Restoring from snapshot for ${sectionId}:`, restoredState);
      setFormDataState(restoredState);
      setOriginalFormDataSnapshot(null);
      setEditable(sectionId, false);
      // Clear validation errors for this section
      const sectionPrefix = `section${sectionId.replace(".", "_")}`;
      setIndicatorValidationErrors((prev) => {
        const filtered = { ...prev };
        Object.keys(filtered).forEach((key) => {
          if (key.startsWith(sectionPrefix)) {
            delete filtered[key];
          }
        });
        return filtered;
      });
      setSectionValidationMessages((prev) => {
        const updated = { ...prev };
        delete updated[sectionId];
        return updated;
      });
      // Increment reset key to force Select components to remount
      setSelectResetKey((prev) => prev + 1);
      // Reset the flag after React has processed the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isRestoringRef.current = false;
        });
      });
    } else {
      // If no snapshot exists (e.g., after page refresh), fetch fresh data from server
      // to ensure we have the latest saved values
      isRestoringRef.current = true;
      (async () => {
        try {
          console.log(`[InfraDevelopmentReview] No snapshot found, fetching fresh data for ${sectionId}`);
          const freshSubmission = await apiService.getSubmission(submissionId);
          if (freshSubmission && (freshSubmission as any).formData) {
            const freshFormData = (freshSubmission as any).formData;
            if (freshFormData.infraDevelopment) {
              const normalized = normalizeInfraDevelopment(
                freshFormData.infraDevelopment
              );
              // Create a fresh deep copy to ensure React detects the change
              const restoredState = JSON.parse(JSON.stringify(normalized));
              console.log(`[InfraDevelopmentReview] Restored from fresh server data for ${sectionId}:`, restoredState);
              setFormDataState(restoredState);
            } else if (formData) {
              // Fallback to formData prop if server fetch doesn't have the data
              const rawData = (formData as any)?.infraDevelopment || formData;
              const normalized = normalizeInfraDevelopment(rawData);
              const restoredState = JSON.parse(JSON.stringify(normalized));
              console.log(`[InfraDevelopmentReview] Restored from formData prop for ${sectionId}:`, restoredState);
              setFormDataState(restoredState);
            }
          } else if (formData) {
            // Fallback to formData prop if server fetch doesn't have the data
            const rawData = (formData as any)?.infraDevelopment || formData;
            const normalized = normalizeInfraDevelopment(rawData);
            const restoredState = JSON.parse(JSON.stringify(normalized));
            console.log(`[InfraDevelopmentReview] Restored from formData prop for ${sectionId}:`, restoredState);
            setFormDataState(restoredState);
          }
        } catch (error) {
          console.error(`[InfraDevelopmentReview] Error fetching fresh data for ${sectionId}:`, error);
          // Fallback to formData prop if fetch fails
          if (formData) {
            const rawData = (formData as any)?.infraDevelopment || formData;
            const normalized = normalizeInfraDevelopment(rawData);
            const restoredState = JSON.parse(JSON.stringify(normalized));
            setFormDataState(restoredState);
          } else {
            console.warn(`[InfraDevelopmentReview] No formData available to restore for ${sectionId}`);
          }
        }
      })();
      setEditable(sectionId, false);
      // Clear validation errors for this section
      const sectionPrefix = `section${sectionId.replace(".", "_")}`;
      setIndicatorValidationErrors((prev) => {
        const filtered = { ...prev };
        Object.keys(filtered).forEach((key) => {
          if (key.startsWith(sectionPrefix)) {
            delete filtered[key];
          }
        });
        return filtered;
      });
      setSectionValidationMessages((prev) => {
        const updated = { ...prev };
        delete updated[sectionId];
        return updated;
      });
      // Increment reset key to force Select components to remount
      setSelectResetKey((prev) => prev + 1);
      // Reset the flag after React has processed the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isRestoringRef.current = false;
        });
      });
    }
    // Reset Add More forms on cancel
    if (sectionId === "2.1") {
      setShowAddForm2_1(false);
      setNewEntry2_1({ sector: "", files: [] });
    } else if (sectionId === "2.2") {
      setShowAddForm2_2(false);
      setNewEntry2_2({ sector: "", files: [] });
    } else if (sectionId === "2.3") {
      setShowAddForm2_3(false);
      setNewEntry2_3({ sector: "", files: [] });
    } else if (sectionId === "2.4") {
      setShowAddForm2_4(false);
      setNewEntry2_4({
        projectName: "",
        sector: "",
        status: "",
        projectSize: "",
        investmentType: "",
        dprFile: null,
      });
    } else if (sectionId === "2.5") {
      setShowAddForm2_5(false);
      setNewEntry2_5({
        projectName: "",
        sector: "",
        type: "",
        ownership: "",
        estimatedMonetization: "",
      });
    }
  };

  // Handle adding new entry for section 2.1
  const handleAddNewEntry2_1 = () => {
    const sectionKey = "section2_1";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.infraActArray)
      ? currentSection.infraActArray
      : [];

    const newEntry = {
      id: `infra-act-${Date.now()}`,
      sector: newEntry2_1.sector,
      files: newEntry2_1.files,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      infraActArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_1({ sector: "", files: [] });
    setShowAddForm2_1(false);
  };

  // Handle adding new entry for section 2.2
  const handleAddNewEntry2_2 = () => {
    const sectionKey = "section2_2";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.specializedEntityArray)
      ? currentSection.specializedEntityArray
      : [];

    const newEntry = {
      id: `specialized-entity-${Date.now()}`,
      sector: newEntry2_2.sector,
      files: newEntry2_2.files,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      specializedEntityArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_2({ sector: "", files: [] });
    setShowAddForm2_2(false);
  };

  // Handle removing entry for section 2.1
  const handleRemoveEntry2_1 = (idOrIndex: string | number) => {
    const sectionKey = "section2_1";
    const currentSection = state?.[sectionKey] || {};
    const existingArray = Array.isArray(currentSection?.infraActArray)
      ? currentSection.infraActArray.filter((item: any, index: number) => {
          // If idOrIndex is a number or starts with "item-", it's an index-based delete
          const isIndexBased = typeof idOrIndex === 'number' || String(idOrIndex).startsWith('item-');
          if (isIndexBased) {
            const targetIndex = typeof idOrIndex === 'number' 
              ? idOrIndex 
              : parseInt(String(idOrIndex).replace('item-', ''), 10);
            return index !== targetIndex;
          } else {
            return item.id !== idOrIndex;
          }
        })
      : [];
    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      infraActArray: existingArray,
    };
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle removing entry for section 2.2
  const handleRemoveEntry2_2 = (idOrIndex: string | number) => {
    const sectionKey = "section2_2";
    const currentSection = state?.[sectionKey] || {};
    const existingArray = Array.isArray(currentSection?.specializedEntityArray)
      ? currentSection.specializedEntityArray.filter(
          (item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased = typeof idOrIndex === 'number' || String(idOrIndex).startsWith('item-');
            if (isIndexBased) {
              const targetIndex = typeof idOrIndex === 'number' 
                ? idOrIndex 
                : parseInt(String(idOrIndex).replace('item-', ''), 10);
              return index !== targetIndex;
            } else {
              return item.id !== idOrIndex;
            }
          }
        )
      : [];
    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      specializedEntityArray: existingArray,
    };
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle removing entry for section 2.3
  const handleRemoveEntry2_3 = (idOrIndex: string | number) => {
    const sectionKey = "section2_3";
    const currentSection = state?.[sectionKey] || {};
    const existingArray = Array.isArray(currentSection?.infraDevelopmentArray)
      ? currentSection.infraDevelopmentArray.filter(
          (item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased = typeof idOrIndex === 'number' || String(idOrIndex).startsWith('item-');
            if (isIndexBased) {
              const targetIndex = typeof idOrIndex === 'number' 
                ? idOrIndex 
                : parseInt(String(idOrIndex).replace('item-', ''), 10);
              return index !== targetIndex;
            } else {
              return item.id !== idOrIndex;
            }
          }
        )
      : [];
    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      infraDevelopmentArray: existingArray,
    };
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle adding new entry for section 2.3
  const handleAddNewEntry2_3 = () => {
    const sectionKey = "section2_3";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.infraDevelopmentArray)
      ? currentSection.infraDevelopmentArray
      : [];

    const newEntry = {
      id: `infra-development-${Date.now()}`,
      sector: newEntry2_3.sector,
      files: newEntry2_3.files,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      infraDevelopmentArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_3({ sector: "", files: [] });
    setShowAddForm2_3(false);
  };

  // Handle field updates for section-level fields (not array items)
  const handleSectionFieldUpdate = (
    sectionId: string,
    fieldName: string,
    value: any
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;

    // If switching hasInvestmentReady to "no", clear all related data
    if (
      sectionId === "2.4" &&
      fieldName === "hasInvestmentReady" &&
      value === "no"
    ) {
      setShowAddForm2_4(false);
      setNewEntry2_4({
        projectName: "",
        sector: "",
        status: "",
        projectSize: "",
        investmentType: "",
        dprFile: null,
      });
      // Clear investmentReadyArray, websiteLink, and comment when switching to "no"
      // Note: Section 2.4 doesn't have a top-level file field - files are in investmentReadyArray items as dprFile
      // Clear comment so user can enter a fresh comment (don't keep old comment from previous "no" selection)
      const updatedSection = {
        ...(currentSection && !Array.isArray(currentSection)
          ? currentSection
          : {}),
        [fieldName]: value,
        investmentReadyArray: [], // Clear the array (which contains items with dprFile)
        websiteLink: "", // Clear website link
        comment: "", // Clear comment - user should enter fresh comment for new "no" selection
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
      console.log(`[InfraDevelopmentReview] Clearing section 2.4 when switching to "no":`, updatedSection);
      console.log(`[InfraDevelopmentReview] Previous formDataState.section2_4:`, formDataState?.section2_4);
      setFormDataState((prev: any) => {
        const updated = {
          ...prev,
          [sectionKey]: updatedSection,
        };
        console.log(`[InfraDevelopmentReview] Updated formDataState.section2_4:`, updated[sectionKey]);
        // Also update submissionData to ensure document tab reflects the change
        setSubmissionData((prevSubmission: any) => {
          if (!prevSubmission) return prevSubmission;
          const infraDev = prevSubmission?.infraDevelopment || {};
          return {
            ...prevSubmission,
            infraDevelopment: {
              ...infraDev,
              [sectionKey]: updatedSection,
            },
          };
        });
        return updated;
      });
      // Mark fields as touched to trigger validation updates
      markFieldAsTouched(`${sectionKey}.investmentReadyArray`);
      markFieldAsTouched(`${sectionKey}.websiteLink`);
      // Force a re-render by updating a dummy state if needed
      setShowValidationErrors(true);
      return; // Early return to prevent double update
    }

    // If switching hasInfraDevelopmentPlan to "no", clear all related data
    if (
      sectionId === "2.3" &&
      fieldName === "hasInfraDevelopmentPlan" &&
      value === "no"
    ) {
      setShowAddForm2_3(false);
      setNewEntry2_3({ sector: "", files: [] });
      // Clear infraDevelopmentArray, files, and comment when switching to "no"
      // Clear comment so user can enter a fresh comment (don't keep old comment from previous "no" selection)
      const updatedSection = {
        ...(currentSection && !Array.isArray(currentSection)
          ? currentSection
          : {}),
        [fieldName]: value,
        infraDevelopmentArray: [], // Clear the array (which contains files)
        files: [], // Clear files array if it exists
        file: null, // Clear any single file field
        comment: "", // Clear comment - user should enter fresh comment for new "no" selection
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
      console.log(`[InfraDevelopmentReview] Clearing section 2.3 when switching to "no":`, updatedSection);
      setFormDataState((prev: any) => {
        const updated = {
          ...prev,
          [sectionKey]: updatedSection,
        };
        // Also update submissionData to ensure document tab reflects the change
        setSubmissionData((prevSubmission: any) => {
          if (!prevSubmission) return prevSubmission;
          const infraDev = prevSubmission?.infraDevelopment || {};
          return {
            ...prevSubmission,
            infraDevelopment: {
              ...infraDev,
              [sectionKey]: updatedSection,
            },
          };
        });
        return updated;
      });
      // Mark fields as touched to trigger validation updates
      markFieldAsTouched(`${sectionKey}.infraDevelopmentArray`);
      markFieldAsTouched(`${sectionKey}.files`);
      markFieldAsTouched(`${sectionKey}.file`);
      return; // Early return to prevent double update
    }

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      [fieldName]: value,
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle removing entry for section 2.4
  const handleRemoveEntry2_4 = (idOrIndex: string | number) => {
    const sectionKey = "section2_4";
    const currentSection = state?.[sectionKey] || {};
    const existingArray = Array.isArray(currentSection?.investmentReadyArray)
      ? currentSection.investmentReadyArray.filter(
          (item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased = typeof idOrIndex === 'number' || String(idOrIndex).startsWith('item-');
            if (isIndexBased) {
              const targetIndex = typeof idOrIndex === 'number' 
                ? idOrIndex 
                : parseInt(String(idOrIndex).replace('item-', ''), 10);
              return index !== targetIndex;
            } else {
              return item.id !== idOrIndex;
            }
          }
        )
      : [];
    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      investmentReadyArray: existingArray,
    };
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle removing entry for section 2.5
  const handleRemoveEntry2_5 = (idOrIndex: string | number) => {
    const sectionKey = "section2_5";
    const currentSection = state?.[sectionKey] || {};
    const existingArray = Array.isArray(currentSection?.assetMonetizationArray)
      ? currentSection.assetMonetizationArray.filter(
          (item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased = typeof idOrIndex === 'number' || String(idOrIndex).startsWith('item-');
            if (isIndexBased) {
              const targetIndex = typeof idOrIndex === 'number' 
                ? idOrIndex 
                : parseInt(String(idOrIndex).replace('item-', ''), 10);
              return index !== targetIndex;
            } else {
              return item.id !== idOrIndex;
            }
          }
        )
      : [];
    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      assetMonetizationArray: existingArray,
    };
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));
  };

  // Handle adding new entry for section 2.4
  const handleAddNewEntry2_4 = () => {
    const sectionKey = "section2_4";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.investmentReadyArray)
      ? currentSection.investmentReadyArray
      : [];

    const newEntry = {
      id: `investment-ready-${Date.now()}`,
      projectName: newEntry2_4.projectName,
      sector: newEntry2_4.sector,
      status: newEntry2_4.status,
      projectSize: newEntry2_4.projectSize,
      investmentType: newEntry2_4.investmentType,
      dprFile: newEntry2_4.dprFile,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      investmentReadyArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_4({
      projectName: "",
      sector: "",
      status: "",
      projectSize: "",
      investmentType: "",
      dprFile: null,
    });
    setShowAddForm2_4(false);
  };

  // Handle adding new entry for section 2.5
  const handleAddNewEntry2_5 = () => {
    const sectionKey = "section2_5";
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;
    const existingArray = Array.isArray(currentSection?.assetMonetizationArray)
      ? currentSection.assetMonetizationArray
      : [];

    const newEntry = {
      id: `asset-monetization-${Date.now()}`,
      projectName: newEntry2_5.projectName,
      sector: newEntry2_5.sector,
      type: newEntry2_5.type,
      ownership: newEntry2_5.ownership,
      estimatedMonetization: newEntry2_5.estimatedMonetization,
    };

    const updatedSection = {
      ...(currentSection && !Array.isArray(currentSection)
        ? currentSection
        : {}),
      assetMonetizationArray: [...existingArray, newEntry],
      ...(currentStatus !== undefined ? { status: currentStatus } : {}),
    };

    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Reset form
    setNewEntry2_5({
      projectName: "",
      sector: "",
      type: "",
      ownership: "",
      estimatedMonetization: "",
    });
    setShowAddForm2_5(false);
  };

  const normalizeInfraDevelopment = (data: any) => {
    if (!data || typeof data !== "object") return data;
    const normalized: any = { ...data };

    const ensureArraySection = (
      sectionKey: string,
      arrayKey: string,
      transformItem?: (item: any) => any
    ) => {
      const section = normalized[sectionKey];
      // Only normalize sections that exist - don't create empty sections
      if (!section && section !== null) {
        return; // Skip if section doesn't exist
      }

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

    // Special handling for section2_4 to preserve hasInvestmentReady, comment, and websiteLink
    if (normalized.section2_4) {
      const section2_4 = normalized.section2_4;
      const status = section2_4?.status;
      const hasInvestmentReady = section2_4?.hasInvestmentReady;
      const comment = section2_4?.comment;
      const websiteLink = section2_4?.websiteLink;

      let items: any[] = [];
      if (Array.isArray(section2_4?.investmentReadyArray)) {
        items = section2_4.investmentReadyArray;
      } else if (Array.isArray(section2_4)) {
        items = section2_4;
      }

      const normalizedItems = Array.isArray(items)
        ? items.map((item) => ({
            ...item,
            dprFile: toSingleFile(item?.dprFile),
          }))
        : [];

      normalized.section2_4 = {
        ...(section2_4 && !Array.isArray(section2_4) ? section2_4 : {}),
        investmentReadyArray: normalizedItems,
        ...(hasInvestmentReady !== undefined && hasInvestmentReady !== null
          ? { hasInvestmentReady }
          : {}),
        ...(comment !== undefined && comment !== null ? { comment } : {}),
        ...(websiteLink !== undefined && websiteLink !== null
          ? { websiteLink }
          : {}),
        ...(status !== undefined ? { status } : {}),
      };

      console.log("🔍 [NORMALIZE section2_4]:", {
        original: section2_4,
        normalized: normalized.section2_4,
        hasInvestmentReady,
        comment,
        websiteLink,
      });
    } else {
      ensureArraySection("section2_4", "investmentReadyArray", (item) => ({
        ...item,
        dprFile: toSingleFile(item?.dprFile),
      }));
    }

    ensureArraySection("section2_5", "assetMonetizationArray");

    return normalized;
  };

  // Type assertion for formDataState to avoid TypeScript errors
  const state = (formDataState as any) || {};

  // 🔍 DEBUG: Log state for section2_4
  useEffect(() => {
    if (state?.section2_4) {
      console.log("🔍 [REVIEW STATE] section2_4 in state:", {
        section2_4: state?.section2_4,
        hasInvestmentReady: state?.section2_4?.hasInvestmentReady,
        comment: state?.section2_4?.comment,
        websiteLink: state?.section2_4?.websiteLink,
        arrayLength: Array.isArray(state?.section2_4?.investmentReadyArray)
          ? state.section2_4.investmentReadyArray.length
          : 0,
      });
    }
  }, [state?.section2_4]);

  // Sync formDataState when formData prop changes (but not when restoring from cancel)
  // This ensures we always have the latest data when navigating between categories
  useEffect(() => {
    if (formData && !isRestoringRef.current) {
      const rawData = (formData as any)?.infraDevelopment || formData;
      const normalized = normalizeInfraDevelopment(rawData);

      // Deep comparison to detect if formData has actually changed
      setFormDataState((prev: any) => {
        const prevStr = JSON.stringify(prev);
        const normalizedStr = JSON.stringify(normalized);

        // If formData is different, it means parent component has refreshed with new data
        if (prevStr !== normalizedStr) {
          console.log(
            "🔄 [InfraDevelopmentReview] formData prop changed, syncing local state with latest data"
          );
          return normalized;
        }

        // If formData hasn't changed, keep previous state (may have local edits)
        return prev;
      });

      // Also sync submissionData
      setSubmissionData((prev: any) => {
        if (!prev) return normalized;
        const prevStr = JSON.stringify(prev);
        const normalizedStr = JSON.stringify(normalized);
        if (prevStr !== normalizedStr) {
          return normalized;
        }
        return prev;
      });
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
              setFormDataState(
                normalizeInfraDevelopment(
                  freshSubmission.formData.infraDevelopment
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

  // Store which sections were initially submitted when component first mounts or when data changes
  // This ensures we remember sections even if they're removed from formData after deletion
  // Once a section is marked as submitted, it stays in the set (never removed)
  const initiallySubmittedSections = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // Check which sections were submitted and add them to the set
    // This runs on mount and when formData/submission changes
    // We only ADD sections, never remove them (once submitted, always submitted)
    const allPossibleSections = ["section2_1", "section2_2", "section2_3", "section2_4", "section2_5"];
    allPossibleSections.forEach((sectionKey) => {
      // Skip if already marked as submitted
      if (initiallySubmittedSections.current.has(sectionKey)) {
        return;
      }
      
      // Check submission.section_status first (most reliable)
      let wasSubmitted = false;
      if (submission?.section_status && typeof submission.section_status === "object") {
        const sectionStatus = (submission.section_status as any)[sectionKey];
        if (sectionStatus && 
            sectionStatus !== "NOT_STARTED" && 
            sectionStatus !== null && 
            sectionStatus !== undefined) {
          wasSubmitted = true;
        }
      }
      
      // Also check if section exists in formData
      if (!wasSubmitted && formData && typeof formData === "object") {
        const infraDev = (formData as any).infraDevelopment;
        if (infraDev && typeof infraDev === "object" && infraDev[sectionKey] !== undefined && infraDev[sectionKey] !== null) {
          wasSubmitted = true;
        }
      }
      
      if (wasSubmitted) {
        initiallySubmittedSections.current.add(sectionKey);
        console.log(`[InfraDevelopmentReview] Marking ${sectionKey} as submitted`);
      }
    });
    console.log(`[InfraDevelopmentReview] Submitted sections set:`, Array.from(initiallySubmittedSections.current));
  }, [formData, submission]); // Run when formData or submission changes

  // Track which sections are currently in edit mode - call isEditable for all sections to track changes
  // This ensures useMemo updates when edit mode changes
  const editModeState = useMemo(() => {
    return {
      "2.1": isEditable("2.1"),
      "2.2": isEditable("2.2"),
      "2.3": isEditable("2.3"),
      "2.4": isEditable("2.4"),
      "2.5": isEditable("2.5"),
    };
  }, [isEditable]);

  const editableSections = useMemo(() => {
    const allPossibleSections = ["section2_1", "section2_2", "section2_3", "section2_4", "section2_5"];
    const sectionIdMap: Record<string, string> = {
      "section2_1": "2.1",
      "section2_2": "2.2",
      "section2_3": "2.3",
      "section2_4": "2.4",
      "section2_5": "2.5",
    };
    return allPossibleSections.filter((sectionKey) => {
      const sectionId = sectionIdMap[sectionKey];
      return sectionId ? editModeState[sectionId as keyof typeof editModeState] : false;
    });
  }, [editModeState]);

  // Check if this section has any data
  const hasData = hasInfraDevelopmentData({ infraDevelopment: state });
  
  // Helper function to check if a section was previously submitted/saved
  // Uses initiallySubmittedSections ref (set on mount) as the source of truth
  // Also checks current submission.section_status and edit mode as fallbacks
  const wasSectionPreviouslySubmitted = useCallback((sectionKey: string): boolean => {
    // Map sectionKey to sectionId for edit mode check
    const sectionIdMap: Record<string, string> = {
      "section2_1": "2.1",
      "section2_2": "2.2",
      "section2_3": "2.3",
      "section2_4": "2.4",
      "section2_5": "2.5",
    };
    const sectionId = sectionIdMap[sectionKey];
    
    // PRIORITY 1: Check if section was marked as initially submitted on mount
    // This is the most reliable as it captures the state when component first loaded
    if (initiallySubmittedSections.current.has(sectionKey)) {
      console.log(`[InfraDevelopmentReview] ${sectionKey} was initially submitted (from ref)`);
      return true;
    }
    
    // PRIORITY 2: Check if section is currently editable - if it's editable, it was previously submitted
    // You can only edit sections that were already submitted
    if (sectionId && isEditable(sectionId)) {
      console.log(`[InfraDevelopmentReview] ${sectionKey} is currently editable, marking as previously submitted`);
      // Add to ref for future checks
      initiallySubmittedSections.current.add(sectionKey);
      return true;
    }
    
    // PRIORITY 3: Check submission.section_status - this is also reliable
    // This persists even if section data is removed after deletion
    if (submission?.section_status && typeof submission.section_status === "object") {
      const sectionStatus = (submission.section_status as any)[sectionKey];
      if (sectionStatus && 
          sectionStatus !== "NOT_STARTED" && 
          sectionStatus !== null && 
          sectionStatus !== undefined) {
        console.log(`[InfraDevelopmentReview] ${sectionKey} has submitted status in submission.section_status:`, sectionStatus);
        // Add to ref for future checks
        initiallySubmittedSections.current.add(sectionKey);
        return true;
      }
    }
    
    // PRIORITY 4: Check original formData prop (from backend) - fallback check
    // formData comes from the backend and represents what was actually submitted
    const infraDevFromFormData = formData && 
      typeof formData === "object" && 
      (formData as any).infraDevelopment 
      ? (formData as any).infraDevelopment 
      : null;
    
    // Check if section exists in formData.infraDevelopment (original from backend)
    // Even if the section object is empty {}, it still means the section was submitted
    const inFormData = infraDevFromFormData && 
      typeof infraDevFromFormData === "object" && 
      (infraDevFromFormData as any)[sectionKey] !== undefined &&
      (infraDevFromFormData as any)[sectionKey] !== null;
    
    if (inFormData) {
      console.log(`[InfraDevelopmentReview] ${sectionKey} exists in formData`);
      // Add to ref for future checks
      initiallySubmittedSections.current.add(sectionKey);
      return true;
    }
    
    return false;
  }, [formData, submission, isEditable]);

  // Wrap sectionsWithData computation in useMemo to ensure it updates when edit mode changes
  const sectionsWithData = useMemo(() => {
    let result = getSectionsWithData(
      { infraDevelopment: state },
      "infraDevelopment"
    );

    // ALWAYS include sections that were previously submitted, even if they have no data now
    // This ensures submitted indicators never disappear from the UI
    const allPossibleSections = ["section2_1", "section2_2", "section2_3", "section2_4", "section2_5"];
    const previouslySubmittedSections = allPossibleSections.filter((sectionKey) => {
      const wasSubmitted = wasSectionPreviouslySubmitted(sectionKey);
      console.log(`[InfraDevelopmentReview] sectionsWithData - ${sectionKey} wasPreviouslySubmitted:`, wasSubmitted);
      return wasSubmitted;
    });
    
    console.log(`[InfraDevelopmentReview] sectionsWithData - previouslySubmittedSections:`, previouslySubmittedSections);
    console.log(`[InfraDevelopmentReview] sectionsWithData - result before merge:`, result);
    
    // Merge previously submitted sections with result
    result = Array.from(
      new Set([...result, ...previouslySubmittedSections])
    );
    
    console.log(`[InfraDevelopmentReview] sectionsWithData - result after merge:`, result);

    // For preview mode with assigned indicators (nodal officers), always include assigned sections even if they have no data
    // This ensures assigned indicators are visible in preview, regardless of data presence
    if (
      isPreview &&
      isNodalOfficer &&
      assignedIndicators &&
      assignedIndicators.length > 0
    ) {
      const assignedSectionKeys: string[] = [];
      const indicatorToSectionMap: Record<string, string> = {
        "2.1": "section2_1",
        "2.2": "section2_2",
        "2.3": "section2_3",
        "2.4": "section2_4",
        "2.5": "section2_5",
      };

      assignedIndicators.forEach((indicator) => {
        const sectionKey = indicatorToSectionMap[indicator];
        if (sectionKey && !result.includes(sectionKey)) {
          assignedSectionKeys.push(sectionKey);
        }
      });

      result = [...result, ...assignedSectionKeys];
    }

  // Helper function to check if a section has meaningful data
  const sectionHasMeaningfulData = (
    sectionKey: string,
    section: any
  ): boolean => {
    if (!section) return false;

    switch (sectionKey) {
      case "section2_1": {
        const items = Array.isArray(section?.infraActArray)
          ? section.infraActArray
          : [];
        return (
          items.length > 0 &&
          items.some(
            (item: any) =>
              item?.sector?.trim() ||
              (item?.files &&
                Array.isArray(item.files) &&
                item.files.length > 0)
          )
        );
      }
      case "section2_2": {
        const items = Array.isArray(section?.specializedEntityArray)
          ? section.specializedEntityArray
          : [];
        return (
          items.length > 0 &&
          items.some(
            (item: any) =>
              item?.sector?.trim() ||
              (item?.files &&
                Array.isArray(item.files) &&
                item.files.length > 0)
          )
        );
      }
      case "section2_3": {
        // Check if hasInfraDevelopmentPlan or comment is set
        if (section?.hasInfraDevelopmentPlan || section?.comment?.trim()) {
          return true;
        }
        // Check array data
        const items = Array.isArray(section?.infraDevelopmentArray)
          ? section.infraDevelopmentArray
          : [];
        return (
          items.length > 0 &&
          items.some(
            (item: any) =>
              item?.sector?.trim() ||
              (item?.files &&
                Array.isArray(item.files) &&
                item.files.length > 0)
          )
        );
      }
      case "section2_4": {
        // Check if hasInvestmentReady, comment, or websiteLink is set
        if (
          section?.hasInvestmentReady ||
          section?.comment?.trim() ||
          section?.websiteLink?.trim()
        ) {
          return true;
        }
        // Check array data
        const items = Array.isArray(section?.investmentReadyArray)
          ? section.investmentReadyArray
          : [];
        return (
          items.length > 0 &&
          items.some(
            (item: any) => item?.projectName?.trim() || item?.sector?.trim()
          )
        );
      }
      case "section2_5": {
        const items = Array.isArray(section?.assetMonetizationArray)
          ? section.assetMonetizationArray
          : [];
        return (
          items.length > 0 &&
          items.some(
            (item: any) =>
              item?.projectName?.trim() ||
              item?.sector?.trim() ||
              item?.type?.trim()
          )
        );
      }
      default:
        return false;
    }
  };

  // For review mode (not preview) OR preview mode for non-nodal officers (e.g., state approver viewing aggregate):
  // Only include sections that have meaningful data (not just empty objects)
  // BUT: Keep sections visible if they are currently in edit mode (user might be adding/removing entries)
  if (
    (!isPreview || (isPreview && !isNodalOfficer)) &&
    state &&
    typeof state === "object"
  ) {
    const allPossibleSections = [
      "section2_1",
      "section2_2",
      "section2_3",
      "section2_4",
      "section2_5",
    ];
    // Map sectionKey to sectionId for edit mode check
    const sectionIdMap: Record<string, string> = {
      "section2_1": "2.1",
      "section2_2": "2.2",
      "section2_3": "2.3",
      "section2_4": "2.4",
      "section2_5": "2.5",
    };
    
    // Helper function to check if a section has meaningful data
    const hasSectionData = (sectionKey: string, sectionData: any): boolean => {
      if (!sectionData || typeof sectionData !== "object") return false;
      
      // Check if section has any non-empty values (excluding metadata fields)
      return Object.entries(sectionData).some(([key, value]) => {
        // Skip metadata fields that don't indicate actual data
        if (["year", "percentage", "marksObtained"].includes(key)) {
          return false;
        }
        
        if (value === null || value === undefined || value === "") {
          return false;
        }
        
        // For arrays, check if they have items
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        
        // For objects, recursively check if they have any meaningful data
    // OR sections that are currently in edit mode (to allow adding entries)
        if (typeof value === "object") {
          return Object.keys(value).length > 0 && hasSectionData(sectionKey, value);
        }
        
        return true;
      });
    };
    
    // Filter sections: only include if they have actual submitted data
    // For both nodal officers and non-nodal officers: only show indicators that have been submitted
    // BUT: Always keep sections that were previously submitted, even if they have no data now
    const existingSections = allPossibleSections.filter((sectionKey) => {
      const section = state[sectionKey];
      const hasData = sectionHasMeaningfulData(sectionKey, section);
      //  return hasSectionData(sectionKey, sectionData);
      
      // Check if section is currently in edit mode
      const sectionId = sectionIdMap[sectionKey];
      const isCurrentlyEditable = sectionId ? editModeState[sectionId as keyof typeof editModeState] : false;
      
      // Check if section was previously submitted
      const wasSubmitted = wasSectionPreviouslySubmitted(sectionKey);
      
      // Keep section visible if it has data OR if it's in edit mode OR if it was previously submitted
      return hasData || isCurrentlyEditable || wasSubmitted;
    });

    // Merge existing sections with result, avoiding duplicates
    result = Array.from(
      new Set([...result, ...existingSections])
    );
    }

    // ALWAYS ensure sections in edit mode are visible, regardless of data or preview mode
    // This prevents sections from disappearing when user deletes all entries in edit mode
    // Use the editableSections computed above
    result = Array.from(
      new Set([...result, ...editableSections])
    );

    // Final merge: ensure previously submitted sections are always included
    // Compute again to ensure we have the latest state
    const allPossibleSectionsFinal = ["section2_1", "section2_2", "section2_3", "section2_4", "section2_5"];
    const previouslySubmittedSectionsFinal = allPossibleSectionsFinal.filter((sectionKey) => {
      return wasSectionPreviouslySubmitted(sectionKey);
    });
    result = Array.from(
      new Set([...result, ...previouslySubmittedSectionsFinal])
    );

    console.log(`[InfraDevelopmentReview] sectionsWithData useMemo - Final result:`, result);
    return result;
  }, [state, isPreview, isNodalOfficer, assignedIndicators, editableSections, wasSectionPreviouslySubmitted, editModeState]);

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
        setFormDataState((updatedSubmission as any).formData.infraDevelopment);
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
      case "2.1": {
        const infraActArray = Array.isArray(
          sourceState?.section2_1?.infraActArray
        )
          ? sourceState.section2_1.infraActArray
          : [];
        const files = infraActArray.map((item: any) => ({
          id: item?.id ?? null,
          sector: item?.sector ?? null,
          files: toFileArray(item?.files).map((file: FileUpload) => ({
            id: file?.id,
            fileName: file?.fileName,
            originalName: (file as any)?.originalName || file?.fileName,
            fileSize: file?.fileSize,
            uploadedAt: file?.uploadedAt,
            filePath: file?.filePath || file?.file,
            fileUrl: file?.fileUrl,
            mimeType: file?.mimeType,
          })),
        }));
        console.log("🔨 Built fields for 2.1:", files);
        return [{ infraActArray: files }];
      }

      case "2.2": {
        const specializedEntityArray = Array.isArray(
          sourceState?.section2_2?.specializedEntityArray
        )
          ? sourceState.section2_2.specializedEntityArray
          : [];
        const files = specializedEntityArray.map((item: any) => ({
          id: item?.id ?? null,
          sector: item?.sector ?? null,
          files: toFileArray(item?.files).map((file: FileUpload) => ({
            id: file?.id,
            fileName: file?.fileName,
            originalName: (file as any)?.originalName || file?.fileName,
            fileSize: file?.fileSize,
            uploadedAt: file?.uploadedAt,
            filePath: file?.filePath || file?.file,
            fileUrl: file?.fileUrl,
            mimeType: file?.mimeType,
          })),
        }));
        console.log("🔨 Built fields for 2.2:", files);
        return [{ specializedEntityArray: files }];
      }

      case "2.3": {
        const infraDevelopmentArray = Array.isArray(
          sourceState?.section2_3?.infraDevelopmentArray
        )
          ? sourceState.section2_3.infraDevelopmentArray
          : [];
        const files = infraDevelopmentArray.map((item: any) => ({
          id: item?.id ?? null,
          sector: item?.sector ?? null,
          files: toFileArray(item?.files).map((file: FileUpload) => ({
            id: file?.id,
            fileName: file?.fileName,
            originalName: (file as any)?.originalName || file?.fileName,
            fileSize: file?.fileSize,
            uploadedAt: file?.uploadedAt,
            filePath: file?.filePath || file?.file,
            fileUrl: file?.fileUrl,
            mimeType: file?.mimeType,
          })),
        }));
        console.log("🔨 Built fields for 2.3:", files);
        return [
          {
            hasInfraDevelopmentPlan:
              sourceState?.section2_3?.hasInfraDevelopmentPlan ?? null,
            comment: sourceState?.section2_3?.comment ?? null,
            infraDevelopmentArray: files,
          },
        ];
      }

      case "2.4": {
        const investmentReadyArray = Array.isArray(
          sourceState?.section2_4?.investmentReadyArray
        )
          ? sourceState.section2_4.investmentReadyArray
          : [];
        return [
          {
            hasInvestmentReady:
              sourceState?.section2_4?.hasInvestmentReady ?? null,
            comment: sourceState?.section2_4?.comment ?? null,
            websiteLink: sourceState?.section2_4?.websiteLink ?? null,
            investmentReadyArray: investmentReadyArray.map((item: any) => ({
              id: item?.id ?? null,
              projectName: item?.projectName ?? null,
              sector: item?.sector ?? null,
              status: item?.status ?? null,
              projectSize: item?.projectSize ?? null,
              investmentType: item?.investmentType ?? null,
              dprFile: toSingleFile(item?.dprFile),
            })),
          },
        ];
      }

      case "2.5": {
        const assetMonetizationArray = Array.isArray(
          sourceState?.section2_5?.assetMonetizationArray
        )
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
    console.log(
      `[InfraDevelopmentReview] onSaveSection called for section ${sectionId}`
    );
    // Check if user is NODAL_OFFICER
    const userRole = getUserRole();
    const isNodalOfficer = userRole === "NODAL_OFFICER";

    console.log(`[InfraDevelopmentReview] onSaveSection - User info:`, {
      userRole,
      isNodalOfficer,
      sectionId,
    });

    // Check if this is a resubmission of a sent-back indicator
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    // Check multiple sources for status: submission.section_status, formDataState
    let currentStatus: string | undefined;

    // Get sectionData for logging and fallback status check
    const sectionData = formDataState && formDataState[sectionKey];

    // First check submission.section_status (most reliable source)
    if (
      submission?.section_status &&
      typeof submission.section_status === "object"
    ) {
      currentStatus = (submission.section_status as any)[sectionKey];
    }

    // Fallback to formDataState status
    if (!currentStatus) {
      currentStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;
    }

    const upperStatus = (currentStatus || "").toUpperCase();
    const isReverted = upperStatus === "REVERTED";

    console.log(`[InfraDevelopmentReview] onSaveSection - Status check:`, {
      sectionKey,
      sectionData,
      currentStatus,
      upperStatus,
      isReverted,
    });

    // If NODAL_OFFICER, ALWAYS run validation FIRST before showing dialog
    // This ensures validation errors are shown on UI instead of alerts
    if (isNodalOfficer) {
      console.log(
        `[InfraDevelopmentReview] ✅ Running validation before showing dialog for NODAL_OFFICER`
      );

      // Run validation first (same logic as in performSave)
      const fullData = {
        section2_1: formDataState?.section2_1 || { infraActArray: [] },
        section2_2: formDataState?.section2_2 || { specializedEntityArray: [] },
        section2_3: formDataState?.section2_3 || {
          infraDevelopmentArray: [],
          hasInfraDevelopmentPlan: "",
          comment: "",
        },
        section2_4: formDataState?.section2_4 || {
          investmentReadyArray: [],
          hasInvestmentReady: "",
          comment: "",
        },
        section2_5: formDataState?.section2_5 || { assetMonetizationArray: [] },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

      const validationResult = validateInfraDevelopment(fullData, {
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

      // If validation fails, show errors on UI and return (don't show dialog)
      if (Object.keys(sectionErrors).length > 0) {
        // Mark all fields in this section as touched so ALL errors show
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData =
          formDataState?.[sectionKey as keyof typeof formDataState];

        // Get all possible field paths for this section
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "2.1") {
          allSectionFields.push(`${sectionPrefix}.infraActArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "infraActArray" in sectionData &&
            Array.isArray((sectionData as any).infraActArray)
          ) {
            (sectionData as any).infraActArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.infraActArray.${index}.sector`,
                  `${sectionPrefix}.infraActArray.${index}.files`
                );
              }
            );
          }
        } else if (sectionId === "2.2") {
          allSectionFields.push(`${sectionPrefix}.specializedEntityArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "specializedEntityArray" in sectionData &&
            Array.isArray((sectionData as any).specializedEntityArray)
          ) {
            (sectionData as any).specializedEntityArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.specializedEntityArray.${index}.sector`,
                  `${sectionPrefix}.specializedEntityArray.${index}.files`
                );
              }
            );
          }
        } else if (sectionId === "2.3") {
          allSectionFields.push(
            `${sectionPrefix}.hasInfraDevelopmentPlan`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "infraDevelopmentArray" in sectionData &&
            Array.isArray((sectionData as any).infraDevelopmentArray)
          ) {
            (sectionData as any).infraDevelopmentArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.infraDevelopmentArray.${index}.sector`,
                  `${sectionPrefix}.infraDevelopmentArray.${index}.files`
                );
              }
            );
          }
        } else if (sectionId === "2.4") {
          allSectionFields.push(
            `${sectionPrefix}.hasInvestmentReady`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "2.5") {
          allSectionFields.push(`${sectionPrefix}.assetMonetizationArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "assetMonetizationArray" in sectionData &&
            Array.isArray((sectionData as any).assetMonetizationArray)
          ) {
            (sectionData as any).assetMonetizationArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.assetMonetizationArray.${index}.projectName`,
                  `${sectionPrefix}.assetMonetizationArray.${index}.sector`,
                  `${sectionPrefix}.assetMonetizationArray.${index}.type`,
                  `${sectionPrefix}.assetMonetizationArray.${index}.ownership`,
                  `${sectionPrefix}.assetMonetizationArray.${index}.files`
                );
              }
            );
          }
        }

        // Mark all section fields as touched so ALL errors show
        allSectionFields.forEach((field) => {
          markFieldAsTouched(field);
        });
        // Also mark fields with errors from validation
        Object.keys(validationResult.errors).forEach((errorKey) => {
          if (errorKey.startsWith(sectionPrefix)) {
            markFieldAsTouched(errorKey);
          }
        });

        setShowValidationErrors(true);
        setIndicatorValidationErrors((prev) => ({ ...prev, ...sectionErrors }));
        // Set section-level validation message (same as STATE_APPROVER)
        setSectionValidationMessages((prev) => ({
          ...prev,
          [sectionId]: `Please fill all mandatory fields.`,
        }));
        console.warn("Validation failed for section", sectionId, sectionErrors);
        // Errors are displayed inline in the UI, don't show dialog
        return;
      }

      // Validation passed - show confirmation dialog only if status is REVERTED
      if (isReverted) {
        console.log(
          `[InfraDevelopmentReview] ✅ Validation passed - showing save confirmation dialog for REVERTED indicator`
        );
        setPendingSaveSectionId(sectionId);
        setShowSaveDialog(true);
        return;
      } else {
        // If not REVERTED, proceed with direct save
        console.log(
          `[InfraDevelopmentReview] ✅ Validation passed - proceeding with direct save (not REVERTED)`
        );
        await performSave(sectionId);
        return;
      }
    }

    console.log(
      `[InfraDevelopmentReview] ✅ Proceeding with direct save (not REVERTED or not NODAL_OFFICER)`
    );
    // For non-NODAL_OFFICER users or non-REVERTED status, proceed with submit directly
    await performSave(sectionId);
  };

  // Actual save function that performs the save operation
  const performSave = async (sectionId: string) => {
    console.log(
      `[InfraDevelopmentReview] performSave called for section ${sectionId}`
    );
    try {
      // Map visual section id to payload section key (e.g. "2.1" -> "section2_1")
      const payloadSection = `section${sectionId.replace(".", "_")}`;
      console.log(
        `[InfraDevelopmentReview] performSave - Starting save process:`,
        {
          sectionId,
          payloadSection,
        }
      );

      // Use the local formData state (formDataState) to build fields for this section
      let fields = buildSectionFields(sectionId);
      console.log(
        `[InfraDevelopmentReview] performSave - Fields built:`,
        fields
      );

      // Check if user is NODAL_OFFICER or STATE_APPROVER to preserve status
      const userRole = getUserRole();
      const isNodalOfficer = userRole === "NODAL_OFFICER";
      const isStateApprover = userRole === "STATE_APPROVER";

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
        section2_1: formDataState?.section2_1 || { infraActArray: [] },
        section2_2: formDataState?.section2_2 || { specializedEntityArray: [] },
        section2_3: formDataState?.section2_3 || {
          infraDevelopmentArray: [],
          hasInfraDevelopmentPlan: "",
          comment: "",
        },
        section2_4: formDataState?.section2_4 || {
          investmentReadyArray: [],
          hasInvestmentReady: "",
          comment: "",
        },
        section2_5: formDataState?.section2_5 || { assetMonetizationArray: [] },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

      const validationResult = validateInfraDevelopment(fullData, {
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
        // Mark all fields in this section as touched so ALL errors show
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData =
          formDataState?.[sectionKey as keyof typeof formDataState];

        // Get all possible field paths for this section
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "2.1") {
          allSectionFields.push(`${sectionPrefix}.infraActArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "infraActArray" in sectionData &&
            Array.isArray((sectionData as any).infraActArray)
          ) {
            (sectionData as any).infraActArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.infraActArray.${index}.sector`,
                  `${sectionPrefix}.infraActArray.${index}.files`
                );
              }
            );
          }
        } else if (sectionId === "2.2") {
          allSectionFields.push(`${sectionPrefix}.specializedEntityArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "specializedEntityArray" in sectionData &&
            Array.isArray((sectionData as any).specializedEntityArray)
          ) {
            (sectionData as any).specializedEntityArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.specializedEntityArray.${index}.sector`,
                  `${sectionPrefix}.specializedEntityArray.${index}.files`
                );
              }
            );
          }
        } else if (sectionId === "2.3") {
          allSectionFields.push(
            `${sectionPrefix}.hasInfraDevelopmentPlan`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "infraDevelopmentArray" in sectionData &&
            Array.isArray((sectionData as any).infraDevelopmentArray)
          ) {
            (sectionData as any).infraDevelopmentArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.infraDevelopmentArray.${index}.sector`,
                  `${sectionPrefix}.infraDevelopmentArray.${index}.files`
                );
              }
            );
          }
        } else if (sectionId === "2.4") {
          allSectionFields.push(
            `${sectionPrefix}.hasInvestmentReady`,
            `${sectionPrefix}.comment`
          );
        }

        // Mark all section fields as touched so ALL errors show
        allSectionFields.forEach((field) => {
          markFieldAsTouched(field);
        });
        // Also mark fields with errors from validation
        Object.keys(validationResult.errors).forEach((errorKey) => {
          if (errorKey.startsWith(sectionPrefix)) {
            markFieldAsTouched(errorKey);
          }
        });

        setShowValidationErrors(true);
        setIndicatorValidationErrors((prev) => ({ ...prev, ...sectionErrors }));
        // Set section-level validation message
        const errorCount = Object.keys(sectionErrors).length;
        setSectionValidationMessages((prev) => ({
          ...prev,
          [sectionId]: `Please fill all mandatory fields.`,
        }));
        console.warn("Validation failed for section", sectionId, sectionErrors);
        // Throw validation error so handleConfirmSave can catch it and close dialog
        const validationError = new Error("VALIDATION_FAILED");
        (validationError as any).isValidationError = true;
        throw validationError;
      } else {
        // Clear errors for this section only
        setIndicatorValidationErrors((prev) => {
          const filtered = { ...prev };
          Object.keys(filtered).forEach((key) => {
            if (key.startsWith(sectionPrefix)) {
              delete filtered[key];
            }
          });
          return filtered;
        });
        // Clear section-level validation message on successful validation
        setSectionValidationMessages((prev) => {
          const updated = { ...prev };
          delete updated[sectionId];
          return updated;
        });
      }

      console.log(
        `[InfraDevelopmentReview] performSave - Calling handleSaveSection API...`,
        {
          submissionId,
          category: "infraDevelopment",
          section: payloadSection,
          fieldsCount: fields.length,
        }
      );
      const saveResult = await handleSaveSection({
        submissionId,
        category: "infraDevelopment", // updated category for this file
        section: payloadSection,
        fields,
      });
      console.log(
        `[InfraDevelopmentReview] ✅ performSave - API call successful:`,
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

      // Update formDataState with saved data to ensure UI reflects changes immediately
      // The formDataState already has the saved data (since we built fields from it),
      // but we ensure it's properly structured and trigger a re-render
      setFormDataState((prev: any) => {
        if (!prev) return prev;
        const updated = { ...prev };
        // Ensure the section data is properly structured
        if (updated[sectionKey]) {
          updated[sectionKey] = {
            ...updated[sectionKey],
            // Preserve status if it was updated
            ...(upperStatus === "RESUBMITTED" && isNodalOfficer ? { status: "RESUBMITTED" } : {}),
            ...(upperStatus === "RESUBMITTED" && isStateApprover ? { status: "RESUBMITTED" } : {}),
          };
        }
        return updated;
      });

      // Disable editing after successful save
      setEditable(sectionId, false);
      // Clear the snapshot since save was successful
      setOriginalFormDataSnapshot(null);

      console.log(
        `[InfraDevelopmentReview] ✅ performSave - Save completed, editing disabled for section ${sectionId}`
      );
    } catch (error) {
      console.error(
        `[InfraDevelopmentReview] ❌ performSave - Error saving section ${sectionId}:`,
        error
      );
      throw error; // Re-throw so handleConfirmSave can catch it
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    console.log(`[InfraDevelopmentReview] handleConfirmSave called:`, {
      pendingSaveSectionId,
    });
    if (pendingSaveSectionId) {
      console.log(
        `[InfraDevelopmentReview] ✅ Confirmed - calling performSave for section ${pendingSaveSectionId}`
      );
      try {
        await performSave(pendingSaveSectionId);
        console.log(`[InfraDevelopmentReview] ✅ Save completed successfully`);
        setShowSaveDialog(false);
        setPendingSaveSectionId(null);
      } catch (error: any) {
        console.error(`[InfraDevelopmentReview] ❌ Save failed:`, error);
        // If validation failed, close dialog so error messages are visible
        if (error?.isValidationError) {
          setShowSaveDialog(false);
          setPendingSaveSectionId(null);
          // Error messages are already displayed on UI, no notification needed
        } else {
          // For other errors, don't close dialog so user can try again
        }
      }
    } else {
      console.warn(
        `[InfraDevelopmentReview] ⚠️ handleConfirmSave called but no pendingSaveSectionId`
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
    const isStateApprover = userRole === "STATE_APPROVER";

    // For MOSPI_APPROVER, use mospi_status field instead of status
    const payload: any = {
      submissionId,
      category: "infraDevelopment",
      section: `section${sectionId.replace(".", "_")}`,
      status: status,
    };

    // If MOSPI_APPROVER, add mospi_status field
    if (isMospiApprover) {
      payload.mospi_status = status ? "ACCEPTED" : "REVERTED";
    }

    // If STATE_APPROVER is sending back (status = false), extract nodalOfficerId from section data
    if (isStateApprover && !status) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (formDataState && (formDataState as any)[sectionKey]) ||
        (formData && (formData as any)[sectionKey]) ||
        (state && (state as any)[sectionKey]);

      const nodalOfficerId = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.nodalOfficerId
          : sectionData?.nodalOfficerId
        : undefined;

      if (nodalOfficerId) {
        payload.nodalOfficerId = nodalOfficerId;
        console.log(
          `📤 [InfraDevelopmentReview] Sending back indicator ${sectionId} to NODAL_OFFICER: ${nodalOfficerId}`
        );
      }
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
        `[InfraDevelopmentReview] STATE_APPROVER cannot send back their own indicator ${sectionId}`
      );
      return; // Don't show dialog, just return
    }

    // If STATE_APPROVER is accepting their own indicator, show confirmation dialog
    if (isStateApprover && status && isSubmissionFromStateApprover) {
      console.log(
        `[InfraDevelopmentReview] STATE_APPROVER accepting their own indicator ${sectionId} - showing confirmation dialog`
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

  // Helper function to handle field updates for nested array items
  const handleArrayFieldUpdate = (
    sectionId: string,
    itemIndex: number,
    fieldName: string,
    value: any
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const currentSection = state?.[sectionKey] || {};
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;

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
        [fieldName]: value,
      };

      return {
        ...(currentSection && !Array.isArray(currentSection)
          ? currentSection
          : {}),
        [arrayKey]: updatedArray,
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
    };

    switch (sectionId) {
      case "2.1":
        nextSection = buildArrayUpdate("infraActArray");
        break;
      case "2.2":
        nextSection = buildArrayUpdate("specializedEntityArray");
        break;
      case "2.3":
        nextSection = buildArrayUpdate("infraDevelopmentArray");
        break;
      case "2.4": {
        const existingArray = Array.isArray(
          currentSection?.investmentReadyArray
        )
          ? currentSection.investmentReadyArray
          : [];

        if (!existingArray[itemIndex]) {
          return;
        }

        const updatedArray = [...existingArray];
        updatedArray[itemIndex] = {
          ...updatedArray[itemIndex],
          [fieldName]: value,
        };

        nextSection = {
          ...(currentSection && !Array.isArray(currentSection)
            ? currentSection
            : {}),
          investmentReadyArray: updatedArray,
          ...(currentStatus !== undefined ? { status: currentStatus } : {}),
        };
        break;
      }
      case "2.5": {
        const existingArray = Array.isArray(
          currentSection?.assetMonetizationArray
        )
          ? currentSection.assetMonetizationArray
          : [];

        if (!existingArray[itemIndex]) {
          return;
        }

        const updatedArray = [...existingArray];
        updatedArray[itemIndex] = {
          ...updatedArray[itemIndex],
          [fieldName]: value,
        };

        nextSection = {
          ...(currentSection && !Array.isArray(currentSection)
            ? currentSection
            : {}),
          assetMonetizationArray: updatedArray,
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
  };

  // File upload handler - handles response structure correctly
  const handleFileUpload = async (file: File): Promise<FileUpload | null> => {
    if (!submissionId) {
      console.error("No submissionId provided for file upload");
      return null;
    }

    try {
      // Upload file to server
      const response = await apiService.uploadFile(submissionId, file);

      // Handle different response structures (same as EditableFileDisplay)
      // Response might be: { data: { fileName, filePath, ... } } or { fileName, filePath, ... } directly
      const fileData = (response as any)?.data || response;

      // Extract file path from various possible fields
      const storedPath =
        fileData.file ??
        fileData.filePath ??
        fileData.url ??
        fileData.path ??
        null;

      // Create FileUpload object
      const fileUpload: FileUpload = {
        id: fileData.id ?? crypto.randomUUID(),
        file: storedPath, // Store file path (string) not File object
        fileName: fileData.fileName || fileData.filename || file.name,
        originalName:
          file.name || fileData.originalName || fileData.data?.originalName, // Preserve original file name
        fileSize: Number(fileData.fileSize ?? fileData.size ?? file.size ?? 0),
        uploadedAt: Number(fileData.uploadedAt ?? Date.now()),
        filePath: storedPath ?? undefined,
        fileUrl: fileData.fileUrl || fileData.url,
        mimeType: fileData.mimeType,
      };

      console.log("✅ File uploaded successfully:", {
        fileName: fileUpload.fileName,
        filePath: fileUpload.filePath,
        response: response,
      });

      return fileUpload;
    } catch (error: any) {
      console.error("Failed to upload file:", error);
      return null;
    }
  };

  // Helper functions to handle file updates
  const handleFilesUpdate = async (
    sectionId: string,
    itemIndex: number,
    updatedFiles: FileUpload | FileUpload[] | null
  ) => {
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const currentSection = state?.[sectionKey];
    const currentStatus = currentSection
      ? (currentSection as any).status
      : undefined;

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
        ...(currentSection && !Array.isArray(currentSection)
          ? currentSection
          : {}),
        [arrayKey]: updatedArray,
        ...(currentStatus !== undefined ? { status: currentStatus } : {}),
      };
    };

    switch (sectionId) {
      case "2.1":
        nextSection = buildArrayUpdate("infraActArray");
        break;
      case "2.2":
        nextSection = buildArrayUpdate("specializedEntityArray");
        break;
      case "2.3":
        nextSection = buildArrayUpdate("infraDevelopmentArray");
        break;
      case "2.4": {
        const existingArray = Array.isArray(
          currentSection?.investmentReadyArray
        )
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
          ...(currentSection && !Array.isArray(currentSection)
            ? currentSection
            : {}),
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

    // Update local state only - save will happen when user clicks Save button
    // Files are stored as File objects and will be uploaded to S3 on Save
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: nextSection,
    }));

    // Removed auto-save - files are stored as File objects and will be uploaded
    // when user clicks Save button (via updateSubmission → uploadFilesAndReplace)
  };

  // Helper function to render MOSPI_REVIEWER comments for MOSPI_APPROVER
  // Helper to render validation error message for a section
  const renderSectionValidationMessage = (sectionId: string) => {
    if (!sectionValidationMessages[sectionId] || !shouldBeEditable(sectionId)) {
      return null;
    }
    return (
      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="text-sm text-destructive font-medium">
          {sectionValidationMessages[sectionId]}
        </p>
      </div>
    );
  };

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
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
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
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
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
            className="flex items-center gap-1 h-7 px-2 text-xs"
            onClick={() => handleOpenTimeline(sectionId)}
          >
            <Clock className="w-3 h-3" />
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
    console.log(`[InfraDevelopmentReview] Section ${sectionId}:`, {
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

      // If mospi_status is REVERTED, continue to show Edit button and other actions
      // We'll add the "Returned from Mospi" button in the normal flow below
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
        `[InfraDevelopmentReview] RESUBMITTED block hit for section ${sectionId}`
      );
      return (
        <div className="flex gap-2">
          {(() => {
            const editable = shouldBeEditable(sectionId);
            console.log(
              `[InfraDevelopmentReview] RESUBMITTED - Edit button render for section ${sectionId}:`,
              {
                shouldBeEditable: editable,
                willShowEditButton: !editable,
              }
            );
            return !editable ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => {
                  console.log(
                    `[InfraDevelopmentReview] RESUBMITTED - Edit button clicked for section ${sectionId}`
                  );
                  handleEditStart(sectionId);
                }}
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
            );
          })()}
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
        console.log(
          `[InfraDevelopmentReview] REVERTED - NODAL_OFFICER block for section ${sectionId}`
        );
        const editable = shouldBeEditable(sectionId);
        const disabled = (() => {
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
        })();
        console.log(
          `[InfraDevelopmentReview] REVERTED - Edit button render for section ${sectionId}:`,
          {
            shouldBeEditable: editable,
            willShowEditButton: !editable,
            disabled,
            isNodalOfficer,
          }
        );
        return (
          <div className="flex gap-2">
            {!editable ? (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => {
                  console.log(
                    `[InfraDevelopmentReview] REVERTED - Edit button clicked for section ${sectionId}`
                  );
                  handleEditStart(sectionId);
                }}
                disabled={disabled}
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
              className="flex items-center gap-1 h-7 px-2 text-xs"
              onClick={() => handleOpenTimeline(sectionId)}
            >
              <Clock className="w-3 h-3" />
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

    // Debug logging removed for performance

    return (
      <div className="flex gap-2">
        {/* Show "Returned from Mospi" button for STATE_APPROVER when mospi_status is REVERTED */}
        {isStateApprover &&
          (() => {
            const sectionKey = `section${sectionId.replace(".", "_")}`;
            const sectionData =
              (formDataState && (formDataState as any)[sectionKey]) ||
              (formData && (formData as any)[sectionKey]) ||
              (state && (state as any)[sectionKey]);
            const mospiStatus = sectionData
              ? Array.isArray(sectionData)
                ? (sectionData as any)?.mospi_status
                : sectionData?.mospi_status
              : undefined;
            return mospiStatus === "REVERTED";
          })() && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 bg-orange-100 text-orange-700 cursor-default"
              disabled
            >
              <RotateCcw className="w-4 h-4" />
              Returned from Mospi
            </Button>
          )}

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
              disabled={isSubmitted}
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

        {/* Show "Send Back" button for STATE_APPROVER when indicator is returned from MOSPI and originally from NODAL_OFFICER */}
        {isStateApprover &&
          (() => {
            const sectionKey = `section${sectionId.replace(".", "_")}`;
            const sectionData =
              (formDataState && (formDataState as any)[sectionKey]) ||
              (formData && (formData as any)[sectionKey]) ||
              (state && (state as any)[sectionKey]);
            const mospiStatus = sectionData
              ? Array.isArray(sectionData)
                ? (sectionData as any)?.mospi_status
                : sectionData?.mospi_status
              : undefined;

            // Check if this specific indicator was originally submitted by NODAL_OFFICER
            const isFromNodalOfficer = isIndicatorFromNodalOfficer(
              submission as any,
              sectionId
            );

            // Detailed logging for debugging
            console.group(
              `🔍 [InfraDevelopmentReview] "Send Back" button check for section ${sectionId}`
            );
            console.log("📊 Section data:", {
              sectionKey,
              sectionData: sectionData
                ? Array.isArray(sectionData)
                  ? sectionData[0]
                  : sectionData
                : null,
              mospiStatus,
              hasFormDataState: !!formDataState,
              hasFormData: !!formData,
              hasState: !!state,
            });
            console.log("👤 Submission info:", {
              submissionId: submission?.id,
              submissionStatus: submission?.status,
              currentOwnerRole: submission?.currentOwnerRole,
              submittedBy: submission?.submittedBy,
            });
            console.log("✅ Checks:", {
              isStateApprover,
              mospiStatus,
              isMospiReverted: mospiStatus === "REVERTED",
              isFromNodalOfficer,
              shouldShowButton:
                mospiStatus === "REVERTED" && isFromNodalOfficer,
            });
            console.groupEnd();

            return mospiStatus === "REVERTED" && isFromNodalOfficer;
          })() && (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => {
                // Track that this was opened from STATE_APPROVER "Send Back" button
                setIsStateApproverSentBack(true);
                setStateApproverSentBackSectionId(sectionId);
                handleOpenModal(sectionId);
              }}
              disabled={shouldBeEditable(sectionId)}
            >
              <RotateCcw className="w-4 h-4" />
              Send Back
            </Button>
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
            `[InfraDevelopmentReview] Section ${sectionId} - Send Back visibility:`,
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
          className="flex items-center gap-1"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-4 h-4" />
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

  // If no data AND no sections to show (including previously submitted sections), show message
  // IMPORTANT: Check sectionsWithData.length instead of just hasData
  // This ensures previously submitted sections remain visible even if they have no data
  if (!hasData && sectionsWithData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No Infra Development data available for review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData(
            { infraDevelopment: state },
            "infraDevelopment"
          );
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
        {sectionsWithData.includes("section2_1") && (
          <SectionCard
            key="section-2.1"
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.1 -</span> Availability of
                    Infrastructure Act/Policy{" "}
                  </span>
                  {renderActionButtons("2.1")}
                </div>
              </div>
            }
            // subtitle="Annex 4: Provide link and funding details"
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("2.1")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("2.1")}
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
              {/* Validation error for infraActArray */}
              {renderFieldError("section2_1.infraActArray")}

              {/* Table Display */}
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                        Sector
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Uploaded File
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        File Type
                      </th>
                      {shouldBeEditable("2.1") && (
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const infraActArray = Array.isArray(
                        state?.section2_1?.infraActArray
                      )
                        ? state.section2_1.infraActArray
                        : [];

                      if (!infraActArray.length) {
                        return (
                          <tr>
                            <td
                              colSpan={shouldBeEditable("2.1") ? 4 : 3}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No data available
                            </td>
                          </tr>
                        );
                      }

                      return infraActArray.map((item: any, index: number) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.1") ? (
                              <div>
                                <Dropdown
                                  options={dropdownValues.sector.map((opt) => ({
                                    label: opt,
                                    value: opt,
                                  }))}
                                  value={item.sector || ""}
                                  onChange={(value) => {
                                    handleArrayFieldUpdate(
                                      "2.1",
                                      index,
                                      "sector",
                                      value
                                    );
                                    // Clear validation error when user selects
                                    if (
                                      getFieldError(
                                        `section2_1.infraActArray.${index}.sector`
                                      )
                                    ) {
                                      setIndicatorValidationErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[
                                          `section2_1.infraActArray.${index}.sector`
                                        ];
                                        return updated;
                                      });
                                    }
                                  }}
                                  placeholder="Select Sector"
                                  isEditable={true}
                                  resetKey={selectResetKey}
                                />
                                {renderFieldError(
                                  `section2_1.infraActArray.${index}.sector`
                                )}
                              </div>
                            ) : (
                              item.sector || "N/A"
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.1") ? (
                              <div className="space-y-1.5">
                                {item.files && item.files.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.files.map(
                                      (file: any, fileIndex: number) => (
                                        <Badge
                                          key={fileIndex}
                                          variant="secondary"
                                          className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                          title={
                                            extractOriginalName(
                                              file.fileName || "",
                                              (file as any)?.originalName
                                            ) || "Unknown file"
                                          }
                                        >
                                          <Upload className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">
                                            {extractOriginalName(
                                              file.fileName || "",
                                              (file as any)?.originalName
                                            ) || "Unknown file"}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updatedFiles =
                                                item.files.filter(
                                                  (_: any, idx: number) =>
                                                    idx !== fileIndex
                                                );
                                              handleFilesUpdate(
                                                "2.1",
                                                index,
                                                updatedFiles.length > 0
                                                  ? updatedFiles
                                                  : []
                                              );
                                            }}
                                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                          </button>
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    No files
                                  </span>
                                )}
                                <div className="flex items-center">
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={async (e) => {
                                      const selectedFile = e.target.files?.[0];
                                      if (selectedFile) {
                                        const uploadedFile =
                                          await handleFileUpload(selectedFile);
                                        if (uploadedFile) {
                                          const existingFiles =
                                            item.files || [];
                                          await handleFilesUpdate(
                                            "2.1",
                                            index,
                                            [...existingFiles, uploadedFile]
                                          );
                                        }
                                        e.target.value = ""; // Reset input
                                      }
                                    }}
                                    className="hidden"
                                    id={`file-input-2.1-${index}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      document
                                        .getElementById(
                                          `file-input-2.1-${index}`
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
                            ) : item.files && item.files.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                {item.files.map(
                                  (file: any, fileIndex: number) => {
                                    const fileKey = `2.1-${index}-${fileIndex}`;
                                    const isLoading = !!fileLoading[fileKey];
                                    const hasFileAccess = !!(
                                      file.filePath ||
                                      file.file ||
                                      file.fileUrl
                                    );
                                    return (
                                      <div
                                        key={fileIndex}
                                        className="flex items-center gap-1"
                                      >
                                        <Badge
                                          variant="secondary"
                                          className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                          title={
                                            extractOriginalName(
                                              file.fileName || "",
                                              (file as any)?.originalName
                                            ) || "Unknown file"
                                          }
                                        >
                                          <Upload className="w-3 h-3" />
                                          <span className="truncate">
                                            {extractOriginalName(
                                              file.fileName || "",
                                              (file as any)?.originalName
                                            ) || "Unknown file"}
                                          </span>
                                        </Badge>
                                        {hasFileAccess && (
                                          <>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleViewFile(file, fileKey)
                                              }
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
                                              onClick={() =>
                                                handleDownloadFile(
                                                  file,
                                                  fileKey
                                                )
                                              }
                                              disabled={isLoading}
                                              className="h-7 w-7 p-0"
                                              title="Download file"
                                            >
                                              <Download className="w-3 h-3" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No files
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {item.files && item.files.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.files.map(
                                  (file: any, fileIndex: number) => (
                                    <Badge
                                      key={fileIndex}
                                      variant="outline"
                                      className="text-xs px-1.5 py-0.5"
                                    >
                                      {file.fileName
                                        ?.split(".")
                                        .pop()
                                        ?.toUpperCase() || "N/A"}
                                    </Badge>
                                  )
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                N/A
                              </span>
                            )}
                          </td>
                          {shouldBeEditable("2.1") && (
                            <td className="py-3 px-4 text-sm font-normal">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  // Use index for deletion since items may not have IDs
                                  handleRemoveEntry2_1(index);
                                }}
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

              {/* Add More Button - Only visible when in edit mode */}
              {isEditable("2.1") && !showAddForm2_1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowAddForm2_1(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add More
                </Button>
              )}

              {/* Add Entry Form - Only visible when showAddForm2_1 is true */}
              {showAddForm2_1 && isEditable("2.1") && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">
                    Add New Infrastructure Act/Policy Entry
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Dropdown
                        options={dropdownValues.sector.map((opt) => ({
                          label: opt,
                          value: opt,
                        }))}
                        value={newEntry2_1.sector}
                        onChange={(value) =>
                          setNewEntry2_1({ ...newEntry2_1, sector: value })
                        }
                        placeholder="Select Sector"
                        isEditable={true}
                      />
                      {renderFieldError("section2_1.infraActArray.new.sector")}
                    </div>
                    <div>
                      <Label>Upload Files</Label>
                      <EditableFileDisplay
                        files={newEntry2_1.files}
                        isEditable={true}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) =>
                          setNewEntry2_1({
                            ...newEntry2_1,
                            files: toFileArray(updatedFiles),
                          })
                        }
                        label=""
                        multiple={true}
                      />
                      {renderFieldError("section2_1.infraActArray.new.files")}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddNewEntry2_1}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Entry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm2_1(false);
                        setNewEntry2_1({ sector: "", files: [] });
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Upload copy of Act/Policy
              </p>
            </div>
          </SectionCard>
        )}

        {/* Section 2.2 */}
        {sectionsWithData.includes("section2_2") && (
          <SectionCard
            key="section-2.2"
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.2 -</span> Availability of
                    Specialised Entity{" "}
                  </span>
                  {renderActionButtons("2.2")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("2.2")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("2.2")}
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
              {/* Table Display */}
              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                        Sector
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Uploaded File
                      </th>
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        File Type
                      </th>
                      {shouldBeEditable("2.2") && (
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const specializedEntityArray = Array.isArray(
                        state?.section2_2?.specializedEntityArray
                      )
                        ? state.section2_2.specializedEntityArray
                        : [];

                      if (!specializedEntityArray.length) {
                        return (
                          <tr>
                            <td
                              colSpan={shouldBeEditable("2.2") ? 4 : 3}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No data available
                            </td>
                          </tr>
                        );
                      }

                      return specializedEntityArray.map(
                        (item: any, index: number) => (
                          <tr key={item.id || index} className="border-b">
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("2.2") ? (
                                <div>
                                  <Dropdown
                                    options={dropdownValues.sector.map(
                                      (opt) => ({
                                        label: opt,
                                        value: opt,
                                      })
                                    )}
                                    value={item.sector || ""}
                                    onChange={(value) =>
                                      handleArrayFieldUpdate(
                                        "2.2",
                                        index,
                                        "sector",
                                        value
                                      )
                                    }
                                    placeholder="Select Sector"
                                    isEditable={true}
                                    resetKey={selectResetKey}
                                  />
                                  {renderFieldError(
                                    `section2_2.specializedEntityArray.${index}.sector`
                                  )}
                                </div>
                              ) : (
                                item.sector || "N/A"
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {shouldBeEditable("2.2") ? (
                                <div className="space-y-1.5">
                                  {item.files && item.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {item.files.map(
                                        (file: any, fileIndex: number) => (
                                          <Badge
                                            key={fileIndex}
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                            title={
                                              extractOriginalName(
                                                file.fileName || "",
                                                (file as any)?.originalName
                                              ) || "Unknown file"
                                            }
                                          >
                                            <Upload className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">
                                              {extractOriginalName(
                                                file.fileName || "",
                                                (file as any)?.originalName
                                              ) || "Unknown file"}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updatedFiles =
                                                  item.files.filter(
                                                    (_: any, idx: number) =>
                                                      idx !== fileIndex
                                                  );
                                                handleFilesUpdate(
                                                  "2.2",
                                                  index,
                                                  updatedFiles.length > 0
                                                    ? updatedFiles
                                                    : []
                                                );
                                              }}
                                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                            </button>
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      No files
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
                                          const uploadedFile =
                                            await handleFileUpload(
                                              selectedFile
                                            );
                                          if (uploadedFile) {
                                            const existingFiles =
                                              item.files || [];
                                            await handleFilesUpdate(
                                              "2.2",
                                              index,
                                              [...existingFiles, uploadedFile]
                                            );
                                          }
                                          e.target.value = ""; // Reset input
                                        }
                                      }}
                                      className="hidden"
                                      id={`file-input-2.2-${index}`}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        document
                                          .getElementById(
                                            `file-input-2.2-${index}`
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
                              ) : item.files && item.files.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {item.files.map(
                                    (file: any, fileIndex: number) => {
                                      const fileKey = `2.2-${index}-${fileIndex}`;
                                      const isLoading = !!fileLoading[fileKey];
                                      const hasFileAccess = !!(
                                        file.filePath ||
                                        file.file ||
                                        file.fileUrl
                                      );
                                      return (
                                        <div
                                          key={fileIndex}
                                          className="flex items-center gap-1"
                                        >
                                          <Badge
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                            title={
                                              extractOriginalName(
                                                file.fileName || "",
                                                (file as any)?.originalName
                                              ) || "Unknown file"
                                            }
                                          >
                                            <Upload className="w-3 h-3" />
                                            <span className="truncate">
                                              {extractOriginalName(
                                                file.fileName || "",
                                                (file as any)?.originalName
                                              ) || "Unknown file"}
                                            </span>
                                          </Badge>
                                          {hasFileAccess && (
                                            <>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleViewFile(file, fileKey)
                                                }
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
                                                onClick={() =>
                                                  handleDownloadFile(
                                                    file,
                                                    fileKey
                                                  )
                                                }
                                                disabled={isLoading}
                                                className="h-7 w-7 p-0"
                                                title="Download file"
                                              >
                                                <Download className="w-3 h-3" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  No files
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {item.files && item.files.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.files.map(
                                    (file: any, fileIndex: number) => (
                                      <Badge
                                        key={fileIndex}
                                        variant="outline"
                                        className="text-xs px-1.5 py-0.5"
                                      >
                                        {file.fileName
                                          ?.split(".")
                                          .pop()
                                          ?.toUpperCase() || "N/A"}
                                      </Badge>
                                    )
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  N/A
                                </span>
                              )}
                            </td>
                            {shouldBeEditable("2.2") && (
                              <td className="py-3 px-4 text-sm font-normal">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    // Use index for deletion since items may not have IDs
                                    handleRemoveEntry2_2(index);
                                  }}
                                  className="text-red-500 hover:text-red-700 border-none bg-none"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Add More Button - Only visible when in edit mode */}
              {isEditable("2.2") && !showAddForm2_2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  onClick={() => setShowAddForm2_2(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add More
                </Button>
              )}

              {/* Add Entry Form - Only visible when showAddForm2_2 is true */}
              {showAddForm2_2 && isEditable("2.2") && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">
                    Add New Specialized Entity Entry
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label>Sector</Label>
                      <Dropdown
                        options={dropdownValues.sector.map((opt) => ({
                          label: opt,
                          value: opt,
                        }))}
                        value={newEntry2_2.sector}
                        onChange={(value) =>
                          setNewEntry2_2({ ...newEntry2_2, sector: value })
                        }
                        placeholder="Select Sector"
                        isEditable={true}
                      />
                      {renderFieldError(
                        "section2_2.specializedEntityArray.new.sector"
                      )}
                    </div>
                    <div>
                      <Label>Upload Files</Label>
                      <EditableFileDisplay
                        files={newEntry2_2.files}
                        isEditable={true}
                        submissionId={submissionId}
                        onFilesChange={(updatedFiles) =>
                          setNewEntry2_2({
                            ...newEntry2_2,
                            files: toFileArray(updatedFiles),
                          })
                        }
                        label=""
                        multiple={true}
                      />
                      {renderFieldError(
                        "section2_2.specializedEntityArray.new.files"
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleAddNewEntry2_2}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Entry
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddForm2_2(false);
                        setNewEntry2_2({ sector: "", files: [] });
                      }}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">Upload OPM/SPC</p>
            </div>
          </SectionCard>
        )}

        {/* Section 2.3 */}
        {sectionsWithData.includes("section2_3") && (
          <SectionCard
            key="section-2.3"
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.3 -</span> Availability of
                    Sector Infra Development Plan{" "}
                  </span>
                  {renderActionButtons("2.3")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("2.3")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("2.3")}
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
              {/* RadioGroup for hasInfraDevelopmentPlan */}
              <div>
                <Label className="mb-3 block">
                  Has Infrastructure Development Plan?*
                </Label>
                {shouldBeEditable("2.3") ? (
                  <RadioGroup
                    value={state?.section2_3?.hasInfraDevelopmentPlan || ""}
                    onValueChange={(value) => {
                      handleSectionFieldUpdate(
                        "2.3",
                        "hasInfraDevelopmentPlan",
                        value
                      );
                      // Clear validation error when user selects
                      if (getFieldError("section2_3.hasInfraDevelopmentPlan")) {
                        setIndicatorValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section2_3.hasInfraDevelopmentPlan"];
                          return updated;
                        });
                      }
                    }}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="2.3-yes" />
                      <Label htmlFor="2.3-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="2.3-no" />
                      <Label htmlFor="2.3-no">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section2_3?.hasInfraDevelopmentPlan === "yes"
                          ? "bg-green-100 text-green-800"
                          : state?.section2_3?.hasInfraDevelopmentPlan === "no"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {state?.section2_3?.hasInfraDevelopmentPlan === "yes"
                        ? "Yes"
                        : state?.section2_3?.hasInfraDevelopmentPlan === "no"
                        ? "No"
                        : "Not specified"}
                    </span>
                  </div>
                )}
                {renderFieldError("section2_3.hasInfraDevelopmentPlan")}
              </div>

              {/* Show table and Add More button if hasInfraDevelopmentPlan is "yes" */}
              {state?.section2_3?.hasInfraDevelopmentPlan === "yes" && (
                <>
                  {/* Table Display */}
                  <div className="overflow-x-auto rounded-xl">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Sector
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Uploaded File
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            File Type
                          </th>
                          {shouldBeEditable("2.3") && (
                            <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const infraDevelopmentArray = Array.isArray(
                            state?.section2_3?.infraDevelopmentArray
                          )
                            ? state.section2_3.infraDevelopmentArray
                            : [];

                          if (!infraDevelopmentArray.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={shouldBeEditable("2.3") ? 4 : 3}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No data available
                                </td>
                              </tr>
                            );
                          }

                          return infraDevelopmentArray.map(
                            (item: any, index: number) => (
                              <tr key={item.id || index} className="border-b">
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.3") ? (
                                    <div>
                                      <Dropdown
                                        options={dropdownValues.sector.map(
                                          (opt) => ({ label: opt, value: opt })
                                        )}
                                        value={item.sector || ""}
                                        onChange={(value) =>
                                          handleArrayFieldUpdate(
                                            "2.3",
                                            index,
                                            "sector",
                                            value
                                          )
                                        }
                                        placeholder="Select Sector"
                                        isEditable={true}
                                        resetKey={selectResetKey}
                                      />
                                      {getFieldError(
                                        `section2_3.infraDevelopmentArray.${index}.sector`
                                      ) && (
                                        <p className="text-sm text-red-500 mt-1">
                                          {getFieldError(
                                            `section2_3.infraDevelopmentArray.${index}.sector`
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    item.sector || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.3") ? (
                                    <div className="space-y-1.5">
                                      {getFieldError(
                                        `section2_3.infraDevelopmentArray.${index}.files`
                                      ) && (
                                        <p className="text-sm text-red-500">
                                          {getFieldError(
                                            `section2_3.infraDevelopmentArray.${index}.files`
                                          )}
                                        </p>
                                      )}
                                      {item.files && item.files.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.files.map(
                                            (file: any, fileIndex: number) => (
                                              <Badge
                                                key={fileIndex}
                                                variant="secondary"
                                                className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                                title={
                                                  extractOriginalName(
                                                    file.fileName || "",
                                                    (file as any)?.originalName
                                                  ) || "Unknown file"
                                                }
                                              >
                                                <Upload className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">
                                                  {extractOriginalName(
                                                    file.fileName || "",
                                                    (file as any)?.originalName
                                                  ) || "Unknown file"}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updatedFiles =
                                                      item.files.filter(
                                                        (_: any, idx: number) =>
                                                          idx !== fileIndex
                                                      );
                                                    handleFilesUpdate(
                                                      "2.3",
                                                      index,
                                                      updatedFiles.length > 0
                                                        ? updatedFiles
                                                        : []
                                                    );
                                                  }}
                                                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  <X className="w-3 h-3 text-destructive hover:text-destructive/80" />
                                                </button>
                                              </Badge>
                                            )
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          No files
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
                                              const uploadedFile =
                                                await handleFileUpload(
                                                  selectedFile
                                                );
                                              if (uploadedFile) {
                                                const existingFiles =
                                                  item.files || [];
                                                await handleFilesUpdate(
                                                  "2.3",
                                                  index,
                                                  [
                                                    ...existingFiles,
                                                    uploadedFile,
                                                  ]
                                                );
                                              }
                                              e.target.value = ""; // Reset input
                                            }
                                          }}
                                          className="hidden"
                                          id={`file-input-2.3-${index}`}
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            document
                                              .getElementById(
                                                `file-input-2.3-${index}`
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
                                  ) : item.files && item.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      {item.files.map(
                                        (file: any, fileIndex: number) => {
                                          const fileKey = `2.3-${index}-${fileIndex}`;
                                          const isLoading =
                                            !!fileLoading[fileKey];
                                          const hasFileAccess = !!(
                                            file.filePath ||
                                            file.file ||
                                            file.fileUrl
                                          );
                                          return (
                                            <div
                                              key={fileIndex}
                                              className="flex items-center gap-1"
                                            >
                                              <Badge
                                                variant="secondary"
                                                className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                                title={
                                                  (file as any).originalName ||
                                                  file.fileName ||
                                                  "Unknown file"
                                                }
                                              >
                                                <Upload className="w-3 h-3" />
                                                <span className="truncate">
                                                  {(file as any).originalName ||
                                                    file.fileName ||
                                                    "Unknown file"}
                                                </span>
                                              </Badge>
                                              {hasFileAccess && (
                                                <>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      handleViewFile(
                                                        file,
                                                        fileKey
                                                      )
                                                    }
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
                                                    onClick={() =>
                                                      handleDownloadFile(
                                                        file,
                                                        fileKey
                                                      )
                                                    }
                                                    disabled={isLoading}
                                                    className="h-7 w-7 p-0"
                                                    title="Download file"
                                                  >
                                                    <Download className="w-3 h-3" />
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      No files
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {item.files && item.files.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {item.files.map(
                                        (file: any, fileIndex: number) => (
                                          <Badge
                                            key={fileIndex}
                                            variant="outline"
                                            className="text-xs px-1.5 py-0.5"
                                          >
                                            {file.fileName
                                              ?.split(".")
                                              .pop()
                                              ?.toUpperCase() || "N/A"}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      N/A
                                    </span>
                                  )}
                                </td>
                                {shouldBeEditable("2.3") && (
                                  <td className="py-3 px-4 text-sm font-normal">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        // Use index for deletion since items may not have IDs
                                        handleRemoveEntry2_3(index);
                                      }}
                                      className="text-red-500 hover:text-red-700 border-none bg-none"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            )
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Button - Only visible when in edit mode */}
                  {isEditable("2.3") && !showAddForm2_3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                      onClick={() => setShowAddForm2_3(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>
                  )}

                  {/* Add Entry Form - Only visible when showAddForm2_3 is true */}
                  {showAddForm2_3 && isEditable("2.3") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">
                        Add New Infrastructure Development Plan Entry
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label>Sector</Label>
                          <Dropdown
                            options={dropdownValues.sector.map((opt) => ({
                              label: opt,
                              value: opt,
                            }))}
                            value={newEntry2_3.sector}
                            onChange={(value) =>
                              setNewEntry2_3({ ...newEntry2_3, sector: value })
                            }
                            placeholder="Select Sector"
                            isEditable={true}
                          />
                        </div>
                        <div>
                          <Label>Upload Files</Label>
                          <EditableFileDisplay
                            files={newEntry2_3.files}
                            isEditable={true}
                            submissionId={submissionId}
                            onFilesChange={(updatedFiles) =>
                              setNewEntry2_3({
                                ...newEntry2_3,
                                files: toFileArray(updatedFiles),
                              })
                            }
                            label=""
                            multiple={true}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleAddNewEntry2_3}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save Entry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddForm2_3(false);
                            setNewEntry2_3({ sector: "", files: [] });
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">Upload plan</p>
                </>
              )}

              {/* Show comment field if hasInfraDevelopmentPlan is "no" */}
              {state?.section2_3?.hasInfraDevelopmentPlan === "no" && (
                <div>
                  <Label className="mb-2 block">Comment</Label>
                  {shouldBeEditable("2.3") ? (
                    <Textarea
                      value={state?.section2_3?.comment || ""}
                      onChange={(e) =>
                        handleSectionFieldUpdate(
                          "2.3",
                          "comment",
                          e.target.value
                        )
                      }
                      placeholder="Please provide a comment..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section2_3?.comment || "No comment provided"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 2.4 */}
        {sectionsWithData.includes("section2_4") && (
          <SectionCard
            key="section-2.4"
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.4 -</span> Availability of
                    Investment Ready Project Pipeline{" "}
                  </span>
                  {renderActionButtons("2.4")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("2.4")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("2.4")}
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
              {/* RadioGroup for hasInvestmentReady */}
              <div>
                <Label className="mb-3 block">
                  Has Investment Ready Project Pipeline?*
                </Label>
                {isEditable("2.4") ? (
                  <RadioGroup
                    value={state?.section2_4?.hasInvestmentReady || ""}
                    onValueChange={(value) => {
                      handleSectionFieldUpdate(
                        "2.4",
                        "hasInvestmentReady",
                        value
                      );
                      // Clear validation error when user selects
                      if (getFieldError("section2_4.hasInvestmentReady")) {
                        setIndicatorValidationErrors((prev) => {
                          const updated = { ...prev };
                          delete updated["section2_4.hasInvestmentReady"];
                          return updated;
                        });
                      }
                    }}
                    className="flex flex-row gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="2.4-yes" />
                      <Label htmlFor="2.4-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="2.4-no" />
                      <Label htmlFor="2.4-no">No</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        state?.section2_4?.hasInvestmentReady === "yes"
                          ? "bg-green-100 text-green-800"
                          : state?.section2_4?.hasInvestmentReady === "no"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {state?.section2_4?.hasInvestmentReady === "yes"
                        ? "Yes"
                        : state?.section2_4?.hasInvestmentReady === "no"
                        ? "No"
                        : "Not specified"}
                    </span>
                  </div>
                )}
                {getFieldError("section2_4.hasInvestmentReady") && (
                  <p className="text-sm text-red-500 mt-1">
                    {getFieldError("section2_4.hasInvestmentReady")}
                  </p>
                )}
              </div>

              {/* Show table and Add More button if hasInvestmentReady is "yes" */}
              {state?.section2_4?.hasInvestmentReady === "yes" && (
                <>
                  {/* Website Link Field */}
                  <div className="max-w-[60%]">
                    <Label className="mb-2 block">
                      Website Link <span className="text-destructive">*</span>
                    </Label>
                    {shouldBeEditable("2.4") ? (
                      <div>
                        <Input
                          type="url"
                          placeholder="Enter website URL"
                          value={state?.section2_4?.websiteLink || ""}
                          onChange={(e) => {
                            handleSectionFieldUpdate(
                              "2.4",
                              "websiteLink",
                              e.target.value
                            );
                            // Clear validation error when user starts typing
                            if (getFieldError("section2_4.websiteLink")) {
                              setIndicatorValidationErrors((prev) => {
                                const updated = { ...prev };
                                delete updated["section2_4.websiteLink"];
                                return updated;
                              });
                            }
                          }}
                          className={
                            getFieldError("section2_4.websiteLink")
                              ? "bg-white border-red-500"
                              : "bg-white"
                          }
                        />
                        {getFieldError("section2_4.websiteLink") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getFieldError("section2_4.websiteLink")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {state?.section2_4?.websiteLink ||
                          "No website link provided"}
                      </div>
                    )}
                  </div>

                  {/* Table Display */}
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
                            Status
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Project Size (Cr)
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Type of Investment
                          </th>
                          {shouldBeEditable("2.4") && (
                            <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                              Action
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const investmentReadyArray = Array.isArray(
                            state?.section2_4?.investmentReadyArray
                          )
                            ? state.section2_4.investmentReadyArray
                            : [];

                          if (!investmentReadyArray.length) {
                            return (
                              <tr>
                                <td
                                  colSpan={shouldBeEditable("2.4") ? 6 : 5}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No data available
                                </td>
                              </tr>
                            );
                          }

                          return investmentReadyArray.map(
                            (item: any, index: number) => (
                              <tr key={item.id || index} className="border-b">
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.4") ? (
                                    <div>
                                      <Input
                                        value={item.projectName || ""}
                                        onChange={(e) =>
                                          handleArrayFieldUpdate(
                                            "2.4",
                                            index,
                                            "projectName",
                                            e.target.value
                                          )
                                        }
                                        className={
                                          getFieldError(
                                            `section2_4.investmentReadyArray.${index}.projectName`
                                          )
                                            ? "w-full border-red-500"
                                            : "w-full"
                                        }
                                        placeholder="Enter project name"
                                      />
                                      {getFieldError(
                                        `section2_4.investmentReadyArray.${index}.projectName`
                                      ) && (
                                        <p className="text-sm text-red-500 mt-1">
                                          {getFieldError(
                                            `section2_4.investmentReadyArray.${index}.projectName`
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    item.projectName || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.4") ? (
                                    <div>
                                      <Dropdown
                                        options={dropdownValues.sector.map(
                                          (opt) => ({ label: opt, value: opt })
                                        )}
                                        value={item.sector || ""}
                                        onChange={(value) =>
                                          handleArrayFieldUpdate(
                                            "2.4",
                                            index,
                                            "sector",
                                            value
                                          )
                                        }
                                        placeholder="Select Sector"
                                        isEditable={true}
                                      />
                                      {getFieldError(
                                        `section2_4.investmentReadyArray.${index}.sector`
                                      ) && (
                                        <p className="text-sm text-red-500 mt-1">
                                          {getFieldError(
                                            `section2_4.investmentReadyArray.${index}.sector`
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    item.sector || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.4") ? (
                                    <div>
                                      <Dropdown
                                        options={[
                                          "Tender Done",
                                          "Bidding",
                                          "Other",
                                        ].map((opt) => ({
                                          label: opt,
                                          value: opt,
                                        }))}
                                        value={item.status || ""}
                                        onChange={(value) =>
                                          handleArrayFieldUpdate(
                                            "2.4",
                                            index,
                                            "status",
                                            value
                                          )
                                        }
                                        placeholder="Select Status"
                                        isEditable={true}
                                      />
                                      {getFieldError(
                                        `section2_4.investmentReadyArray.${index}.status`
                                      ) && (
                                        <p className="text-sm text-red-500 mt-1">
                                          {getFieldError(
                                            `section2_4.investmentReadyArray.${index}.status`
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    item.status || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.4") ? (
                                    <div>
                                      <Input
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        value={item.projectSize || ""}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          // Only allow numbers and decimal point
                                          if (
                                            value === "" ||
                                            /^\d*\.?\d*$/.test(value)
                                          ) {
                                            handleArrayFieldUpdate(
                                              "2.4",
                                              index,
                                              "projectSize",
                                              value
                                            );
                                          }
                                        }}
                                        className={
                                          getFieldError(
                                            `section2_4.investmentReadyArray.${index}.projectSize`
                                          )
                                            ? "w-full border-red-500"
                                            : "w-full"
                                        }
                                        placeholder="Enter project size"
                                      />
                                      {getFieldError(
                                        `section2_4.investmentReadyArray.${index}.projectSize`
                                      ) && (
                                        <p className="text-sm text-red-500 mt-1">
                                          {getFieldError(
                                            `section2_4.investmentReadyArray.${index}.projectSize`
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    item.projectSize || "N/A"
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm font-normal">
                                  {shouldBeEditable("2.4") ? (
                                    <div>
                                      <Dropdown
                                        options={[
                                          "Partner",
                                          "Investor",
                                          "Other",
                                        ].map((opt) => ({
                                          label: opt,
                                          value: opt,
                                        }))}
                                        value={item.investmentType || ""}
                                        onChange={(value) =>
                                          handleArrayFieldUpdate(
                                            "2.4",
                                            index,
                                            "investmentType",
                                            value
                                          )
                                        }
                                        placeholder="Select Type"
                                        isEditable={true}
                                      />
                                      {getFieldError(
                                        `section2_4.investmentReadyArray.${index}.investmentType`
                                      ) && (
                                        <p className="text-sm text-red-500 mt-1">
                                          {getFieldError(
                                            `section2_4.investmentReadyArray.${index}.investmentType`
                                          )}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    item.investmentType || "N/A"
                                  )}
                                </td>
                                {shouldBeEditable("2.4") && (
                                  <td className="py-3 px-4 text-sm font-normal">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => {
                                        // Use index for deletion since items may not have IDs
                                        handleRemoveEntry2_4(index);
                                      }}
                                      className="text-red-500 hover:text-red-700 border-none bg-none"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            )
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Add More Button - Only visible when in edit mode */}
                  {isEditable("2.4") && !showAddForm2_4 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                      onClick={() => setShowAddForm2_4(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>
                  )}

                  {/* Add Entry Form - Only visible when showAddForm2_4 is true */}
                  {showAddForm2_4 && isEditable("2.4") && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">
                        Add New Investment Ready Project Entry
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label>
                            Project Name{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={newEntry2_4.projectName}
                            onChange={(e) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                projectName: e.target.value,
                              })
                            }
                            className="bg-white"
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <Label>
                            Sector <span className="text-destructive">*</span>
                          </Label>
                          <Dropdown
                            options={dropdownValues.sector.map((opt) => ({
                              label: opt,
                              value: opt,
                            }))}
                            value={newEntry2_4.sector}
                            onChange={(value) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                sector: value,
                              })
                            }
                            placeholder="Select Sector"
                            isEditable={true}
                          />
                        </div>
                        <div>
                          <Label>
                            Status <span className="text-destructive">*</span>
                          </Label>
                          <Dropdown
                            options={["Tender Done", "Bidding", "Other"].map(
                              (opt) => ({ label: opt, value: opt })
                            )}
                            value={newEntry2_4.status}
                            onChange={(value) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                status: value,
                              })
                            }
                            placeholder="Select Status"
                            isEditable={true}
                          />
                        </div>
                        <div>
                          <Label>
                            Project Size (INR - values is in CRORES){" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newEntry2_4.projectSize}
                            onChange={(e) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                projectSize: e.target.value,
                              })
                            }
                            className="bg-white"
                            placeholder="Enter project size"
                          />
                        </div>
                        <div>
                          <Label>
                            Type of Investment{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Dropdown
                            options={["Partner", "Investor", "Other"].map(
                              (opt) => ({ label: opt, value: opt })
                            )}
                            value={newEntry2_4.investmentType}
                            onChange={(value) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                investmentType: value,
                              })
                            }
                            placeholder="Select Type"
                            isEditable={true}
                          />
                        </div>
                        <div>
                          <Label>Upload DPR/Feasibility Report</Label>
                          <EditableFileDisplay
                            files={newEntry2_4.dprFile}
                            isEditable={true}
                            submissionId={submissionId}
                            onFilesChange={(updatedFile) =>
                              setNewEntry2_4({
                                ...newEntry2_4,
                                dprFile: toSingleFile(updatedFile),
                              })
                            }
                            label=""
                            multiple={false}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleAddNewEntry2_4}
                          className="flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Save Entry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddForm2_4(false);
                            setNewEntry2_4({
                              projectName: "",
                              sector: "",
                              status: "",
                              projectSize: "",
                              investmentType: "",
                              dprFile: null,
                            });
                          }}
                          className="flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* <p className="text-sm text-muted-foreground">
                Annex 8: Upload DPR/Feasibility Report
              </p> */}
                </>
              )}

              {/* Show comment field - only when "no" is selected and it's mandatory */}
              {state?.section2_4?.hasInvestmentReady === "no" && (
                <div>
                  <Label className="mb-2 block">
                    Comment <span className="text-destructive">*</span>
                  </Label>
                  {shouldBeEditable("2.4") ? (
                    <Textarea
                      value={state?.section2_4?.comment || ""}
                      onChange={(e) =>
                        handleSectionFieldUpdate(
                          "2.4",
                          "comment",
                          e.target.value
                        )
                      }
                      placeholder="Please provide a comment..."
                      className={cn(
                        "min-h-[100px]",
                        getFieldError("section2_4.comment") && "border-red-500"
                      )}
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {state?.section2_4?.comment || "No comment provided"}
                    </div>
                  )}
                  {getFieldError("section2_4.comment") && (
                    <p className="text-sm text-red-500 mt-1">
                      {getFieldError("section2_4.comment")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 2.5 */}
        {sectionsWithData.includes("section2_5") && (
          <SectionCard
            key="section-2.5"
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">2.5 -</span> Availability of
                    Asset Monetization Pipeline{" "}
                  </span>
                  {renderActionButtons("2.5")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("2.5")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("2.5")}
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
                    <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                      Project/Asset Name
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Select Sector
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Select Type
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Asset Ownership
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">
                      Estimated Monetization (INR - values is in CRORES)
                    </th>
                    {shouldBeEditable("2.5") && (
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const assetMonetizationArray = Array.isArray(
                      state?.section2_5?.assetMonetizationArray
                    )
                      ? state.section2_5.assetMonetizationArray
                      : [];

                    if (!assetMonetizationArray.length) {
                      return (
                        <tr>
                          <td
                            colSpan={shouldBeEditable("2.5") ? 6 : 5}
                            className="py-8 text-center text-muted-foreground"
                          >
                            No asset monetization pipeline data available
                          </td>
                        </tr>
                      );
                    }

                    return assetMonetizationArray.map(
                      (item: any, index: number) => (
                        <tr key={item.id || index} className="border-b">
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.5") ? (
                              <div>
                                <Input
                                  value={item.projectName || ""}
                                  onChange={(e) => {
                                    handleArrayFieldUpdate(
                                      "2.5",
                                      index,
                                      "projectName",
                                      e.target.value
                                    );
                                    // Clear validation error when user types
                                    if (
                                      getFieldError(
                                        `section2_5.assetMonetizationArray.${index}.projectName`
                                      )
                                    ) {
                                      setIndicatorValidationErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[
                                          `section2_5.assetMonetizationArray.${index}.projectName`
                                        ];
                                        return updated;
                                      });
                                    }
                                  }}
                                  className={
                                    getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.projectName`
                                    )
                                      ? "w-full border-red-500"
                                      : "w-full"
                                  }
                                />
                                {getFieldError(
                                  `section2_5.assetMonetizationArray.${index}.projectName`
                                ) && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.projectName`
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              item.projectName || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.5") ? (
                              <div>
                                <Dropdown
                                  options={dropdownValues.sector.map((opt) => ({
                                    label: opt,
                                    value: opt,
                                  }))}
                                  value={item.sector || ""}
                                  onChange={(value) => {
                                    handleArrayFieldUpdate(
                                      "2.5",
                                      index,
                                      "sector",
                                      value
                                    );
                                    // Clear validation error when user selects
                                    if (
                                      getFieldError(
                                        `section2_5.assetMonetizationArray.${index}.sector`
                                      )
                                    ) {
                                      setIndicatorValidationErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[
                                          `section2_5.assetMonetizationArray.${index}.sector`
                                        ];
                                        return updated;
                                      });
                                    }
                                  }}
                                  placeholder="Select Sector"
                                  isEditable={true}
                                  resetKey={selectResetKey}
                                />
                                {getFieldError(
                                  `section2_5.assetMonetizationArray.${index}.sector`
                                ) && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.sector`
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              item.sector || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.5") ? (
                              <div>
                                <Dropdown
                                  options={dropdownValues.projectType.map(
                                    (opt) => ({ label: opt, value: opt })
                                  )}
                                  value={item.type || ""}
                                  onChange={(value) => {
                                    handleArrayFieldUpdate(
                                      "2.5",
                                      index,
                                      "type",
                                      value
                                    );
                                    // Clear validation error when user selects
                                    if (
                                      getFieldError(
                                        `section2_5.assetMonetizationArray.${index}.type`
                                      )
                                    ) {
                                      setIndicatorValidationErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[
                                          `section2_5.assetMonetizationArray.${index}.type`
                                        ];
                                        return updated;
                                      });
                                    }
                                  }}
                                  placeholder="Select Type"
                                  isEditable={true}
                                  resetKey={selectResetKey}
                                />
                                {getFieldError(
                                  `section2_5.assetMonetizationArray.${index}.type`
                                ) && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.type`
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              item.type || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.5") ? (
                              <div>
                                <Dropdown
                                  options={dropdownValues.ownership.map(
                                    (opt) => ({ label: opt, value: opt })
                                  )}
                                  value={item.ownership || ""}
                                  onChange={(value) => {
                                    handleArrayFieldUpdate(
                                      "2.5",
                                      index,
                                      "ownership",
                                      value
                                    );
                                    // Clear validation error when user selects
                                    if (
                                      getFieldError(
                                        `section2_5.assetMonetizationArray.${index}.ownership`
                                      )
                                    ) {
                                      setIndicatorValidationErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[
                                          `section2_5.assetMonetizationArray.${index}.ownership`
                                        ];
                                        return updated;
                                      });
                                    }
                                  }}
                                  placeholder="Select Ownership"
                                  isEditable={true}
                                  resetKey={selectResetKey}
                                />
                                {getFieldError(
                                  `section2_5.assetMonetizationArray.${index}.ownership`
                                ) && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.ownership`
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : (
                              item.ownership || ""
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {shouldBeEditable("2.5") ? (
                              <div>
                                <Input
                                  value={item.estimatedMonetization || ""}
                                  onChange={(e) => {
                                    handleArrayFieldUpdate(
                                      "2.5",
                                      index,
                                      "estimatedMonetization",
                                      e.target.value
                                    );
                                    // Clear validation error when user types
                                    if (
                                      getFieldError(
                                        `section2_5.assetMonetizationArray.${index}.estimatedMonetization`
                                      )
                                    ) {
                                      setIndicatorValidationErrors((prev) => {
                                        const updated = { ...prev };
                                        delete updated[
                                          `section2_5.assetMonetizationArray.${index}.estimatedMonetization`
                                        ];
                                        return updated;
                                      });
                                    }
                                  }}
                                  className={
                                    getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.estimatedMonetization`
                                    )
                                      ? "w-full border-red-500"
                                      : "w-full"
                                  }
                                  placeholder="Enter amount"
                                />
                                {getFieldError(
                                  `section2_5.assetMonetizationArray.${index}.estimatedMonetization`
                                ) && (
                                  <p className="text-xs text-red-500 mt-1">
                                    {getFieldError(
                                      `section2_5.assetMonetizationArray.${index}.estimatedMonetization`
                                    )}
                                  </p>
                                )}
                              </div>
                            ) : item.estimatedMonetization ? (
                              `₹ ${item.estimatedMonetization} Crores`
                            ) : (
                              ""
                            )}
                          </td>
                          {shouldBeEditable("2.5") && (
                            <td className="py-3 px-4 text-sm font-normal">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  // Use index for deletion since items may not have IDs
                                  handleRemoveEntry2_5(index);
                                }}
                                className="text-red-500 hover:text-red-700 border-none bg-none"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {/* General array error message */}
            {shouldBeEditable("2.5") &&
              getFieldError("section2_5.assetMonetizationArray") && (
                <p className="text-sm text-red-500 mt-2">
                  {getFieldError("section2_5.assetMonetizationArray")}
                </p>
              )}

            {/* Add More Button - Only visible when in edit mode */}
            {isEditable("2.5") && !showAddForm2_5 && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 mt-4"
                onClick={() => setShowAddForm2_5(true)}
              >
                <Plus className="w-4 h-4" />
                Add More
              </Button>
            )}

            {/* Add Entry Form - Only visible when showAddForm2_5 is true */}
            {showAddForm2_5 && isEditable("2.5") && (
              <div className="border rounded-lg p-4 bg-gray-50 mt-4">
                <h4 className="font-medium mb-3">
                  Add New Asset Monetization Entry
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Project/Asset Name</Label>
                    <Input
                      value={newEntry2_5.projectName}
                      onChange={(e) => {
                        setNewEntry2_5({
                          ...newEntry2_5,
                          projectName: e.target.value,
                        });
                        // Clear validation error when user types
                        if (
                          getFieldError(
                            "section2_5.assetMonetizationArray.new.projectName"
                          )
                        ) {
                          setIndicatorValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[
                              "section2_5.assetMonetizationArray.new.projectName"
                            ];
                            return updated;
                          });
                        }
                      }}
                      className={
                        getFieldError(
                          "section2_5.assetMonetizationArray.new.projectName"
                        )
                          ? "bg-white border-red-500"
                          : "bg-white"
                      }
                      placeholder="Enter project/asset name"
                    />
                    {getFieldError(
                      "section2_5.assetMonetizationArray.new.projectName"
                    ) && (
                      <p className="text-sm text-red-500 mt-1">
                        {getFieldError(
                          "section2_5.assetMonetizationArray.new.projectName"
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Sector</Label>
                    <Dropdown
                      options={dropdownValues.sector.map((opt) => ({
                        label: opt,
                        value: opt,
                      }))}
                      value={newEntry2_5.sector}
                      onChange={(value) => {
                        setNewEntry2_5({ ...newEntry2_5, sector: value });
                        // Clear validation error when user selects
                        if (
                          getFieldError(
                            "section2_5.assetMonetizationArray.new.sector"
                          )
                        ) {
                          setIndicatorValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[
                              "section2_5.assetMonetizationArray.new.sector"
                            ];
                            return updated;
                          });
                        }
                      }}
                      placeholder="Select Sector"
                      isEditable={true}
                    />
                    {getFieldError(
                      "section2_5.assetMonetizationArray.new.sector"
                    ) && (
                      <p className="text-sm text-red-500 mt-1">
                        {getFieldError(
                          "section2_5.assetMonetizationArray.new.sector"
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Dropdown
                      options={dropdownValues.projectType.map((opt) => ({
                        label: opt,
                        value: opt,
                      }))}
                      value={newEntry2_5.type}
                      onChange={(value) => {
                        setNewEntry2_5({ ...newEntry2_5, type: value });
                        // Clear validation error when user selects
                        if (
                          getFieldError(
                            "section2_5.assetMonetizationArray.new.type"
                          )
                        ) {
                          setIndicatorValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[
                              "section2_5.assetMonetizationArray.new.type"
                            ];
                            return updated;
                          });
                        }
                      }}
                      placeholder="Select Type"
                      isEditable={true}
                    />
                    {getFieldError(
                      "section2_5.assetMonetizationArray.new.type"
                    ) && (
                      <p className="text-sm text-red-500 mt-1">
                        {getFieldError(
                          "section2_5.assetMonetizationArray.new.type"
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Asset Ownership</Label>
                    <Dropdown
                      options={dropdownValues.ownership.map((opt) => ({
                        label: opt,
                        value: opt,
                      }))}
                      value={newEntry2_5.ownership}
                      onChange={(value) => {
                        setNewEntry2_5({ ...newEntry2_5, ownership: value });
                        // Clear validation error when user selects
                        if (
                          getFieldError(
                            "section2_5.assetMonetizationArray.new.ownership"
                          )
                        ) {
                          setIndicatorValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[
                              "section2_5.assetMonetizationArray.new.ownership"
                            ];
                            return updated;
                          });
                        }
                      }}
                      placeholder="Select Ownership"
                      isEditable={true}
                    />
                    {getFieldError(
                      "section2_5.assetMonetizationArray.new.ownership"
                    ) && (
                      <p className="text-sm text-red-500 mt-1">
                        {getFieldError(
                          "section2_5.assetMonetizationArray.new.ownership"
                        )}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label>Estimated Monetization</Label>
                    <Input
                      value={newEntry2_5.estimatedMonetization}
                      onChange={(e) => {
                        setNewEntry2_5({
                          ...newEntry2_5,
                          estimatedMonetization: e.target.value,
                        });
                        // Clear validation error when user types
                        if (
                          getFieldError(
                            "section2_5.assetMonetizationArray.new.estimatedMonetization"
                          )
                        ) {
                          setIndicatorValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated[
                              "section2_5.assetMonetizationArray.new.estimatedMonetization"
                            ];
                            return updated;
                          });
                        }
                      }}
                      className={
                        getFieldError(
                          "section2_5.assetMonetizationArray.new.estimatedMonetization"
                        )
                          ? "bg-white border-red-500"
                          : "bg-white"
                      }
                      placeholder="Enter amount"
                    />
                    {getFieldError(
                      "section2_5.assetMonetizationArray.new.estimatedMonetization"
                    ) && (
                      <p className="text-sm text-red-500 mt-1">
                        {getFieldError(
                          "section2_5.assetMonetizationArray.new.estimatedMonetization"
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddNewEntry2_5}
                    className="flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Save Entry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm2_5(false);
                      setNewEntry2_5({
                        projectName: "",
                        sector: "",
                        type: "",
                        ownership: "",
                        estimatedMonetization: "",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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
