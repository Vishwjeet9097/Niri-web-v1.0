/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SectionCard } from "../components/SectionCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import {
  IMPACT_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  SUBMISSION_STEPS,
  SECTOR_OPTIONS,
  OWNERSHIP_OPTIONS,
} from "../constants/steps";
import type { InfraEnablersData, FileUpload } from "../types";
import { FileUploadSection } from "../components/FileUploadSection";
import { draftService } from "@/services/draft.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { FormActions } from "../components/FormActions";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { apiService } from "@/services/api.service";
import { computeStepProgress } from "../utils/progress";
import { cn } from "@/lib/utils";
import {
  validateInfraEnablers,
  type InfraEnablersValidationResult,
} from "../validation/infraEnablersValidation";
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

const defaultData: InfraEnablersData = {
  section4_1: {
    allEligible: "",
    websiteLink: "",
    comment: "",
  },
  section4_2: {
    available: "",
    file: null,
    comment: "",
  },
  section4_3: {
    adopted: "",
    projects: [],
    comment: "",
  },
  section4_4: {
    adopted: "",
    file: null,
    comment: "",
  },
  section4_5: {
    implemented: "",
    practices: [],
    comment: "",
  },
  section4_6: {
    participated: "",
    capacityArray: [],
    comment: "",
  },
};

export const InfraEnablersStep = () => {
  const { currentStep, goToStep, goToNext, goToPrevious, isLastStep } =
    useStepNavigation(4);
  const { getStepData, updateFormData } = useFormPersistence();

  // Detect edit mode to hide empty indicators
  const isEditMode =
    typeof window !== "undefined" &&
    localStorage.getItem("is_edit_mode") === "true";
  const { user } = useAuth();
  const [sectionStatus, setSectionStatus] = useState<any>({
    completedIndicators: [],
    completedCount: 0,
    totalAssigned: 0,
  });

  // Indicator access
  const {
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    refresh,
    loading: indicatorLoading,
    error: indicatorError,
  } = useIndicatorAccess();

  useEffect(() => {
    console.log("🔍 InfraEnablersStep: Access control state", {
      isNodalOfficer,
      isStateApprover,
      assignedIndicators,
      availableIndicators,
      indicatorLoading,
      indicatorError,
      user,
    });
  }, [
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    indicatorLoading,
    indicatorError,
    user,
  ]);

  // Defensive: always ensure array fields are initialized
  function safeInfraEnablersFormData(
    data: Partial<InfraEnablersData>
  ): InfraEnablersData {
    return {
      ...defaultData,
      ...data,
      section4_1: {
        ...defaultData.section4_1,
        ...(data.section4_1 || {}),
        status: (data.section4_1 as any)?.status,
      },
      section4_2: {
        ...defaultData.section4_2,
        ...(data.section4_2 || {}),
        status: (data.section4_2 as any)?.status,
      },
      section4_3: {
        ...defaultData.section4_3,
        ...(data.section4_3 || {}),
        projects: Array.isArray(data.section4_3?.projects)
          ? data.section4_3.projects
          : [],
        status: (data.section4_3 as any)?.status,
      },
      section4_4: {
        ...defaultData.section4_4,
        ...(data.section4_4 || {}),
        status: (data.section4_4 as any)?.status,
      },
      section4_5: {
        ...defaultData.section4_5,
        ...(data.section4_5 || {}),
        practices: Array.isArray(data.section4_5?.practices)
          ? data.section4_5.practices
          : [],
        status: (data.section4_5 as any)?.status,
      },
      section4_6: {
        ...defaultData.section4_6,
        ...(data.section4_6 || {}),
        capacityArray: Array.isArray(data.section4_6?.capacityArray)
          ? data.section4_6.capacityArray
          : [],
        status: (data.section4_6 as any)?.status,
      },
    };
  }

  const loadedData =
    (getStepData("infraEnablers") as Partial<InfraEnablersData>) || {};
  const initialData: InfraEnablersData = safeInfraEnablersFormData(loadedData);

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [submittingIndicator, setSubmittingIndicator] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pendingIndicator, setPendingIndicator] = useState<{
    code: string;
    title: string;
  } | null>(null);
  // Track which indicators are in edit mode (for sent back indicators)
  const [editingIndicators, setEditingIndicators] = useState<Set<string>>(
    new Set()
  );
  const [savingIndicators, setSavingIndicators] = useState<Set<string>>(
    new Set()
  );
  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveIndicatorCode, setPendingSaveIndicatorCode] = useState<
    string | null
  >(null);
  // Track which indicator is being validated and its specific errors
  const [validatingIndicator, setValidatingIndicator] = useState<string | null>(null);
  const [indicatorValidationErrors, setIndicatorValidationErrors] = useState<Record<string, string>>({});
  
  // State for submissionId to enable immediate file uploads
  const [submissionId, setSubmissionId] = useState<string | undefined>();
  
  const { toast } = useToast();

  // On mount, fetch submission from DB and populate form
  // Helper to merge normalized and legacy data for each section
  function getSectionFromNormalizedOrLegacy(
    normalized: any,
    legacy: any,
    code: string
  ) {
    if (
      normalized &&
      normalized.byIndicatorCode &&
      normalized.byIndicatorCode[code]
    ) {
      return { ...legacy, ...normalized.byIndicatorCode[code] };
    }
    return legacy || {};
  }

  useEffect(() => {
    if (!user || !user.id || isDataLoaded) return;

    (async () => {
      try {
        const submissionsResp = await apiService.getSubmissions(1, 100);
        const userSubmission = submissionsResp.submissions.find(
          (sub: any) =>
            sub.status === "DRAFT" ||
            sub.status === "IN_PROGRESS" ||
            sub.status === "RETURNED_FROM_STATE" ||
            sub.status === "PENDING_STATE_APPROVAL"
        );
        
        // Set submissionId for immediate file uploads
        if (userSubmission?.id) {
          setSubmissionId(userSubmission.id);
          console.log("✅ Found existing submissionId:", userSubmission.id);
        } else {
          console.log("ℹ️ No existing submission found, files will upload on submit");
        }

        let sectionStatusFromDB = undefined;
        if (userSubmission && userSubmission.id) {
          const fullSubmission = await apiService.getSubmission(
            userSubmission.id
          );
          let parsedFormData = fullSubmission.formData;
          if (typeof fullSubmission.formData === "string") {
            try {
              parsedFormData = JSON.parse(fullSubmission.formData);
            } catch (e) {}
          }
          // Restore section_status from DB if present
          sectionStatusFromDB = fullSubmission.section_status;
          // Ensure sectionStatus is always an object with completedIndicators array
          setSectionStatus(
            sectionStatusFromDB || {
              completedIndicators: [],
              completedCount: 0,
              totalAssigned: 0,
            }
          );
          const normalized = parsedFormData?.normalizedFormData;
          const legacy = parsedFormData?.infraEnablers || {};
          const newFormData: InfraEnablersData = safeInfraEnablersFormData({
            section4_1: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_1,
                "4.1"
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_1,
                "4.1"
              )?.status,
            },
            section4_2: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_2,
                "4.2"
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_2,
                "4.2"
              )?.status,
            },
            section4_3: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_3,
                "4.3"
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_3,
                "4.3"
              )?.status,
            },
            section4_4: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_4,
                "4.4"
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_4,
                "4.4"
              )?.status,
            },
            section4_5: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_5,
                "4.5"
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_5,
                "4.5"
              )?.status,
            },
            section4_6: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_6,
                "4.6"
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_6,
                "4.6"
              )?.status,
            },
          });
          setFormData(newFormData);
          setIsDataLoaded(true);
        } else {
          // No submission found, but still initialize sectionStatus
          setSectionStatus({
            completedIndicators: [],
            completedCount: 0,
            totalAssigned: 0,
          });
          setIsDataLoaded(true);
        }
      } catch (e) {
        // On error, still initialize sectionStatus to prevent undefined state
        setSectionStatus({
          completedIndicators: [],
          completedCount: 0,
          totalAssigned: 0,
        });
        setIsDataLoaded(true);
      }
    })();
  }, [user, isDataLoaded]);

  // Unified access control for both roles - calculate before validation
  const sectionIndicators = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"];
  const allowedIndicators =
    (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter((i) =>
      sectionIndicators.includes(i)
    ) || [];

  console.log("🟢 InfraEnablersStep: Allowed indicators", allowedIndicators);

  // Validation - only validate sections that are accessible based on indicators
  const validation: InfraEnablersValidationResult = useMemo(() => {
    // Determine which indicators to validate
    // For Nodal Officer or State Approver: only validate assigned/available indicators
    // For others: validate all (no restrictions)
    const indicatorsToValidate =
      (isNodalOfficer || isStateApprover) && allowedIndicators.length > 0
        ? allowedIndicators
        : undefined; // undefined means validate all (backward compatibility)

    return validateInfraEnablers(formData, {
      allowedIndicators: indicatorsToValidate,
    });
  }, [formData, isNodalOfficer, isStateApprover, allowedIndicators]);
  const isNextDisabled = false; // Validation disabled - Next button always enabled

  // Debug logging
  useEffect(() => {
    console.log("🔍 InfraEnablersStep Validation:", {
      isValid: validation.isValid,
      errors: validation.errors,
      allowedIndicators,
      isNodalOfficer,
      isStateApprover,
      section4_1_allEligible: formData.section4_1.allEligible,
      section4_2_available: formData.section4_2.available,
      section4_3_adopted: formData.section4_3.adopted,
      section4_3_projects_count: formData.section4_3.projects.length,
      section4_4_adopted: formData.section4_4.adopted,
      section4_5_implemented: formData.section4_5.implemented,
      section4_5_practices_count: formData.section4_5.practices.length,
      section4_6_participated: formData.section4_6.participated,
      section4_6_capacity_count: formData.section4_6.capacityArray.length,
    });
  }, [
    validation,
    formData,
    allowedIndicators,
    isNodalOfficer,
    isStateApprover,
  ]);

  // Helper functions for error display
  const getFieldError = (fieldPath: string): string | undefined => {
    if (!showValidationErrors) return undefined;
    
    // If validating a specific indicator, only show errors for that indicator
    if (validatingIndicator) {
      const sectionPrefix = `section${validatingIndicator.replace(".", "_")}`;
      if (fieldPath.startsWith(sectionPrefix)) {
        return indicatorValidationErrors[fieldPath];
      }
      return undefined; // Don't show errors for other indicators
    }
    
    // Otherwise, show all errors (for form-level validation)
    return validation.errors[fieldPath];
  };

  const renderFieldError = (fieldPath: string) => {
    const error = getFieldError(fieldPath);
    if (!error || !showValidationErrors) return null;
    return <p className="text-sm text-destructive mt-1">{error}</p>;
  };

  const getInputValidationClass = (fieldPath: string): string => {
    const error = getFieldError(fieldPath);
    if (!error || !showValidationErrors) return "";
    return "border-destructive focus-visible:ring-destructive";
  };

  const showErrorsIfNeeded = () => {
    if (!validation.isValid) {
      setShowValidationErrors(true);
    }
  };

  // Sync with persisted localStorage step data when component mounts or getStepData changes
  useEffect(() => {
    const currentStepData = getStepData(
      "infraEnablers"
    ) as Partial<InfraEnablersData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: InfraEnablersData =
        safeInfraEnablersFormData(currentStepData);
      setFormData(syncedData);
      console.log(
        "🔄 Synced infraEnablers data from localStorage in normal flow:",
        syncedData
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStepData]);

  // Initialize form data only once when component mounts (editing_submission)
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log(
          "🔍 Direct editing submission check in InfraEnablersStep:",
          submissionData
        );

        if (submissionData.formData && submissionData.formData.infraEnablers) {
          const stepData = submissionData.formData
            .infraEnablers as Partial<InfraEnablersData>;
          const updatedData: InfraEnablersData =
            safeInfraEnablersFormData(stepData);
          setFormData(updatedData);
          console.log(
            "✅ Direct prefill from editing submission:",
            updatedData
          );

          // Clear the editing submission data after successful prefill
          localStorage.removeItem("editing_submission");
        }
      } catch (error) {
        console.error(
          "❌ Failed to parse editing submission in InfraEnablersStep:",
          error
        );
        localStorage.removeItem("editing_submission");
      }
    }
  }, []); // run once

  // Calculation helpers
  const calculateSection4_3 = useCallback(() => {
    const numberOfProjects = parseInt(
      formData.section4_3.numberOfProjects || ""
    );
    if (isNaN(numberOfProjects)) return { marksObtained: 0 };
    const marksObtained = Math.min(numberOfProjects * 5, 20);
    return { marksObtained: Math.round(marksObtained * 100) / 100 };
  }, [formData.section4_3.numberOfProjects]);

  const calculateSection4_4 = useCallback(() => {
    const marksObtained = formData.section4_4.adopted === "yes" ? 50 : 0;
    return { marksObtained: Math.round(marksObtained * 100) / 100 };
  }, [formData.section4_4.adopted]);

  const calculateSection4_6 = useCallback(() => {
    const len = formData.section4_6.capacityArray.length;
    const totalMarks = Math.min(len * 1, 50);
    return {
      perEntry: len > 0 ? 1 : 0,
      totalMarks: Math.round(totalMarks * 100) / 100,
    };
  }, [formData.section4_6.capacityArray.length]);

  // update computed marks into formData (per-entry marks for section4_6 set to 1)
  useEffect(() => {
    const section4_3Calc = calculateSection4_3();
    const section4_4Calc = calculateSection4_4();
    const section4_6Calc = calculateSection4_6();

    setFormData((prev) => ({
      ...prev,
      section4_3: {
        ...prev.section4_3,
        marksObtained: section4_3Calc.marksObtained,
      },
      section4_4: {
        ...prev.section4_4,
        marksObtained: section4_4Calc.marksObtained,
      },
      section4_6: {
        ...prev.section4_6,
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.section4_3.numberOfProjects,
    formData.section4_4.adopted,
    formData.section4_6.capacityArray.length,
  ]);

  // Autosave to persistence with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const structuredData: InfraEnablersData = {
        section4_1: formData.section4_1 || defaultData.section4_1,
        section4_2: formData.section4_2 || defaultData.section4_2,
        section4_3: formData.section4_3 || defaultData.section4_3,
        section4_4: formData.section4_4 || defaultData.section4_4,
        section4_5: formData.section4_5 || defaultData.section4_5,
        section4_6: formData.section4_6 || defaultData.section4_6,
      };
      updateFormData("infraEnablers", structuredData);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [formData]);

  // --- Section 4.3 helpers ---
  const addGatiProject = () => {
    setFormData((prev) => ({
      ...prev,
      section4_3: {
        ...prev.section4_3,
        projects: [
          ...(prev.section4_3.projects || []),
          {
            id:
              typeof crypto !== "undefined" &&
              typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : Date.now().toString(),
            projectName: "",
            sector: "",
            file: null,
          },
        ],
      },
    }));
  };

  const removeGatiProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section4_3: {
        ...prev.section4_3,
        projects: prev.section4_3.projects.filter((p) => p.id !== id),
      },
    }));
  };

  const updateGatiProject = (
    id: string,
    field: "projectName" | "sector" | "file",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_3: {
        ...prev.section4_3,
        projects: prev.section4_3.projects.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  // --- Section 4.5 helpers ---
  const addPractice = () => {
    setFormData((prev) => ({
      ...prev,
      section4_5: {
        ...prev.section4_5,
        practices: [
          ...(prev.section4_5.practices || []),
          {
            id:
              typeof crypto !== "undefined" &&
              typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : Date.now().toString(),
            practiceName: "",
            impact: "",
            file: null,
          },
        ],
      },
    }));
  };

  const removePractice = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section4_5: {
        ...prev.section4_5,
        practices: prev.section4_5.practices.filter((p) => p.id !== id),
      },
    }));
  };

  const updatePractice = (
    id: string,
    field: "practiceName" | "impact" | "file",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_5: {
        ...prev.section4_5,
        practices: prev.section4_5.practices.map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  // --- Section 4.6 helpers ---
  const addTraining = () => {
    const newEntry = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Date.now().toString(),
      officerName: "",
      designation: "",
      programName: "",
      organiser: "",
      trainingType: "",
    };
    setFormData((prev) => ({
      ...prev,
      section4_6: {
        ...prev.section4_6,
        capacityArray: [...(prev.section4_6.capacityArray || []), newEntry],
      },
    }));
  };

  const removeTraining = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: {
        ...prev.section4_6,
        capacityArray: prev.section4_6.capacityArray.filter(
          (entry) => entry.id !== id
        ),
      },
    }));
  };

  const updateTraining = (
    id: string,
    field:
      | "officerName"
      | "designation"
      | "programName"
      | "organiser"
      | "trainingType",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: {
        ...prev.section4_6,
        capacityArray: prev.section4_6.capacityArray.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  // Navigation / Save
  const handleNext = () => {
    // Validation disabled - allow navigation without checking required fields
    updateFormData("infraEnablers", formData);
    goToNext();
  };

  // Remove unwanted keys from all levels of the payload
  // CRITICAL: Preserves File and Blob instances (they cannot be serialized to JSON)
  function deepRemoveUnwantedKeys(obj) {
    const keysToRemove = [
      "sectionStatus",
      "section_status",
      "completedList",
      "totalIndicators",
      "completedIndicators",
    ];
    
    // Preserve File and Blob instances - return them as-is
    if (obj instanceof File || obj instanceof Blob) {
      return obj;
    }
    
    if (Array.isArray(obj)) return obj.map(deepRemoveUnwantedKeys);
    
    if (obj && typeof obj === "object") {
      const newObj = {};
      for (const key in obj) {
        if (!keysToRemove.includes(key)) {
          const value = obj[key];
          
          // Preserve File and Blob instances
          if (value instanceof File || value instanceof Blob) {
            newObj[key] = value; // Keep File/Blob instance as-is
          }
          // Preserve FileUpload objects with File instances
          else if (
            value &&
            typeof value === "object" &&
            "file" in value &&
            (value.file instanceof File || value.file instanceof Blob)
          ) {
            // Preserve the FileUpload object structure, including the File instance
            const fileUploadObj: any = {};
            for (const prop in value) {
              if (prop === "file" && (value.file instanceof File || value.file instanceof Blob)) {
                fileUploadObj[prop] = value.file; // Keep File/Blob instance as-is
              } else {
                fileUploadObj[prop] = deepRemoveUnwantedKeys(value[prop]);
              }
            }
            newObj[key] = fileUploadObj;
          }
          // Special handling for normalizedFormData and its 'original' property
          else if (
            key === "normalizedFormData" &&
            value &&
            typeof value === "object"
          ) {
            newObj[key] = deepRemoveUnwantedKeys(value);
            // Remove section_status from normalizedFormData.original if present
            if (newObj[key].original) {
              newObj[key].original = deepRemoveUnwantedKeys(
                newObj[key].original
              );
            }
          } else {
            newObj[key] = deepRemoveUnwantedKeys(value);
          }
        }
      }
      return newObj;
    }
    return obj;
  }

  function sanitizeFilesInFormData(obj) {
    if (Array.isArray(obj)) return obj.map(sanitizeFilesInFormData);
    if (obj && typeof obj === "object") {
      const newObj = {};
      for (const key in obj) {
        if (key === "file") {
          const fileVal = obj[key];
          // Allow FileUpload object (with fileName/fileSize) or null
          if (
            fileVal &&
            typeof fileVal === "object" &&
            ("fileName" in fileVal || "fileSize" in fileVal)
          ) {
            newObj[key] = fileVal;
          } else {
            newObj[key] = null;
          }
        } else {
          newObj[key] = sanitizeFilesInFormData(obj[key]);
        }
      }
      return newObj;
    }
    return obj;
  }

  const handleSubmitToStateApprover = async () => {
    if (!validation.isValid) {
      setShowValidationErrors(true);
      toast({
        title: "Incomplete section",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Debug: Log files before submit
    console.log("[DEBUG] Submitting InfraEnablersStep, formData:", formData);

    try {
      setSubmittingIndicator(indicatorCode);
      // Get the indicators for this section
      const sectionIndicators = allowedIndicators || [
        "4.1",
        "4.2",
        "4.3",
        "4.4",
        "4.5",
        "4.6",
      ];
      // Remove unwanted keys (preserves File instances for upload)
      let sanitizedFormData = deepRemoveUnwantedKeys(formData);
      // Debug: Log sanitized payload before submit
      console.log(
        "[DEBUG] Payload to submit InfraEnablersStep:",
        sanitizedFormData
      );
      await apiService.submitSectionToStateApprover(
        sanitizedFormData,
        "infraEnablers",
        sectionIndicators
      );
      toast({
        title: "Success",
        description:
          "Infrastructure Enablers section submitted to State Approver successfully.",
        variant: "default",
      });
      updateFormData("infraEnablers", sanitizedFormData);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit section. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingIndicator(null);
    }
  };

  const handleSubmitIndicator = async (
    indicatorCode: string,
    indicatorTitle: string
  ) => {
    // Track which indicator is being validated
    setValidatingIndicator(indicatorCode);
    setShowValidationErrors(true);
    // Validate only this specific indicator
    const indicatorValidation = validateInfraEnablers(formData, {
      allowedIndicators: [indicatorCode],
    });
    if (!indicatorValidation.isValid) {
      // Store indicator-specific errors
      setIndicatorValidationErrors(indicatorValidation.errors);
      toast({
        title: "Incomplete Indicator",
        description: `Please complete all required fields for indicator ${indicatorCode} before submitting.`,
        variant: "destructive",
      });
      return;
    }
    
    // Clear indicator-specific validation state on success
    setValidatingIndicator(null);
    setIndicatorValidationErrors({});

    // Check if already submitted
    if (isIndicatorSubmitted(indicatorCode)) {
      toast({
        title: "Already Submitted",
        description: `Indicator ${indicatorCode} has already been submitted.`,
        variant: "default",
      });
      return;
    }

    // Show confirmation dialog
    setPendingIndicator({ code: indicatorCode, title: indicatorTitle });
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingIndicator) return;

    const { code: indicatorCode, title: indicatorTitle } = pendingIndicator;

    try {
      setSubmittingIndicator(indicatorCode);
      setShowSubmitDialog(false);
      // Clear indicator validation state after successful submission
      setValidatingIndicator(null);
      setIndicatorValidationErrors({});

      // Remove unwanted keys (preserves File instances for upload)
      const sanitizedFormData = deepRemoveUnwantedKeys(formData);

      // Create sanitized data with status for the submitted indicator
      const sectionKey = `section${indicatorCode.replace(".", "_")}`;

      // Check current status - if REVERTED, set to RESUBMITTED, otherwise SUBMITTED_TO_STATE
      const currentStatus = getIndicatorStatus(indicatorCode);
      const upperStatus = (currentStatus || "").toUpperCase();
      const newStatus =
        upperStatus === "REVERTED" || upperStatus === "RESUBMITTED"
          ? "RESUBMITTED"
          : "SUBMITTED_TO_STATE";

      const sanitizedFormDataWithStatus = {
        ...sanitizedFormData,
        [sectionKey]: {
          ...sanitizedFormData[sectionKey],
          status: newStatus,
        },
      };

      const result = await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraEnablers",
        [indicatorCode]
      );

      // Update submissionId if it was created/updated
      if (result?.id || result?.submissionId) {
        const newSubmissionId = result.id || result.submissionId;
        if (newSubmissionId && newSubmissionId !== submissionId) {
          setSubmissionId(newSubmissionId);
          console.log("✅ Updated submissionId after submit:", newSubmissionId);
        }
      }

      // Remove from editingIndicators first to ensure it becomes non-editable immediately
      setEditingIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.delete(indicatorCode);
        return newSet;
      });

      // Optimistically update formData with the correct status immediately
      // This ensures the UI updates without requiring a refresh
      setFormData((prev: any) => {
        const updated = {
          ...prev,
          [sectionKey]: {
            ...prev[sectionKey],
            ...sanitizedFormData[sectionKey],
            status: newStatus,
          },
        };
        // Update form persistence with the merged data
        updateFormData("infraEnablers", {
          ...updated,
          ...sanitizedFormDataWithStatus,
        });
        return updated;
      });

      toast({
        title: "Success",
        description: `Indicator ${indicatorCode} (${indicatorTitle}) submitted to State Approver successfully.`,
        variant: "default",
      });

      // Update form data with sanitized data that includes status
      updateFormData("infraEnablers", sanitizedFormDataWithStatus);

      // Optimistically update sectionStatus to immediately disable the button
      setSectionStatus((prev: any) => {
        const currentCompleted = prev?.completedIndicators || [];
        if (!currentCompleted.includes(indicatorCode)) {
          const updatedStatus = {
            ...(prev || {}),
            completedIndicators: [...currentCompleted, indicatorCode],
            completedCount: (prev?.completedCount || 0) + 1,
            totalAssigned: prev?.totalAssigned || 0,
          };
          console.log(
            `✅ Optimistically updated sectionStatus for ${indicatorCode}:`,
            updatedStatus
          );
          return updatedStatus;
        }
        return prev || {};
      });

      // Refresh sectionStatus to update completedIndicators from server
      try {
        const submissionsResp = await apiService.getSubmissions(1, 100);
        const userSubmission = submissionsResp.submissions.find(
          (sub: any) =>
            sub.status === "DRAFT" ||
            sub.status === "IN_PROGRESS" ||
            sub.status === "RETURNED_FROM_STATE" ||
            sub.status === "PENDING_STATE_APPROVAL"
        );
        if (userSubmission && userSubmission.id) {
          const fullSubmission = await apiService.getSubmission(
            userSubmission.id
          );
          // Merge server response with current state to ensure we don't lose the optimistic update
          setSectionStatus((current: any) => {
            const serverCompleted =
              fullSubmission.section_status?.completedIndicators || [];
            const currentCompleted = current?.completedIndicators || [];
            const mergedCompleted = Array.from(
              new Set([...currentCompleted, ...serverCompleted])
            );
            return {
              ...fullSubmission.section_status,
              completedIndicators: mergedCompleted,
              completedCount: mergedCompleted.length,
            };
          });
        }
      } catch (err) {
        console.error("Failed to refresh section status:", err);
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to submit indicator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingIndicator(null);
      setPendingIndicator(null);
    }
  };

  const handleCancelSubmit = () => {
    setShowSubmitDialog(false);
    setPendingIndicator(null);
  };

  const handleSaveDraft = async () => {
    try {
      const result = await apiService.submitSectionToStateApprover(
        formData,
        "infraEnablers",
        allowedIndicators || ["4.1", "4.2", "4.3", "4.4", "4.5"]
      );
      
      // Update submissionId if it was created/updated
      if (result?.id || result?.submissionId) {
        const newSubmissionId = result.id || result.submissionId;
        if (newSubmissionId && newSubmissionId !== submissionId) {
          setSubmissionId(newSubmissionId);
          console.log("✅ Updated submissionId after draft save:", newSubmissionId);
        }
      }
      
      updateFormData("infraEnablers", formData);
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved to the database.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Save draft error:", error);
      toast({
        title: "Save Failed",
        description:
          error?.message || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  if ((isNodalOfficer || isStateApprover) && allowedIndicators.length === 0) {
    return (
      <div className="w-full -mx-6 lg:-mx-8">
        <div className="px-6 lg:px-8">
          <Stepper
            steps={SUBMISSION_STEPS}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        </div>
        <div className="px-6 lg:px-8">
          <ProgressHeader
            title="Infrastructure Enablers"
            description="Supporting infrastructure and policy enablers"
            points={250}
            completed={0}
            total={6}
            progress={0}
          />
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Data Required
            </h3>
            <p className="text-gray-600 mb-4">
              This section is not applicable for your submission. No data entry
              required here.
            </p>
            <Button onClick={goToNext} className="bg-primary text-white">
              Continue to Next Step
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Helper function to check if an indicator is submitted
  // Helper function to get indicator status
  const getIndicatorStatus = (indicatorCode: string): string | undefined => {
    const sectionKey = `section${indicatorCode.replace(".", "_")}`;
    const sectionData = formData[sectionKey];
    return (sectionData as any)?.status;
  };

  // Check if indicator is submitted or accepted (non-editable)
  // Note: REVERTED/RESUBMITTED indicators are non-editable by default, but can be edited via Edit button
  const isIndicatorSubmitted = (indicatorCode: string): boolean => {
    const status = getIndicatorStatus(indicatorCode);
    if (!status) return false;
    const upperStatus = status.toUpperCase();
    // If indicator is in edit mode, it's editable
    if (editingIndicators.has(indicatorCode)) {
      return false;
    }
    // REVERTED and RESUBMITTED are non-editable by default (need Edit button)
    // Other statuses are non-editable
    return (
      upperStatus === "SUBMITTED_TO_STATE" ||
      upperStatus === "ACCEPTED" ||
      upperStatus === "APPROVED" ||
      upperStatus === "REVERTED" ||
      upperStatus === "RESUBMITTED"
    );
  };

  // Get button text based on indicator status
  const getSubmitButtonText = (
    indicatorCode: string,
    submittingIndicator: string | null
  ): string => {
    if (submittingIndicator === indicatorCode) return "Submitting...";

    const status = getIndicatorStatus(indicatorCode);
    if (!status) return "Submit";

    const upperStatus = status.toUpperCase();
    if (upperStatus === "RESUBMITTED") {
      return "Resubmitted";
    } else if (
      upperStatus === "SUBMITTED_TO_STATE" ||
      upperStatus === "ACCEPTED" ||
      upperStatus === "APPROVED"
    ) {
      return "Submitted";
    }

    return "Submit";
  };

  // Handle Edit button click for sent back indicators
  const handleEditIndicator = (indicatorCode: string) => {
    setEditingIndicators((prev) => new Set(prev).add(indicatorCode));
  };

  // Handle Save button click for sent back indicators
  const handleSaveIndicator = async (indicatorCode: string) => {
    // Check if user is NODAL_OFFICER and indicator is REVERTED
    const currentStatus = getIndicatorStatus(indicatorCode);
    const upperStatus = (currentStatus || "").toUpperCase();
    const isReverted = upperStatus === "REVERTED";

    // If NODAL_OFFICER and status is REVERTED (sent back), show confirmation dialog first
    if (isNodalOfficer && isReverted) {
      setPendingSaveIndicatorCode(indicatorCode);
      setShowSaveDialog(true);
      return;
    }

    // For non-NODAL_OFFICER users or non-REVERTED status, proceed with save directly
    await performSaveIndicator(indicatorCode);
  };

  // Actual save function that performs the save operation
  const performSaveIndicator = async (indicatorCode: string) => {
    setSavingIndicators((prev) => new Set(prev).add(indicatorCode));
    try {
      // Validate the indicator before saving
      const indicatorValidation = validateInfraEnablers(formData, {
        allowedIndicators: [indicatorCode],
      });

      if (!indicatorValidation.isValid) {
        toast({
          title: "Validation Error",
          description: `Please complete all required fields for indicator ${indicatorCode} before saving.`,
          variant: "destructive",
        });
        return;
      }

      // Get current submission to preserve status
      const submissionsResp = await apiService.getSubmissions(1, 100);
      const userSubmission = submissionsResp.submissions.find(
        (sub: any) =>
          sub.status === "DRAFT" ||
          sub.status === "IN_PROGRESS" ||
          sub.status === "RETURNED_FROM_STATE" ||
          sub.status === "PENDING_STATE_APPROVAL"
      );

      if (!userSubmission?.id) {
        toast({
          title: "Error",
          description: "No submission found. Please create a submission first.",
          variant: "destructive",
        });
        return;
      }

      // Get current indicator status
      const currentStatus = getIndicatorStatus(indicatorCode);
      const sectionKey = `section${indicatorCode.replace(".", "_")}`;

      // Remove unwanted keys before saving (preserves File instances for upload)
      const sanitizedFormData = deepRemoveUnwantedKeys(formData);

      // If indicator was sent back (REVERTED), change status to RESUBMITTED after saving
      // Both Save and Submit buttons should change REVERTED to RESUBMITTED
      const upperStatus = currentStatus?.toUpperCase() || "";
      const newStatus =
        upperStatus === "REVERTED" || upperStatus === "RESUBMITTED"
          ? "RESUBMITTED"
          : currentStatus || "DRAFT"; // Preserve status if not sent back

      // Prepare data with updated status
      const sectionDataWithStatus = {
        ...sanitizedFormData[sectionKey],
        status: newStatus,
      };

      // Create sanitized data with status for the saved indicator (same format as Submit)
      const sanitizedFormDataWithStatus = {
        ...sanitizedFormData,
        [sectionKey]: sectionDataWithStatus,
      };

      // Use submitSectionToStateApprover API which properly handles RESUBMITTED status
      // This ensures the status is preserved correctly in the database
      const result = await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraEnablers",
        [indicatorCode]
      );

      // Update submissionId if it was created/updated
      if (result?.id || result?.submissionId) {
        const newSubmissionId = result.id || result.submissionId;
        if (newSubmissionId && newSubmissionId !== submissionId) {
          setSubmissionId(newSubmissionId);
          console.log("✅ Updated submissionId after resubmit:", newSubmissionId);
        }
      }

      // Remove from editingIndicators first to ensure it becomes non-editable immediately
      setEditingIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.delete(indicatorCode);
        return newSet;
      });

      // Update local formData state immediately to reflect RESUBMITTED status
      setFormData((prev: any) => {
        const updated = {
          ...prev,
          [sectionKey]: sectionDataWithStatus,
        };
        // Also update form persistence with the merged data
        updateFormData("infraEnablers", {
          ...prev,
          ...sanitizedFormDataWithStatus,
        });
        return updated;
      });

      // Exit edit mode
      setEditingIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.delete(indicatorCode);
        return newSet;
      });

      toast({
        title: "Saved",
        description: `Indicator ${indicatorCode} has been saved successfully.`,
      });
    } catch (error) {
      console.error(`Failed to save indicator ${indicatorCode}:`, error);
      toast({
        title: "Save Failed",
        description: `Failed to save indicator ${indicatorCode}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSavingIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.delete(indicatorCode);
        return newSet;
      });
    }
  };

  // Handle confirmation dialog actions
  const handleConfirmSave = async () => {
    if (pendingSaveIndicatorCode) {
      await performSaveIndicator(pendingSaveIndicatorCode);
      setShowSaveDialog(false);
      setPendingSaveIndicatorCode(null);
    }
  };

  const handleCancelSave = () => {
    setShowSaveDialog(false);
    setPendingSaveIndicatorCode(null);
  };

  // Handle Cancel button click for sent back indicators
  const handleCancelEdit = (indicatorCode: string) => {
    setEditingIndicators((prev) => {
      const newSet = new Set(prev);
      newSet.delete(indicatorCode);
      return newSet;
    });
    // Optionally reload the original data for this indicator
    // For now, just exit edit mode
  };

  return (
    <div className="">
      <Stepper
        steps={SUBMISSION_STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
      />
      {(() => {
        const { completed, total, progress } = computeStepProgress(
          { infraEnablers: formData } as any,
          "infraEnablers",
          {
            assignedIndicators,
            availableIndicators,
            isNodalOfficer,
            isStateApprover,
          }
        );
        console.log("Infra Enablers Progress Debug:", {
          isNodalOfficer,
          isStateApprover,
          assignedIndicators,
          availableIndicators,
          completed,
          total,
          progress,
        });
        return (
          <ProgressHeader
            title="Infrastructure Enablers"
            description="Regulatory and institutional frameworks supporting infrastructure"
            points={250}
            completed={completed}
            total={total}
            progress={progress}
          />
        );
      })()}

      {/* Section 4.1 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.1") ||
        availableIndicators.includes("4.1")) && (
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.1 - </span> Eligible
                Infrastructure Projects{" "}
              </span>
            </div>
          }
          subtitle=""
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.1")}
          indicatorCode="4.1"
          isEditable={editingIndicators.has("4.1")}
          onEdit={() => handleEditIndicator("4.1")}
          onSave={() => handleSaveIndicator("4.1")}
          onCancel={() => handleCancelEdit("4.1")}
          isSaving={savingIndicators.has("4.1")}
        >
          <div className="flex flex-col gap-4 w-[40%]">
            <div>
              <Label>
                All Eligible Infra Projects on NIP Portal{" "}
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Are all eligible infra projects on NIP Portal?
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="all-eligible"
                    value="yes"
                    checked={formData.section4_1.allEligible === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.1")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_1: {
                          ...prev.section4_1,
                          allEligible: "yes",
                          comment: "",
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.1")}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="all-eligible"
                    value="no"
                    checked={formData.section4_1.allEligible === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.1")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_1: {
                          ...prev.section4_1,
                          allEligible: "no",
                          websiteLink: "",
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.1")}
                  />
                  No
                </label>
              </div>
              {renderFieldError("section4_1.allEligible")}
            </div>

            {/* ✅ Conditionally render website link or comment */}
            {formData.section4_1.allEligible === "yes" && (
              <div className="flex flex-col gap-2">
                <Label>
                  Website Link <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="url"
                  placeholder="Enter Website Link"
                  value={formData.section4_1.websiteLink}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_1: {
                        ...prev.section4_1,
                        websiteLink: e.target.value,
                      },
                    }));
                  }}
                  disabled={isIndicatorSubmitted("4.1")}
                  className={cn(
                    getInputValidationClass("section4_1.websiteLink"),
                    isIndicatorSubmitted("4.1") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_1.websiteLink")}
              </div>
            )}

            {formData.section4_1.allEligible === "no" && (
              <div className="flex flex-col gap-2">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_1.comment || ""}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_1: {
                        ...prev.section4_1,
                        comment: e.target.value,
                      },
                    }));
                  }}
                  disabled={isIndicatorSubmitted("4.1")}
                  className={cn(
                    getInputValidationClass("section4_1.comment"),
                    isIndicatorSubmitted("4.1") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_1.comment")}
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.1", "Ease of Participation")
                }
                disabled={submittingIndicator !== null || isIndicatorSubmitted("4.1")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.1", submittingIndicator)}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Section 4.2 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.2") ||
        availableIndicators.includes("4.2")) && (
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.2 - </span> Availability & Use
                of State/UT PMG{" "}
              </span>
            </div>
          }
          subtitle=""
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.2")}
          indicatorCode="4.2"
          isEditable={editingIndicators.has("4.2")}
          onEdit={() => handleEditIndicator("4.2")}
          onSave={() => handleSaveIndicator("4.2")}
          onCancel={() => handleCancelEdit("4.2")}
          isSaving={savingIndicators.has("4.2")}
        >
          <div className="flex flex-col gap-4 w-[70%]">
            <div>
              <Label>
                Availability & Use of State/UT PMG{" "}
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Is State/UT PMG available and used?
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="pmg-available"
                    value="yes"
                    checked={formData.section4_2.available === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.2")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_2: { ...prev.section4_2, available: "yes" },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.2")}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="pmg-available"
                    value="no"
                    checked={formData.section4_2.available === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.2")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_2: { ...prev.section4_2, available: "no" },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.2")}
                  />
                  No
                </label>
              </div>
              {renderFieldError("section4_2.available")}
            </div>
            {formData.section4_2.available === "yes" && (
              <div className="flex flex-col gap-2">
                <FileUploadSection
                  label="Upload File"
                  value={formData.section4_2.file || null}
                  onChange={(file) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_2: { ...prev.section4_2, file },
                    }));
                  }}
                  submissionId={submissionId}
                  disabled={isIndicatorSubmitted("4.2")}
                />
                <p className="text-xs text-muted-foreground">Description</p>
                {renderFieldError("section4_2.file")}
              </div>
            )}
            {formData.section4_2.available === "no" && (
              <div className="flex flex-col gap-2">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_2.comment || ""}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_2: {
                        ...prev.section4_2,
                        comment: e.target.value,
                      },
                    }));
                  }}
                  disabled={isIndicatorSubmitted("4.2")}
                  className={cn(
                    getInputValidationClass("section4_2.comment"),
                    isIndicatorSubmitted("4.2") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_2.comment")}
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.2", "PM GatiShakti Master Plan")
                }
                disabled={submittingIndicator !== null || isIndicatorSubmitted("4.2")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.2", submittingIndicator)}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Section 4.3 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.3") ||
        availableIndicators.includes("4.3")) && (
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold">
                <span className="text-primary">4.3 – </span> Adoption of PM
                GatiShakti
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.3")}
          indicatorCode="4.3"
          isEditable={editingIndicators.has("4.3")}
          onEdit={() => handleEditIndicator("4.3")}
          onSave={() => handleSaveIndicator("4.3")}
          onCancel={() => handleCancelEdit("4.3")}
          isSaving={savingIndicators.has("4.3")}
        >
          <div className="flex flex-col gap-4">
            {/* --- Toggle --- */}
            <div className="w-[60%]">
              <Label>
                Adoption of PM GatiShakti{" "}
                <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Has the State/UT adopted PM GatiShakti?
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="pm-gatishakti"
                    value="yes"
                    checked={formData.section4_3.adopted === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.3")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_3: {
                          ...prev.section4_3,
                          adopted: "yes",
                          comment: "",
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.3")}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="pm-gatishakti"
                    value="no"
                    checked={formData.section4_3.adopted === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.3")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_3: {
                          ...prev.section4_3,
                          adopted: "no",
                          projects: [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.3")}
                  />
                  No
                </label>
              </div>
              {renderFieldError("section4_3.adopted")}
            </div>

            {/* --- If YES --- */}
            {formData.section4_3.adopted === "yes" && (
              <div className="flex flex-col gap-4">
                {(Array.isArray(formData.section4_3?.projects)
                  ? formData.section4_3.projects
                  : []
                ).map((entry) => (
                  <div key={entry.id} className="mb-2">
                    {/* Fields row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <Label>
                          Project Name{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter project name"
                          value={entry.projectName}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updateGatiProject(
                              entry.id,
                              "projectName",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("4.3")}
                          className={cn(
                            getInputValidationClass(
                              `section4_3.projects.${formData.section4_3.projects.findIndex(
                                (p) => p.id === entry.id
                              )}.projectName`
                            ),
                            isIndicatorSubmitted("4.3") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_3.projects.${formData.section4_3.projects.findIndex(
                            (p) => p.id === entry.id
                          )}.projectName`
                        )}
                      </div>

                      <div>
                        <Label>
                          Sector <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={entry.sector}
                          onValueChange={(v) => {
                            showErrorsIfNeeded();
                            updateGatiProject(entry.id, "sector", v);
                          }}
                          disabled={isIndicatorSubmitted("4.3")}
                        >
                          <SelectTrigger
                            className={cn(
                              getInputValidationClass(
                                `section4_3.projects.${formData.section4_3.projects.findIndex(
                                  (p) => p.id === entry.id
                                )}.sector`
                              )
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
                        {renderFieldError(
                          `section4_3.projects.${formData.section4_3.projects.findIndex(
                            (p) => p.id === entry.id
                          )}.sector`
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGatiProject(entry.id)}
                          disabled={isIndicatorSubmitted("4.3")}
                          aria-label="Remove"
                          className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Upload file below */}
                    <div className="mt-4">
                      <FileUploadSection
                        label="Upload File (PDF only)"
                        accept=".pdf"
                        value={entry.file || null}
                        onChange={(file) => {
                          showErrorsIfNeeded();
                          updateGatiProject(entry.id, "file", file);
                        }}
                        submissionId={submissionId}
                        disabled={isIndicatorSubmitted("4.3")}
                      />
                      {renderFieldError(
                        `section4_3.projects.${formData.section4_3.projects.findIndex(
                          (p) => p.id === entry.id
                        )}.file`
                      )}
                    </div>
                  </div>
                ))}
                {renderFieldError("section4_3.projects")}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGatiProject}
                  disabled={isIndicatorSubmitted("4.3")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
                {/* ✅ Table view for Section 4.3 – PM GatiShakti Projects */}
                {formData.section4_3.projects.length > 0 && (
                  <div className="overflow-x-auto rounded-xl mt-4">
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
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            File Size
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(formData.section4_3?.projects)
                          ? formData.section4_3.projects
                          : []
                        ).map((entry) => {
                          const file = entry.file;
                          if (!file) {
                            return (
                              <tr key={entry.id} className="bg-white">
                                <td className="py-3 px-4 text-sm">{entry.projectName}</td>
                                <td className="py-3 px-4 text-sm">{entry.sector}</td>
                                <td className="py-3 px-4 text-sm">No file uploaded</td>
                                <td className="py-3 px-4 text-sm">N/A</td>
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    onClick={() => removeGatiProject(entry.id)}
                                    disabled={isIndicatorSubmitted("4.3")}
                                    className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Delete"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                          
                          // Extract original name from UUID-prefixed fileName if originalName is not available
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
                          
                          const displayName = extractOriginalName(file.fileName || "", (file as any)?.originalName);
                          
                          return (
                          <tr key={entry.id} className="bg-white">
                            <td className="py-3 px-4 text-sm">
                              {entry.projectName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.sector}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {displayName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.file?.fileSize
                                ? `${(
                                    entry.file.fileSize /
                                    1024 /
                                    1024
                                  ).toFixed(1)} MB`
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removeGatiProject(entry.id)}
                                disabled={isIndicatorSubmitted("4.3")}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* --- If NO --- (same style as Section 4.1) */}
            {formData.section4_3.adopted === "no" && (
              <div className="flex flex-col gap-2 w-[60%]">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_3.comment || ""}
                  disabled={isIndicatorSubmitted("4.3")}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_3: {
                        ...prev.section4_3,
                        comment: e.target.value,
                      },
                    }));
                  }}
                  className={cn(
                    getInputValidationClass("section4_3.comment"),
                    isIndicatorSubmitted("4.3") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_3.comment")}
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.3", "PM GatiShakti NMP Projects")
                }
                disabled={submittingIndicator !== null || isIndicatorSubmitted("4.3")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.3", submittingIndicator)}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Section 4.4 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.4") ||
        availableIndicators.includes("4.4")) && (
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.4 – </span> Adoption of ADR
                <span className="font-normal text-xs text-muted-foreground ml-1">
                  (10 marks per practice)
                </span>
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.4")}
          indicatorCode="4.4"
          isEditable={editingIndicators.has("4.4")}
          onEdit={() => handleEditIndicator("4.4")}
          onSave={() => handleSaveIndicator("4.4")}
          onCancel={() => handleCancelEdit("4.4")}
          isSaving={savingIndicators.has("4.4")}
        >
          <div className="flex flex-col gap-4 w-[70%]">
            <div>
              <Label>
                Adoption of ADR <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>Is ADR adopted?</TooltipContent>
                </Tooltip>
              </Label>

              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="adr-adopted"
                    value="yes"
                    checked={formData.section4_4.adopted === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.4")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_4: {
                          ...prev.section4_4,
                          adopted: "yes",
                          comment: "",
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.4")}
                  />
                  Yes
                </label>

                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="adr-adopted"
                    value="no"
                    checked={formData.section4_4.adopted === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.4")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_4: {
                          ...prev.section4_4,
                          adopted: "no",
                          file: null,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.4")}
                  />
                  No
                </label>
              </div>
              {renderFieldError("section4_4.adopted")}
            </div>

            {/* ✅ If YES → show file upload */}
            {formData.section4_4.adopted === "yes" && (
              <div className="flex flex-col gap-2">
                <FileUploadSection
                  label="Upload File"
                  value={formData.section4_4.file || null}
                  onChange={(file) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_4: { ...prev.section4_4, file },
                    }));
                  }}
                  submissionId={submissionId}
                  disabled={isIndicatorSubmitted("4.4")}
                />
                <p className="text-xs text-muted-foreground">
                  Upload ADR orders
                </p>
                {renderFieldError("section4_4.file")}
              </div>
            )}

            {/* ✅ If NO → show comment box (same style as 4.1 & 4.3) */}
            {formData.section4_4.adopted === "no" && (
              <div className="flex flex-col gap-2 w-[60%]">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_4.comment || ""}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_4: {
                        ...prev.section4_4,
                        comment: e.target.value,
                      },
                    }));
                  }}
                  disabled={isIndicatorSubmitted("4.4")}
                  className={cn(
                    getInputValidationClass("section4_4.comment"),
                    isIndicatorSubmitted("4.4") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_4.comment")}
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={() => handleSubmitIndicator("4.4", "Adoption of ADR")}
                disabled={submittingIndicator !== null || isIndicatorSubmitted("4.4")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.4", submittingIndicator)}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Section 4.5 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.5") ||
        availableIndicators.includes("4.5")) && (
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold">
                <span className="text-primary">4.5 – </span> Innovative
                Practices
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.5")}
          indicatorCode="4.5"
          isEditable={editingIndicators.has("4.5")}
          onEdit={() => handleEditIndicator("4.5")}
          onSave={() => handleSaveIndicator("4.5")}
          onCancel={() => handleCancelEdit("4.5")}
          isSaving={savingIndicators.has("4.5")}
        >
          <div className="flex flex-col gap-4 w-[70%]">
            {/* Toggle */}
            <div>
              <Label>
                Innovative Practices <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Has the State/UT implemented innovative practices?
                  </TooltipContent>
                </Tooltip>
              </Label>

              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="innovative-practices"
                    value="yes"
                    checked={formData.section4_5.implemented === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.5")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: {
                          ...prev.section4_5,
                          implemented: "yes",
                          comment: "",
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.5")}
                  />
                  Yes
                </label>

                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="innovative-practices"
                    value="no"
                    checked={formData.section4_5.implemented === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.5")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: {
                          ...prev.section4_5,
                          implemented: "no",
                          practices: [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.5")}
                  />
                  No
                </label>
              </div>
              {renderFieldError("section4_5.implemented")}
            </div>

            {/* ✅ If YES → show Practice list */}
            {formData.section4_5.implemented === "yes" && (
              <div className="flex flex-col gap-4">
                {(formData.section4_5.practices || []).map((entry) => (
                  <div key={entry.id} className="mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <Label>
                          Practice Name{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter practice name"
                          value={entry.practiceName}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updatePractice(
                              entry.id,
                              "practiceName",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("4.5")}
                          className={cn(
                            getInputValidationClass(
                              `section4_5.practices.${formData.section4_5.practices.findIndex(
                                (p) => p.id === entry.id
                              )}.practiceName`
                            ),
                            isIndicatorSubmitted("4.5") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_5.practices.${formData.section4_5.practices.findIndex(
                            (p) => p.id === entry.id
                          )}.practiceName`
                        )}
                      </div>

                      <div>
                        <Label>
                          Impact <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={entry.impact}
                          onValueChange={(v) => {
                            showErrorsIfNeeded();
                            updatePractice(entry.id, "impact", v);
                          }}
                          disabled={isIndicatorSubmitted("4.5")}
                        >
                          <SelectTrigger
                            className={cn(
                              getInputValidationClass(
                                `section4_5.practices.${formData.section4_5.practices.findIndex(
                                  (p) => p.id === entry.id
                                )}.impact`
                              )
                            )}
                          >
                            <SelectValue placeholder="Select impact" />
                          </SelectTrigger>
                          <SelectContent>
                            {IMPACT_OPTIONS.map((impact) => (
                              <SelectItem key={impact} value={impact}>
                                {impact}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {renderFieldError(
                          `section4_5.practices.${formData.section4_5.practices.findIndex(
                            (p) => p.id === entry.id
                          )}.impact`
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePractice(entry.id)}
                          disabled={isIndicatorSubmitted("4.5")}
                          aria-label="Remove"
                          className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Upload File Below */}
                    <div className="mt-4">
                      <FileUploadSection
                        label="Upload Evidence"
                        value={entry.file || null}
                        accept=".pdf"
                        onChange={(file) => {
                          showErrorsIfNeeded();
                          updatePractice(entry.id, "file", file);
                        }}
                        submissionId={submissionId}
                        disabled={isIndicatorSubmitted("4.5")}
                      />
                      {renderFieldError(
                        `section4_5.practices.${formData.section4_5.practices.findIndex(
                          (p) => p.id === entry.id
                        )}.file`
                      )}
                    </div>
                  </div>
                ))}
                {renderFieldError("section4_5.practices")}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPractice}
                  disabled={isIndicatorSubmitted("4.5")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Practice
                </Button>
              </div>
            )}

            {/* ✅ If NO → show Comment Box (same as 4.1/4.3/4.4) */}
            {formData.section4_5.implemented === "no" && (
              <div className="flex flex-col gap-2 w-[60%]">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_5.comment || ""}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_5: {
                        ...prev.section4_5,
                        comment: e.target.value,
                      },
                    }));
                  }}
                  disabled={isIndicatorSubmitted("4.5")}
                  className={cn(
                    getInputValidationClass("section4_5.comment"),
                    isIndicatorSubmitted("4.5") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_5.comment")}
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={() => handleSubmitIndicator("4.5", "Best Practices")}
                disabled={submittingIndicator !== null || isIndicatorSubmitted("4.5")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.5", submittingIndicator)}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Section 4.6 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.6") ||
        availableIndicators.includes("4.6")) && (
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold ">
                <span className="text-primary">4.6 – </span> Capacity Building –
                Officer Participation
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.6")}
          indicatorCode="4.6"
          isEditable={editingIndicators.has("4.6")}
          onEdit={() => handleEditIndicator("4.6")}
          onSave={() => handleSaveIndicator("4.6")}
          onCancel={() => handleCancelEdit("4.6")}
          isSaving={savingIndicators.has("4.6")}
        >
          <div className="flex flex-col gap-4">
            {/* --- Toggle --- */}
            <div className="w-[60%]">
              <Label>
                Capacity Building – Officer Participation{" "}
                <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="inline w-3 h-3 ml-1" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Has there been officer participation in capacity building?
                  </TooltipContent>
                </Tooltip>
              </Label>

              <div className="flex gap-6 mt-1">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="capacity-building"
                    value="yes"
                    checked={formData.section4_6.participated === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.6")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_6: {
                          ...prev.section4_6,
                          participated: "yes",
                          comment: "",
                          capacityArray: prev.section4_6.capacityArray || [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.6")}
                  />
                  Yes
                </label>

                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="capacity-building"
                    value="no"
                    checked={formData.section4_6.participated === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.6")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_6: {
                          ...prev.section4_6,
                          participated: "no",
                          capacityArray: [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.6")}
                  />
                  No
                </label>
              </div>
              {renderFieldError("section4_6.participated")}
            </div>

            {/* ✅ If YES → show officer entries */}
            {formData.section4_6.participated === "yes" && (
              <div className="flex flex-col gap-4">
                {formData.section4_6.capacityArray.map((entry) => (
                  <div key={entry.id} className="mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <Label>
                          Officer Name{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter officer name"
                          value={entry.officerName}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updateTraining(
                              entry.id,
                              "officerName",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("4.6")}
                          className={cn(
                            getInputValidationClass(
                              `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                (e) => e.id === entry.id
                              )}.officerName`
                            ),
                            isIndicatorSubmitted("4.6") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                            (e) => e.id === entry.id
                          )}.officerName`
                        )}
                      </div>
                      <div>
                        <Label>
                          Designation{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter designation"
                          value={entry.designation}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updateTraining(
                              entry.id,
                              "designation",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("4.6")}
                          className={cn(
                            getInputValidationClass(
                              `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                (e) => e.id === entry.id
                              )}.designation`
                            ),
                            isIndicatorSubmitted("4.6") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                            (e) => e.id === entry.id
                          )}.designation`
                        )}
                      </div>
                      <div>
                        <Label>
                          Program Name{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter program name"
                          value={entry.programName}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updateTraining(
                              entry.id,
                              "programName",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("4.6")}
                          className={cn(
                            getInputValidationClass(
                              `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                (e) => e.id === entry.id
                              )}.programName`
                            ),
                            isIndicatorSubmitted("4.6") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                            (e) => e.id === entry.id
                          )}.programName`
                        )}
                      </div>
                      <div>
                        <Label>
                          Organizer <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter organizer"
                          value={entry.organiser}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updateTraining(
                              entry.id,
                              "organiser",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("4.6")}
                          className={cn(
                            getInputValidationClass(
                              `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                (e) => e.id === entry.id
                              )}.organiser`
                            ),
                            isIndicatorSubmitted("4.6") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                            (e) => e.id === entry.id
                          )}.organiser`
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Label>
                            Type <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={entry.trainingType}
                            onValueChange={(v) => {
                              showErrorsIfNeeded();
                              updateTraining(entry.id, "trainingType", v);
                            }}
                            disabled={isIndicatorSubmitted("4.6")}
                          >
                            <SelectTrigger
                              className={cn(
                                getInputValidationClass(
                                  `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                    (e) => e.id === entry.id
                                  )}.trainingType`
                                )
                              )}
                            >
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Online">Online</SelectItem>
                              <SelectItem value="Offline">Offline</SelectItem>
                            </SelectContent>
                          </Select>
                          {renderFieldError(
                            `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                              (e) => e.id === entry.id
                            )}.trainingType`
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTraining(entry.id)}
                          disabled={isIndicatorSubmitted("4.6")}
                          aria-label="Remove"
                          className="text-destructive hover:bg-destructive/10 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {renderFieldError("section4_6.capacityArray")}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTraining}
                  disabled={isIndicatorSubmitted("4.6")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Officer
                </Button>
                {/* ✅ Table view for Section 4.6 – Officer Participation */}
                {formData.section4_6.capacityArray.length > 0 && (
                  <div className="overflow-x-auto rounded-xl mt-4">
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
                            Organizer
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Type
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.section4_6.capacityArray.map((entry) => (
                          <tr key={entry.id} className="bg-white">
                            <td className="py-3 px-4 text-sm">
                              {entry.officerName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.designation}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.programName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.organiser}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.trainingType}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removeTraining(entry.id)}
                                disabled={isIndicatorSubmitted("4.6")}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ✅ If NO → show comment box */}
            {formData.section4_6.participated === "no" && (
              <div className="flex flex-col gap-2 w-[60%]">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_6.comment || ""}
                  onChange={(e) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_6: {
                        ...prev.section4_6,
                        comment: e.target.value,
                      },
                    }));
                  }}
                  disabled={isIndicatorSubmitted("4.6")}
                  className={cn(
                    getInputValidationClass("section4_6.comment"),
                    isIndicatorSubmitted("4.6") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
                {renderFieldError("section4_6.comment")}
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.6", "Capacity Building")
                }
                disabled={submittingIndicator !== null || isIndicatorSubmitted("4.6")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.6", submittingIndicator)}
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Navigation Buttons */}

      <FormActions
        onPrevious={goToPrevious}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        isFirstStep={false}
        isLastStep={isLastStep}
        nextLabel={isLastStep ? "Review & Submit" : "Next"}
        showSaveDraft={true}
        isNextDisabled={isNextDisabled}
      />

      {/* Confirmation Dialog for Submit */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit indicator{" "}
              <strong>
                {pendingIndicator?.code} - {pendingIndicator?.title}
              </strong>
              ? This will send the data to the State Approver for review. Once
              submitted, you cannot modify this indicator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSubmit}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={submittingIndicator !== null}
            >
              {submittingIndicator !== null ? "Submitting..." : "Confirm & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
};
