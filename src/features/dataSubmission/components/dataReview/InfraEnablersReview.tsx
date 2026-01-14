/* eslint-disable @typescript-eslint/no-explicit-any */
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
  FileSpreadsheet,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { MonthYearPicker } from "@/components/ui/month-year-picker";
import { useEditableSectionStore } from "@/utils/EditableSection";
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
import { EditableFileDisplay } from "../EditableFileDisplay";
import type { FileUpload } from "@/types";
import { Dropdown, dropdownValues } from "@/utils/getDropDowns";
import { validateInfraEnablers } from "@/features/submission/validation/infraEnablersValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { useFieldValidation } from "@/features/submission/hooks/useFieldValidation";
import { useFieldErrorDisplay } from "@/features/submission/hooks/useFieldErrorDisplay";
import { getInputValidationClass as getInputValidationClassUtil } from "@/features/submission/utils/validationStyles";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { IndicatorScoreToggle } from "@/components/IndicatorScoreToggle";
import { IndicatorScoreDisplay } from "@/components/IndicatorScoreDisplay";
import {
  isSubmissionFromNodalOfficer,
  isIndicatorFromNodalOfficer,
} from "@/utils/indicatorStatusUtils";
import {
  IMPACT_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  SECTOR_OPTIONS,
} from "@/features/submission/constants/steps";
import { useToast } from "@/hooks/use-toast";
import {
  parseCapacityBuildingExcel,
  generateCapacityBuildingTemplate,
} from "@/utils/excelParser";
import {
  getCurrentFinancialYear,
  countOfficersTrainedInCurrentFY,
} from "@/utils/dateUtils";

interface InfraEnablersReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: any; // Complete submission object
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
  // Normalize formData to ensure trainingPeriod exists in capacityArray entries
  const normalizeFormData = (data: any) => {
    if (!data || typeof data !== "object") return data;

    const normalized = { ...data };
    const infraEnablers = normalized.infraEnablers || normalized;

    // Ensure mutual exclusivity for section 4.1
    if (infraEnablers?.section4_1) {
      const section = infraEnablers.section4_1;
      const hasFile =
        section.file &&
        (section.file.file || section.file.fileName || section.file.filePath);

      if (hasFile) {
        infraEnablers.section4_1 = {
          ...section,
          noDocumentAvailable: false,
        };
      } else {
        // Preserve noDocumentAvailable value if it exists, otherwise default to false
        infraEnablers.section4_1 = {
          ...section,
          noDocumentAvailable:
            section.noDocumentAvailable !== undefined
              ? section.noDocumentAvailable
              : false,
        };
      }
    }

    // Ensure mutual exclusivity for section 4.3
    if (infraEnablers?.section4_3) {
      const section = infraEnablers.section4_3;
      const hasFile =
        section.file &&
        (section.file.file || section.file.fileName || section.file.filePath);

      if (hasFile) {
        infraEnablers.section4_3 = {
          ...section,
          noDocumentAvailable: false,
        };
      } else {
        // Preserve noDocumentAvailable value if it exists, otherwise default to false
        infraEnablers.section4_3 = {
          ...section,
          noDocumentAvailable:
            section.noDocumentAvailable !== undefined
              ? section.noDocumentAvailable
              : false,
        };
      }
    }

    // Ensure mutual exclusivity for section 4.2 projects
    if (infraEnablers?.section4_2?.projects) {
      infraEnablers.section4_2 = {
        ...infraEnablers.section4_2,
        projects: infraEnablers.section4_2.projects.map((project: any) => {
          const hasFile =
            project.file &&
            (project.file.file ||
              project.file.fileName ||
              project.file.filePath ||
              project.file.fileUrl);

          if (hasFile) {
            return {
              ...project,
              noDocumentAvailable: false,
            };
          } else {
            return {
              ...project,
              noDocumentAvailable:
                project.noDocumentAvailable !== undefined
                  ? project.noDocumentAvailable
                  : false,
            };
          }
        }),
      };
    }

    // Ensure mutual exclusivity for section 4.4 practices
    if (infraEnablers?.section4_4?.practices) {
      infraEnablers.section4_4 = {
        ...infraEnablers.section4_4,
        practices: infraEnablers.section4_4.practices.map((practice: any) => {
          const hasFile =
            practice.file &&
            (practice.file.file ||
              practice.file.fileName ||
              practice.file.filePath ||
              practice.file.fileUrl);

          if (hasFile) {
            return {
              ...practice,
              noDocumentAvailable: false,
            };
          } else {
            return {
              ...practice,
              noDocumentAvailable:
                practice.noDocumentAvailable !== undefined
                  ? practice.noDocumentAvailable
                  : false,
            };
          }
        }),
      };
    }

    if (infraEnablers?.section4_5?.capacityArray) {
      infraEnablers.section4_5 = {
        ...infraEnablers.section4_5,
        capacityArray: infraEnablers.section4_5.capacityArray.map(
          (item: any) => ({
            ...item,
            trainingPeriod: item.trainingPeriod || "",
          })
        ),
      };
    }

    return normalized;
  };

  const [formDataState, setFormDataState] = useState(() =>
    normalizeFormData(formData)
  );
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

    return validateInfraEnablers(fullFormDataForValidation as any, {
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

  // Normalize capacityArray entries to ensure trainingPeriod field exists
  // This handles cases where old data doesn't have the trainingPeriod field
  useEffect(() => {
    if (formDataState?.section4_5?.capacityArray) {
      const hasMissingTrainingPeriod =
        formDataState.section4_5.capacityArray.some(
          (item: any) =>
            item.trainingPeriod === undefined || item.trainingPeriod === null
        );

      if (hasMissingTrainingPeriod) {
        setFormDataState((prev: any) => {
          if (!prev?.section4_5?.capacityArray) return prev;

          return {
            ...prev,
            section4_5: {
              ...prev.section4_5,
              capacityArray: prev.section4_5.capacityArray.map((item: any) => ({
                ...item,
                trainingPeriod: item.trainingPeriod || "",
              })),
            },
          };
        });
      }
    }
  }, [formDataState?.section4_5?.capacityArray]);

  // Also normalize when formData prop changes (initial load)
  useEffect(() => {
    if (formData && typeof formData === "object") {
      const infraEnablers = (formData as any)?.infraEnablers;
      if (infraEnablers?.section4_5?.capacityArray) {
        const hasMissingTrainingPeriod =
          infraEnablers.section4_5.capacityArray.some(
            (item: any) =>
              item.trainingPeriod === undefined || item.trainingPeriod === null
          );

        if (hasMissingTrainingPeriod) {
          setFormDataState((prev: any) => {
            const currentInfraEnablers = prev?.infraEnablers || prev || {};
            return {
              ...(typeof prev === "object" && !prev.infraEnablers ? prev : {}),
              infraEnablers: {
                ...currentInfraEnablers,
                section4_5: {
                  ...currentInfraEnablers.section4_5,
                  capacityArray: (
                    currentInfraEnablers.section4_5?.capacityArray || []
                  ).map((item: any) => ({
                    ...item,
                    trainingPeriod: item.trainingPeriod || "",
                  })),
                },
              },
            };
          });
        }
      }
    }
  }, [formData]);

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

  // State for indicator score toggle (per indicator)
  const [indicatorScoreToggleState, setIndicatorScoreToggleState] = useState<
    Record<string, "score" | "updatedScore">
  >({});

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

  // State for adding new project in section 4.3
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    projectName: "",
    sector: "",
    statusOfProject: "",
    file: null as FileUpload | null,
    noDocumentAvailable: false,
  });

  // State for adding new practice in section 4.5
  const [showAddPracticeForm, setShowAddPracticeForm] = useState(false);
  const [newPractice, setNewPractice] = useState({
    practiceName: "",
    impact: "",
    file: null as FileUpload | null,
  });

  // State for adding new capacity building entry in section 4.5
  const [showAddCapacityForm, setShowAddCapacityForm] = useState(false);
  const [newCapacityEntry, setNewCapacityEntry] = useState({
    officerName: "",
    designation: "",
    programName: "",
    organiser: "",
    trainingType: "",
    trainingPeriod: "",
  });

  // Excel upload functionality for Section 4.5
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const { toast } = useToast();

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
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (state && state[sectionKey]) || (formData && formData[sectionKey]);
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

    // Show all validation errors when entering edit mode
    // Build full form data for validation (include all sections)
    const fullData = {
      section4_1: formDataState?.section4_1 || {
        available: "",
        file: null,
        comment: "",
        noDocumentAvailable: false,
      },
      section4_2: formDataState?.section4_2 || {
        adopted: "",
        file: null,
        projects: [],
        comment: "",
      },
      section4_3: formDataState?.section4_3 || {
        adopted: "",
        file: null,
        comment: "",
        noDocumentAvailable: false,
      },
      section4_4: formDataState?.section4_4 || {
        implemented: "",
        practices: [],
        comment: "",
      },
      section4_5: formDataState?.section4_5 || {
        participated: "",
        capacityArray: [],
        comment: "",
      },
    };

    const effectiveAssignedIndicators =
      assignedIndicators.length > 0
        ? assignedIndicators
        : hookAssignedIndicators.length > 0
        ? hookAssignedIndicators
        : undefined;

    // Run validation for the section
    const validationResult = validateInfraEnablers(fullData, {
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
    // This includes both fields with errors and fields that might get errors later
    const sectionKey = `section${sectionId.replace(".", "_")}`;
    const sectionData =
      formDataState?.[sectionKey as keyof typeof formDataState];

    // Get all possible field paths for this section
    const allSectionFields: string[] = [];

    // Add base fields based on section
    if (sectionId === "4.1") {
      allSectionFields.push(
        `${sectionPrefix}.available`,
        `${sectionPrefix}.file`,
        `${sectionPrefix}.comment`
      );
    } else if (sectionId === "4.2") {
      allSectionFields.push(
        `${sectionPrefix}.adopted`,
        `${sectionPrefix}.comment`
      );
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "projects" in sectionData &&
        Array.isArray((sectionData as any).projects)
      ) {
        (sectionData as any).projects.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.projects.${index}.projectName`,
            `${sectionPrefix}.projects.${index}.sector`,
            `${sectionPrefix}.projects.${index}.file`
          );
        });
      }
    } else if (sectionId === "4.3") {
      allSectionFields.push(
        `${sectionPrefix}.adopted`,
        `${sectionPrefix}.file`,
        `${sectionPrefix}.comment`
      );
    } else if (sectionId === "4.4") {
      allSectionFields.push(
        `${sectionPrefix}.implemented`,
        `${sectionPrefix}.comment`
      );
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "practices" in sectionData &&
        Array.isArray((sectionData as any).practices)
      ) {
        (sectionData as any).practices.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.practices.${index}.practiceName`,
            `${sectionPrefix}.practices.${index}.impact`,
            `${sectionPrefix}.practices.${index}.file`
          );
        });
      }
    } else if (sectionId === "4.5") {
      allSectionFields.push(
        `${sectionPrefix}.participated`,
        `${sectionPrefix}.comment`
      );
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "capacityArray" in sectionData &&
        Array.isArray((sectionData as any).capacityArray)
      ) {
        (sectionData as any).capacityArray.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.capacityArray.${index}.officerName`,
            `${sectionPrefix}.capacityArray.${index}.designation`,
            `${sectionPrefix}.capacityArray.${index}.programName`,
            `${sectionPrefix}.capacityArray.${index}.organiser`,
            `${sectionPrefix}.capacityArray.${index}.trainingType`,
            `${sectionPrefix}.capacityArray.${index}.trainingPeriod`
          );
        });
      }
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
      `[InfraEnablersReview] Validation errors for section ${sectionId}:`,
      sectionErrors
    );
  };

  // Handle cancel - restore original state
  const handleCancel = async (sectionId: string) => {
    console.log(
      `[InfraEnablersReview] handleCancel called for section ${sectionId}`,
      {
        hasSnapshot: !!originalFormDataSnapshot,
        hasFormData: !!formData,
      }
    );

    if (originalFormDataSnapshot) {
      isRestoringRef.current = true;
      // Create a fresh deep copy to ensure React detects the change
      const restoredState = JSON.parse(
        JSON.stringify(originalFormDataSnapshot)
      );
      // Normalize trainingPeriod in capacityArray
      if (restoredState?.section4_5?.capacityArray) {
        restoredState.section4_5.capacityArray =
          restoredState.section4_5.capacityArray.map((item: any) => ({
            ...item,
            trainingPeriod: item.trainingPeriod || "",
          }));
      }
      console.log(
        `[InfraEnablersReview] Restoring from snapshot for ${sectionId}:`,
        restoredState
      );
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

      // Close and reset "Add Project" form for section 4.3
      // Close and reset "Add Project" form for section 4.2
      if (sectionId === "4.2") {
        setShowAddProjectForm(false);
        setNewProject({
          projectName: "",
          sector: "",
          statusOfProject: "",
          file: null,
          noDocumentAvailable: false,
        });
      }

      // Close and reset "Add Practice" form for section 4.4
      if (sectionId === "4.4") {
        setShowAddPracticeForm(false);
        setNewPractice({
          practiceName: "",
          impact: "",
          file: null,
        });
      }

      // Close and reset "Add Capacity Entry" form for section 4.5
      if (sectionId === "4.5") {
        setShowAddCapacityForm(false);
        setNewCapacityEntry({
          officerName: "",
          designation: "",
          programName: "",
          organiser: "",
          trainingType: "",
          trainingPeriod: "",
        });
      }

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
          console.log(
            `[InfraEnablersReview] No snapshot found, fetching fresh data for ${sectionId}`
          );
          const freshSubmission = await apiService.getSubmission(submissionId);
          if (freshSubmission && (freshSubmission as any).formData) {
            const freshFormData = (freshSubmission as any).formData;
            if (freshFormData.infraEnablers) {
              // Create a fresh deep copy to ensure React detects the change
              const restoredState = JSON.parse(
                JSON.stringify(freshFormData.infraEnablers)
              );
              // Normalize trainingPeriod in capacityArray
              if (restoredState?.section4_5?.capacityArray) {
                restoredState.section4_5.capacityArray =
                  restoredState.section4_5.capacityArray.map((item: any) => ({
                    ...item,
                    trainingPeriod: item.trainingPeriod || "",
                  }));
              }
              console.log(
                `[InfraEnablersReview] Restored from fresh server data for ${sectionId}:`,
                restoredState
              );
              setFormDataState(restoredState);
            } else if (formData) {
              // Fallback to formData prop if server fetch doesn't have the data
              const rawData = (formData as any)?.infraEnablers || formData;
              const restoredState = JSON.parse(JSON.stringify(rawData));
              // Normalize trainingPeriod in capacityArray
              if (restoredState?.section4_5?.capacityArray) {
                restoredState.section4_5.capacityArray =
                  restoredState.section4_5.capacityArray.map((item: any) => ({
                    ...item,
                    trainingPeriod: item.trainingPeriod || "",
                  }));
              }
              console.log(
                `[InfraEnablersReview] Restored from formData prop for ${sectionId}:`,
                restoredState
              );
              setFormDataState(restoredState);
            }
          } else if (formData) {
            // Fallback to formData prop if server fetch doesn't have the data
            const rawData = (formData as any)?.infraEnablers || formData;
            const restoredState = JSON.parse(JSON.stringify(rawData));
            setFormDataState(restoredState);
          }
        } catch (error) {
          console.error(
            `[InfraEnablersReview] Error fetching fresh data for ${sectionId}:`,
            error
          );
          // Fallback to formData prop if fetch fails
          if (formData) {
            const rawData = (formData as any)?.infraEnablers || formData;
            const restoredState = JSON.parse(JSON.stringify(rawData));
            setFormDataState(restoredState);
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
      // Still close forms even if no snapshot exists
      // Close and reset "Add Project" form for section 4.2
      if (sectionId === "4.2") {
        setShowAddProjectForm(false);
        setNewProject({
          projectName: "",
          sector: "",
          statusOfProject: "",
          file: null,
          noDocumentAvailable: false,
        });
      }
      // Close and reset "Add Practice" form for section 4.4
      if (sectionId === "4.4") {
        setShowAddPracticeForm(false);
        setNewPractice({
          practiceName: "",
          impact: "",
          file: null,
        });
      }
      if (sectionId === "4.4") {
        setShowAddCapacityForm(false);
        setNewCapacityEntry({
          officerName: "",
          designation: "",
          programName: "",
          organiser: "",
          trainingType: "",
          trainingPeriod: "",
        });
      }
      // Reset the flag after React has processed the state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isRestoringRef.current = false;
        });
      });
    }
  };

  // Type assertion for formDataState to avoid TypeScript errors
  const state = formDataState as any;

  // Sync formDataState when formData prop changes (but not when restoring from cancel)
  // This ensures we always have the latest data when navigating between categories
  useEffect(() => {
    if (formData && !isRestoringRef.current) {
      const newFormData = (formData as any)?.infraEnablers || formData;

      // Deep comparison to detect if formData has actually changed
      setFormDataState((prev: any) => {
        const prevStr = JSON.stringify(prev);
        const newStr = JSON.stringify(newFormData);

        // If formData is different, it means parent component has refreshed with new data
        if (prevStr !== newStr) {
          console.log(
            "🔄 [InfraEnablersReview] formData prop changed, syncing local state with latest data"
          );
          return newFormData;
        }

        // If formData hasn't changed, keep previous state (may have local edits)
        return prev;
      });

      // Also sync submissionData
      setSubmissionData((prev: any) => {
        if (!prev) return newFormData;
        const prevStr = JSON.stringify(prev);
        const newStr = JSON.stringify(newFormData);
        if (prevStr !== newStr) {
          return newFormData;
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
              setFormDataState(freshSubmission.formData.infraEnablers);
            }

            console.log("✅ Fresh submission data loaded:", freshSubmission);
          }
        } catch (error) {
          console.error("❌ Failed to refresh submission data:", error);
        }
      }
    };

    const handleSubmissionUpdate = async (event: CustomEvent) => {
      const { submissionId: eventSubmissionId, indicatorScore } =
        event.detail || {};
      if (eventSubmissionId === submissionId) {
        // Add a small delay to ensure backend has processed the update
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Refresh complete submission data to get updated indicator scores
        try {
          console.log(
            "🔄 Refreshing submission data after indicator update..."
          );
          const freshSubmission = await apiService.getSubmission(submissionId);

          if (freshSubmission) {
            // Update submission state with fresh data (includes indicatorScores)
            setSubmissionState(freshSubmission);

            // Update form data with fresh data (only this section's slice)
            if (freshSubmission.formData?.infraEnablers) {
              setFormDataState(freshSubmission.formData.infraEnablers);
            }

            console.log(
              "✅ Fresh submission data loaded with updated indicator scores:",
              freshSubmission
            );
          }
        } catch (error) {
          console.error(
            "❌ Failed to refresh submission data after update:",
            error
          );
        }
      }
    };

    window.addEventListener(
      "niri-comment-updated",
      handleCommentUpdate as EventListener
    );

    window.addEventListener(
      "niri-submission-updated",
      handleSubmissionUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-comment-updated",
        handleCommentUpdate as EventListener
      );
      window.removeEventListener(
        "niri-submission-updated",
        handleSubmissionUpdate as EventListener
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
    const allPossibleSections = [
      "section4_1",
      "section4_2",
      "section4_3",
      "section4_4",
      "section4_5",
      "section4_6",
    ];
    allPossibleSections.forEach((sectionKey) => {
      // Skip if already marked as submitted
      if (initiallySubmittedSections.current.has(sectionKey)) {
        return;
      }

      // Check submission.section_status first (most reliable)
      let wasSubmitted = false;
      if (
        submission?.section_status &&
        typeof submission.section_status === "object"
      ) {
        const sectionStatus = (submission.section_status as any)[sectionKey];
        if (
          sectionStatus &&
          sectionStatus !== "NOT_STARTED" &&
          sectionStatus !== null &&
          sectionStatus !== undefined
        ) {
          wasSubmitted = true;
        }
      }

      // Also check if section exists in formData
      if (!wasSubmitted && formData && typeof formData === "object") {
        const infraEnab = (formData as any).infraEnablers;
        if (
          infraEnab &&
          typeof infraEnab === "object" &&
          infraEnab[sectionKey] !== undefined &&
          infraEnab[sectionKey] !== null
        ) {
          wasSubmitted = true;
        }
      }

      if (wasSubmitted) {
        initiallySubmittedSections.current.add(sectionKey);
        console.log(`[InfraEnablersReview] Marking ${sectionKey} as submitted`);
      }
    });
    console.log(
      `[InfraEnablersReview] Submitted sections set:`,
      Array.from(initiallySubmittedSections.current)
    );
  }, [formData, submission]); // Run when formData or submission changes

  // Helper function to check if a section was previously submitted/saved
  // Uses initiallySubmittedSections ref (set on mount) as the source of truth
  // Also checks current submission.section_status as a fallback
  const wasSectionPreviouslySubmitted = useCallback(
    (sectionKey: string): boolean => {
      // PRIORITY 1: Check if section was marked as initially submitted on mount
      if (initiallySubmittedSections.current.has(sectionKey)) {
        return true;
      }

      // PRIORITY 2: Check submission.section_status - this is also reliable
      if (
        submission?.section_status &&
        typeof submission.section_status === "object"
      ) {
        const sectionStatus = (submission.section_status as any)[sectionKey];
        if (
          sectionStatus &&
          sectionStatus !== "NOT_STARTED" &&
          sectionStatus !== null &&
          sectionStatus !== undefined
        ) {
          return true;
        }
      }

      // PRIORITY 3: Check original formData prop (from backend) - fallback check
      const infraEnabFromFormData =
        formData &&
        typeof formData === "object" &&
        (formData as any).infraEnablers
          ? (formData as any).infraEnablers
          : null;

      const inFormData =
        infraEnabFromFormData &&
        typeof infraEnabFromFormData === "object" &&
        (infraEnabFromFormData as any)[sectionKey] !== undefined &&
        (infraEnabFromFormData as any)[sectionKey] !== null;

      return inFormData;
    },
    [formData, submission]
  );

  // Check if this section has any data
  const hasData = hasInfraEnablersData({ infraEnablers: state });
  let sectionsWithData = getSectionsWithData(
    { infraEnablers: state },
    "infraEnablers"
  );

  // ALWAYS include sections that were previously submitted, even if they have no data now
  // This ensures submitted indicators never disappear from the UI
  const allPossibleSections = [
    "section4_1",
    "section4_2",
    "section4_3",
    "section4_4",
    "section4_5",
    "section4_6",
  ];
  const previouslySubmittedSections = allPossibleSections.filter(
    (sectionKey) => {
      return wasSectionPreviouslySubmitted(sectionKey);
    }
  );

  // Merge previously submitted sections with sectionsWithData
  sectionsWithData = Array.from(
    new Set([...sectionsWithData, ...previouslySubmittedSections])
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
    const indicatorToSectionMap: Record<string, string> = {};

    assignedIndicators.forEach((indicator) => {
      const sectionKey = indicatorToSectionMap[indicator];
      if (sectionKey && !sectionsWithData.includes(sectionKey)) {
        assignedSectionKeys.push(sectionKey);
      }
    });

    sectionsWithData = [...sectionsWithData, ...assignedSectionKeys];
  }

  // Helper function to check if a section has meaningful data
  const sectionHasMeaningfulData = (
    sectionKey: string,
    section: any
  ): boolean => {
    if (!section) return false;

    switch (sectionKey) {
      case "section4_1": {
        return (
          (section.available &&
            (section.available === "yes" || section.available === "no")) ||
          (section.file &&
            (section.file.file ||
              section.file.fileName ||
              section.file.filePath)) ||
          (section.comment && section.comment.trim())
        );
      }
      case "section4_2": {
        return (
          (section.adopted &&
            (section.adopted === "yes" || section.adopted === "no")) ||
          (section.comment && section.comment.trim()) ||
          (section.projects &&
            Array.isArray(section.projects) &&
            section.projects.length > 0)
        );
      }
      case "section4_3": {
        return (
          (section.adopted &&
            (section.adopted === "yes" || section.adopted === "no")) ||
          (section.comment && section.comment.trim()) ||
          (section.file &&
            (section.file.file ||
              section.file.fileName ||
              section.file.filePath))
        );
      }
      case "section4_4": {
        return (
          (section.implemented &&
            (section.implemented === "yes" || section.implemented === "no")) ||
          (section.comment && section.comment.trim()) ||
          (section.practices &&
            Array.isArray(section.practices) &&
            section.practices.length > 0)
        );
      }
      case "section4_5": {
        return (
          (section.participated &&
            (section.participated === "yes" ||
              section.participated === "no")) ||
          (section.comment && section.comment.trim()) ||
          (section.capacityArray &&
            Array.isArray(section.capacityArray) &&
            section.capacityArray.length > 0)
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
    const allPossibleSections = ["section4_1"];
    // Map sectionKey to sectionId for edit mode check
    const sectionIdMap: Record<string, string> = {};

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
        if (typeof value === "object") {
          return (
            Object.keys(value).length > 0 && hasSectionData(sectionKey, value)
          );
        }

        return true;
      });
    };

    // Filter sections: only include if they have data OR (for nodal officers) if they're assigned
    // OR sections that are currently in edit mode (to allow adding entries)
    // BUT: Always keep sections that were previously submitted, even if they have no data now
    const existingSections = allPossibleSections.filter((sectionKey) => {
      const section = state[sectionKey];

      // Exclude SAVE_AS_DRAFT indicators from review
      if (section?.status && section.status.toUpperCase() === "SAVE_AS_DRAFT") {
        return false; // Exclude SAVE_AS_DRAFT indicators from review
      }

      const hasData = sectionHasMeaningfulData(sectionKey, section);
      // return hasSectionData(sectionKey, sectionData);

      // Check if section is currently in edit mode
      const sectionId = sectionIdMap[sectionKey];
      const isCurrentlyEditable = sectionId ? isEditable(sectionId) : false;

      // Check if section was previously submitted
      const wasSubmitted = wasSectionPreviouslySubmitted(sectionKey);

      // Keep section visible if it has data OR if it's in edit mode OR if it was previously submitted
      return hasData || isCurrentlyEditable || wasSubmitted;
    });

    // Merge existing sections with sectionsWithData, avoiding duplicates
    sectionsWithData = Array.from(
      new Set([...sectionsWithData, ...existingSections])
    );
  }

  // ALWAYS ensure sections in edit mode are visible, regardless of data or preview mode
  // This prevents sections from disappearing when user deletes all entries in edit mode
  // Reuse allPossibleSections declared earlier
  const sectionIdMap: Record<string, string> = {
    section4_1: "4.1",
    section4_2: "4.2",
    section4_3: "4.3",
    section4_4: "4.4",
    section4_5: "4.5",
    section4_6: "4.6",
  };

  const sectionsInEditMode = allPossibleSections.filter((sectionKey) => {
    const sectionId = sectionIdMap[sectionKey];
    return sectionId ? isEditable(sectionId) : false;
  });

  // Merge sections in edit mode with sectionsWithData
  sectionsWithData = Array.from(
    new Set([...sectionsWithData, ...sectionsInEditMode])
  );

  // Final merge: ensure previously submitted sections are always included
  // This ensures submitted indicators never disappear, even after canceling edit or deleting entries
  // Reuse allPossibleSections declared earlier
  const previouslySubmittedSectionsFinal = allPossibleSections.filter(
    (sectionKey) => {
      return wasSectionPreviouslySubmitted(sectionKey);
    }
  );
  sectionsWithData = Array.from(
    new Set([...sectionsWithData, ...previouslySubmittedSectionsFinal])
  );

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
      "4.1": "4.1 - Availability & Use of State/UT PMG",
      "4.2": "4.2 - Adoption of PM GatiShakti",
      "4.3": "4.3 - Adoption of ADR",
      "4.4": "4.4 - Innovative Practices",
      "4.5": "4.5 - Capacity Building - Officer Participation",
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

    console.log(`[InfraEnablersReview] onSaveSection - Status check:`, {
      sectionKey,
      sectionData,
      currentStatus,
      upperStatus,
      isReverted,
      formDataStateKeys: formDataState ? Object.keys(formDataState) : [],
    });

    // If NODAL_OFFICER, ALWAYS run validation FIRST before showing dialog
    // This ensures validation errors are shown on UI instead of alerts
    if (isNodalOfficer) {
      console.log(
        `[InfraEnablersReview] ✅ Running validation before showing dialog for NODAL_OFFICER`
      );

      // Run validation first (same logic as in performSave)
      // Build full form data for validation (include all sections)
      const fullData = {
        section4_1: formDataState?.section4_1 || {
          available: "",
          file: null,
          comment: "",
        },
        section4_2: formDataState?.section4_2 || {
          adopted: "",
          file: null,
          projects: [],
          comment: "",
        },
        section4_3: formDataState?.section4_3 || {
          adopted: "",
          file: null,
          comment: "",
        },
        section4_4: formDataState?.section4_4 || {
          implemented: "",
          practices: [],
          comment: "",
        },
        section4_5: formDataState?.section4_5 || {
          participated: "",
          capacityArray: [],
          comment: "",
        },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

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

      // If validation fails, show errors on UI and return (don't show dialog)
      if (Object.keys(sectionErrors).length > 0) {
        // Mark all fields in this section as touched so ALL errors show
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData =
          formDataState?.[sectionKey as keyof typeof formDataState];

        // Get all possible field paths for this section
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "4.1") {
          allSectionFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "4.2") {
          allSectionFields.push(
            `${sectionPrefix}.adopted`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "projects" in sectionData &&
            Array.isArray((sectionData as any).projects)
          ) {
            (sectionData as any).projects.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.projects.${index}.projectName`,
                `${sectionPrefix}.projects.${index}.sector`,
                `${sectionPrefix}.projects.${index}.file`
              );
            });
          }
        } else if (sectionId === "4.3") {
          allSectionFields.push(
            `${sectionPrefix}.adopted`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "4.4") {
          allSectionFields.push(
            `${sectionPrefix}.implemented`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "practices" in sectionData &&
            Array.isArray((sectionData as any).practices)
          ) {
            (sectionData as any).practices.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.practices.${index}.practiceName`,
                `${sectionPrefix}.practices.${index}.impact`,
                `${sectionPrefix}.practices.${index}.file`
              );
            });
          }
        } else if (sectionId === "4.5") {
          allSectionFields.push(
            `${sectionPrefix}.participated`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "capacityArray" in sectionData &&
            Array.isArray((sectionData as any).capacityArray)
          ) {
            (sectionData as any).capacityArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.capacityArray.${index}.officerName`,
                  `${sectionPrefix}.capacityArray.${index}.designation`,
                  `${sectionPrefix}.capacityArray.${index}.programName`,
                  `${sectionPrefix}.capacityArray.${index}.organiser`,
                  `${sectionPrefix}.capacityArray.${index}.trainingType`
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
          `[InfraEnablersReview] ✅ Validation passed - showing save confirmation dialog for REVERTED indicator`
        );
        setPendingSaveSectionId(sectionId);
        setShowSaveDialog(true);
        return;
      } else {
        // If not REVERTED, proceed with direct save
        console.log(
          `[InfraEnablersReview] ✅ Validation passed - proceeding with direct save (not REVERTED)`
        );
        await performSave(sectionId);
        return;
      }
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
          console.log("Section_4_1 state", formDataState?.section4_1);
          fields = [
            {
              available: formDataState?.section4_1?.available ?? null,
              file: formDataState?.section4_1?.file ?? null,
              comment: formDataState?.section4_1?.comment ?? null,
              noDocumentAvailable:
                formDataState?.section4_1?.noDocumentAvailable ?? false,
            },
          ];
          break;

        case "4.2": {
          // Use local state for section 4.2 data
          const files4_2 = (
            formDataState?.section4_2?.file
              ? [formDataState.section4_2.file]
              : []
          ).map((file: any) => ({
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

          const projects4_2 = (formDataState?.section4_2?.projects || []).map(
            (project: any) => ({
              id: project.id,
              projectName: project.projectName ?? null,
              sector: project.sector ?? null,
              statusOfProject: project.statusOfProject ?? null,
              file: project.file ?? null,
              noDocumentAvailable: project.noDocumentAvailable ?? false,
            })
          );

          fields = [
            {
              adopted: formDataState?.section4_2?.adopted ?? null,
              files: files4_2,
              projects: projects4_2,
              comment: formDataState?.section4_2?.comment ?? null,
            },
          ];
          break;
        }

        case "4.3": {
          // Use local state for section 4.3 data (Adoption of ADR)
          const files4_3 = (
            formDataState?.section4_3?.file
              ? [formDataState.section4_3.file]
              : []
          ).map((file: any) => ({
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
              adopted: formDataState?.section4_3?.adopted ?? null,
              file: files4_3.length > 0 ? files4_3[0] : null,
              comment: formDataState?.section4_3?.comment ?? null,
              noDocumentAvailable:
                formDataState?.section4_3?.noDocumentAvailable ?? false,
            },
          ];
          break;
        }

        case "4.4": {
          // Use local state for section 4.4 data
          const practices4_4 = (formDataState?.section4_4?.practices || []).map(
            (practice: any) => ({
              id: practice.id,
              practiceName: practice.practiceName ?? null,
              impact: practice.impact ?? null,
              file: practice.file ?? null,
              noDocumentAvailable: practice.noDocumentAvailable ?? false,
            })
          );
          fields = [
            {
              implemented: formDataState?.section4_4?.implemented ?? null,
              practices: practices4_4,
              comment: formDataState?.section4_4?.comment ?? null,
            },
          ];
          break;
        }

        case "4.5": {
          // Use local state for section 4.5 data
          const capacityArray4_5 = (
            formDataState?.section4_5?.capacityArray || []
          ).map((item: any) => ({
            id: item.id,
            officerName: item?.officerName ?? null,
            designation: item?.designation ?? null,
            programName: item?.programName ?? null,
            trainingType: item?.trainingType ?? null,
            organiser: item?.organiser ?? null,
            trainingPeriod: item?.trainingPeriod ?? null,
          }));
          fields = [
            {
              participated: formDataState?.section4_5?.participated ?? null,
              capacityArray: capacityArray4_5,
              comment: formDataState?.section4_5?.comment ?? null,
            },
          ];
          break;
        }

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          fields = [];
          break;
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
        section4_1: formDataState?.section4_1 || {
          available: "",
          file: null,
          comment: "",
        },
        section4_2: formDataState?.section4_2 || {
          adopted: "",
          file: null,
          projects: [],
          comment: "",
        },
        section4_3: formDataState?.section4_3 || {
          adopted: "",
          file: null,
          comment: "",
        },
        section4_4: formDataState?.section4_4 || {
          implemented: "",
          practices: [],
          comment: "",
        },
        section4_5: formDataState?.section4_5 || {
          participated: "",
          capacityArray: [],
          comment: "",
        },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

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
        // Mark all fields in this section as touched so ALL errors show
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData =
          formDataState?.[sectionKey as keyof typeof formDataState];

        // Get all possible field paths for this section
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "4.1") {
          allSectionFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "4.2") {
          allSectionFields.push(
            `${sectionPrefix}.adopted`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "projects" in sectionData &&
            Array.isArray((sectionData as any).projects)
          ) {
            (sectionData as any).projects.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.projects.${index}.projectName`,
                `${sectionPrefix}.projects.${index}.sector`,
                `${sectionPrefix}.projects.${index}.file`
              );
            });
          }
        } else if (sectionId === "4.3") {
          allSectionFields.push(
            `${sectionPrefix}.adopted`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "4.4") {
          allSectionFields.push(
            `${sectionPrefix}.implemented`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "practices" in sectionData &&
            Array.isArray((sectionData as any).practices)
          ) {
            (sectionData as any).practices.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.practices.${index}.practiceName`,
                `${sectionPrefix}.practices.${index}.impact`,
                `${sectionPrefix}.practices.${index}.file`
              );
            });
          }
        } else if (sectionId === "4.5") {
          allSectionFields.push(
            `${sectionPrefix}.participated`,
            `${sectionPrefix}.comment`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "capacityArray" in sectionData &&
            Array.isArray((sectionData as any).capacityArray)
          ) {
            (sectionData as any).capacityArray.forEach(
              (_: any, index: number) => {
                allSectionFields.push(
                  `${sectionPrefix}.capacityArray.${index}.officerName`,
                  `${sectionPrefix}.capacityArray.${index}.designation`,
                  `${sectionPrefix}.capacityArray.${index}.programName`,
                  `${sectionPrefix}.capacityArray.${index}.organiser`,
                  `${sectionPrefix}.capacityArray.${index}.trainingType`
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
      }

      // Clear errors for this section only (validation passed)
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

      // Update submission state directly from saveResult if it contains indicatorScore
      if (saveResult?.indicatorScore) {
        console.log(
          `[InfraEnablersReview] 📊 Indicator score received in saveResult:`,
          saveResult.indicatorScore
        );
        // Update submission state with the score from the response
        setSubmissionState((prev: any) => {
          if (!prev) return prev;
          const updated = { ...prev };
          // Update or add indicatorScore to the submission
          if (!updated.indicatorScores) {
            updated.indicatorScores = [];
          }
          // Find and update existing score or add new one
          const existingIndex = updated.indicatorScores.findIndex(
            (score: any) =>
              score.indicatorCode === saveResult.indicatorScore.indicatorCode
          );
          if (existingIndex >= 0) {
            updated.indicatorScores[existingIndex] = saveResult.indicatorScore;
          } else {
            updated.indicatorScores.push(saveResult.indicatorScore);
          }
          return updated;
        });
      }

      // Refresh data from server after successful save to ensure UI shows latest data
      // Add a small delay to ensure backend has processed the update
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        console.log(
          `[InfraEnablersReview] 🔄 Refreshing data after save for section ${sectionId}...`
        );
        const freshSubmission = await apiService.getSubmission(submissionId);

        if (freshSubmission?.formData?.infraEnablers) {
          // Normalize the data to ensure mutual exclusivity between file and noDocumentAvailable
          const normalizedData = normalizeFormData(
            freshSubmission.formData.infraEnablers
          );
          setFormDataState(normalizedData);
          setSubmissionState(freshSubmission);
          console.log(
            `[InfraEnablersReview] ✅ Data refreshed after save for section ${sectionId}`
          );
        }
      } catch (refreshError) {
        console.error(
          `[InfraEnablersReview] ⚠️ Failed to refresh data after save (non-critical):`,
          refreshError
        );
        // Don't throw - save was successful, just refresh failed
      }

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
      } catch (error: any) {
        console.error(`[InfraEnablersReview] ❌ Save failed:`, error);
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
    const isStateApprover = userRole === "STATE_APPROVER";

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

    // If STATE_APPROVER is sending back (status = false), extract nodalOfficerId from section data
    if (isStateApprover && !status) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (state && state[sectionKey]) || (formData && formData[sectionKey]);

      const nodalOfficerId = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.nodalOfficerId
          : sectionData?.nodalOfficerId
        : undefined;

      if (nodalOfficerId) {
        payload.nodalOfficerId = nodalOfficerId;
        console.log(
          `📤 [InfraEnablersReview] Sending back indicator ${sectionId} to NODAL_OFFICER: ${nodalOfficerId}`
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

    // All sections use 'file' (singular) for single file uploads
    // Sections 4.2 and 4.4 are single file uploads, same as 3.1
    const targetKey = "file";

    // Normalize to single file (take first if array, or the value itself)
    const normalizedValue =
      Array.isArray(updatedValue) && updatedValue.length > 0
        ? updatedValue[0]
        : Array.isArray(updatedValue)
        ? null
        : updatedValue;

    // Check if there's actually a file (not just a truthy value)
    const hasFile =
      normalizedValue !== null &&
      normalizedValue !== undefined &&
      (normalizedValue.file ||
        normalizedValue.fileName ||
        normalizedValue.filePath ||
        normalizedValue.fileUrl);

    const updatedSection = {
      ...previousSection,
      [targetKey]: normalizedValue,
      // Keep 'files' array for backward compatibility with save logic
      ...(normalizedValue ? { files: [normalizedValue] } : { files: [] }),
      // Clear noDocumentAvailable when file is uploaded (for sections 4.1 and 4.3)
      ...(hasFile && (sectionId === "4.1" || sectionId === "4.3")
        ? { noDocumentAvailable: false }
        : {}),
    };

    // Update local state only - save will happen when user clicks Save button
    // Files are stored as File objects and will be uploaded to S3 on Save
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Removed auto-save - files are stored as File objects and will be uploaded
    // when user clicks Save button (via updateSubmission → uploadFilesAndReplace)
  };

  // Helper functions to handle field updates
  const handleFieldUpdate = (
    sectionId: string,
    fieldName: string,
    value: any
  ) => {
    setFormDataState((prev: any) => {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const currentSection = prev?.[sectionKey] || {};

      // When switching from "yes" to "no", clear related fields
      let clearedFields: any = {};

      if (value === "no") {
        switch (sectionId) {
          case "4.1":
            if (fieldName === "allEligible") {
              clearedFields = {
                websiteLink: "",
                file: null,
                files: [],
                comment: "",
              };
            }
            break;
          case "4.2":
            if (fieldName === "available") {
              clearedFields = { file: null, files: [], comment: "" };
            }
            break;
          case "4.3":
            if (fieldName === "adopted") {
              // Clear projects array (which may contain files)
              clearedFields = {
                projects: [],
                file: null,
                files: [],
                comment: "",
              };
            }
            break;
          case "4.4":
            if (fieldName === "adopted") {
              clearedFields = { file: null, files: [], comment: "" };
            }
            break;
          case "4.5":
            if (fieldName === "implemented") {
              // Clear practices array (which may contain files)
              clearedFields = {
                practices: [],
                file: null,
                files: [],
                comment: "",
              };
            }
            break;
          case "4.6":
            if (fieldName === "participated") {
              // Clear capacityArray (which may contain files)
              clearedFields = { capacityArray: [], comment: "" };
            }
            break;
        }
        console.log(
          `[InfraEnablersReview] Clearing fields for ${sectionId}.${fieldName}:`,
          clearedFields
        );
      }

      return {
        ...prev,
        [sectionKey]: {
          ...currentSection,
          [fieldName]: value,
          ...clearedFields,
        },
      };
    });
  };

  // Handle adding new project to section 4.2
  const handleAddNewProject = () => {
    setFormDataState((prev: any) => {
      const newProjectWithId = {
        ...newProject,
        id: `project-${Date.now()}`,
      };
      const current = prev?.section4_2?.projects || [];
      return {
        ...prev,
        section4_2: {
          ...prev?.section4_2,
          projects: [...current, newProjectWithId],
        },
      };
    });
    // Reset form
    setNewProject({
      projectName: "",
      sector: "",
      statusOfProject: "",
      file: null,
      noDocumentAvailable: false,
    });
    setShowAddProjectForm(false);
  };

  // Handle cancel adding new project
  const handleCancelAddProject = () => {
    setNewProject({
      projectName: "",
      sector: "",
      statusOfProject: "",
      file: null,
      noDocumentAvailable: false,
    });
    setShowAddProjectForm(false);
  };

  // Handle updating project fields in section 4.2
  const handleProjectFieldUpdate = (
    index: number,
    fieldName: string,
    value: any
  ) => {
    setFormDataState((prev: any) => {
      const projects = prev?.section4_2?.projects || [];
      const updatedProjects = [...projects];
      updatedProjects[index] = {
        ...updatedProjects[index],
        [fieldName]: value,
      };
      return {
        ...prev,
        section4_2: {
          ...prev?.section4_2,
          projects: updatedProjects,
        },
      };
    });
  };

  // Handle removing project from section 4.2
  const handleRemoveProject = (idOrIndex: string | number) => {
    setFormDataState((prev: any) => {
      const currentSection = prev?.section4_2 || {};
      const currentProjects = currentSection.projects || [];
      const projects = currentProjects.filter((project: any, index: number) => {
        // If idOrIndex is a number or starts with "item-", it's an index-based delete
        const isIndexBased =
          typeof idOrIndex === "number" ||
          String(idOrIndex).startsWith("item-");
        if (isIndexBased) {
          const targetIndex =
            typeof idOrIndex === "number"
              ? idOrIndex
              : parseInt(String(idOrIndex).replace("item-", ""), 10);
          return index !== targetIndex;
        } else {
          return project.id !== idOrIndex;
        }
      });
      return {
        ...prev,
        section4_2: {
          ...currentSection,
          projects,
          // Preserve status if it exists
          ...(currentSection.status ? { status: currentSection.status } : {}),
        },
      };
    });
  };

  // Handle updating project file in section 4.2
  const handleProjectFileUpdate = (
    index: number,
    updatedFile: FileUpload | null
  ) => {
    setFormDataState((prev: any) => {
      const projects = prev?.section4_2?.projects || [];
      const updatedProjects = [...projects];
      updatedProjects[index] = {
        ...updatedProjects[index],
        file: updatedFile,
      };
      return {
        ...prev,
        section4_2: {
          ...prev?.section4_2,
          projects: updatedProjects,
        },
      };
    });
  };

  // Handle adding new practice to section 4.4
  const handleAddNewPractice = () => {
    setFormDataState((prev: any) => {
      const newPracticeWithId = {
        ...newPractice,
        id: `practice-${Date.now()}`,
      };
      const current = prev?.section4_4?.practices || [];
      return {
        ...prev,
        section4_4: {
          ...prev?.section4_4,
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

  // Handle updating practice fields in section 4.4
  const handlePracticeFieldUpdate = (
    index: number,
    fieldName: string,
    value: any
  ) => {
    setFormDataState((prev: any) => {
      const practices = prev?.section4_4?.practices || [];
      const updatedPractices = [...practices];
      updatedPractices[index] = {
        ...updatedPractices[index],
        [fieldName]: value,
      };
      return {
        ...prev,
        section4_4: {
          ...prev?.section4_4,
          practices: updatedPractices,
        },
      };
    });
  };

  // Handle updating practice file in section 4.4
  const handlePracticeFileUpdate = (
    index: number,
    updatedFile: FileUpload | null
  ) => {
    setFormDataState((prev: any) => {
      const practices = prev?.section4_4?.practices || [];
      const updatedPractices = [...practices];
      updatedPractices[index] = {
        ...updatedPractices[index],
        file: updatedFile,
      };
      return {
        ...prev,
        section4_4: {
          ...prev?.section4_4,
          practices: updatedPractices,
        },
      };
    });
  };

  // Handle removing practice from section 4.4
  const handleRemovePractice = (idOrIndex: string | number) => {
    setFormDataState((prev: any) => {
      const currentSection = prev?.section4_4 || {};
      const currentPractices = currentSection.practices || [];
      const practices = currentPractices.filter(
        (practice: any, index: number) => {
          // If idOrIndex is a number or starts with "item-", it's an index-based delete
          const isIndexBased =
            typeof idOrIndex === "number" ||
            String(idOrIndex).startsWith("item-");
          if (isIndexBased) {
            const targetIndex =
              typeof idOrIndex === "number"
                ? idOrIndex
                : parseInt(String(idOrIndex).replace("item-", ""), 10);
            return index !== targetIndex;
          } else {
            return practice.id !== idOrIndex;
          }
        }
      );
      return {
        ...prev,
        section4_4: {
          ...currentSection,
          practices,
          // Preserve status if it exists
          ...(currentSection.status ? { status: currentSection.status } : {}),
        },
      };
    });
  };

  // Handle removing capacity entry from section 4.5
  const handleRemoveCapacityEntry = (idOrIndex: string | number) => {
    setFormDataState((prev: any) => {
      const currentSection = prev?.section4_5 || {};
      const current = currentSection.capacityArray || [];
      const rows = Array.isArray(current)
        ? current.filter((item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased =
              typeof idOrIndex === "number" ||
              String(idOrIndex).startsWith("item-");
            if (isIndexBased) {
              const targetIndex =
                typeof idOrIndex === "number"
                  ? idOrIndex
                  : parseInt(String(idOrIndex).replace("item-", ""), 10);
              return index !== targetIndex;
            } else {
              return item.id !== idOrIndex;
            }
          })
        : [];
      return {
        ...prev,
        section4_5: {
          ...currentSection,
          capacityArray: rows,
          // Preserve status if it exists
          ...(currentSection.status ? { status: currentSection.status } : {}),
        },
      };
    });
  };

  // Helper to update table row items for section 4.5
  const handleTableFieldUpdate = (
    rowIndex: number,
    fieldName: string,
    value: any
  ) => {
    setFormDataState((prev: any) => {
      const currentSection = prev?.section4_5 || {};
      const current = currentSection.capacityArray || [];
      const rows = Array.isArray(current) ? [...current] : [];
      const currentRow = { ...(rows[rowIndex] || {}) };
      currentRow[fieldName] = value;
      rows[rowIndex] = currentRow;
      return {
        ...prev,
        section4_5: {
          ...currentSection,
          capacityArray: rows,
        },
      };
    });
  };

  // Handle adding new capacity building entry to section 4.5
  const handleAddNewCapacityEntry = () => {
    setFormDataState((prev: any) => {
      const newEntryWithId = {
        ...newCapacityEntry,
        id: `capacity-${Date.now()}`,
      };
      const current = prev?.section4_5?.capacityArray || [];
      return {
        ...prev,
        section4_5: {
          ...prev?.section4_5,
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
      trainingPeriod: "",
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
      trainingPeriod: "",
    });
    setShowAddCapacityForm(false);
  };

  // Clear all officers function for review component
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);

  const handleClearAll = () => {
    setFormDataState((prev: any) => ({
      ...prev,
      section4_5: {
        ...prev?.section4_5,
        capacityArray: [],
      },
    }));
    setShowClearAllDialog(false);
    toast({
      title: "All entries cleared",
      description: "All officer entries have been removed.",
    });
  };

  // Excel upload handlers for Section 4.5
  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validExtensions = [".xlsx", ".xls"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = "";
      }
      return;
    }

    setIsUploadingExcel(true);
    try {
      const result = await parseCapacityBuildingExcel(file);

      if (!result.success || !result.data) {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to parse Excel file",
          variant: "destructive",
        });
        return;
      }

      if (result.data.length === 0) {
        toast({
          title: "No data found",
          description: "The Excel file does not contain valid data rows",
          variant: "destructive",
        });
        return;
      }

      // Merge with existing entries (avoid duplicates based on ID)
      setFormDataState((prev: any) => {
        const existingIds = new Set(
          (prev?.section4_5?.capacityArray || []).map((e: any) => e.id)
        );
        const newEntries = result.data!.filter((e) => !existingIds.has(e.id));

        return {
          ...prev,
          section4_5: {
            ...prev?.section4_5,
            capacityArray: [
              ...(prev?.section4_5?.capacityArray || []),
              ...newEntries,
            ],
          },
        };
      });

      toast({
        title: "Upload successful",
        description: `Successfully imported ${result.data.length} officer ${
          result.data.length === 1 ? "entry" : "entries"
        }.${
          result.warnings && result.warnings.length > 0
            ? ` ${result.warnings.length} row(s) were skipped due to missing data.`
            : ""
        }`,
      });

      if (result.warnings && result.warnings.length > 0) {
        console.warn("Excel upload warnings:", result.warnings);
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description:
          error.message || "An error occurred while processing the Excel file",
        variant: "destructive",
      });
    } finally {
      setIsUploadingExcel(false);
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = "";
      }
    }
  };

  const handleDownloadTemplate = () => {
    try {
      generateCapacityBuildingTemplate();
      toast({
        title: "Template downloaded",
        description:
          "Excel template has been downloaded. Please fill it with your data and upload it.",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to generate template",
        variant: "destructive",
      });
    }
  };

  const handleExcelUploadClick = () => {
    if (!shouldBeEditable("4.5")) return;
    excelFileInputRef.current?.click();
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
    const mospiReviewerComments = comments
      ? comments.filter((comment: any) => {
          const commentRole = comment.role || comment.userRole || "";
          return commentRole.toUpperCase() === "MOSPI_REVIEWER";
        })
      : [];

    // Sort by timestamp (newest first) and get the last (most recent) comment
    const sortedComments = mospiReviewerComments.sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA; // Descending order (newest first)
    });
    const lastComment = sortedComments.length > 0 ? sortedComments[0] : null;

    if (!lastComment) return null;

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
        const toggleState = indicatorScoreToggleState[sectionId] || "score";
        return (
          <div className="flex items-center gap-2">
            <IndicatorScoreToggle
              submissionId={submissionId}
              indicatorCode={sectionId}
              controlledToggleState={toggleState}
              mospiStatus={mospiStatus}
              onToggleChange={(newState) => {
                setIndicatorScoreToggleState((prev) => ({
                  ...prev,
                  [sectionId]: newState,
                }));
              }}
              showLabel={false}
              size="sm"
              variant="outline"
            />
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
        const toggleState = indicatorScoreToggleState[sectionId] || "score";
        return (
          <div className="flex items-center gap-2">
            <IndicatorScoreToggle
              submissionId={submissionId}
              indicatorCode={sectionId}
              controlledToggleState={toggleState}
              mospiStatus={mospiStatus}
              onToggleChange={(newState) => {
                setIndicatorScoreToggleState((prev) => ({
                  ...prev,
                  [sectionId]: newState,
                }));
              }}
              showLabel={false}
              size="sm"
              variant="outline"
            />
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
      const toggleState = indicatorScoreToggleState[sectionId] || "score";
      return (
        <div className="flex items-center gap-2">
          <IndicatorScoreToggle
            submissionId={submissionId}
            indicatorCode={sectionId}
            controlledToggleState={toggleState}
            mospiStatus={mospiStatus}
            onToggleChange={(newState) => {
              setIndicatorScoreToggleState((prev) => ({
                ...prev,
                [sectionId]: newState,
              }));
            }}
            showLabel={false}
            size="sm"
            variant="outline"
          />
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

    const toggleState = indicatorScoreToggleState[sectionId] || "score";

    return (
      <div className="flex gap-2">
        {/* Indicator Score Toggle for MOSPI_APPROVER */}
        {isMospiApprover && (
          <IndicatorScoreToggle
            submissionId={submissionId}
            indicatorCode={sectionId}
            toggleState={toggleState}
            onToggleChange={(newState) => {
              setIndicatorScoreToggleState((prev) => ({
                ...prev,
                [sectionId]: newState,
              }));
            }}
            showLabel={false}
            size="sm"
            variant="outline"
          />
        )}

        {/* Show "Returned from Mospi" button for STATE_APPROVER when mospi_status is REVERTED */}
        {isStateApprover &&
          (() => {
            const sectionKey = `section${sectionId.replace(".", "_")}`;
            const sectionData =
              (state && state[sectionKey]) ||
              (formData && formData[sectionKey]);
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
              (state && state[sectionKey]) ||
              (formData && formData[sectionKey]);
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
              `🔍 [InfraEnablersReview] "Send Back" button check for section ${sectionId}`
            );
            console.log("📊 Section data:", {
              sectionKey,
              sectionData: sectionData
                ? Array.isArray(sectionData)
                  ? sectionData[0]
                  : sectionData
                : null,
              mospiStatus,
              hasState: !!state,
              hasFormData: !!formData,
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
  // If no data AND no sections to show (including previously submitted sections), show message
  // IMPORTANT: Check sectionsWithData.length instead of just hasData
  // This ensures previously submitted sections remain visible even if they have no data
  if (!hasData && sectionsWithData.length === 0) {
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
                    <span className="text-primary">4.1 -</span> Availability &
                    Use of State/UT PMG{" "}
                  </span>
                  {renderActionButtons("4.1")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorCode="4.1"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.1")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("4.1")}
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="mb-3 block">
                    Availability & Use of State/UT PMG{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  {shouldBeEditable("4.1") ? (
                    <RadioGroup
                      value={
                        formDataState?.section4_1?.available
                          ? String(
                              formDataState.section4_1.available
                            ).toLowerCase()
                          : ""
                      }
                      onValueChange={(value) =>
                        handleFieldUpdate("4.1", "available", value)
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
                          formDataState?.section4_1?.available === "yes"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formDataState?.section4_1?.available === "yes"
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>
                  )}
                </div>

                {formDataState?.section4_1?.available === "yes" && (
                  <div>
                    {shouldBeEditable("4.1") && (
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="no-doc-4.1"
                          checked={
                            formDataState?.section4_1?.noDocumentAvailable ||
                            false
                          }
                          onCheckedChange={(checked) => {
                            const noDocument = checked as boolean;
                            setFormDataState((prev: any) => ({
                              ...prev,
                              section4_1: {
                                ...prev.section4_1,
                                noDocumentAvailable: noDocument,
                                file: noDocument ? null : prev.section4_1?.file,
                              },
                            }));
                          }}
                        />
                        <label
                          htmlFor="no-doc-4.1"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          No document available
                        </label>
                      </div>
                    )}

                    {formDataState?.section4_1?.noDocumentAvailable &&
                    !(
                      formDataState?.section4_1?.file?.file ||
                      formDataState?.section4_1?.file?.fileName ||
                      formDataState?.section4_1?.file?.filePath
                    ) ? (
                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                        No document available
                      </div>
                    ) : (
                      <>
                        <Label className="mb-2 block">Upload File</Label>
                        <EditableFileDisplay
                          files={formDataState?.section4_1?.file || null}
                          isEditable={shouldBeEditable("4.1")}
                          submissionId={submissionId}
                          onFilesChange={(updatedFiles) =>
                            handleFileUpdate("4.1", updatedFiles)
                          }
                          label="Uploaded File"
                          multiple={false}
                        />
                      </>
                    )}
                  </div>
                )}

                {formDataState?.section4_1?.available === "no" && (
                  <div>
                    <Label className="mb-2 block">Comment</Label>
                    {shouldBeEditable("4.1") ? (
                      <Textarea
                        value={formDataState?.section4_1?.comment || ""}
                        onChange={(e) =>
                          handleFieldUpdate("4.1", "comment", e.target.value)
                        }
                        placeholder="Please provide a comment..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {formDataState?.section4_1?.comment ||
                          "No comment provided"}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Upload documentation of State/UT PMG portal
                </p>
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="4.1"
                    toggleState={indicatorScoreToggleState["4.1"] || "score"}
                  />
                </div>
              )}
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
                    <span className="text-primary">4.2 -</span> Adoption of PM
                    GatiShakti{" "}
                  </span>
                  {renderActionButtons("4.2")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorCode="4.2"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.2")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("4.2")}
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="mb-3 block">
                    Adoption of PM GatiShakti?*
                  </Label>
                  {shouldBeEditable("4.2") ? (
                    <RadioGroup
                      value={
                        formDataState?.section4_2?.adopted
                          ? String(
                              formDataState.section4_2.adopted
                            ).toLowerCase()
                          : ""
                      }
                      onValueChange={(value) =>
                        handleFieldUpdate("4.2", "adopted", value)
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
                          formDataState?.section4_2?.adopted === "yes"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formDataState?.section4_2?.adopted === "yes"
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>
                  )}
                </div>

                {formDataState?.section4_2?.adopted === "yes" && (
                  <div className="space-y-4">
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
                              Status of Project
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-normal">
                              Uploaded File
                            </th>
                            {shouldBeEditable("4.2") && (
                              <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                                Action
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const projects = Array.isArray(
                              formDataState?.section4_2?.projects
                            )
                              ? formDataState.section4_2.projects
                              : [];

                            if (!projects.length) {
                              return (
                                <tr>
                                  <td
                                    colSpan={shouldBeEditable("4.2") ? 5 : 4}
                                    className="py-8 text-center text-muted-foreground"
                                  >
                                    No projects available
                                  </td>
                                </tr>
                              );
                            }

                            return projects.map((project: any, idx: number) => {
                              const extractOriginalName = (
                                fileName: string,
                                originalName?: string
                              ): string => {
                                if (originalName && originalName.trim())
                                  return originalName;

                                const uuidPattern =
                                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

                                if (uuidPattern.test(fileName)) {
                                  const extracted = fileName.replace(
                                    uuidPattern,
                                    ""
                                  );
                                  if (
                                    extracted &&
                                    extracted.trim().length > 0
                                  ) {
                                    return extracted;
                                  }
                                }

                                return fileName;
                              };

                              return (
                                <tr
                                  key={project.id || idx}
                                  className="border-b"
                                >
                                  <td className="py-3 px-4 text-sm font-normal">
                                    {shouldBeEditable("4.2") ? (
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
                                    {shouldBeEditable("4.2") ? (
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
                                          (opt) => ({
                                            label: opt,
                                            value: opt,
                                          })
                                        )}
                                        placeholder="Select sector"
                                      />
                                    ) : (
                                      project.sector || "N/A"
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-sm font-normal">
                                    {shouldBeEditable("4.2") ? (
                                      <Input
                                        type="text"
                                        value={project.statusOfProject || ""}
                                        onChange={(e) =>
                                          handleProjectFieldUpdate(
                                            idx,
                                            "statusOfProject",
                                            e.target.value
                                          )
                                        }
                                        className="w-full"
                                        placeholder="Enter project status"
                                      />
                                    ) : (
                                      project.statusOfProject || "N/A"
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-sm font-normal">
                                    {shouldBeEditable("4.2") ? (
                                      <div className="space-y-1.5">
                                        {/* No Document Available Checkbox */}
                                        <div className="flex items-center space-x-2 py-1">
                                          <Checkbox
                                            id={`no-doc-4.2-${idx}`}
                                            checked={
                                              project.noDocumentAvailable ||
                                              false
                                            }
                                            onCheckedChange={(checked) => {
                                              const noDocument =
                                                checked as boolean;
                                              // Update noDocumentAvailable and clear file if checked
                                              setFormDataState((prev: any) => {
                                                const projects =
                                                  prev?.section4_2?.projects ||
                                                  [];
                                                const updatedProjects =
                                                  projects.map(
                                                    (p: any, index: number) =>
                                                      index === idx
                                                        ? {
                                                            ...p,
                                                            noDocumentAvailable:
                                                              noDocument,
                                                            file: noDocument
                                                              ? null
                                                              : p.file,
                                                          }
                                                        : p
                                                  );
                                                return {
                                                  ...prev,
                                                  section4_2: {
                                                    ...prev.section4_2,
                                                    projects: updatedProjects,
                                                  },
                                                };
                                              });
                                            }}
                                          />
                                          <label
                                            htmlFor={`no-doc-4.2-${idx}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            No document available
                                          </label>
                                        </div>

                                        {project.noDocumentAvailable &&
                                        !(
                                          project.file?.file ||
                                          project.file?.fileName ||
                                          project.file?.filePath ||
                                          project.file?.fileUrl
                                        ) ? (
                                          <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                            No document available
                                          </div>
                                        ) : (
                                          <>
                                            {project.file ? (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                                title={
                                                  extractOriginalName(
                                                    project.file.fileName || "",
                                                    (project.file as any)
                                                      ?.originalName
                                                  ) || "Unknown file"
                                                }
                                              >
                                                <Upload className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">
                                                  {extractOriginalName(
                                                    project.file.fileName || "",
                                                    (project.file as any)
                                                      ?.originalName
                                                  ) || "Unknown file"}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleProjectFileUpdate(
                                                      idx,
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
                                                  const selectedFile =
                                                    e.target.files?.[0];
                                                  if (selectedFile) {
                                                    try {
                                                      const response =
                                                        await apiService.uploadFile(
                                                          submissionId,
                                                          selectedFile
                                                        );
                                                      const fileData =
                                                        response?.data ||
                                                        response;

                                                      const newFile: FileUpload =
                                                        {
                                                          id:
                                                            fileData.id ??
                                                            crypto.randomUUID(),
                                                          file: null,
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
                                                          mimeType:
                                                            fileData.mimeType,
                                                        };

                                                      // Update file and clear noDocumentAvailable
                                                      setFormDataState(
                                                        (prev: any) => {
                                                          const projects =
                                                            prev?.section4_2
                                                              ?.projects || [];
                                                          const updatedProjects =
                                                            projects.map(
                                                              (
                                                                p: any,
                                                                index: number
                                                              ) =>
                                                                index === idx
                                                                  ? {
                                                                      ...p,
                                                                      file: newFile,
                                                                      noDocumentAvailable:
                                                                        false,
                                                                    }
                                                                  : p
                                                            );
                                                          return {
                                                            ...prev,
                                                            section4_2: {
                                                              ...prev.section4_2,
                                                              projects:
                                                                updatedProjects,
                                                            },
                                                          };
                                                        }
                                                      );
                                                      e.target.value = "";
                                                    } catch (error: any) {
                                                      console.error(
                                                        "Failed to upload file:",
                                                        error
                                                      );
                                                    }
                                                  }
                                                }}
                                                className="hidden"
                                                id={`file-input-4.2-${idx}`}
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  document
                                                    .getElementById(
                                                      `file-input-4.2-${idx}`
                                                    )
                                                    ?.click()
                                                }
                                                className="h-6 px-2 text-xs"
                                              >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ) : project.noDocumentAvailable &&
                                      !(
                                        project.file?.file ||
                                        project.file?.fileName ||
                                        project.file?.filePath ||
                                        project.file?.fileUrl
                                      ) ? (
                                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                        No document available
                                      </div>
                                    ) : project.file ? (
                                      <div className="flex items-center gap-1">
                                        <Badge
                                          variant="secondary"
                                          className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                          title={
                                            extractOriginalName(
                                              project.file.fileName || "",
                                              (project.file as any)
                                                ?.originalName
                                            ) || "Unknown file"
                                          }
                                        >
                                          <Upload className="w-3 h-3" />
                                          <span className="truncate">
                                            {extractOriginalName(
                                              project.file.fileName || "",
                                              (project.file as any)
                                                ?.originalName
                                            ) || "Unknown file"}
                                          </span>
                                        </Badge>
                                        {(() => {
                                          const fileKey = `section4_2.projects.${idx}.file`;
                                          const hasFileAccess = !(
                                            project.file.filePath ||
                                            project.file.file ||
                                            project.file.fileUrl
                                          );
                                          return hasFileAccess ? (
                                            <>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleViewFile(
                                                    project.file,
                                                    fileKey
                                                  )
                                                }
                                                disabled={false}
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
                                                    project.file,
                                                    fileKey
                                                  )
                                                }
                                                disabled={false}
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
                                  {shouldBeEditable("4.2") && (
                                    <td className="py-3 px-4 text-sm font-normal">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          handleRemoveProject(
                                            project.id || idx
                                          );
                                        }}
                                        disabled={!shouldBeEditable("4.2")}
                                        className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Project Form */}
                    {shouldBeEditable("4.2") && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        {!showAddProjectForm ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddProjectForm(true)}
                            className="w-fit"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add More Project
                          </Button>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <Label>
                                  Project Name{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  value={newProject.projectName}
                                  onChange={(e) =>
                                    setNewProject({
                                      ...newProject,
                                      projectName: e.target.value,
                                    })
                                  }
                                  placeholder="Enter project name"
                                  className="bg-white"
                                />
                              </div>
                              <div>
                                <Label>
                                  Sector <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={newProject.sector}
                                  onValueChange={(value) =>
                                    setNewProject({
                                      ...newProject,
                                      sector: value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select sector" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SECTOR_OPTIONS.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Status of Project</Label>
                                <Input
                                  type="text"
                                  value={newProject.statusOfProject}
                                  onChange={(e) =>
                                    setNewProject({
                                      ...newProject,
                                      statusOfProject: e.target.value,
                                    })
                                  }
                                  className="bg-white"
                                  placeholder="Enter project status"
                                />
                              </div>
                              <div>
                                <Label>
                                  Upload File{" "}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <div className="space-y-2">
                                  {/* No Document Available Checkbox */}
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="no-doc-add-project-4.2"
                                      checked={newProject.noDocumentAvailable}
                                      onCheckedChange={(checked) => {
                                        const noDocument = checked as boolean;
                                        setNewProject({
                                          ...newProject,
                                          noDocumentAvailable: noDocument,
                                          file: noDocument
                                            ? null
                                            : newProject.file,
                                        });
                                      }}
                                    />
                                    <label
                                      htmlFor="no-doc-add-project-4.2"
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                      No document available
                                    </label>
                                  </div>

                                  {newProject.noDocumentAvailable &&
                                  !(
                                    newProject.file?.file ||
                                    newProject.file?.fileName ||
                                    newProject.file?.filePath ||
                                    newProject.file?.fileUrl
                                  ) ? (
                                    <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                      No document available
                                    </div>
                                  ) : (
                                    <FileUploadSection
                                      label=""
                                      value={newProject.file}
                                      onChange={(file) =>
                                        setNewProject({
                                          ...newProject,
                                          file,
                                          noDocumentAvailable: false,
                                        })
                                      }
                                      submissionId={submissionId}
                                      required={!newProject.noDocumentAvailable}
                                      multiple={false}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleAddNewProject}
                                disabled={
                                  !newProject.projectName ||
                                  !newProject.sector ||
                                  (!newProject.file &&
                                    !newProject.noDocumentAvailable)
                                }
                              >
                                Add
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancelAddProject}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {formDataState?.section4_2?.adopted === "no" && (
                  <div>
                    <Label className="mb-2 block">Comment</Label>
                    {shouldBeEditable("4.2") ? (
                      <Textarea
                        value={formDataState?.section4_2?.comment || ""}
                        onChange={(e) =>
                          handleFieldUpdate("4.2", "comment", e.target.value)
                        }
                        placeholder="Please provide a comment..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {formDataState?.section4_2?.comment ||
                          "No comment provided"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="4.2"
                    toggleState={indicatorScoreToggleState["4.2"] || "score"}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 4.3 - Adoption of ADR */}
        {sectionsWithData.includes("section4_3") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">4.3 -</span> Adoption of ADR{" "}
                  </span>
                  {renderActionButtons("4.3")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorCode="4.3"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.3")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("4.3")}
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="mb-3 block">Adoption of ADR?*</Label>
                  {shouldBeEditable("4.3") ? (
                    <RadioGroup
                      value={
                        formDataState?.section4_3?.adopted
                          ? String(
                              formDataState.section4_3.adopted
                            ).toLowerCase()
                          : ""
                      }
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
                          formDataState?.section4_3?.adopted === "yes"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {formDataState?.section4_3?.adopted === "yes"
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>
                  )}
                </div>

                {formDataState?.section4_3?.adopted === "yes" && (
                  <div>
                    {shouldBeEditable("4.3") && (
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="no-doc-4.3"
                          checked={
                            formDataState?.section4_3?.noDocumentAvailable ||
                            false
                          }
                          onCheckedChange={(checked) => {
                            const noDocument = checked as boolean;
                            setFormDataState((prev: any) => ({
                              ...prev,
                              section4_3: {
                                ...prev.section4_3,
                                noDocumentAvailable: noDocument,
                                file: noDocument ? null : prev.section4_3?.file,
                              },
                            }));
                          }}
                        />
                        <label
                          htmlFor="no-doc-4.3"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          No document available
                        </label>
                      </div>
                    )}

                    {formDataState?.section4_3?.noDocumentAvailable &&
                    !(
                      formDataState?.section4_3?.file?.file ||
                      formDataState?.section4_3?.file?.fileName ||
                      formDataState?.section4_3?.file?.filePath
                    ) ? (
                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                        No document available
                      </div>
                    ) : (
                      <>
                        <Label className="mb-2 block">Upload File</Label>
                        <EditableFileDisplay
                          files={formDataState?.section4_3?.file || null}
                          isEditable={shouldBeEditable("4.3")}
                          submissionId={submissionId}
                          onFilesChange={(updatedFiles) =>
                            handleFileUpdate("4.3", updatedFiles)
                          }
                          label="Uploaded File"
                          multiple={false}
                        />
                      </>
                    )}
                  </div>
                )}

                {formDataState?.section4_3?.adopted === "no" && (
                  <div>
                    <Label className="mb-2 block">Comment</Label>
                    {shouldBeEditable("4.3") ? (
                      <Textarea
                        value={formDataState?.section4_3?.comment || ""}
                        onChange={(e) =>
                          handleFieldUpdate("4.3", "comment", e.target.value)
                        }
                        placeholder="Please provide a comment..."
                        className="min-h-[100px]"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {formDataState?.section4_3?.comment ||
                          "No comment provided"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="4.3"
                    toggleState={indicatorScoreToggleState["4.3"] || "score"}
                  />
                </div>
              )}
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
                    <span className="text-primary">4.4 -</span> Innovative
                    Practices{" "}
                  </span>
                  {renderActionButtons("4.4")}
                </div>
              </div>
            }
            // subtitle="(10 marks per practice)"
            className="mb-6"
            indicatorCode="4.4"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.4")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("4.4")}
            {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button> )}
            </div>
          </CardHeader> */}
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="mb-3 block">Innovation Practices </Label>
                  {shouldBeEditable("4.4") ? (
                    <RadioGroup
                      value={
                        formDataState?.section4_4?.implemented
                          ? String(
                              formDataState.section4_4.implemented
                            ).toLowerCase()
                          : ""
                      }
                      onValueChange={(value) =>
                        handleFieldUpdate("4.4", "implemented", value)
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
                          formDataState?.section4_4?.implemented === "yes"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {state?.section4_4?.implemented === "yes"
                          ? "Yes"
                          : "No"}
                      </span>
                    </div>
                  )}
                </div>

                {state?.section4_4?.implemented === "yes" && (
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
                            {shouldBeEditable("4.4") && (
                              <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                                Action
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const practices = Array.isArray(
                              formDataState?.section4_4?.practices
                            )
                              ? formDataState.section4_4.practices
                              : [];

                            if (!practices.length) {
                              return (
                                <tr>
                                  <td
                                    colSpan={shouldBeEditable("4.4") ? 4 : 3}
                                    className="py-8 text-center text-muted-foreground"
                                  >
                                    No practices available
                                  </td>
                                </tr>
                              );
                            }

                            return practices.map(
                              (practice: any, idx: number) => (
                                <tr
                                  key={practice.id || idx}
                                  className="border-b"
                                >
                                  <td className="py-3 px-4 text-sm font-normal">
                                    {shouldBeEditable("4.4") ? (
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
                                    {shouldBeEditable("4.4") ? (
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
                                    {shouldBeEditable("4.4") ? (
                                      <div className="space-y-1.5">
                                        {/* No Document Available Checkbox */}
                                        <div className="flex items-center space-x-2 py-1">
                                          <Checkbox
                                            id={`no-doc-4.4-${idx}`}
                                            checked={
                                              practice.noDocumentAvailable ||
                                              false
                                            }
                                            onCheckedChange={(checked) => {
                                              const noDocument =
                                                checked as boolean;
                                              // Update noDocumentAvailable and clear file if checked
                                              setFormDataState((prev: any) => {
                                                const practices =
                                                  prev?.section4_4?.practices ||
                                                  [];
                                                const updatedPractices =
                                                  practices.map(
                                                    (p: any, index: number) =>
                                                      index === idx
                                                        ? {
                                                            ...p,
                                                            noDocumentAvailable:
                                                              noDocument,
                                                            file: noDocument
                                                              ? null
                                                              : p.file,
                                                          }
                                                        : p
                                                  );
                                                return {
                                                  ...prev,
                                                  section4_4: {
                                                    ...prev.section4_4,
                                                    practices: updatedPractices,
                                                  },
                                                };
                                              });
                                            }}
                                          />
                                          <label
                                            htmlFor={`no-doc-4.4-${idx}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                          >
                                            No document available
                                          </label>
                                        </div>

                                        {practice.noDocumentAvailable &&
                                        !(
                                          practice.file?.file ||
                                          practice.file?.fileName ||
                                          practice.file?.filePath ||
                                          practice.file?.fileUrl
                                        ) ? (
                                          <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                            No document available
                                          </div>
                                        ) : (
                                          <>
                                            {practice.file ? (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                                title={
                                                  extractOriginalName(
                                                    practice.file.fileName ||
                                                      "",
                                                    (practice.file as any)
                                                      ?.originalName
                                                  ) || "Unknown file"
                                                }
                                              >
                                                <Upload className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">
                                                  {extractOriginalName(
                                                    practice.file.fileName ||
                                                      "",
                                                    (practice.file as any)
                                                      ?.originalName
                                                  ) || "Unknown file"}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handlePracticeFileUpdate(
                                                      idx,
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
                                                        response?.data ||
                                                        response;

                                                      const newFile: FileUpload =
                                                        {
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
                                                          mimeType:
                                                            fileData.mimeType,
                                                        };

                                                      // Update file and clear noDocumentAvailable
                                                      setFormDataState(
                                                        (prev: any) => {
                                                          const practices =
                                                            prev?.section4_4
                                                              ?.practices || [];
                                                          const updatedPractices =
                                                            practices.map(
                                                              (
                                                                p: any,
                                                                index: number
                                                              ) =>
                                                                index === idx
                                                                  ? {
                                                                      ...p,
                                                                      file: newFile,
                                                                      noDocumentAvailable:
                                                                        false,
                                                                    }
                                                                  : p
                                                            );
                                                          return {
                                                            ...prev,
                                                            section4_4: {
                                                              ...prev.section4_4,
                                                              practices:
                                                                updatedPractices,
                                                            },
                                                          };
                                                        }
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
                                                id={`file-input-4.4-${idx}`}
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                  document
                                                    .getElementById(
                                                      `file-input-4.4-${idx}`
                                                    )
                                                    ?.click()
                                                }
                                                className="h-6 px-2 text-xs"
                                              >
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    ) : practice.noDocumentAvailable &&
                                      !(
                                        practice.file?.file ||
                                        practice.file?.fileName ||
                                        practice.file?.filePath ||
                                        practice.file?.fileUrl
                                      ) ? (
                                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                        No document available
                                      </div>
                                    ) : practice.file ? (
                                      <div className="flex items-center gap-1">
                                        <Badge
                                          variant="secondary"
                                          className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                          title={
                                            extractOriginalName(
                                              practice.file.fileName || "",
                                              (practice.file as any)
                                                ?.originalName
                                            ) || "Unknown file"
                                          }
                                        >
                                          <Upload className="w-3 h-3" />
                                          <span className="truncate">
                                            {extractOriginalName(
                                              practice.file.fileName || "",
                                              (practice.file as any)
                                                ?.originalName
                                            ) || "Unknown file"}
                                          </span>
                                        </Badge>
                                        {(() => {
                                          const fileKey = `4.4-${idx}`;
                                          const isLoading =
                                            !!fileLoading[fileKey];
                                          const hasFileAccess = !!(
                                            practice.file.filePath ||
                                            practice.file.file ||
                                            practice.file.fileUrl
                                          );
                                          return hasFileAccess ? (
                                            <>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleViewFile(
                                                    practice.file,
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
                                                    practice.file,
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
                                          ) : null;
                                        })()}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">
                                        No file
                                      </span>
                                    )}
                                  </td>
                                  {shouldBeEditable("4.4") && (
                                    <td className="py-3 px-4 text-sm font-normal">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          // Use index for deletion since items may not have IDs
                                          handleRemovePractice(idx);
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

                    {/* Add More Practice Button - Only visible when in edit mode */}
                    {shouldBeEditable("4.4") && !showAddPracticeForm && (
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
                    {showAddPracticeForm && shouldBeEditable("4.4") && (
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
                                setNewPractice({
                                  ...newPractice,
                                  impact: value,
                                })
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

                {state?.section4_4?.implemented === "no" && (
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
                  Upload documentation of innovative practices
                </p>
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="4.4"
                    toggleState={indicatorScoreToggleState["4.4"] || "score"}
                  />
                </div>
              )}
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
                    <span className="text-primary">4.5 -</span> Capacity
                    Building - Officer Participation{" "}
                  </span>
                  {renderActionButtons("4.5")}
                </div>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorCode="4.5"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("4.5")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("4.5")}
            <div className="space-y-4">
              {/* --- FY Count Display --- */}
              {formDataState?.section4_5?.participated === "yes" && (
                <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Label className="text-base font-semibold text-gray-700 leading-none">
                      Total Number of Officers Trained (FY{" "}
                      {getCurrentFinancialYear()}):
                    </Label>
                    <span className="text-base font-semibold text-blue-600 leading-none">
                      {countOfficersTrainedInCurrentFY(
                        formDataState?.section4_5?.capacityArray || []
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Count based on training dates within the current financial
                    year
                  </p>
                </div>
              )}

              <div>
                <Label className="mb-3 block">
                  Capacity Building – Officer Participation*
                </Label>
                {shouldBeEditable("4.5") ? (
                  <RadioGroup
                    value={
                      formDataState?.section4_5?.participated
                        ? String(
                            formDataState.section4_5.participated
                          ).toLowerCase()
                        : ""
                    }
                    onValueChange={(value) => {
                      handleFieldUpdate("4.5", "participated", value);
                      if (value === "yes") {
                        handleFieldUpdate("4.5", "comment", "");
                      } else {
                        handleFieldUpdate("4.5", "capacityArray", []);
                      }
                    }}
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
                        formDataState?.section4_5?.participated === "yes"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {formDataState?.section4_5?.participated === "yes"
                        ? "Yes"
                        : "No"}
                    </span>
                  </div>
                )}
              </div>

              {formDataState?.section4_5?.participated === "yes" && (
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-2 px-2 text-left rounded-tl-xl text-sm font-normal">
                          Officer Name
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Designation
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Program Name
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Type
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Organiser
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Conducted during (MM/YY)
                        </th>
                        {shouldBeEditable("4.5") && (
                          <th className="py-2 px-2 text-center rounded-tr-xl text-sm font-normal w-12">
                            Action
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const capacityArray = Array.isArray(
                          formDataState?.section4_5?.capacityArray
                        )
                          ? formDataState.section4_5.capacityArray.map(
                              (item: any) => ({
                                ...item,
                                trainingPeriod: item.trainingPeriod || "",
                              })
                            )
                          : [];

                        if (!capacityArray.length) {
                          return (
                            <tr>
                              <td
                                colSpan={shouldBeEditable("4.5") ? 7 : 6}
                                className="py-8 text-center text-muted-foreground"
                              >
                                No capacity building data available
                              </td>
                            </tr>
                          );
                        }

                        return capacityArray.map((item: any, idx: number) => (
                          <tr key={item.id || idx} className="border-b">
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("4.5") ? (
                                <Input
                                  value={item.officerName || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "officerName",
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 text-sm"
                                  placeholder="Enter officer name"
                                />
                              ) : (
                                item.officerName || "N/A"
                              )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("4.5") ? (
                                <Input
                                  value={item.designation || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "designation",
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 text-sm"
                                  placeholder="Enter designation"
                                />
                              ) : (
                                item.designation || "N/A"
                              )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("4.5") ? (
                                <Input
                                  value={item.programName || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "programName",
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 text-sm"
                                  placeholder="Enter program name"
                                />
                              ) : (
                                item.programName || "N/A"
                              )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("4.5") ? (
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
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("4.5") ? (
                                <Input
                                  value={item.organiser || ""}
                                  onChange={(e) =>
                                    handleTableFieldUpdate(
                                      idx,
                                      "organiser",
                                      e.target.value
                                    )
                                  }
                                  className="w-full h-8 text-sm"
                                  placeholder="Enter organiser"
                                />
                              ) : (
                                item.organiser || "N/A"
                              )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("4.5") ? (
                                <MonthYearPicker
                                  value={
                                    item.trainingPeriod
                                      ? item.trainingPeriod.includes("/")
                                        ? item.trainingPeriod
                                        : item.trainingPeriod.length === 4
                                        ? `${item.trainingPeriod.slice(
                                            0,
                                            2
                                          )}/${item.trainingPeriod.slice(2)}`
                                        : item.trainingPeriod
                                      : ""
                                  }
                                  onChange={(value) => {
                                    handleTableFieldUpdate(
                                      idx,
                                      "trainingPeriod",
                                      value
                                    );
                                  }}
                                  placeholder="Select month/year"
                                  className="h-8 text-sm"
                                />
                              ) : item.trainingPeriod ? (
                                item.trainingPeriod.includes("/") ? (
                                  item.trainingPeriod
                                ) : item.trainingPeriod.length === 4 ? (
                                  `${item.trainingPeriod.slice(
                                    0,
                                    2
                                  )}/${item.trainingPeriod.slice(2)}`
                                ) : (
                                  item.trainingPeriod
                                )
                              ) : (
                                "N/A"
                              )}
                            </td>
                            {shouldBeEditable("4.5") && (
                              <td className="py-2 px-2 text-sm font-normal text-center w-12">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    // Use index for deletion since items may not have IDs
                                    handleRemoveCapacityEntry(idx);
                                  }}
                                  className="text-red-500 hover:text-red-700 border-none bg-none h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4" />
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

              {formDataState?.section4_5?.participated === "no" && (
                <div>
                  <Label className="mb-2 block">Comments (Reason)</Label>
                  {shouldBeEditable("4.5") ? (
                    <Textarea
                      value={formDataState?.section4_5?.comment || ""}
                      onChange={(e) =>
                        handleFieldUpdate("4.5", "comment", e.target.value)
                      }
                      placeholder="Please provide a comment..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-md text-sm">
                      {formDataState?.section4_5?.comment ||
                        "No comment provided"}
                    </div>
                  )}
                </div>
              )}

              {/* Add More and Excel Upload Buttons - Only visible when in edit mode and "yes" is selected */}
              {shouldBeEditable("4.5") && !showAddCapacityForm && (
                <div className="flex gap-2 flex-wrap items-center justify-between w-full">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                      onClick={() => setShowAddCapacityForm(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExcelUploadClick}
                      disabled={isUploadingExcel}
                      className="w-fit border-green-600 text-green-600 hover:bg-green-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      {isUploadingExcel ? "Uploading..." : "Upload Excel"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="w-fit border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download Template
                    </Button>
                  </div>

                  {(formDataState?.section4_5?.capacityArray || []).length >
                    0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClearAllDialog(true)}
                      className="w-fit border-red-600 text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-4 h-4" />
                      Clear All
                    </Button>
                  )}

                  <input
                    ref={excelFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    style={{ display: "none" }}
                  />
                </div>
              )}

              {/* Clear All Confirmation Dialog */}
              <AlertDialog
                open={showClearAllDialog}
                onOpenChange={setShowClearAllDialog}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Entries?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to clear all officer entries? This
                      action cannot be undone.
                      {(formDataState?.section4_5?.capacityArray || []).length >
                        0 && (
                        <span className="block mt-2 font-semibold text-destructive">
                          This will remove{" "}
                          {
                            (formDataState?.section4_5?.capacityArray || [])
                              .length
                          }{" "}
                          {(formDataState?.section4_5?.capacityArray || [])
                            .length === 1
                            ? "entry"
                            : "entries"}
                          .
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Add Capacity Entry Form - Only visible when showAddCapacityForm is true and "yes" is selected */}
              {showAddCapacityForm && shouldBeEditable("4.5") && (
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
                    <div>
                      <Label>Conducted during (MM/YY)</Label>
                      <MonthYearPicker
                        value={
                          newCapacityEntry.trainingPeriod
                            ? newCapacityEntry.trainingPeriod.includes("/")
                              ? newCapacityEntry.trainingPeriod
                              : newCapacityEntry.trainingPeriod.length === 4
                              ? `${newCapacityEntry.trainingPeriod.slice(
                                  0,
                                  2
                                )}/${newCapacityEntry.trainingPeriod.slice(2)}`
                              : newCapacityEntry.trainingPeriod
                            : ""
                        }
                        onChange={(value) => {
                          setNewCapacityEntry({
                            ...newCapacityEntry,
                            trainingPeriod: value,
                          });
                        }}
                        placeholder="Select month/year"
                        className="bg-white"
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
            {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
            {getUserRole() === "MOSPI_APPROVER" && (
              <div className="flex-shrink-0 self-start ml-auto">
                <IndicatorScoreDisplay
                  submissionId={submissionId}
                  indicatorCode="4.5"
                  toggleState={indicatorScoreToggleState["4.5"] || "score"}
                />
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
