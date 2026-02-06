/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Info,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import {
  hasPPPDevelopmentData,
  getSectionsWithData,
} from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
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
  isSubmissionFromNodalOfficer,
  isIndicatorFromNodalOfficer,
} from "@/utils/indicatorStatusUtils";
import { useFieldValidation } from "@/features/submission/hooks/useFieldValidation";
import { useFieldErrorDisplay } from "@/features/submission/hooks/useFieldErrorDisplay";
import { getInputValidationClass as getInputValidationClassUtil } from "@/features/submission/utils/validationStyles";
import { cn } from "@/lib/utils";
import { useMemo, useCallback } from "react";
import { IndicatorScoreToggle } from "@/components/IndicatorScoreToggle";
import { IndicatorScoreDisplay } from "@/components/IndicatorScoreDisplay";
import {
  SECTOR_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "@/features/submission/constants/steps";

interface PPPDevelopmentReviewProps {
  submissionId: string;
  formData?: any;
  submission?: any; // Complete submission object
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
  const [isIndicator1_1AcceptedState, setIsIndicator1_1AcceptedState] =
    useState<boolean | null>(null);
  const [indicator1_1CapitalAllocation, setIndicator1_1CapitalAllocation] =
    useState<string | null>(null);

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

      // Ensure mutual exclusivity for each item in VGFArray
      items = items.map((item: any) => {
        const hasFile =
          item.file &&
          (item.file.file || item.file.fileName || item.file.filePath);

        return {
          ...item,
          noDocumentAvailable: hasFile
            ? false
            : item.noDocumentAvailable || false,
        };
      });

      normalized.section3_3 = {
        ...(section && !Array.isArray(section) ? section : {}),
        available: section?.available ?? undefined,
        comment: section?.comment ?? undefined,
        VGFArray: items,
        ...(status !== undefined ? { status } : {}),
      };
    }

    // Ensure mutual exclusivity for section 3.1
    if (normalized.section3_1) {
      const section = normalized.section3_1;
      const hasFile =
        section.file &&
        (section.file.file || section.file.fileName || section.file.filePath);

      if (hasFile) {
        normalized.section3_1 = {
          ...section,
          noDocumentAvailable: false,
        };
      }
    }

    // Ensure mutual exclusivity for section 3.2
    if (normalized.section3_2) {
      const section = normalized.section3_2;
      const hasFile =
        section.file &&
        (section.file.file || section.file.fileName || section.file.filePath);

      if (hasFile) {
        normalized.section3_2 = {
          ...section,
          noDocumentAvailable: false,
        };
      }
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

  // Helper function to format date for HTML5 date input (YYYY-MM-DD)
  const formatDateForInput = useCallback(
    (dateValue: string | undefined | null): string => {
      if (!dateValue) return "";
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
      } catch (error) {
        console.error("Error formatting date:", error);
        return "";
      }
    },
    []
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

    return validatePPPDevelopment(fullFormDataForValidation as any, {
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

  // Auto-calculate Total of TPC of PPP Projects as sum of all project costs
  const calculatedTotalProjectCostAwarded = useMemo(() => {
    const projects = formDataState?.section3_4?.projects || [];
    const sum = projects.reduce((total: number, project: any) => {
      const cost = project.totalProjectCost
        ? parseFloat(String(project.totalProjectCost))
        : 0;
      return total + (isNaN(cost) ? 0 : cost);
    }, 0);
    return sum > 0 ? sum.toFixed(2) : "";
  }, [formDataState?.section3_4?.projects]);

  // Update totalProjectCostAwarded when calculated value changes
  useEffect(() => {
    if (calculatedTotalProjectCostAwarded !== "") {
      const currentValue =
        formDataState?.section3_4?.totalProjectCostAwarded || "";
      if (currentValue !== calculatedTotalProjectCostAwarded) {
        setFormDataState((prev: any) => ({
          ...prev,
          section3_4: {
            ...prev?.section3_4,
            totalProjectCostAwarded: calculatedTotalProjectCostAwarded,
          },
        }));
      }
    }
  }, [
    calculatedTotalProjectCostAwarded,
    formDataState?.section3_4?.totalProjectCostAwarded,
  ]);

  // Validate that totalProjectsAwarded matches indicator 1.1 capitalAllocation (STATE_APPROVER only)
  useEffect(() => {
    const userRole = getUserRole();
    if (userRole !== "STATE_APPROVER") {
      // Clear validation error for non-STATE_APPROVER users
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section3_4.totalProjectsAwarded"];
        return updated;
      });
      return;
    }

    // Only validate if indicator 1.1 is accepted and capitalAllocation is available
    // Use state directly instead of function to avoid dependency issues
    if (!isIndicator1_1AcceptedState || !indicator1_1CapitalAllocation) {
      // Clear validation error if indicator 1.1 is not accepted
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section3_4.totalProjectsAwarded"];
        return updated;
      });
      return;
    }

    const currentValue = formDataState?.section3_4?.totalProjectsAwarded || "";
    if (!currentValue) {
      // Field is empty, don't show validation error yet (let normal validation handle it)
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section3_4.totalProjectsAwarded"];
        return updated;
      });
      return;
    }

    // Compare values
    const indicator1_1Value = parseFloat(
      String(indicator1_1CapitalAllocation).trim()
    );
    const currentValueNum = parseFloat(String(currentValue).trim());

    if (isNaN(indicator1_1Value) || isNaN(currentValueNum)) {
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section3_4.totalProjectsAwarded"];
        return updated;
      });
      return;
    }

    if (indicator1_1Value !== currentValueNum) {
      // Values don't match, show validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section3_4.totalProjectsAwarded": `This value must equal the Capital Allocation for FY (${indicator1_1CapitalAllocation} CRORES) from indicator 1.1`,
      }));
    } else {
      // Values match, clear validation error
      setIndicatorValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated["section3_4.totalProjectsAwarded"];
        return updated;
      });
    }
  }, [
    formDataState?.section3_4?.totalProjectsAwarded,
    indicator1_1CapitalAllocation,
    isIndicator1_1AcceptedState,
  ]);

  // Fetch all submissions for the same state and check if indicator 1.1 is accepted in any of them
  // (Matches niri/final: at state level / State Aggregate Review we need to see 1.1 accepted in any submission for the state)
  useEffect(() => {
    const checkIndicator1_1AcrossSubmissions = async () => {
      if (!submission) {
        setIsIndicator1_1AcceptedState(false);
        return;
      }

      const currentStateUt =
        (submission as any)?.stateUt || (submission as any)?.user?.stateUt;
      if (!currentStateUt) {
        console.log(
          "❌ [isIndicator1_1Accepted] No stateUt found in submission"
        );
        setIsIndicator1_1AcceptedState(false);
        return;
      }

      console.log(
        "🔍 [isIndicator1_1Accepted] Checking across all submissions for state:",
        currentStateUt
      );

      try {
        // Fetch all submissions
        const submissionsData = await apiService.getSubmissions(1, 100);

        // Handle different response structures
        let submissionsArray: any[] = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (
          submissionsData?.submissions &&
          Array.isArray(submissionsData.submissions)
        ) {
          submissionsArray = submissionsData.submissions;
        } else if (
          (submissionsData as any)?.data &&
          Array.isArray((submissionsData as any).data)
        ) {
          submissionsArray = (submissionsData as any).data;
        }

        // Filter submissions for the same state/UT
        const sameStateSubmissions = submissionsArray.filter((sub: any) => {
          const subStateUt = sub.stateUt || sub.user?.stateUt;
          return (
            subStateUt &&
            String(subStateUt).toUpperCase() ===
              String(currentStateUt).toUpperCase()
          );
        });

        console.log(
          "🔍 [isIndicator1_1Accepted] Found submissions for same state:",
          sameStateSubmissions.length
        );

        // Check each submission for indicator 1.1 acceptance
        for (const sub of sameStateSubmissions) {
          let isAccepted = false;
          let capitalAllocValue: string | null = null;

          // Check section_status first
          if (sub?.section_status && typeof sub.section_status === "object") {
            const sectionStatus = (sub.section_status as any)["section1_1"];
            if (sectionStatus === "ACCEPTED" || sectionStatus === "APPROVED") {
              console.log(
                "✅ [isIndicator1_1Accepted] Found indicator 1.1 ACCEPTED in submission:",
                sub.id
              );
              isAccepted = true;
            }
          }

          // Check completedIndicators
          if (
            sub?.section_status?.completedIndicators &&
            Array.isArray(sub.section_status.completedIndicators)
          ) {
            if (sub.section_status.completedIndicators.includes("1.1")) {
              console.log(
                "✅ [isIndicator1_1Accepted] Found indicator 1.1 in completedIndicators for submission:",
                sub.id
              );
              isAccepted = true;
            }
          }

          // Check formData
          if (sub?.formData?.infraFinancing?.section1_1) {
            const section1_1Data = sub.formData.infraFinancing.section1_1;
            const statusValue = section1_1Data.status
              ? String(section1_1Data.status).trim().toUpperCase()
              : null;

            if (statusValue === "ACCEPTED" || statusValue === "APPROVED") {
              console.log(
                "✅ [isIndicator1_1Accepted] Found indicator 1.1 ACCEPTED in formData for submission:",
                sub.id
              );
              isAccepted = true;
            }

            // Extract capitalAllocation value from accepted indicator 1.1
            if (isAccepted && section1_1Data.capitalAllocation) {
              capitalAllocValue = String(
                section1_1Data.capitalAllocation
              ).trim();
              console.log(
                "📊 [isIndicator1_1Accepted] Found capitalAllocation value:",
                capitalAllocValue
              );
            }
          }

          // If indicator 1.1 is accepted, set state and return
          if (isAccepted) {
            setIsIndicator1_1AcceptedState(true);
            setIndicator1_1CapitalAllocation(capitalAllocValue);
            return;
          }
        }

        console.log(
          "❌ [isIndicator1_1Accepted] Indicator 1.1 not found as ACCEPTED in any submission for state:",
          currentStateUt
        );
        setIsIndicator1_1AcceptedState(false);
      } catch (error) {
        console.error(
          "❌ [isIndicator1_1Accepted] Error checking across submissions:",
          error
        );
        setIsIndicator1_1AcceptedState(false);
      }
    };

    checkIndicator1_1AcrossSubmissions();
  }, [submission]);

  // Helper function to check if indicator 1.1 is accepted (uses cached state)
  const isIndicator1_1Accepted = (): boolean => {
    // Use the cached state from useEffect
    if (isIndicator1_1AcceptedState === null) {
      // Still loading, return false for now
      return false;
    }
    return isIndicator1_1AcceptedState;
  };

  // Helper function to check if totalProjectsAwarded matches indicator 1.1 capitalAllocation
  const doesCapitalAllocationMatch = (): boolean => {
    // Only check at STATE_APPROVER level
    const userRole = getUserRole();
    if (userRole !== "STATE_APPROVER") {
      return true; // No validation for other roles
    }

    // If indicator 1.1 is not accepted, don't validate
    if (!isIndicator1_1Accepted()) {
      return true;
    }

    // If capitalAllocation is not available, don't validate
    if (!indicator1_1CapitalAllocation) {
      return true;
    }

    const currentValue = formDataState?.section3_4?.totalProjectsAwarded || "";
    if (!currentValue) {
      return false; // Field is empty, doesn't match
    }

    // Compare values (normalize by removing leading zeros and comparing as numbers)
    const indicator1_1Value = parseFloat(
      String(indicator1_1CapitalAllocation).trim()
    );
    const currentValueNum = parseFloat(String(currentValue).trim());

    if (isNaN(indicator1_1Value) || isNaN(currentValueNum)) {
      return false;
    }

    return indicator1_1Value === currentValueNum;
  };

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

  // Sync formDataState when formData prop changes (but not when restoring from cancel)
  // This ensures we always have the latest data when navigating between categories
  useEffect(() => {
    if (formData && !isRestoringRef.current) {
      const rawData = (formData as any)?.pppDevelopment || formData;
      const normalized = normalizePPPDevelopment(
        rawData &&
          typeof rawData === "object" &&
          (rawData as any)?.section3_1 !== undefined
          ? rawData
          : rawData
      );

      // Deep comparison to detect if formData has actually changed
      setFormDataState((prev: any) => {
        const prevStr = JSON.stringify(prev);
        const normalizedStr = JSON.stringify(normalized);

        // If formData is different, it means parent component has refreshed with new data
        if (prevStr !== normalizedStr) {
          console.log(
            "🔄 [PPPDevelopmentReview] formData prop changed, syncing local state with latest data"
          );
          return normalized;
        }

        // If formData hasn't changed, keep previous state (may have local edits)
        return prev;
      });
    }
  }, [formData]);

  // Store original formDataState snapshot when edit mode starts (for cancel functionality)
  const [originalFormDataSnapshot, setOriginalFormDataSnapshot] =
    useState<any>(null);
  // Flag to prevent useEffect from overriding cancel restore
  const isRestoringRef = useRef(false);
  // Counter to force remount of Select components on cancel
  const [selectResetKey, setSelectResetKey] = useState(0);

  // State for adding new project in section 3.4
  const [showAddProjectForm, setShowAddProjectForm] = useState(false);
  const [newProject, setNewProject] = useState({
    nameOfProject: "",
    infrastructureSector: "",
    dateOfAward: "",
    totalProjectCost: "",
  });

  // State for adding new VGF proposal in section 3.3
  const [showAddVGFForm, setShowAddVGFForm] = useState(false);
  const [newVGFItem, setNewVGFItem] = useState({
    projectName: "",
    sector: "",
    scheme: "",
    submissionDate: "",
    totalProjectCost: "",
    statusOfProject: "",
    file: null as FileUpload | null,
    noDocumentAvailable: false,
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

  // State for indicator score toggle (per indicator)
  const [indicatorScoreToggleState, setIndicatorScoreToggleState] = useState<
    Record<string, "score" | "updatedScore">
  >({});

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

  // State for MOSPI approver dependency warning (indicator 3.4 depends on 1.1 and 1.2)
  const [showDependencyWarning, setShowDependencyWarning] = useState(false);
  const [dependencyAction, setDependencyAction] = useState<"accept" | "sendBack" | null>(null);
  const [dependencySectionId, setDependencySectionId] = useState<string | null>(null);
  const [shouldSendBackBoth, setShouldSendBackBoth] = useState(false);
  const [indicatorsToSendBack, setIndicatorsToSendBack] = useState<string[]>([]);

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

  // Helper function to check if indicators 1.1, 1.2, and 3.4 exist (for 3.4 dependency)
  // Indicators 1.1, 1.2, and 3.4 must all be handled together
  const checkDependentIndicatorStatus = (sectionId: string): {
    otherSectionId: string;
    otherSectionStatus: string | null;
    needsWarning: boolean;
    dependentIndicators: string[]; // All indicators that must be handled together
  } => {
    const userRole = getUserRole();
    const isMospiApprover = userRole === "MOSPI_APPROVER";
    
    // Only check dependency for MOSPI_APPROVER and indicator 3.4
    if (!isMospiApprover || sectionId !== "3.4") {
      return { otherSectionId: "", otherSectionStatus: null, needsWarning: false, dependentIndicators: [] };
    }

    // For 3.4, check if 1.1 and 1.2 exist in the submission
    // 1.1 and 1.2 are in infraFinancing category
    const submissionFormData = submission?.formData || submission?.form_data || {};
    const infraFinancingData = submissionFormData.infraFinancing || submissionFormData;
    
    // Check if 1.1 exists
    const section1_1Data = infraFinancingData?.section1_1 || submissionFormData?.section1_1;
    let indicator1_1Exists = false;
    if (section1_1Data) {
      const capitalAllocation = Array.isArray(section1_1Data)
        ? (section1_1Data as any)?.capitalAllocation
        : section1_1Data?.capitalAllocation;
      const gsdpForFY = Array.isArray(section1_1Data)
        ? (section1_1Data as any)?.gsdpForFY
        : section1_1Data?.gsdpForFY;
      indicator1_1Exists = !!(capitalAllocation || gsdpForFY);
    }

    // Check if 1.2 exists
    const section1_2Data = infraFinancingData?.section1_2 || submissionFormData?.section1_2;
    let indicator1_2Exists = false;
    if (section1_2Data) {
      const actualCapex = Array.isArray(section1_2Data)
        ? (section1_2Data as any)?.actualCapex
        : section1_2Data?.actualCapex;
      const stateCapexUtilisation = Array.isArray(section1_2Data)
        ? (section1_2Data as any)?.stateCapexUtilisation
        : section1_2Data?.stateCapexUtilisation;
      indicator1_2Exists = !!(actualCapex || stateCapexUtilisation);
    }

    // If any of 1.1 or 1.2 exists, all three (1.1, 1.2, 3.4) must be handled together
    const needsWarning = indicator1_1Exists || indicator1_2Exists;

    const dependentIndicators: string[] = ["3.4"];
    if (indicator1_1Exists) dependentIndicators.push("1.1");
    if (indicator1_2Exists) dependentIndicators.push("1.2");

    const otherSectionId = indicator1_1Exists ? "1.1" : "1.2";
    const otherSectionData = indicator1_1Exists ? section1_1Data : section1_2Data;
    const otherMospiStatus = otherSectionData
      ? Array.isArray(otherSectionData)
        ? (otherSectionData as any)?.mospi_status
        : otherSectionData?.mospi_status
      : null;

    return {
      otherSectionId,
      otherSectionStatus: otherMospiStatus,
      needsWarning,
      dependentIndicators: needsWarning ? dependentIndicators : [],
    };
  };

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
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      // Check both formDataState (state) and formData to ensure we get the correct status
      // Use the same logic as renderActionButtons
      const state = formDataState as any;
      const sectionData =
        (state && state[sectionKey]) || (formData && formData[sectionKey]);
      // Handle both array and object sections for status - match renderActionButtons logic exactly
      const sectionStatus = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any).status
          : sectionData.status
        : undefined;
      const mospiStatus = Array.isArray(sectionData)
        ? (sectionData as any)?.mospi_status
        : sectionData?.mospi_status;

      console.log(
        `[PPPDevelopmentReview] shouldBeEditable(${sectionId}) - STATE_APPROVER:`,
        {
          sectionKey,
          sectionStatus,
          mospiStatus,
          isEditable: isEditable(sectionId),
          hasFormDataState: !!(state && state[sectionKey]),
          hasFormData: !!(formData && formData[sectionKey]),
          sectionData: sectionData
            ? Array.isArray(sectionData)
              ? "array"
              : "object"
            : "null",
        }
      );

      // If section status is RESUBMITTED, allow editing if section is in edit mode
      if (sectionStatus === "RESUBMITTED") {
        const result = isEditable(sectionId);
        console.log(
          `[PPPDevelopmentReview] RESUBMITTED check for ${sectionId}:`,
          {
            sectionStatus,
            isEditable: isEditable(sectionId),
            result,
          }
        );
        return result;
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
    const validationResult = validatePPPDevelopment(fullData as any, {
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
    if (sectionId === "3.1") {
      allSectionFields.push(
        `${sectionPrefix}.available`,
        `${sectionPrefix}.file`,
        `${sectionPrefix}.comment`
      );
    } else if (sectionId === "3.2") {
      allSectionFields.push(
        `${sectionPrefix}.available`,
        `${sectionPrefix}.file`,
        `${sectionPrefix}.comment`
      );
    } else if (sectionId === "3.3") {
      allSectionFields.push(
        `${sectionPrefix}.available`,
        `${sectionPrefix}.comment`,
        `${sectionPrefix}.VGFArray`
      );
      if (
        sectionData &&
        typeof sectionData === "object" &&
        "VGFArray" in sectionData &&
        Array.isArray((sectionData as any).VGFArray)
      ) {
        (sectionData as any).VGFArray.forEach((_: any, index: number) => {
          allSectionFields.push(
            `${sectionPrefix}.VGFArray.${index}.projectName`,
            `${sectionPrefix}.VGFArray.${index}.sector`,
            `${sectionPrefix}.VGFArray.${index}.scheme`,
            `${sectionPrefix}.VGFArray.${index}.totalProjectCost`,
            `${sectionPrefix}.VGFArray.${index}.statusOfProject`,
            `${sectionPrefix}.VGFArray.${index}.submissionDate`,
            `${sectionPrefix}.VGFArray.${index}.file`
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
      `[PPPDevelopmentReview] Validation errors for section ${sectionId}:`,
      sectionErrors
    );
  };

  // Handle cancel - restore original state
  const handleCancel = async (sectionId: string) => {
    console.log(
      `[PPPDevelopmentReview] handleCancel called for section ${sectionId}`,
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
      console.log(
        `[PPPDevelopmentReview] Restoring from snapshot for ${sectionId}:`,
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

      // Close and reset "Add More Project" forms for section 3.3
      if (sectionId === "3.3") {
        setShowAddVGFForm(false);
        setNewVGFItem({
          projectName: "",
          sector: "",
          scheme: "",
          submissionDate: "",
          totalProjectCost: "",
          statusOfProject: "",
          file: null,
          noDocumentAvailable: false,
        });
      }

      // Close and reset "Add More Project" forms for section 3.4
      if (sectionId === "3.4") {
        setShowAddProjectForm(false);
        setNewProject({
          nameOfProject: "",
          infrastructureSector: "",
          dateOfAward: "",
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
      // If no snapshot exists (e.g., after page refresh), fetch fresh data from server
      // to ensure we have the latest saved values
      isRestoringRef.current = true;
      (async () => {
        try {
          console.log(
            `[PPPDevelopmentReview] No snapshot found, fetching fresh data for ${sectionId}`
          );
          const freshSubmission = await apiService.getSubmission(submissionId);
          if (freshSubmission && (freshSubmission as any).formData) {
            const freshFormData = (freshSubmission as any).formData;
            if (freshFormData.pppDevelopment) {
              // Create a fresh deep copy to ensure React detects the change
              const restoredState = JSON.parse(
                JSON.stringify(freshFormData.pppDevelopment)
              );
              console.log(
                `[PPPDevelopmentReview] Restored from fresh server data for ${sectionId}:`,
                restoredState
              );
              setFormDataState(restoredState);
            } else if (formData) {
              // Fallback to formData prop if server fetch doesn't have the data
              const rawData = (formData as any)?.pppDevelopment || formData;
              const restoredState = JSON.parse(JSON.stringify(rawData));
              console.log(
                `[PPPDevelopmentReview] Restored from formData prop for ${sectionId}:`,
                restoredState
              );
              setFormDataState(restoredState);
            }
          } else if (formData) {
            // Fallback to formData prop if server fetch doesn't have the data
            const rawData = (formData as any)?.pppDevelopment || formData;
            const restoredState = JSON.parse(JSON.stringify(rawData));
            setFormDataState(restoredState);
          }
        } catch (error) {
          console.error(
            `[PPPDevelopmentReview] Error fetching fresh data for ${sectionId}:`,
            error
          );
          // Fallback to formData prop if fetch fails
          if (formData) {
            const rawData = (formData as any)?.pppDevelopment || formData;
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
      if (sectionId === "3.3") {
        setShowAddVGFForm(false);
        setNewVGFItem({
          projectName: "",
          sector: "",
          scheme: "",
          submissionDate: "",
          totalProjectCost: "",
          statusOfProject: "",
          file: null,
          noDocumentAvailable: false,
        });
      }
      if (sectionId === "3.4") {
        setShowAddProjectForm(false);
        setNewProject({
          nameOfProject: "",
          infrastructureSector: "",
          dateOfAward: "",
          totalProjectCost: "",
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

            // Update form data with fresh data
            if (freshSubmission.formData?.pppDevelopment) {
              setFormDataState(
                normalizePPPDevelopment(freshSubmission.formData.pppDevelopment)
              );
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
      "section3_1",
      "section3_2",
      "section3_3",
      "section3_4",
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

      // Also check if section exists in formData AND has been submitted (has status other than NOT_STARTED)
      if (!wasSubmitted && formData && typeof formData === "object") {
        const pppDev = (formData as any).pppDevelopment;
        if (
          pppDev &&
          typeof pppDev === "object" &&
          pppDev[sectionKey] !== undefined &&
          pppDev[sectionKey] !== null
        ) {
          // Check if the section has a status indicating it was actually submitted
          const section = pppDev[sectionKey];
          const sectionStatus = section?.status;

          // Only mark as submitted if status exists and is not NOT_STARTED/null/undefined
          if (
            sectionStatus &&
            sectionStatus !== "NOT_STARTED" &&
            sectionStatus !== null &&
            sectionStatus !== undefined &&
            sectionStatus !== ""
          ) {
            wasSubmitted = true;
          }
        }
      }

      if (wasSubmitted) {
        initiallySubmittedSections.current.add(sectionKey);
        console.log(
          `[PPPDevelopmentReview] Marking ${sectionKey} as submitted`
        );
      }
    });
    console.log(
      `[PPPDevelopmentReview] Submitted sections set:`,
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
      // Only consider it submitted if it has a status indicating submission
      const pppDevFromFormData =
        formData &&
        typeof formData === "object" &&
        (formData as any).pppDevelopment
          ? (formData as any).pppDevelopment
          : null;

      if (pppDevFromFormData && typeof pppDevFromFormData === "object") {
        const section = (pppDevFromFormData as any)[sectionKey];
        if (section && section !== null && section !== undefined) {
          const sectionStatus = section?.status;
          // Only return true if section has a status indicating it was submitted
          if (
            sectionStatus &&
            sectionStatus !== "NOT_STARTED" &&
            sectionStatus !== null &&
            sectionStatus !== undefined &&
            sectionStatus !== ""
          ) {
            return true;
          }
        }
      }

      return false;
    },
    [formData, submission]
  );

  // Check if this section has any data
  const hasData = hasPPPDevelopmentData({ pppDevelopment: formDataState });
  let sectionsWithData = getSectionsWithData(
    { pppDevelopment: formDataState },
    "pppDevelopment"
  );

  // ALWAYS include sections that were previously submitted, even if they have no data now
  // This ensures submitted indicators never disappear from the UI
  const allPossibleSections = [
    "section3_1",
    "section3_2",
    "section3_3",
    "section3_4",
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

  // Helper function to check if a section has meaningful data
  const sectionHasMeaningfulData = (
    sectionKey: string,
    section: any
  ): boolean => {
    if (!section) return false;

    switch (sectionKey) {
      case "section3_1": {
        return (
          (section.file &&
            (section.file.file ||
              section.file.fileName ||
              section.file.filePath)) ||
          (section.available &&
            (section.available === "yes" || section.available === "no")) ||
          (section.comment && section.comment.trim())
        );
      }
      case "section3_2": {
        return (
          (section.file &&
            (section.file.file ||
              section.file.fileName ||
              section.file.filePath)) ||
          (section.available &&
            (section.available === "yes" || section.available === "no")) ||
          (section.comment && section.comment.trim())
        );
      }
      case "section3_3": {
        if (section?.available === "no" && section?.comment?.trim()) {
          return true;
        }
        const items = Array.isArray(section?.VGFArray) ? section.VGFArray : [];
        return (
          items.length > 0 &&
          items.some(
            (item: any) =>
              item?.projectName?.trim() ||
              item?.sector?.trim() ||
              item?.scheme?.trim()
          )
        );
      }
      case "section3_4": {
        return (
          (section.totalProjectsAwarded &&
            section.totalProjectsAwarded.trim()) ||
          (section.totalProjectCostAwarded &&
            section.totalProjectCostAwarded.trim()) ||
          (section.projects &&
            Array.isArray(section.projects) &&
            section.projects.length > 0)
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
    formDataState &&
    typeof formDataState === "object"
  ) {
    const allPossibleSections = [
      "section3_1",
      "section3_2",
      "section3_3",
      "section3_4",
    ];
    // Map sectionKey to sectionId for edit mode check
    const sectionIdMap: Record<string, string> = {
      section3_1: "3.1",
      section3_2: "3.2",
      section3_3: "3.3",
      section3_4: "3.4",
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
      const section = formDataState[sectionKey];

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
  const allPossibleSectionsForEditMode = [
    "section3_1",
    "section3_2",
    "section3_3",
    "section3_4",
  ];
  const sectionIdMap: Record<string, string> = {
    section3_1: "3.1",
    section3_2: "3.2",
    section3_3: "3.3",
    section3_4: "3.4",
  };

  const sectionsInEditMode = allPossibleSectionsForEditMode.filter(
    (sectionKey) => {
      const sectionId = sectionIdMap[sectionKey];
      return sectionId ? isEditable(sectionId) : false;
    }
  );

  // Merge sections in edit mode with sectionsWithData
  sectionsWithData = Array.from(
    new Set([...sectionsWithData, ...sectionsInEditMode])
  );

  // Final merge: ensure previously submitted sections are always included
  // This ensures submitted indicators never disappear, even after canceling edit or deleting entries
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
      const currentSection = prev?.[sectionKey] || {};

      // When switching from "yes" to "no", clear related fields
      let clearedFields: any = {};

      if (value === "no") {
        switch (sectionId) {
          case "3.1":
            if (fieldName === "available") {
              clearedFields = { file: null, files: [], comment: "" };
            }
            break;
          case "3.2":
            if (fieldName === "available") {
              clearedFields = { file: null, files: [], comment: "" };
            }
            break;
        }
        console.log(
          `[PPPDevelopmentReview] Clearing fields for ${sectionId}.${fieldName}:`,
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
    // Clear section validation message when user starts filling fields
    if (sectionValidationMessages[sectionId]) {
      setSectionValidationMessages((prev) => {
        const updated = { ...prev };
        delete updated[sectionId];
        return updated;
      });
    }
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
    const normalizedValue =
      Array.isArray(updatedValue) && updatedValue.length > 0
        ? updatedValue[0]
        : Array.isArray(updatedValue)
        ? null
        : updatedValue;

    // Clear noDocumentAvailable when a file is uploaded
    const hasFile =
      normalizedValue !== null &&
      normalizedValue !== undefined &&
      (normalizedValue.file ||
        normalizedValue.fileName ||
        normalizedValue.filePath);
    const updatedSection = {
      ...previousSection,
      [targetKey]: normalizedValue,
      // Clear noDocumentAvailable when file is uploaded
      ...(hasFile ? { noDocumentAvailable: false } : {}),
    };

    // Update local state only - save will happen when user clicks Save button
    // Files are stored as File objects and will be uploaded to S3 on Save
    setFormDataState((prev: any) => ({
      ...prev,
      [sectionKey]: updatedSection,
    }));

    // Also update submissionState to keep it in sync
    if (hasFile) {
      setSubmissionState((prevSubmission: any) => {
        if (!prevSubmission) return prevSubmission;
        const pppDev = prevSubmission?.formData?.pppDevelopment || {};
        return {
          ...prevSubmission,
          formData: {
            ...prevSubmission.formData,
            pppDevelopment: {
              ...pppDev,
              [sectionKey]: {
                ...pppDev[sectionKey],
                noDocumentAvailable: false,
              },
            },
          },
        };
      });
    }

    // Removed auto-save - files are stored as File objects and will be uploaded
    // when user clicks Save button (via updateSubmission → uploadFilesAndReplace)

    // Clear section validation message when user uploads files
    if (sectionValidationMessages[sectionId]) {
      setSectionValidationMessages((prev) => {
        const updated = { ...prev };
        delete updated[sectionId];
        return updated;
      });
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
    // Clear section validation message when user updates table fields
    if (sectionValidationMessages["3.3"]) {
      setSectionValidationMessages((prev) => {
        const updated = { ...prev };
        delete updated["3.3"];
        return updated;
      });
    }
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
  const handleRemoveVGFEntry = (idOrIndex: string | number) => {
    console.log(
      `[PPPDevelopmentReview] handleRemoveVGFEntry called for idOrIndex: ${idOrIndex}`
    );
    setFormDataState((prev: any) => {
      const current = prev?.section3_3?.VGFArray;
      const currentSection = prev?.section3_3 || {};
      const rows = Array.isArray(current)
        ? current.filter((item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased =
              typeof idOrIndex === "number" ||
              String(idOrIndex).startsWith("item-");
            let shouldKeep: boolean;

            if (isIndexBased) {
              // Extract index from "item-0" format or use number directly
              const targetIndex =
                typeof idOrIndex === "number"
                  ? idOrIndex
                  : parseInt(String(idOrIndex).replace("item-", ""), 10);
              shouldKeep = index !== targetIndex;
            } else {
              // ID-based delete: match by item.id
              shouldKeep = item.id !== idOrIndex;
            }

            console.log(
              `[PPPDevelopmentReview] Filtering item at index ${index}:`,
              {
                itemId: item.id,
                itemIndex: index,
                targetIdOrIndex: idOrIndex,
                isIndexBased,
                shouldKeep,
              }
            );
            return shouldKeep;
          })
        : [];
      console.log(`[PPPDevelopmentReview] After filtering:`, {
        originalCount: Array.isArray(current) ? current.length : 0,
        newCount: rows.length,
        preservedStatus: currentSection.status,
      });
      return {
        ...prev,
        section3_3: {
          ...currentSection,
          VGFArray: rows,
          // Preserve status if it exists
          ...(currentSection.status ? { status: currentSection.status } : {}),
        },
      };
    });
  };

  // Handle removing entry from section 3.4
  const handleRemoveProjectEntry = (idOrIndex: string | number) => {
    setFormDataState((prev: any) => {
      const current = prev?.section3_4?.projects;
      const currentSection = prev?.section3_4 || {};
      const projects = Array.isArray(current)
        ? current.filter((item: any, index: number) => {
            // If idOrIndex is a number or starts with "item-", it's an index-based delete
            const isIndexBased =
              typeof idOrIndex === "number" ||
              String(idOrIndex).startsWith("item-");
            let shouldKeep: boolean;

            if (isIndexBased) {
              // Extract index from "item-0" format or use number directly
              const targetIndex =
                typeof idOrIndex === "number"
                  ? idOrIndex
                  : parseInt(String(idOrIndex).replace("item-", ""), 10);
              shouldKeep = index !== targetIndex;
            } else {
              // ID-based delete: match by item.id
              shouldKeep = item.id !== idOrIndex;
            }
            return shouldKeep;
          })
        : [];
      return {
        ...prev,
        section3_4: {
          ...currentSection,
          projects: projects,
          // Preserve status if it exists
          ...(currentSection.status ? { status: currentSection.status } : {}),
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
      infrastructureSector: "",
      dateOfAward: "",
      totalProjectCost: "",
    });
    setShowAddProjectForm(false);
  };

  // Handle cancel adding new project
  const handleCancelAddProject = () => {
    setNewProject({
      nameOfProject: "",
      infrastructureSector: "",
      dateOfAward: "",
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
        file: newVGFItem.noDocumentAvailable ? null : newVGFItem.file,
        noDocumentAvailable: newVGFItem.noDocumentAvailable || false,
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
      scheme: "",
      submissionDate: "",
      totalProjectCost: "",
      statusOfProject: "",
      file: null,
      noDocumentAvailable: false,
    });
    setShowAddVGFForm(false);
  };

  // Handle cancel adding new VGF item
  const handleCancelAddVGF = () => {
    setNewVGFItem({
      projectName: "",
      sector: "",
      scheme: "",
      submissionDate: "",
      totalProjectCost: "",
      statusOfProject: "",
      file: null,
      noDocumentAvailable: false,
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

    console.log(`[PPPDevelopmentReview] onSaveSection - Status check:`, {
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
        `[PPPDevelopmentReview] ✅ Running validation before showing dialog for NODAL_OFFICER`
      );

      // Run validation first (same logic as in performSave)
      const fullData = {
        section3_1: formDataState?.section3_1 || { available: "", file: null },
        section3_2: formDataState?.section3_2 || { available: "", file: null },
        section3_3: formDataState?.section3_3 || [],
        section3_4: formDataState?.section3_4 || { projects: [] },
      };

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

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

      // If validation fails, show errors on UI and return (don't show dialog)
      if (Object.keys(sectionErrors).length > 0) {
        // Mark all fields in this section as touched so ALL errors show
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData =
          formDataState?.[sectionKey as keyof typeof formDataState];

        // Get all possible field paths for this section
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "3.1") {
          allSectionFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "3.2") {
          allSectionFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "3.3") {
          allSectionFields.push(`${sectionPrefix}.VGFArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "VGFArray" in sectionData &&
            Array.isArray((sectionData as any).VGFArray)
          ) {
            (sectionData as any).VGFArray.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.VGFArray.${index}.projectName`,
                `${sectionPrefix}.VGFArray.${index}.sector`,
                `${sectionPrefix}.VGFArray.${index}.scheme`,
                `${sectionPrefix}.VGFArray.${index}.totalProjectCost`,
                `${sectionPrefix}.VGFArray.${index}.statusOfProject`,
                `${sectionPrefix}.VGFArray.${index}.submissionDate`,
                `${sectionPrefix}.VGFArray.${index}.file`
              );
            });
          }
        } else if (sectionId === "3.4") {
          allSectionFields.push(
            `${sectionPrefix}.totalProjectsAwarded`,
            `${sectionPrefix}.totalProjectCostAwarded`,
            `${sectionPrefix}.projects`
          );
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "projects" in sectionData &&
            Array.isArray((sectionData as any).projects)
          ) {
            (sectionData as any).projects.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.projects.${index}.nameOfProject`,
                `${sectionPrefix}.projects.${index}.infrastructureSector`,
                `${sectionPrefix}.projects.${index}.dateOfAward`,
                `${sectionPrefix}.projects.${index}.totalProjectCost`
              );
            });
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
          `[PPPDevelopmentReview] ✅ Validation passed - showing save confirmation dialog for REVERTED indicator`
        );
        setPendingSaveSectionId(sectionId);
        setShowSaveDialog(true);
        return;
      } else {
        // If not REVERTED, proceed with direct save
        console.log(
          `[PPPDevelopmentReview] ✅ Validation passed - proceeding with direct save (not REVERTED)`
        );
        await performSave(sectionId);
        return;
      }
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
              available: state?.section3_3?.available ?? null,
              comment: state?.section3_3?.comment ?? null,
              VGFArray: (state?.section3_3?.VGFArray || []).map(
                (item: any) => ({
                  projectName: item?.projectName ?? null,
                  sector: item?.sector ?? null,
                  scheme: item?.scheme ?? null,
                  totalProjectCost: item?.totalProjectCost ?? null,
                  statusOfProject: item?.statusOfProject ?? null,
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
                  infrastructureSector: project?.infrastructureSector ?? null,
                  dateOfAward: project?.dateOfAward ?? null,
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

      const effectiveAssignedIndicators =
        assignedIndicators.length > 0
          ? assignedIndicators
          : hookAssignedIndicators.length > 0
          ? hookAssignedIndicators
          : undefined;

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
        // Mark all fields in this section as touched so ALL errors show
        const sectionKey = `section${sectionId.replace(".", "_")}`;
        const sectionData =
          formDataState?.[sectionKey as keyof typeof formDataState];

        // Get all possible field paths for this section
        const allSectionFields: string[] = [];

        // Add base fields based on section
        if (sectionId === "3.1") {
          allSectionFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "3.2") {
          allSectionFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (sectionId === "3.3") {
          allSectionFields.push(`${sectionPrefix}.VGFArray`);
          if (
            sectionData &&
            typeof sectionData === "object" &&
            "VGFArray" in sectionData &&
            Array.isArray((sectionData as any).VGFArray)
          ) {
            (sectionData as any).VGFArray.forEach((_: any, index: number) => {
              allSectionFields.push(
                `${sectionPrefix}.VGFArray.${index}.projectName`,
                `${sectionPrefix}.VGFArray.${index}.sector`,
                `${sectionPrefix}.VGFArray.${index}.scheme`,
                `${sectionPrefix}.VGFArray.${index}.totalProjectCost`,
                `${sectionPrefix}.VGFArray.${index}.statusOfProject`,
                `${sectionPrefix}.VGFArray.${index}.submissionDate`,
                `${sectionPrefix}.VGFArray.${index}.file`
              );
            });
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

      // Validate required fields before calling API
      if (!submissionId) {
        console.error("[PPPDevelopmentReview] ❌ submissionId is missing");
        // Don't show notification, throw error instead
        throw new Error("Submission ID is missing");
      }

      if (!fields || fields.length === 0) {
        console.error("[PPPDevelopmentReview] ❌ fields array is empty");
        // Don't show notification, throw error instead
        throw new Error("Fields array is empty");
      }

      if (!payloadSection) {
        console.error("[PPPDevelopmentReview] ❌ section is missing");
        // Don't show notification, throw error instead
        throw new Error("Section is missing");
      }

      console.log(
        `[PPPDevelopmentReview] performSave - Calling handleSaveSection API...`,
        {
          submissionId,
          category: "pppDevelopment",
          section: payloadSection,
          fieldsCount: fields.length,
          fieldsWithStatus: fields[0]?.status,
          fields: fields,
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

      // Update submission state directly from saveResult if it contains indicatorScore
      if (saveResult?.indicatorScore) {
        console.log(
          `[PPPDevelopmentReview] 📊 Indicator score received in saveResult:`,
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
      } catch (error: any) {
        console.error(`[PPPDevelopmentReview] ❌ Save failed:`, error);
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
    const isStateApprover = userRole === "STATE_APPROVER";

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

    // If STATE_APPROVER is sending back (status = false), extract nodalOfficerId from section data
    if (isStateApprover && !status) {
      const sectionKey = `section${sectionId.replace(".", "_")}`;
      const sectionData =
        (formDataState && (formDataState as any)[sectionKey]) ||
        (formData && (formData as any)[sectionKey]);

      const nodalOfficerId = sectionData
        ? Array.isArray(sectionData)
          ? (sectionData as any)?.nodalOfficerId
          : sectionData?.nodalOfficerId
        : undefined;

      if (nodalOfficerId) {
        payload.nodalOfficerId = nodalOfficerId;
        console.log(
          `📤 [PPPDevelopmentReview] Sending back indicator ${sectionId} to NODAL_OFFICER: ${nodalOfficerId}`
        );
      }
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

    // If STATE_APPROVER is accepting their own indicator, accept directly (no confirm popup)
    if (isStateApprover && status && isSubmissionFromStateApprover) {
      console.log(
        `[PPPDevelopmentReview] STATE_APPROVER accepting their own indicator ${sectionId} - accepting directly without dialog`
      );
      await performIndicatorStatus(sectionId, status);
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

      // If we're in a "send back both" scenario, also send back the other dependent indicators
      if (shouldSendBackBoth && indicatorsToSendBack.length > 0) {
        console.log(`[PPPDevelopmentReview] Sending back dependent indicators:`, indicatorsToSendBack);
        for (const indicatorId of indicatorsToSendBack) {
          if (indicatorId !== pendingActionSectionId) {
            if (indicatorId === "1.1" || indicatorId === "1.2") {
              // 1.1 and 1.2 are in infraFinancing category
              try {
                const payload: any = {
                  submissionId,
                  category: "infraFinancing",
                  section: `section${indicatorId.replace(".", "_")}`,
                  status: false,
                  mospi_status: "REVERTED",
                };
                await apiService.indicatorStatus(payload);
                console.log(`✅ Indicator ${indicatorId} mospi_status updated to REVERTED`);
                
                // Dispatch custom event to notify other components
                window.dispatchEvent(
                  new CustomEvent("niri-indicator-status-updated", {
                    detail: { sectionId: indicatorId, status: "REVERTED" },
                  })
                );
              } catch (error) {
                console.error(`❌ Failed to send back indicator ${indicatorId}:`, error);
              }
            }
          }
        }
        setShouldSendBackBoth(false);
        setIndicatorsToSendBack([]);
      } else if (shouldSendBackBoth && pendingActionSectionId === "3.4") {
        // Fallback for backward compatibility
        console.log(`[PPPDevelopmentReview] Sending back both indicators: 3.4 and 1.1`);
        try {
          const payload: any = {
            submissionId,
            category: "infraFinancing",
            section: "section1_1",
            status: false,
            mospi_status: "REVERTED",
          };
          await apiService.indicatorStatus(payload);
          console.log(`✅ Indicator 1.1 mospi_status updated to REVERTED`);
          
          window.dispatchEvent(
            new CustomEvent("niri-indicator-status-updated", {
              detail: { sectionId: "1.1", status: "REVERTED" },
            })
          );
        } catch (error) {
          console.error(`❌ Failed to send back indicator 1.1:`, error);
        }
        setShouldSendBackBoth(false);
      }

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

  // Handle dependency warning - accept all dependent indicators together
  const handleAcceptBothIndicators = async () => {
    if (dependencySectionId && dependencySectionId === "3.4") {
      const dependencyCheck = checkDependentIndicatorStatus(dependencySectionId);
      const indicatorsToAccept = dependencyCheck.dependentIndicators.length > 0 
        ? dependencyCheck.dependentIndicators 
        : [dependencySectionId, dependencyCheck.otherSectionId].filter(Boolean);
      
      try {
        // Accept all indicators sequentially
        for (const indicatorId of indicatorsToAccept) {
          if (indicatorId === "3.4") {
            // 3.4 is in pppDevelopment category
            await performIndicatorStatus("3.4", true);
          } else if (indicatorId === "1.1" || indicatorId === "1.2") {
            // 1.1 and 1.2 are in infraFinancing category
            const payload: any = {
              submissionId,
              category: "infraFinancing",
              section: `section${indicatorId.replace(".", "_")}`,
              status: true,
              mospi_status: "ACCEPTED",
            };
            await apiService.indicatorStatus(payload);
            console.log(`✅ Indicator ${indicatorId} mospi_status updated to ACCEPTED`);
            
            // Dispatch custom event to notify other components
            window.dispatchEvent(
              new CustomEvent("niri-indicator-status-updated", {
                detail: { sectionId: indicatorId, status: "ACCEPTED" },
              })
            );
          }
        }
        
        // Close the dependency warning modal
        setShowDependencyWarning(false);
        setDependencyAction(null);
        setDependencySectionId(null);
      } catch (error) {
        console.error("Failed to accept indicators:", error);
        // Keep modal open on error so user can retry
      }
    }
  };

  // Handle dependency warning - send back all dependent indicators together
  const handleSendBackBothIndicators = async () => {
    if (dependencySectionId && dependencySectionId === "3.4") {
      const dependencyCheck = checkDependentIndicatorStatus(dependencySectionId);
      const indicatorsToHandle = dependencyCheck.dependentIndicators.length > 0 
        ? dependencyCheck.dependentIndicators 
        : [dependencySectionId, dependencyCheck.otherSectionId].filter(Boolean);
      
      // Close the dependency warning modal first
      setShowDependencyWarning(false);
      setDependencyAction(null);
      setDependencySectionId(null);
      
      // Set flag and store which indicators to send back
      setShouldSendBackBoth(true);
      setIndicatorsToSendBack(indicatorsToHandle);
      
      // For send back, we need to open comment modal for indicator 3.4
      // The comment will apply to all indicators, and handleConfirmSendBack will handle all
      setIsMospiApproverSentBack(true);
      setMospiSentBackSectionId("3.4");
      handleOpenModal("3.4");
    }
  };

  // Handle dependency warning - cancel action
  const handleCancelDependencyWarning = () => {
    setShowDependencyWarning(false);
    setDependencyAction(null);
    setDependencySectionId(null);
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
    // BUT allow MOSPI_APPROVER to see toggle button and edit score
    if (submissionStatus === "APPROVED" && !isMospiApprover) {
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

      // When submission is APPROVED, show toggle button and view-only mode (similar to ACCEPTED)
      // This allows users to see updated scores and comment timeline
      const isSubmissionApproved = submissionStatus === "APPROVED";

      // If mospiStatus is ACCEPTED OR submission is APPROVED, show view-only mode
      if (mospiStatus === "ACCEPTED" || isSubmissionApproved) {
        const toggleState = indicatorScoreToggleState[sectionId] || "score";
        return (
          <div className="flex items-center gap-2">
            <IndicatorScoreToggle
              submissionId={submissionId}
              indicatorCode={sectionId}
              controlledToggleState={toggleState}
              mospiStatus={isSubmissionApproved ? "ACCEPTED" : mospiStatus}
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
              {isSubmissionApproved ? "Approved" : "Accepted"}
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
              // Check if this is indicator 3.4 and if indicator 1.1 needs to be handled together
              const dependencyCheck = checkDependentIndicatorStatus(sectionId);
              if (dependencyCheck.needsWarning) {
                // Show dependency warning modal
                setDependencyAction("sendBack");
                setDependencySectionId(sectionId);
                setShowDependencyWarning(true);
              } else {
                // Proceed with normal send back flow
                setIsMospiApproverSentBack(true);
                setMospiSentBackSectionId(sectionId);
                handleOpenModal(sectionId);
              }
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
              // Check if this is indicator 3.4 and if indicator 1.1 needs to be handled together
              const dependencyCheck = checkDependentIndicatorStatus(sectionId);
              if (dependencyCheck.needsWarning) {
                // Show dependency warning modal
                setDependencyAction("accept");
                setDependencySectionId(sectionId);
                setShowDependencyWarning(true);
              } else {
                // Proceed with normal accept flow
                setPendingActionSectionId(sectionId);
                setShowAcceptDialog(true);
              }
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
          {!isNodalOfficer &&
            (() => {
              // For STATE_APPROVER, check if indicator 1.1 is accepted before allowing acceptance of 3.4
              const isEditing = shouldBeEditable(sectionId);
              const isIndicator1_1AcceptedValue = isIndicator1_1Accepted();
              const capitalAllocationMatches = doesCapitalAllocationMatch();
              const shouldDisableFor3_4_NotAccepted =
                isStateApprover &&
                sectionId === "3.4" &&
                !isIndicator1_1AcceptedValue;
              const shouldDisableFor3_4_NotMatching =
                isStateApprover &&
                sectionId === "3.4" &&
                isIndicator1_1AcceptedValue &&
                !capitalAllocationMatches;
              const isDisabled =
                isEditing ||
                shouldDisableFor3_4_NotAccepted ||
                shouldDisableFor3_4_NotMatching;

              return (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => onIndicatorStatus(sectionId, true)}
                          disabled={isDisabled}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Accept
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {isDisabled && (
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-sm">
                          {shouldDisableFor3_4_NotAccepted
                            ? "Indicator 1.1 must be accepted before accepting indicator 3.4"
                            : shouldDisableFor3_4_NotMatching
                            ? `Total Budgeted capital allocation must equal Capital Allocation for FY (${indicator1_1CapitalAllocation} INR-CRORE) from indicator 1.1`
                            : isEditing
                            ? "Please save your changes before accepting"
                            : ""}
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
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
              (formDataState && (formDataState as any)[sectionKey]) ||
              (formData && (formData as any)[sectionKey]);
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
              (formData && (formData as any)[sectionKey]);
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
              `🔍 [PPPDevelopmentReview] "Send Back" button check for section ${sectionId}`
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

        {!isNodalOfficer &&
          (() => {
            // For STATE_APPROVER, check if indicator 1.1 is accepted before allowing acceptance of 3.4
            const isEditing = shouldBeEditable(sectionId);
            const isIndicator1_1AcceptedValue = isIndicator1_1Accepted();
            const capitalAllocationMatches = doesCapitalAllocationMatch();
            const shouldDisableFor3_4_NotAccepted =
              isStateApprover &&
              sectionId === "3.4" &&
              !isIndicator1_1AcceptedValue;
            const shouldDisableFor3_4_NotMatching =
              isStateApprover &&
              sectionId === "3.4" &&
              isIndicator1_1AcceptedValue &&
              !capitalAllocationMatches;
            const isDisabled =
              isEditing ||
              shouldDisableFor3_4_NotAccepted ||
              shouldDisableFor3_4_NotMatching;

            return (
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onIndicatorStatus(sectionId, true)}
                        disabled={isDisabled}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Accept
                      </Button>
                    </div>
                  </TooltipTrigger>
                  {isDisabled && (
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-sm">
                        {shouldDisableFor3_4_NotAccepted
                          ? "Indicator 1.1 must be accepted before accepting indicator 3.4"
                          : shouldDisableFor3_4_NotMatching
                          ? `Total Budgeted capital allocation must equal Capital Allocation for FY (${indicator1_1CapitalAllocation} INR-CRORE) from indicator 1.1`
                          : isEditing
                          ? "Please save your changes before accepting"
                          : ""}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })()}
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
            indicatorCode="3.1"
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
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("3.1")}
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="mb-3 block">
                    PPP Act/Policy Available?*
                  </Label>
                  {shouldBeEditable("3.1") ? (
                    <RadioGroup
                      value={state?.section3_1?.available || ""}
                      onValueChange={(value) => {
                        handleFieldUpdate("3.1", "available", value);
                        markFieldAsTouched("section3_1.available");
                        setShowValidationErrors(true);
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
                  {renderFieldError("section3_1.available")}
                </div>

                {state?.section3_1?.available === "yes" && (
                  <div className="space-y-2">
                    {/* No Document Available Checkbox */}
                    {shouldBeEditable("3.1") && (
                      <div className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id="no-doc-3.1"
                          checked={
                            state?.section3_1?.noDocumentAvailable || false
                          }
                          onCheckedChange={(checked) => {
                            const noDocument = checked as boolean;
                            setFormDataState((prev: any) => ({
                              ...prev,
                              section3_1: {
                                ...prev.section3_1,
                                noDocumentAvailable: noDocument,
                                file: noDocument ? null : prev.section3_1?.file,
                              },
                            }));

                            // Also update submissionData
                            setSubmissionState((prevSubmission: any) => {
                              if (!prevSubmission) return prevSubmission;
                              const pppDev =
                                prevSubmission?.formData?.pppDevelopment || {};
                              return {
                                ...prevSubmission,
                                formData: {
                                  ...prevSubmission.formData,
                                  pppDevelopment: {
                                    ...pppDev,
                                    section3_1: {
                                      ...pppDev.section3_1,
                                      noDocumentAvailable: noDocument,
                                      file: noDocument
                                        ? null
                                        : pppDev.section3_1?.file,
                                    },
                                  },
                                },
                              };
                            });

                            // Clear validation error
                            if (getFieldError("section3_1.file")) {
                              setIndicatorValidationErrors((prev) => {
                                const updated = { ...prev };
                                delete updated["section3_1.file"];
                                return updated;
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor="no-doc-3.1"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          No document available
                        </label>
                      </div>
                    )}

                    {state?.section3_1?.noDocumentAvailable &&
                    !(
                      state?.section3_1?.file?.file ||
                      state?.section3_1?.file?.fileName ||
                      state?.section3_1?.file?.filePath
                    ) ? (
                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                        No document available
                      </div>
                    ) : (
                      <EditableFileDisplay
                        files={state?.section3_1?.file ?? null}
                        isEditable={shouldBeEditable("3.1")}
                        submissionId={submissionId}
                        onFilesChange={(updatedFile) => {
                          handleFileUpdate("3.1", updatedFile);
                          markFieldAsTouched("section3_1.file");
                          setShowValidationErrors(true);
                        }}
                        label="Uploaded File"
                        multiple={false}
                      />
                    )}
                    {renderFieldError("section3_1.file")}
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
                          markFieldAsTouched("section3_1.comment");
                          setShowValidationErrors(true);
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
                    {renderFieldError("section3_1.comment")}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Upload copy of Act/Policy
                </p>
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="3.1"
                    toggleState={indicatorScoreToggleState["3.1"] || "score"}
                  />
                </div>
              )}
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
            indicatorCode="3.2"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.2")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("3.2")}
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
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
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
                          setIndicatorValidationErrors((prev) => {
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
                  {renderFieldError("section3_2.available")}
                </div>

                {state?.section3_2?.available === "yes" && (
                  <div className="space-y-2">
                    {/* No Document Available Checkbox */}
                    {shouldBeEditable("3.2") && (
                      <div className="flex items-center space-x-2 py-1">
                        <Checkbox
                          id="no-doc-3.2"
                          checked={
                            state?.section3_2?.noDocumentAvailable || false
                          }
                          onCheckedChange={(checked) => {
                            const noDocument = checked as boolean;
                            setFormDataState((prev: any) => ({
                              ...prev,
                              section3_2: {
                                ...prev.section3_2,
                                noDocumentAvailable: noDocument,
                                file: noDocument ? null : prev.section3_2?.file,
                              },
                            }));

                            // Also update submissionData
                            setSubmissionState((prevSubmission: any) => {
                              if (!prevSubmission) return prevSubmission;
                              const pppDev =
                                prevSubmission?.formData?.pppDevelopment || {};
                              return {
                                ...prevSubmission,
                                formData: {
                                  ...prevSubmission.formData,
                                  pppDevelopment: {
                                    ...pppDev,
                                    section3_2: {
                                      ...pppDev.section3_2,
                                      noDocumentAvailable: noDocument,
                                      file: noDocument
                                        ? null
                                        : pppDev.section3_2?.file,
                                    },
                                  },
                                },
                              };
                            });

                            // Clear validation error
                            if (getFieldError("section3_2.file")) {
                              setIndicatorValidationErrors((prev) => {
                                const updated = { ...prev };
                                delete updated["section3_2.file"];
                                return updated;
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor="no-doc-3.2"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          No document available
                        </label>
                      </div>
                    )}

                    {state?.section3_2?.noDocumentAvailable &&
                    !(
                      state?.section3_2?.file?.file ||
                      state?.section3_2?.file?.fileName ||
                      state?.section3_2?.file?.filePath
                    ) ? (
                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                        No document available
                      </div>
                    ) : (
                      <EditableFileDisplay
                        files={state?.section3_2?.file ?? null}
                        isEditable={shouldBeEditable("3.2")}
                        submissionId={submissionId}
                        onFilesChange={(updatedFile) => {
                          handleFileUpdate("3.2", updatedFile);
                          // Clear validation error when file is uploaded
                          if (getFieldError("section3_2.file")) {
                            setIndicatorValidationErrors((prev) => {
                              const updated = { ...prev };
                              delete updated["section3_2.file"];
                              return updated;
                            });
                          }
                        }}
                        label="Uploaded File"
                        multiple={false}
                      />
                    )}
                    {renderFieldError("section3_2.file")}
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
                            setIndicatorValidationErrors((prev) => {
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
                    {renderFieldError("section3_2.comment")}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Upload notification or mandate
                </p>
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="3.2"
                    toggleState={indicatorScoreToggleState["3.2"] || "score"}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 3.3 */}
        {sectionsWithData.includes("section3_3") && (
          <SectionCard
            key="section-3.3"
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
            indicatorCode="3.3"
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.3")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("3.3")}
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                {/* Yes/No - same pattern as 3.2 / 2.2 */}
                <div>
                  <Label className="mb-3 block">
                    Are there any proposals submitted under VGF/IIPDF?*
                  </Label>
                  {shouldBeEditable("3.3") ? (
                    <RadioGroup
                      value={state?.section3_3?.available || ""}
                      onValueChange={(value: "yes" | "no") => {
                        setFormDataState((prev: any) => ({
                          ...prev,
                          section3_3: {
                            ...(prev?.section3_3 || {}),
                            available: value,
                            comment: value === "no" ? (prev?.section3_3?.comment ?? "") : "",
                            VGFArray:
                              value === "no"
                                ? []
                                : Array.isArray(prev?.section3_3?.VGFArray) &&
                                    prev.section3_3.VGFArray.length > 0
                                  ? prev.section3_3.VGFArray
                                  : [
                                      {
                                        projectName: "",
                                        sector: "",
                                        scheme: "",
                                        submissionDate: "",
                                        totalProjectCost: "",
                                        statusOfProject: "",
                                        file: null,
                                        noDocumentAvailable: false,
                                      },
                                    ],
                          },
                        }));
                        if (value === "no") setShowAddVGFForm(false);
                        if (getFieldError("section3_3.available")) {
                          setIndicatorValidationErrors((prev) => {
                            const updated = { ...prev };
                            delete updated["section3_3.available"];
                            return updated;
                          });
                        }
                      }}
                      className="flex flex-row gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="3.3-yes" />
                        <Label htmlFor="3.3-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="3.3-no" />
                        <Label htmlFor="3.3-no">No</Label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          state?.section3_3?.available === "yes"
                            ? "bg-green-100 text-green-800"
                            : state?.section3_3?.available === "no"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {state?.section3_3?.available === "yes"
                          ? "Yes"
                          : state?.section3_3?.available === "no"
                            ? "No"
                            : "Not specified"}
                      </span>
                    </div>
                  )}
                  {renderFieldError("section3_3.available")}
                </div>

                {/* When No: Comment block - same as 3.2 / 2.2 */}
                {state?.section3_3?.available === "no" && (
                  <div>
                    <Label className="mb-2 block">Comment</Label>
                    {shouldBeEditable("3.3") ? (
                      <Textarea
                        value={state?.section3_3?.comment ?? ""}
                        onChange={(e) =>
                          setFormDataState((prev: any) => ({
                            ...prev,
                            section3_3: {
                              ...(prev?.section3_3 || {}),
                              comment: e.target.value,
                            },
                          }))
                        }
                        placeholder="Please provide a comment..."
                        className={
                          getFieldError("section3_3.comment")
                            ? "min-h-[100px] border-red-500"
                            : "min-h-[100px]"
                        }
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md text-sm">
                        {state?.section3_3?.comment || "No comment provided"}
                      </div>
                    )}
                    {renderFieldError("section3_3.comment")}
                  </div>
                )}

                {/* When Yes: proposals table and Add More */}
                {state?.section3_3?.available === "yes" && (
                <>
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
                          Scheme
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Total Project Cost (INR-CRORE)
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Status of Project
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal min-w-[180px]">
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
                      key={`vgf-table-body-${selectResetKey}-${
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
                                colSpan={shouldBeEditable("3.3") ? 8 : 7}
                                className="py-8 text-center text-muted-foreground"
                              >
                                No VGF/IIPDF proposals data available
                              </td>
                            </tr>
                          );
                        }

                        return VGFArray.map((item: any, index: number) => {
                          const isEditable3_3 = shouldBeEditable("3.3");
                          console.log(
                            `[PPPDevelopmentReview] Rendering row ${index} for section 3.3:`,
                            {
                              itemId: item.id,
                              index,
                              isEditable3_3,
                              willShowDeleteButton: isEditable3_3,
                            }
                          );
                          return (
                            <tr key={item.id || index} className="border-b">
                              <td className="py-3 px-4 text-sm font-normal">
                                {isEditable3_3 ? (
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
                                        getFieldError(
                                          `section3_3.VGFArray.${index}.projectName`
                                        )
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                    />
                                    {renderFieldError(
                                      `section3_3.VGFArray.${index}.projectName`
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
                                        handleTableFieldUpdate(
                                          index,
                                          "sector",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        className={
                                          getFieldError(
                                            `section3_3.VGFArray.${index}.sector`
                                          )
                                            ? "w-full border-red-500"
                                            : "w-full"
                                        }
                                      >
                                        <SelectValue placeholder="Select sector" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {SECTOR_OPTIONS.map((sector) => (
                                          <SelectItem
                                            key={sector}
                                            value={sector}
                                          >
                                            {sector}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {getFieldError(
                                      `section3_3.VGFArray.${index}.sector`
                                    ) && (
                                      <p className="text-sm text-red-500 mt-1">
                                        {getFieldError(
                                          `section3_3.VGFArray.${index}.sector`
                                        )}
                                      </p>
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
                                      key={`scheme-${index}-${selectResetKey}`}
                                      value={item.scheme || ""}
                                      onValueChange={(value) =>
                                        handleTableFieldUpdate(
                                          index,
                                          "scheme",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        className={
                                          getFieldError(
                                            `section3_3.VGFArray.${index}.scheme`
                                          )
                                            ? "w-full border-red-500"
                                            : "w-full"
                                        }
                                      >
                                        <SelectValue placeholder="Select scheme" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="IIPDF">
                                          IIPDF
                                        </SelectItem>
                                        <SelectItem value="Central VGF">
                                          Central VGF
                                        </SelectItem>
                                        <SelectItem value="State VGF">
                                          State VGF
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {getFieldError(
                                      `section3_3.VGFArray.${index}.scheme`
                                    ) && (
                                      <p className="text-sm text-red-500 mt-1">
                                        {getFieldError(
                                          `section3_3.VGFArray.${index}.statusOfProject`
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  item.scheme || ""
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("3.3") ? (
                                  <div>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.01"
                                      min="0"
                                      placeholder="Enter project cost in crores"
                                      value={item.totalProjectCost || ""}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (
                                          value === "" ||
                                          /^\d*\.?\d*$/.test(value)
                                        ) {
                                          handleTableFieldUpdate(
                                            index,
                                            "totalProjectCost",
                                            value
                                          );
                                        }
                                      }}
                                      className={
                                        getFieldError(
                                          `section3_3.VGFArray.${index}.totalProjectCost`
                                        )
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                    />
                                    {getFieldError(
                                      `section3_3.VGFArray.${index}.totalProjectCost`
                                    ) && (
                                      <p className="text-sm text-red-500 mt-1">
                                        {getFieldError(
                                          `section3_3.VGFArray.${index}.totalProjectCost`
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  item.totalProjectCost || "-"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("3.3") ? (
                                  <div>
                                    <Select
                                      key={`status-${index}-${selectResetKey}`}
                                      value={item.statusOfProject || ""}
                                      onValueChange={(value) =>
                                        handleTableFieldUpdate(
                                          index,
                                          "statusOfProject",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        className={
                                          getFieldError(
                                            `section3_3.VGFArray.${index}.statusOfProject`
                                          )
                                            ? "w-full border-red-500"
                                            : "w-full"
                                        }
                                      >
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {PROJECT_STATUS_OPTIONS.map(
                                          (status) => (
                                            <SelectItem
                                              key={status}
                                              value={status}
                                            >
                                              {status}
                                            </SelectItem>
                                          )
                                        )}
                                      </SelectContent>
                                    </Select>
                                    {getFieldError(
                                      `section3_3.VGFArray.${index}.statusOfProject`
                                    ) && (
                                      <p className="text-sm text-red-500 mt-1">
                                        {getFieldError(
                                          `section3_3.VGFArray.${index}.statusOfProject`
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  item.statusOfProject || "-"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal min-w-[180px]">
                                {shouldBeEditable("3.3") ? (
                                  <div>
                                    <Input
                                      type="date"
                                      max={
                                        new Date().toISOString().split("T")[0]
                                      }
                                      value={
                                        item.submissionDate
                                          ? (() => {
                                              const d = new Date(
                                                item.submissionDate
                                              );
                                              if (isNaN(d.getTime())) return "";
                                              const year = d.getFullYear();
                                              const month = String(
                                                d.getMonth() + 1
                                              ).padStart(2, "0");
                                              const day = String(
                                                d.getDate()
                                              ).padStart(2, "0");
                                              return `${year}-${month}-${day}`;
                                            })()
                                          : ""
                                      }
                                      onChange={(e) => {
                                        handleTableFieldUpdate(
                                          index,
                                          "submissionDate",
                                          e.target.value
                                            ? new Date(
                                                e.target.value
                                              ).toISOString()
                                            : ""
                                        );
                                      }}
                                      className={
                                        getFieldError(
                                          `section3_3.VGFArray.${index}.submissionDate`
                                        )
                                          ? "w-full border-red-500"
                                          : "w-full"
                                      }
                                    />
                                    {getFieldError(
                                      `section3_3.VGFArray.${index}.submissionDate`
                                    ) && (
                                      <p className="text-sm text-red-500 mt-1">
                                        {getFieldError(
                                          `section3_3.VGFArray.${index}.submissionDate`
                                        )}
                                      </p>
                                    )}
                                  </div>
                                ) : item.submissionDate ? (
                                  new Date(
                                    item.submissionDate
                                  ).toLocaleDateString()
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {shouldBeEditable("3.3") ? (
                                  <div className="space-y-1.5">
                                    {/* No Document Available Checkbox */}
                                    <div className="flex items-center space-x-2 py-1">
                                      <Checkbox
                                        id={`no-doc-3.3-${index}`}
                                        checked={
                                          item.noDocumentAvailable || false
                                        }
                                        onCheckedChange={(checked) => {
                                          const noDocument = checked as boolean;
                                          // Update noDocumentAvailable and clear file if checked
                                          setFormDataState((prev: any) => {
                                            const current =
                                              prev?.section3_3?.VGFArray;
                                            const rows = Array.isArray(current)
                                              ? [...current]
                                              : [];
                                            const currentRow = {
                                              ...(rows[index] || {}),
                                            };
                                            currentRow.noDocumentAvailable =
                                              noDocument;
                                            currentRow.file = noDocument
                                              ? null
                                              : currentRow.file;
                                            rows[index] = currentRow;
                                            return {
                                              ...prev,
                                              section3_3: {
                                                ...(prev?.section3_3 || {}),
                                                VGFArray: rows,
                                              },
                                            };
                                          });

                                          // Clear validation error
                                          if (
                                            getFieldError(
                                              `section3_3.VGFArray.${index}.file`
                                            )
                                          ) {
                                            setIndicatorValidationErrors(
                                              (prev) => {
                                                const updated = { ...prev };
                                                delete updated[
                                                  `section3_3.VGFArray.${index}.file`
                                                ];
                                                return updated;
                                              }
                                            );
                                          }
                                        }}
                                      />
                                      <label
                                        htmlFor={`no-doc-3.3-${index}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                      >
                                        No document available
                                      </label>
                                    </div>

                                    {item.noDocumentAvailable ? (
                                      <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                        No document available
                                      </div>
                                    ) : (
                                      <>
                                        {/* Only show ONE file (single file upload) */}
                                        {item.file ? (
                                          <div className="flex flex-wrap gap-1.5">
                                            <Badge
                                              variant="secondary"
                                              className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[180px] group"
                                              title={
                                                extractOriginalName(
                                                  item.file.fileName || "",
                                                  (item.file as any)
                                                    ?.originalName
                                                ) || "Unknown file"
                                              }
                                            >
                                              <Upload className="w-3 h-3 flex-shrink-0" />
                                              <span className="truncate">
                                                {extractOriginalName(
                                                  item.file.fileName || "",
                                                  (item.file as any)
                                                    ?.originalName
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
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-xs">
                                            No file
                                          </span>
                                        )}
                                        {/* Upload button for both add and replace */}
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
                                                    originalName:
                                                      selectedFile.name ||
                                                      fileData.originalName ||
                                                      fileData.data
                                                        ?.originalName, // Preserve original file name
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

                                                  // Update file and clear noDocumentAvailable
                                                  setFormDataState(
                                                    (prev: any) => {
                                                      const current =
                                                        prev?.section3_3
                                                          ?.VGFArray;
                                                      const rows =
                                                        Array.isArray(current)
                                                          ? [...current]
                                                          : [];
                                                      const currentRow = {
                                                        ...(rows[index] || {}),
                                                      };
                                                      currentRow.file = newFile;
                                                      currentRow.noDocumentAvailable =
                                                        false;
                                                      rows[index] = currentRow;
                                                      return {
                                                        ...prev,
                                                        section3_3: {
                                                          ...(prev?.section3_3 ||
                                                            {}),
                                                          VGFArray: rows,
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
                                            <Upload className="w-3 h-3 mr-1" />
                                            Upload
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : item.noDocumentAvailable ? (
                                  <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                                    No document available
                                  </div>
                                ) : item.file ? (
                                  <div className="flex items-center gap-1">
                                    <Badge
                                      variant="secondary"
                                      className="text-xs px-2 py-0.5 flex items-center gap-1 max-w-[200px]"
                                      title={
                                        (item.file as any).originalName ||
                                        item.file.fileName ||
                                        "Unknown file"
                                      }
                                    >
                                      <Upload className="w-3 h-3" />
                                      <span className="truncate">
                                        {(item.file as any).originalName ||
                                          item.file.fileName ||
                                          "Unknown file"}
                                      </span>
                                    </Badge>
                                    {(() => {
                                      const fileKey = `3.3-${index}`;
                                      const isLoading = !!fileLoading[fileKey];
                                      const hasFileAccess = !!(
                                        item.file.filePath ||
                                        item.file.file ||
                                        item.file.fileUrl
                                      );
                                      return hasFileAccess ? (
                                        <>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleViewFile(item.file, fileKey)
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
                                                item.file,
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
                              {isEditable3_3 && (
                                <td className="py-3 px-4 text-sm font-normal">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log(
                                        `[PPPDevelopmentReview] Delete button clicked for item:`,
                                        {
                                          itemId: item.id,
                                          index,
                                          item,
                                          timestamp: new Date().toISOString(),
                                        }
                                      );
                                      // Use index for deletion since items may not have IDs
                                      handleRemoveVGFEntry(index);
                                    }}
                                    className="text-red-500 hover:text-red-700 border-none bg-none cursor-pointer"
                                    disabled={false}
                                    title="Delete entry"
                                  >
                                    <Trash2 className="h-5 w-5" />
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

                {/* Add More Project Button - Only visible when in edit mode */}
                {shouldBeEditable("3.3") && !showAddVGFForm && (
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
                {showAddVGFForm && shouldBeEditable("3.3") && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">
                      Add New VGF/IIPDF Proposal
                    </h4>
                    {/* Row 1: Project Name, Sector, Scheme */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                        <Label>Scheme</Label>
                        <Select
                          value={newVGFItem.scheme}
                          onValueChange={(value) =>
                            setNewVGFItem({ ...newVGFItem, scheme: value })
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select scheme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IIPDF">IIPDF</SelectItem>
                            <SelectItem value="Central VGF">
                              Central VGF
                            </SelectItem>
                            <SelectItem value="State VGF">State VGF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Row 2: Total Project Cost, Status of Project, Submission Date */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label>Total Project Cost (INR-CRORE)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="Enter project cost in crores"
                          value={newVGFItem.totalProjectCost}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setNewVGFItem({
                                ...newVGFItem,
                                totalProjectCost: value,
                              });
                            }
                          }}
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label>Status of Project</Label>
                        <Select
                          value={newVGFItem.statusOfProject}
                          onValueChange={(value) =>
                            setNewVGFItem({
                              ...newVGFItem,
                              statusOfProject: value,
                            })
                          }
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROJECT_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Submission Date</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split("T")[0]}
                          value={formatDateForInput(newVGFItem.submissionDate)}
                          onChange={(e) => {
                            setNewVGFItem({
                              ...newVGFItem,
                              submissionDate: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            });
                          }}
                          className={cn(
                            "w-full bg-[#fff] border border-[#C6C6C6]",
                            !newVGFItem.submissionDate &&
                              "text-muted-foreground"
                          )}
                        />
                      </div>
                    </div>
                    {/* Row 3: File Upload */}
                    <div className="mb-4">
                      {/* No Document Available Checkbox */}
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="no-doc-3.3-new"
                          checked={newVGFItem.noDocumentAvailable || false}
                          onCheckedChange={(checked) => {
                            const noDocument = checked as boolean;
                            setNewVGFItem({
                              ...newVGFItem,
                              noDocumentAvailable: noDocument,
                              file: noDocument ? null : newVGFItem.file,
                            });
                          }}
                        />
                        <label
                          htmlFor="no-doc-3.3-new"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          No document available
                        </label>
                      </div>

                      {newVGFItem.noDocumentAvailable ? (
                        <div className="px-3 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
                          No document available
                        </div>
                      ) : (
                        <>
                          <Label>Upload File</Label>
                          <EditableFileDisplay
                            files={newVGFItem.file}
                            isEditable={true}
                            submissionId={submissionId}
                            onFilesChange={(updatedFile) => {
                              setNewVGFItem({
                                ...newVGFItem,
                                file: updatedFile as FileUpload | null,
                                noDocumentAvailable: false,
                              });
                            }}
                            label=""
                            multiple={false}
                          />
                        </>
                      )}
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
                </>
                )}
                {/* <p className="text-xs text-muted-foreground">
                Annex 7: Provide VGF/IIPDF details
              </p> */}
              </div>
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="3.3"
                    toggleState={indicatorScoreToggleState["3.3"] || "score"}
                  />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Section 3.4 */}
        {sectionsWithData.includes("section3_4") && (
          <SectionCard
            key="section-3.4"
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
            indicatorCode="3.4"
            className="mb-6"
          >
            {/* Show MOSPI_REVIEWER comments for MOSPI_APPROVER */}
            {renderMOSPIReviewerComments("3.4")}
            {/* Show validation error message if save failed */}
            {renderSectionValidationMessage("3.4")}
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
            <div className="flex gap-6 items-start justify-between">
              <div className="flex-1 space-y-4">
                {/* Summary Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label>Total Budgeted capital allocation (INR-CRORE)</Label>
                    {shouldBeEditable("3.4") ? (
                      <div>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          step="0.01"
                          value={state?.section3_4?.totalProjectsAwarded || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow non-negative numbers with decimals (up to 2 decimal places)
                            if (
                              value === "" ||
                              /^\d+(\.\d{1,2})?$/.test(value)
                            ) {
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
                          placeholder="Enter total budgeted capital allocation"
                        />
                        {getFieldError("section3_4.totalProjectsAwarded") && (
                          <p className="text-sm text-red-500 mt-1">
                            {getFieldError("section3_4.totalProjectsAwarded")}
                          </p>
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
                    <Label>Total of TPC of PPP Projects (INR-CRORE) </Label>
                    {/* <p className="text-xs text-muted-foreground mt-1">INR-CRORE </p> */}
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={calculatedTotalProjectCostAwarded || ""}
                      readOnly
                      disabled
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Auto-calculated"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Automatically calculated from sum of all project costs
                    </p>
                    {getFieldError("section3_4.totalProjectCostAwarded") && (
                      <p className="text-sm text-red-500 mt-1">
                        {getFieldError("section3_4.totalProjectCostAwarded")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Projects Table */}
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-2 px-2 text-left rounded-tl-xl text-sm font-normal">
                          Name of Project
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Infrastructure Sector
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Date of Award
                        </th>
                        <th className="py-2 px-2 text-left text-sm font-normal">
                          Total Project Cost
                        </th>
                        {shouldBeEditable("3.4") && (
                          <th className="py-2 px-2 text-center rounded-tr-xl text-sm font-normal w-12">
                            Action
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody
                      key={`projects-table-body-${selectResetKey}-${
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
                                colSpan={shouldBeEditable("3.4") ? 5 : 4}
                                className="py-8 text-center text-muted-foreground"
                              >
                                No projects available
                              </td>
                            </tr>
                          );
                        }

                        return projects.map((project: any, idx: number) => (
                          <tr key={project.id || idx} className="border-b">
                            <td className="py-2 px-2 text-sm font-normal">
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
                                  className="w-full h-8 text-sm"
                                />
                              ) : (
                                project.nameOfProject || "N/A"
                              )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
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
                                  <SelectTrigger
                                    className={cn(
                                      "w-full h-8 text-sm",
                                      getFieldError(
                                        `section3_4.projects.${idx}.infrastructureSector`
                                      ) && "border-red-500"
                                    )}
                                  >
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
                              {shouldBeEditable("3.4") &&
                                getFieldError(
                                  `section3_4.projects.${idx}.infrastructureSector`
                                ) && (
                                  <p className="text-sm text-red-500 mt-1">
                                    {getFieldError(
                                      `section3_4.projects.${idx}.infrastructureSector`
                                    )}
                                  </p>
                                )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
                              {shouldBeEditable("3.4") ? (
                                <Input
                                  type="date"
                                  max={new Date().toISOString().split("T")[0]}
                                  value={
                                    project.dateOfAward
                                      ? new Date(project.dateOfAward)
                                          .toISOString()
                                          .split("T")[0]
                                      : ""
                                  }
                                  onChange={(e) => {
                                    handleProjectFieldUpdate(
                                      idx,
                                      "dateOfAward",
                                      e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : null
                                    );
                                  }}
                                  className={cn(
                                    "w-full h-8 text-sm bg-[#fff] border border-[#C6C6C6]",
                                    !project.dateOfAward &&
                                      "text-muted-foreground"
                                  )}
                                />
                              ) : project.dateOfAward ? (
                                format(
                                  new Date(project.dateOfAward),
                                  "dd-MM-yyyy"
                                )
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="py-2 px-2 text-sm font-normal">
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
                                    if (
                                      value === "" ||
                                      /^\d*\.?\d*$/.test(value)
                                    ) {
                                      handleProjectFieldUpdate(
                                        idx,
                                        "totalProjectCost",
                                        value
                                      );
                                    }
                                  }}
                                  className="w-full h-8 text-sm"
                                  placeholder="Enter cost"
                                />
                              ) : (
                                project.totalProjectCost || "N/A"
                              )}
                            </td>
                            {shouldBeEditable("3.4") && (
                              <td className="py-2 px-2 text-sm font-normal text-center w-12">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    // Use index for deletion since items may not have IDs
                                    handleRemoveProjectEntry(idx);
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

                {/* Add More Project Button - Only visible when in edit mode */}
                {shouldBeEditable("3.4") && !showAddProjectForm && (
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
                {showAddProjectForm && shouldBeEditable("3.4") && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Add New Project</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name of Awarded PPP Projects</Label>
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
                        <Label>
                          Infrastructure Sector{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={newProject.infrastructureSector}
                          onValueChange={(value) =>
                            setNewProject({
                              ...newProject,
                              infrastructureSector: value,
                            })
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "bg-white",
                              getFieldError(
                                "section3_4.projects.new.infrastructureSector"
                              ) && "border-red-500"
                            )}
                          >
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
                        {getFieldError(
                          "section3_4.projects.new.infrastructureSector"
                        ) && (
                          <p className="text-sm text-red-500 mt-1">
                            {getFieldError(
                              "section3_4.projects.new.infrastructureSector"
                            )}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Date of Award</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split("T")[0]}
                          value={formatDateForInput(newProject.dateOfAward)}
                          onChange={(e) => {
                            setNewProject({
                              ...newProject,
                              dateOfAward: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : "",
                            });
                          }}
                          className={cn(
                            "w-full bg-[#fff] border border-[#C6C6C6]",
                            !newProject.dateOfAward && "text-muted-foreground"
                          )}
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
              {/* Score Display on the right for MOSPI_APPROVER - positioned at top-right edge */}
              {getUserRole() === "MOSPI_APPROVER" && (
                <div className="flex-shrink-0 self-start ml-auto">
                  <IndicatorScoreDisplay
                    submissionId={submissionId}
                    indicatorCode="3.4"
                    toggleState={indicatorScoreToggleState["3.4"] || "score"}
                  />
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

      {/* Dependency Warning Dialog for MOSPI_APPROVER - Indicator 3.4 depends on 1.1 */}
      <AlertDialog open={showDependencyWarning} onOpenChange={setShowDependencyWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dependent Indicators</AlertDialogTitle>
            <AlertDialogDescription>
              {dependencySectionId && (() => {
                const dependencyCheck = checkDependentIndicatorStatus(dependencySectionId);
                const dependentIndicators = dependencyCheck.dependentIndicators.length > 0 
                  ? dependencyCheck.dependentIndicators 
                  : [dependencySectionId, dependencyCheck.otherSectionId].filter(Boolean);
                
                return (
                  <div className="space-y-3">
                    <p className="text-sm">
                      Indicators <strong>1.1</strong>, <strong>1.2</strong>, and <strong>3.4</strong> are dependent on each other.
                    </p>
                    <p className="text-sm font-medium">
                      {dependencyAction === "accept"
                        ? `If you accept indicator ${dependencySectionId}, you must also accept ${dependentIndicators.filter(id => id !== dependencySectionId).map(id => `indicator ${id}`).join(" and ")}.`
                        : `If you send back indicator ${dependencySectionId}, you must also send back ${dependentIndicators.filter(id => id !== dependencySectionId).map(id => `indicator ${id}`).join(" and ")}.`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Please choose an action:
                    </p>
                  </div>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelDependencyWarning}>
              Cancel
            </AlertDialogCancel>
            {dependencyAction === "accept" ? (
              <AlertDialogAction onClick={handleAcceptBothIndicators} className="bg-primary text-primary-foreground">
                Accept All Indicators
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleSendBackBothIndicators} className="bg-destructive text-destructive-foreground">
                Send Back All Indicators
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
