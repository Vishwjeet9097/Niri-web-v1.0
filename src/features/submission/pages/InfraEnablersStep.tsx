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
import { useFieldValidation } from "../hooks/useFieldValidation";
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
import { getInputValidationClass as getInputValidationClassUtil } from "../utils/validationStyles";
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
    available: "",
    file: null,
    comment: "",
  },
  section4_2: {
    adopted: "",
    projects: [],
    comment: "",
  },
  section4_3: {
    adopted: "",
    file: null,
    comment: "",
  },
  section4_4: {
    implemented: "",
    practices: [],
    comment: "",
  },
  section4_5: {
    participated: "",
    capacityArray: [],
    comment: "",
  },
};

export const InfraEnablersStep = () => {
  const { currentStep, goToStep, goToNext, goToPrevious, isLastStep } =
    useStepNavigation(4);
  const { getStepData, updateFormData, clearFormData } = useFormPersistence();

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
        status: (data.section4_5 as any)?.status,
      },
    };
  }

  const loadedData =
    (getStepData("infraEnablers") as Partial<InfraEnablersData>) || {};
  const initialData: InfraEnablersData = safeInfraEnablersFormData(loadedData);

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [submittingIndicator, setSubmittingIndicator] = useState<string | null>(
    null
  );
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
  // Track which indicators are being saved as draft
  const [savingDraftIndicators, setSavingDraftIndicators] = useState<
    Set<string>
  >(new Set());
  // Store snapshots of original form data when editing starts (for cancel functionality)
  const [originalFormDataSnapshots, setOriginalFormDataSnapshots] = useState<
    Record<string, any>
  >({});
  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveIndicatorCode, setPendingSaveIndicatorCode] = useState<
    string | null
  >(null);
  // Track indicator-specific validation errors
  const [indicatorValidationErrors, setIndicatorValidationErrors] = useState<
    Record<string, string>
  >({});
  // Section-level validation error messages (shown when save fails)
  const [sectionValidationMessages, setSectionValidationMessages] = useState<
    Record<string, string>
  >({});

  // Use the shared field validation hook
  const {
    validatingIndicator,
    setValidatingIndicator,
    markFieldAsTouched,
    getFieldError: getFieldErrorFromHook,
    markIndicatorFieldsAsTouched,
    clearValidatingIndicator,
    clearValidFieldErrors,
  } = useFieldValidation();

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
          console.log(
            "ℹ️ No existing submission found, files will upload on submit"
          );
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
                legacy.section4_1
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_1
              )?.status,
              // Preserve saveAsDraft flag from database
              saveAsDraft: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_1
              )?.saveAsDraft,
            },
            section4_2: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_2
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_2
              )?.status,
              // Preserve saveAsDraft flag from database
              saveAsDraft: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_2
              )?.saveAsDraft,
            },
            section4_3: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_3
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_3
              )?.status,
              // Preserve saveAsDraft flag from database
              saveAsDraft: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_3
              )?.saveAsDraft,
            },
            section4_4: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_4
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_4
              )?.status,
              // Preserve saveAsDraft flag from database
              saveAsDraft: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_4
              )?.saveAsDraft,
            },
            section4_5: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_5
              ),
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_5
              )?.status,
              // Preserve saveAsDraft flag from database
              saveAsDraft: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section4_5
              )?.saveAsDraft,
            },
          });
          setFormData(newFormData);
          setIsDataLoaded(true);
        } else {
          // No submission found in database (submission was deleted), clear localStorage
          console.log(
            "🧹 No submission found in database - clearing localStorage"
          );
          clearFormData();

          setFormData(safeInfraEnablersFormData({}));
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

  // Define the indicators for this section (after removing old 4.1, indicators are now 4.1-4.5)
  const sectionIndicators = ["4.1", "4.2", "4.3", "4.4", "4.5"];

  // Unified access control for both roles - calculate before validation
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
      section4_1_available: formData.section4_1.available,
    });
  }, [
    validation,
    formData,
    allowedIndicators,
    isNodalOfficer,
    isStateApprover,
  ]);

  // Use the hook's getFieldError function
  const getFieldError = (fieldPath: string): string | undefined => {
    return getFieldErrorFromHook(
      fieldPath,
      validation.errors,
      indicatorValidationErrors,
      showValidationErrors
    );
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

  // Ensure arrays have at least 1 entry when "yes" is selected
  useEffect(() => {
    if (
      formData.section4_2.adopted === "yes" &&
      (!formData.section4_2.projects ||
        formData.section4_2.projects.length === 0)
    ) {
      setFormData((prev) => ({
        ...prev,
        section4_2: {
          ...prev.section4_2,
          projects: [
            {
              id: Date.now().toString(),
              projectName: "",
              sector: "",
              file: null,
            },
          ],
        },
      }));
    }
  }, [formData.section4_2.adopted, formData.section4_2.projects?.length]);

  useEffect(() => {
    if (
      formData.section4_4.implemented === "yes" &&
      (!formData.section4_4.practices ||
        formData.section4_4.practices.length === 0)
    ) {
      setFormData((prev) => ({
        ...prev,
        section4_4: {
          ...prev.section4_4,
          practices: [
            {
              id: Date.now().toString(),
              practiceName: "",
              impact: "",
              file: null,
            },
          ],
        },
      }));
    }
  }, [formData.section4_4.implemented, formData.section4_4.practices?.length]);

  useEffect(() => {
    if (
      formData.section4_5.participated === "yes" &&
      (!formData.section4_5.capacityArray ||
        formData.section4_5.capacityArray.length === 0)
    ) {
      setFormData((prev) => ({
        ...prev,
        section4_5: {
          ...prev.section4_5,
          capacityArray: [
            {
              id: Date.now().toString(),
              officerName: "",
              designation: "",
              programName: "",
              organiser: "",
              trainingType: "",
              trainingPeriod: "",
            },
          ],
        },
      }));
    }
  }, [
    formData.section4_5.participated,
    formData.section4_5.capacityArray?.length,
  ]);

  // Calculation helpers
  const calculateSection4_3 = useCallback(() => {
    const numberOfProjects = parseInt(
      String(formData.section4_2?.projects?.length || 0),
      10
    );
    if (isNaN(numberOfProjects)) return { marksObtained: 0 };
    const marksObtained = Math.min(numberOfProjects * 5, 20);
    return { marksObtained: Math.round(marksObtained * 100) / 100 };
  }, [formData.section4_2?.projects?.length]);

  const calculateSection4_4 = useCallback(() => {
    const numberOfPractices = formData.section4_4?.practices?.length || 0;
    const marksObtained = Math.min(numberOfPractices * 5, 20);
    return { marksObtained: Math.round(marksObtained * 100) / 100 };
  }, [formData.section4_4?.practices?.length]);

  const calculateSection4_5 = useCallback(() => {
    const len = formData.section4_5?.capacityArray?.length || 0;
    const totalMarks = Math.min(len * 1, 50);
    return {
      perEntry: len > 0 ? 1 : 0,
      totalMarks: Math.round(totalMarks * 100) / 100,
    };
  }, [formData.section4_5?.capacityArray?.length]);

  // Removed empty useEffect

  // Autosave to persistence with debounce
  // REMOVED: This useEffect was causing data loss by only saving section4_1
  // and overwriting all other sections (4.2-4.5) whenever formData changed.
  // The updateFormData is now handled properly in handleConfirmSubmit and other places.
  // useEffect(() => {
  //   const timeoutId = setTimeout(() => {
  //     const structuredData: InfraEnablersData = {
  //       section4_1: formData.section4_1 || defaultData.section4_1,
  //     };
  //     updateFormData("infraEnablers", structuredData);
  //   }, 500);
  //
  //   return () => clearTimeout(timeoutId);
  //   // eslint-disable-next-line
  // }, [formData]);

  // --- Section 4.2 helpers ---
  const addGatiProject = () => {
    setFormData((prev) => ({
      ...prev,
      section4_2: {
        ...prev.section4_2,
        projects: [
          ...(prev.section4_2?.projects || []),
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
      section4_2: {
        ...prev.section4_2,
        projects: (prev.section4_2?.projects || []).filter(
          (project) => project.id !== id
        ),
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
      section4_2: {
        ...prev.section4_2,
        projects: (prev.section4_2?.projects || []).map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  // --- Section 4.4 helpers ---
  const addPractice = () => {
    setFormData((prev) => ({
      ...prev,
      section4_4: {
        ...prev.section4_4,
        practices: [
          ...(prev.section4_4?.practices || []),
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
      section4_4: {
        ...prev.section4_4,
        practices: (prev.section4_4?.practices || []).filter(
          (practice) => practice.id !== id
        ),
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
      section4_4: {
        ...prev.section4_4,
        practices: (prev.section4_4?.practices || []).map((p) =>
          p.id === id ? { ...p, [field]: value } : p
        ),
      },
    }));
  };

  // --- Section 4.5 helpers ---
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
      trainingPeriod: "",
    };
    setFormData((prev) => ({
      ...prev,
      section4_5: {
        ...prev.section4_5,
        capacityArray: [...(prev.section4_5?.capacityArray || []), newEntry],
      },
    }));
  };

  const removeTraining = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section4_5: {
        ...prev.section4_5,
        capacityArray: (prev.section4_5?.capacityArray || []).filter(
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
      | "trainingType"
      | "trainingPeriod",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_5: {
        ...prev.section4_5,
        capacityArray: (prev.section4_5?.capacityArray || []).map((entry) =>
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
              if (
                prop === "file" &&
                (value.file instanceof File || value.file instanceof Blob)
              ) {
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
      setSubmittingIndicator(null);
      // Get the indicators for this section
      const sectionIndicators = allowedIndicators || [
        "4.1",
        "4.2",
        "4.3",
        "4.4",
        "4.5",
      ];
      // Remove unwanted keys (preserves File instances for upload)
      const sanitizedFormData = deepRemoveUnwantedKeys(formData);
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
      // Mark all fields with errors in this indicator as touched so errors show
      markIndicatorFieldsAsTouched(indicatorCode, indicatorValidation.errors);

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
    clearValidatingIndicator();
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
          saveAsDraft: false, // Remove saveAsDraft flag when submitting/resubmitting
        },
      };

      const result = await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraEnablers",
        [indicatorCode]
      );

      console.log("🔵 [SUBMIT] API response:", result);

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
            saveAsDraft: false, // Remove saveAsDraft flag when submitting/resubmitting
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

      // Dispatch event to refresh indicators after indicator submission
      // This ensures the "Create Submission" button disables correctly when last indicator is submitted
      if (isStateApprover && user?.id) {
        console.log(
          "📢 [InfraEnablersStep] Dispatching indicatorsUpdated event after indicator submission"
        );
        window.dispatchEvent(
          new CustomEvent("indicatorsUpdated", {
            detail: {
              userId: user.id,
              role: "STATE_APPROVER",
              action: "indicator_submitted",
              indicatorCode,
              submissionId: result?.id || result?.submissionId,
            },
          })
        );
      }

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
          console.log("🔵 [SUBMIT] Full submission from server:", {
            id: fullSubmission.id,
            formDataKeys: fullSubmission.formData
              ? Object.keys(
                  typeof fullSubmission.formData === "string"
                    ? JSON.parse(fullSubmission.formData)
                    : fullSubmission.formData
                )
              : "no formData",
            section_status: fullSubmission.section_status,
          });

          // Check if formData in DB has all sections
          let parsedFormData = fullSubmission.formData;
          if (typeof fullSubmission.formData === "string") {
            try {
              parsedFormData = JSON.parse(fullSubmission.formData);
            } catch (e) {
              console.error("🔵 [SUBMIT] Error parsing formData:", e);
            }
          }
          const dbFormData = parsedFormData?.infraEnablers || {};
          console.log("🔵 [SUBMIT] DB formData infraEnablers sections:", {
            section4_1: dbFormData.section4_1 ? "exists" : "missing",
            section4_2: dbFormData.section4_2 ? "exists" : "missing",
            section4_3: dbFormData.section4_3 ? "exists" : "missing",
            section4_4: dbFormData.section4_4 ? "exists" : "missing",
            section4_5: dbFormData.section4_5 ? "exists" : "missing",
            keys: Object.keys(dbFormData),
          });

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
        "infraEnablers"
      );

      // Update submissionId if it was created/updated
      if (result?.id || result?.submissionId) {
        const newSubmissionId = result.id || result.submissionId;
        if (newSubmissionId && newSubmissionId !== submissionId) {
          setSubmissionId(newSubmissionId);
          console.log(
            "✅ Updated submissionId after draft save:",
            newSubmissionId
          );
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

  // Helper function to check if indicator is saved as draft
  const isIndicatorSavedAsDraft = (indicatorCode: string): boolean => {
    const sectionKey = `section${indicatorCode.replace(".", "_")}`;
    const sectionData = formData[sectionKey];
    return (sectionData as any)?.saveAsDraft === true;
  };

  // Check if indicator is submitted or accepted (non-editable)
  // Note: REVERTED/RESUBMITTED indicators are non-editable by default, but can be edited via Edit button
  // Indicators with saveAsDraft flag remain editable
  const isIndicatorSubmitted = (indicatorCode: string): boolean => {
    // If indicator is in edit mode, it's editable
    if (editingIndicators.has(indicatorCode)) {
      return false;
    }
    // Indicators with saveAsDraft flag remain editable
    if (isIndicatorSavedAsDraft(indicatorCode)) {
      return false;
    }
    const status = getIndicatorStatus(indicatorCode);
    if (!status) return false;
    const upperStatus = status.toUpperCase();
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

    // If indicator is saved as draft, show "Submit" (not "Submitted")
    if (isIndicatorSavedAsDraft(indicatorCode)) {
      return "Submit";
    }

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
    const sectionKey = `section${indicatorCode.replace(".", "_")}`;
    // Store a snapshot of the current form data for this section before editing
    setOriginalFormDataSnapshots((prev) => ({
      ...prev,
      [indicatorCode]: JSON.parse(JSON.stringify(formData[sectionKey] || {})),
    }));
    setEditingIndicators((prev) => new Set(prev).add(indicatorCode));
  };

  // Helper to render validation error message for an indicator
  const renderSectionValidationMessage = (indicatorCode: string) => {
    if (
      !sectionValidationMessages[indicatorCode] ||
      !editingIndicators.has(indicatorCode)
    ) {
      return null;
    }
    return (
      <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="text-sm text-destructive font-medium">
          {sectionValidationMessages[indicatorCode]}
        </p>
      </div>
    );
  };

  // Helper to clear validation message for an indicator when fields are updated
  const clearIndicatorValidationMessage = (indicatorCode: string) => {
    setSectionValidationMessages((prev) => {
      const updated = { ...prev };
      delete updated[indicatorCode];
      return updated;
    });
  };

  // Handle Save button click for sent back indicators
  const handleSaveIndicator = async (indicatorCode: string) => {
    // Check if user is NODAL_OFFICER and indicator is REVERTED
    const currentStatus = getIndicatorStatus(indicatorCode);
    const upperStatus = (currentStatus || "").toUpperCase();
    const isReverted = upperStatus === "REVERTED";

    // If NODAL_OFFICER, ALWAYS run validation FIRST before showing dialog
    // This ensures validation errors are shown on UI instead of alerts
    if (isNodalOfficer) {
      // Run validation first
      const validationResult = validateInfraEnablers(formData, {
        allowedIndicators:
          assignedIndicators.length > 0 ? assignedIndicators : undefined,
      });

      // Filter validation errors to only include the indicator being saved
      const sectionErrors: Record<string, string> = {};
      const sectionPrefix = `section${indicatorCode.replace(".", "_")}`;
      Object.keys(validationResult.errors).forEach((errorKey) => {
        if (errorKey.startsWith(sectionPrefix)) {
          sectionErrors[errorKey] = validationResult.errors[errorKey];
        }
      });

      // If validation fails, show errors on UI and return (don't show dialog)
      if (Object.keys(sectionErrors).length > 0) {
        // Mark all fields in this indicator as touched so ALL errors show
        const allIndicatorFields: string[] = [];

        // Add base fields based on indicator
        if (indicatorCode === "4.1") {
          allIndicatorFields.push(
            `${sectionPrefix}.available`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (indicatorCode === "4.2") {
          allIndicatorFields.push(
            `${sectionPrefix}.adopted`,
            `${sectionPrefix}.comment`
          );
          if (formData.section4_2?.projects) {
            formData.section4_2.projects.forEach((_, index) => {
              allIndicatorFields.push(
                `${sectionPrefix}.projects.${index}.projectName`,
                `${sectionPrefix}.projects.${index}.sector`,
                `${sectionPrefix}.projects.${index}.file`
              );
            });
          }
        } else if (indicatorCode === "4.3") {
          allIndicatorFields.push(
            `${sectionPrefix}.adopted`,
            `${sectionPrefix}.file`,
            `${sectionPrefix}.comment`
          );
        } else if (indicatorCode === "4.4") {
          allIndicatorFields.push(
            `${sectionPrefix}.implemented`,
            `${sectionPrefix}.comment`
          );
          if (formData.section4_4?.practices) {
            formData.section4_4.practices.forEach((_, index) => {
              allIndicatorFields.push(
                `${sectionPrefix}.practices.${index}.practiceName`,
                `${sectionPrefix}.practices.${index}.impact`,
                `${sectionPrefix}.practices.${index}.file`
              );
            });
          }
        } else if (indicatorCode === "4.5") {
          allIndicatorFields.push(
            `${sectionPrefix}.participated`,
            `${sectionPrefix}.comment`
          );
          if (formData.section4_5?.capacityArray) {
            formData.section4_5.capacityArray.forEach((_, index) => {
              allIndicatorFields.push(
                `${sectionPrefix}.capacityArray.${index}.officerName`,
                `${sectionPrefix}.capacityArray.${index}.designation`,
                `${sectionPrefix}.capacityArray.${index}.programName`,
                `${sectionPrefix}.capacityArray.${index}.organiser`,
                `${sectionPrefix}.capacityArray.${index}.trainingType`
              );
            });
          }
        }

        // Mark all indicator fields as touched so ALL errors show
        allIndicatorFields.forEach((field) => {
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
          [indicatorCode]: `Please fill all mandatory fields. ${errorCount} field(s) are missing.`,
        }));
        console.log(
          `[InfraEnablersStep] Validation failed for indicator ${indicatorCode}:`,
          sectionErrors
        );
        // Errors are displayed inline in the UI, don't show dialog
        return;
      }

      // Validation passed - show confirmation dialog only if status is REVERTED
      if (isReverted) {
        setPendingSaveIndicatorCode(indicatorCode);
        setShowSaveDialog(true);
        return;
      } else {
        // If not REVERTED, proceed with direct save
        await performSaveIndicator(indicatorCode);
        return;
      }
    }

    // For non-NODAL_OFFICER users, proceed with save directly
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
        saveAsDraft: false, // Remove saveAsDraft flag when saving after resubmission
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
          console.log(
            "✅ Updated submissionId after resubmit:",
            newSubmissionId
          );
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
          [sectionKey]: {
            ...sectionDataWithStatus,
            saveAsDraft: false, // Ensure saveAsDraft is removed
          },
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
    const sectionKey = `section${indicatorCode.replace(".", "_")}`;
    // Restore the original form data from snapshot
    if (originalFormDataSnapshots[indicatorCode]) {
      setFormData((prev: any) => ({
        ...prev,
        [sectionKey]: JSON.parse(
          JSON.stringify(originalFormDataSnapshots[indicatorCode])
        ),
      }));
      // Remove the snapshot after restoring
      setOriginalFormDataSnapshots((prev) => {
        const updated = { ...prev };
        delete updated[indicatorCode];
        return updated;
      });
    }
    setEditingIndicators((prev) => {
      const newSet = new Set(prev);
      newSet.delete(indicatorCode);
      return newSet;
    });
  };

  // Handle Save as Draft button click
  const handleSaveAsDraftIndicator = async (indicatorCode: string) => {
    setSavingDraftIndicators((prev) => new Set(prev).add(indicatorCode));
    try {
      const sectionKey = `section${indicatorCode.replace(".", "_")}`;

      // Sanitize files and remove unwanted keys before saving
      const sanitizedFormData = deepRemoveUnwantedKeys(
        sanitizeFilesInFormData(formData)
      );

      // Get current status to preserve it (REVERTED, SUBMITTED_TO_STATE, etc.)
      const currentStatus = sanitizedFormData[sectionKey]?.status;

      // Prepare data with saveAsDraft flag (preserve existing status)
      const sectionDataWithDraftFlag = {
        ...sanitizedFormData[sectionKey],
        saveAsDraft: true,
        // Preserve existing status if it exists, otherwise don't set status
        ...(currentStatus && { status: currentStatus }),
      };

      // Create sanitized data with saveAsDraft flag for the draft indicator
      const sanitizedFormDataWithDraftFlag = {
        ...sanitizedFormData,
        [sectionKey]: sectionDataWithDraftFlag,
      };

      // Use submitSectionToStateApprover API to save with saveAsDraft flag
      await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithDraftFlag,
        "infraEnablers",
        [indicatorCode]
      );

      // Update local formData state immediately to reflect saveAsDraft flag
      setFormData((prev: any) => {
        const updated = {
          ...prev,
          [sectionKey]: sectionDataWithDraftFlag,
        };
        // Also update form persistence with the merged data
        updateFormData("infraEnablers", {
          ...prev,
          ...sanitizedFormDataWithDraftFlag,
        });
        return updated;
      });

      toast({
        title: "Draft Saved",
        description: `Indicator ${indicatorCode} has been saved as draft. You can edit it later.`,
        variant: "default",
      });
    } catch (error) {
      console.error(
        `Failed to save indicator ${indicatorCode} as draft:`,
        error
      );
      toast({
        title: "Save Failed",
        description: `Failed to save indicator ${indicatorCode} as draft. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSavingDraftIndicators((prev) => {
        const newSet = new Set(prev);
        newSet.delete(indicatorCode);
        return newSet;
      });
    }
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
                <span className="text-primary">4.1 - </span> Availability & Use
                of State/UT PMG{" "}
              </span>
            </div>
          }
          subtitle=""
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.1")}
          saveAsDraft={isIndicatorSavedAsDraft("4.1")}
          indicatorCode="4.1"
          isEditable={editingIndicators.has("4.1")}
          onEdit={() => handleEditIndicator("4.1")}
          onSave={() => handleSaveIndicator("4.1")}
          onCancel={() => handleCancelEdit("4.1")}
          isSaving={savingIndicators.has("4.1")}
        >
          {renderSectionValidationMessage("4.1")}
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
                    checked={formData.section4_1.available === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.1")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_1: {
                          ...prev.section4_1,
                          available: "yes",
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
                    name="pmg-available"
                    value="no"
                    checked={formData.section4_1.available === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.1")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_1: {
                          ...prev.section4_1,
                          available: "no",
                          file: null,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.1")}
                  />
                  No
                </label>
              </div>
            </div>
            {formData.section4_1.available === "yes" && (
              <div className="flex flex-col gap-2">
                <FileUploadSection
                  label="Upload File"
                  value={formData.section4_1.file}
                  onChange={(file) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_1: { ...prev.section4_1, file },
                    }));
                  }}
                  submissionId={submissionId}
                  required
                  disabled={isIndicatorSubmitted("4.1")}
                  deferFileDeletion={editingIndicators.has("4.1")}
                />
                <p className="text-xs text-muted-foreground">Description</p>
              </div>
            )}
            {formData.section4_1.available === "no" && (
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
                    isIndicatorSubmitted("4.1") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.1", "PM GatiShakti Master Plan")
                }
                disabled={
                  submittingIndicator !== null || isIndicatorSubmitted("4.1")
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.1", submittingIndicator)}
              </Button>
              <Button
                onClick={() => handleSaveAsDraftIndicator("4.1")}
                disabled={
                  savingDraftIndicators.has("4.1") ||
                  submittingIndicator !== null ||
                  isIndicatorSubmitted("4.1")
                }
                variant="outline"
                size="sm"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDraftIndicators.has("4.1")
                  ? "Saving..."
                  : "Save as Draft"}
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
              <span className="text-base font-semibold">
                <span className="text-primary">4.2 – </span> Adoption of PM
                GatiShakti
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.2")}
          saveAsDraft={isIndicatorSavedAsDraft("4.2")}
          indicatorCode="4.2"
          isEditable={editingIndicators.has("4.2")}
          onEdit={() => handleEditIndicator("4.2")}
          onSave={() => handleSaveIndicator("4.2")}
          onCancel={() => handleCancelEdit("4.2")}
          isSaving={savingIndicators.has("4.2")}
        >
          {renderSectionValidationMessage("4.2")}
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
                    checked={formData.section4_2.adopted === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.2")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_2: {
                          ...prev.section4_2,
                          adopted: "yes",
                          comment: "",
                          // Initialize with 1 entry if empty
                          projects:
                            prev.section4_2?.projects &&
                            prev.section4_2.projects.length > 0
                              ? prev.section4_2.projects
                              : [
                                  {
                                    id: Date.now().toString(),
                                    projectName: "",
                                    sector: "",
                                    file: null,
                                  },
                                ],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.2")}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="pm-gatishakti"
                    value="no"
                    checked={formData.section4_2.adopted === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.2")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_2: {
                          ...prev.section4_2,
                          adopted: "no",
                          projects: [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.2")}
                  />
                  No
                </label>
              </div>
            </div>

            {/* --- If YES --- */}
            {formData.section4_2.adopted === "yes" && (
              <div className="flex flex-col gap-4">
                {(formData.section4_2?.projects || []).map((entry, index) => (
                  <div key={entry.id || `entry-${index}`} className="mb-2">
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
                          disabled={isIndicatorSubmitted("4.2")}
                          className={cn(
                            getInputValidationClass(
                              `section4_2.projects.${
                                formData.section4_2?.projects?.findIndex(
                                  (p) => p.id === entry.id
                                ) ?? 0
                              }.projectName`
                            ),
                            isIndicatorSubmitted("4.2") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_2.projects.${
                            formData.section4_2?.projects?.findIndex(
                              (p) => p.id === entry.id
                            ) ?? 0
                          }.projectName`
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
                          disabled={isIndicatorSubmitted("4.2")}
                        >
                          <SelectTrigger
                            className={cn(
                              getInputValidationClass(
                                `section4_2.projects.${
                                  formData.section4_2?.projects?.findIndex(
                                    (p) => p.id === entry.id
                                  ) ?? 0
                                }.sector`
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
                          `section4_2.projects.${
                            formData.section4_2?.projects?.findIndex(
                              (p) => p.id === entry.id
                            ) ?? 0
                          }.sector`
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGatiProject(entry.id)}
                          disabled={isIndicatorSubmitted("4.2")}
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
                        required
                        disabled={isIndicatorSubmitted("4.2")}
                        deferFileDeletion={editingIndicators.has("4.2")}
                        className={getInputValidationClass(
                          `section4_2.projects.${
                            formData.section4_2?.projects?.findIndex(
                              (p) => p.id === entry.id
                            ) ?? 0
                          }.file`
                        )}
                      />
                      {renderFieldError(
                        `section4_2.projects.${
                          formData.section4_2?.projects?.findIndex(
                            (p) => p.id === entry.id
                          ) ?? 0
                        }.file`
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addGatiProject}
                  disabled={isIndicatorSubmitted("4.2")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
              </div>
            )}
            {/* ✅ Table view for Section 4.2 – PM GatiShakti Projects */}
            {formData.section4_2.adopted === "yes" && (
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
                    {(formData.section4_2?.projects || []).map(
                      (entry, index) => {
                        const file = entry.file;
                        if (!file) {
                          return (
                            <tr
                              key={entry.id || `entry-${index}`}
                              className="bg-white"
                            >
                              <td className="py-3 px-4 text-sm">
                                {entry.projectName}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {entry.sector}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                No file uploaded
                              </td>
                              <td className="py-3 px-4 text-sm">N/A</td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => removeGatiProject(entry.id)}
                                  disabled={isIndicatorSubmitted("4.2")}
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
                        const extractOriginalName = (
                          fileName: string,
                          originalName?: string
                        ): string => {
                          if (originalName && originalName.trim())
                            return originalName;

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

                        const displayName = extractOriginalName(
                          file.fileName || "",
                          (file as any)?.originalName
                        );

                        return (
                          <tr
                            key={entry.id || `entry-${index}`}
                            className="bg-white"
                          >
                            <td className="py-3 px-4 text-sm">
                              {entry.projectName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.sector}
                            </td>
                            <td className="py-3 px-4 text-sm">{displayName}</td>
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
                                disabled={isIndicatorSubmitted("4.2")}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* --- If NO --- (same style as Section 4.2) */}
            {formData.section4_2.adopted === "no" && (
              <div className="flex flex-col gap-2 w-[60%]">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_2.comment || ""}
                  disabled={isIndicatorSubmitted("4.2")}
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
                  className={cn(
                    isIndicatorSubmitted("4.2") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.2", "PM GatiShakti NMP Projects")
                }
                disabled={
                  submittingIndicator !== null || isIndicatorSubmitted("4.2")
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.2", submittingIndicator)}
              </Button>
              <Button
                onClick={() => handleSaveAsDraftIndicator("4.2")}
                disabled={
                  savingDraftIndicators.has("4.2") ||
                  submittingIndicator !== null ||
                  isIndicatorSubmitted("4.2")
                }
                variant="outline"
                size="sm"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDraftIndicators.has("4.2")
                  ? "Saving..."
                  : "Save as Draft"}
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
              <span className="text-base font-semibold ">
                <span className="text-primary">4.3 – </span> Adoption of ADR
                {/* <span className="font-normal text-xs text-muted-foreground ml-1">
                  (10 marks per practice)
                </span> */}
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.3")}
          saveAsDraft={isIndicatorSavedAsDraft("4.3")}
          indicatorCode="4.3"
          isEditable={editingIndicators.has("4.3")}
          onEdit={() => handleEditIndicator("4.3")}
          onSave={() => handleSaveIndicator("4.3")}
          onCancel={() => handleCancelEdit("4.3")}
          isSaving={savingIndicators.has("4.3")}
        >
          {renderSectionValidationMessage("4.3")}
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
                    name="adr-adopted"
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
                          file: null,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.3")}
                  />
                  No
                </label>
              </div>
            </div>

            {/* ✅ If YES → show file upload */}
            {formData.section4_3.adopted === "yes" && (
              <div className="flex flex-col gap-2">
                <FileUploadSection
                  label="Upload File"
                  value={formData.section4_3.file}
                  onChange={(file) => {
                    showErrorsIfNeeded();
                    setFormData((prev) => ({
                      ...prev,
                      section4_3: { ...prev.section4_3, file },
                    }));
                  }}
                  submissionId={submissionId}
                  required
                  disabled={isIndicatorSubmitted("4.3")}
                  deferFileDeletion={editingIndicators.has("4.3")}
                />
                <p className="text-xs text-muted-foreground">
                  Upload ADR orders
                </p>
              </div>
            )}

            {/* ✅ If NO → show comment box (same style as 4.1 & 4.2) */}
            {formData.section4_3.adopted === "no" && (
              <div className="flex flex-col gap-2 w-[60%]">
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section4_3.comment || ""}
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
                  disabled={isIndicatorSubmitted("4.3")}
                  className={cn(
                    isIndicatorSubmitted("4.3") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => handleSubmitIndicator("4.3", "Adoption of ADR")}
                disabled={
                  submittingIndicator !== null || isIndicatorSubmitted("4.3")
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.3", submittingIndicator)}
              </Button>
              <Button
                onClick={() => handleSaveAsDraftIndicator("4.3")}
                disabled={
                  savingDraftIndicators.has("4.3") ||
                  submittingIndicator !== null ||
                  isIndicatorSubmitted("4.3")
                }
                variant="outline"
                size="sm"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDraftIndicators.has("4.3")
                  ? "Saving..."
                  : "Save as Draft"}
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
              <span className="text-base font-semibold">
                <span className="text-primary">4.4 – </span> Innovative
                Practices
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.4")}
          saveAsDraft={isIndicatorSavedAsDraft("4.4")}
          indicatorCode="4.4"
          isEditable={editingIndicators.has("4.4")}
          onEdit={() => handleEditIndicator("4.4")}
          onSave={() => handleSaveIndicator("4.4")}
          onCancel={() => handleCancelEdit("4.4")}
          isSaving={savingIndicators.has("4.4")}
        >
          {renderSectionValidationMessage("4.4")}
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
                    checked={formData.section4_4.implemented === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.4")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_4: {
                          ...prev.section4_4,
                          implemented: "yes",
                          comment: "",
                          // Initialize with 1 entry if empty
                          practices:
                            prev.section4_4?.practices &&
                            prev.section4_4.practices.length > 0
                              ? prev.section4_4.practices
                              : [
                                  {
                                    id: Date.now().toString(),
                                    practiceName: "",
                                    impact: "",
                                    file: null,
                                  },
                                ],
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
                    name="innovative-practices"
                    value="no"
                    checked={formData.section4_4.implemented === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.4")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_4: {
                          ...prev.section4_4,
                          implemented: "no",
                          practices: [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.4")}
                  />
                  No
                </label>
              </div>
            </div>

            {/* ✅ If YES → show Practice list */}
            {formData.section4_4.implemented === "yes" && (
              <div className="flex flex-col gap-4">
                {(formData.section4_4?.practices || []).map((entry, index) => (
                  <div key={entry.id || `entry-${index}`} className="mb-2">
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
                          disabled={isIndicatorSubmitted("4.4")}
                          className={cn(
                            getInputValidationClass(
                              `section4_4.practices.${
                                formData.section4_4?.practices?.findIndex(
                                  (p) => p.id === entry.id
                                ) ?? 0
                              }.practiceName`
                            ),
                            isIndicatorSubmitted("4.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section4_4.practices.${
                            formData.section4_4?.practices?.findIndex(
                              (p) => p.id === entry.id
                            ) ?? 0
                          }.practiceName`
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
                          disabled={isIndicatorSubmitted("4.4")}
                        >
                          <SelectTrigger
                            className={cn(
                              getInputValidationClass(
                                `section4_4.practices.${
                                  formData.section4_4?.practices?.findIndex(
                                    (p) => p.id === entry.id
                                  ) ?? 0
                                }.impact`
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
                          `section4_4.practices.${
                            formData.section4_4?.practices?.findIndex(
                              (p) => p.id === entry.id
                            ) ?? 0
                          }.impact`
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePractice(entry.id)}
                          disabled={isIndicatorSubmitted("4.4")}
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
                        required
                        disabled={isIndicatorSubmitted("4.4")}
                        deferFileDeletion={editingIndicators.has("4.4")}
                        className={getInputValidationClass(
                          `section4_4.practices.${
                            formData.section4_4?.practices?.findIndex(
                              (p) => p.id === entry.id
                            ) ?? 0
                          }.file`
                        )}
                      />
                      {renderFieldError(
                        `section4_4.practices.${
                          formData.section4_4?.practices?.findIndex(
                            (p) => p.id === entry.id
                          ) ?? 0
                        }.file`
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPractice}
                  disabled={isIndicatorSubmitted("4.4")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Practice
                </Button>
              </div>
            )}

            {/* ✅ If NO → show Comment Box (same as 4.1/4.2/4.3) */}
            {formData.section4_4.implemented === "no" && (
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
                    isIndicatorSubmitted("4.4") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.4", "Innovative Practices")
                }
                disabled={
                  submittingIndicator !== null || isIndicatorSubmitted("4.4")
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.4", submittingIndicator)}
              </Button>
              <Button
                onClick={() => handleSaveAsDraftIndicator("4.4")}
                disabled={
                  savingDraftIndicators.has("4.4") ||
                  submittingIndicator !== null ||
                  isIndicatorSubmitted("4.4")
                }
                variant="outline"
                size="sm"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDraftIndicators.has("4.4")
                  ? "Saving..."
                  : "Save as Draft"}
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
              <span className="text-base font-semibold ">
                <span className="text-primary">4.5 – </span> Capacity Building –
                Officer Participation
              </span>
            </div>
          }
          className="mb-6"
          indicatorStatus={getIndicatorStatus("4.5")}
          saveAsDraft={isIndicatorSavedAsDraft("4.5")}
          indicatorCode="4.5"
          isEditable={editingIndicators.has("4.5")}
          onEdit={() => handleEditIndicator("4.5")}
          onSave={() => handleSaveIndicator("4.5")}
          onCancel={() => handleCancelEdit("4.5")}
          isSaving={savingIndicators.has("4.5")}
        >
          {renderSectionValidationMessage("4.5")}
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
                    checked={formData.section4_5.participated === "yes"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.5")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: {
                          ...prev.section4_5,
                          participated: "yes",
                          comment: "",
                          // Initialize with 1 entry if empty
                          capacityArray:
                            prev.section4_5?.capacityArray &&
                            prev.section4_5.capacityArray.length > 0
                              ? prev.section4_5.capacityArray
                              : [
                                  {
                                    id: Date.now().toString(),
                                    officerName: "",
                                    designation: "",
                                    programName: "",
                                    organiser: "",
                                    trainingType: "",
                                    trainingPeriod: "",
                                  },
                                ],
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
                    name="capacity-building"
                    value="no"
                    checked={formData.section4_5.participated === "no"}
                    onChange={() => {
                      if (isIndicatorSubmitted("4.5")) return;
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: {
                          ...prev.section4_5,
                          participated: "no",
                          capacityArray: [],
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("4.5")}
                  />
                  No
                </label>
              </div>
            </div>

            {/* ✅ If YES → show officer entries */}
            {formData.section4_5.participated === "yes" && (
              <div className="flex flex-col gap-4">
                {(formData.section4_5?.capacityArray || []).map(
                  (entry, index) => (
                    <div key={entry.id || `entry-${index}`} className="mb-2">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end">
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
                            disabled={isIndicatorSubmitted("4.5")}
                            className={cn(
                              getInputValidationClass(
                                `section4_5.capacityArray.${
                                  formData.section4_5?.capacityArray?.findIndex(
                                    (e) => e.id === entry.id
                                  ) ?? 0
                                }.officerName`
                              ),
                              isIndicatorSubmitted("4.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section4_5.capacityArray.${
                              formData.section4_5?.capacityArray?.findIndex(
                                (e) => e.id === entry.id
                              ) ?? 0
                            }.officerName`
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
                            disabled={isIndicatorSubmitted("4.5")}
                            className={cn(
                              getInputValidationClass(
                                `section4_5.capacityArray.${
                                  formData.section4_5?.capacityArray?.findIndex(
                                    (e) => e.id === entry.id
                                  ) ?? 0
                                }.designation`
                              ),
                              isIndicatorSubmitted("4.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section4_5.capacityArray.${
                              formData.section4_5?.capacityArray?.findIndex(
                                (e) => e.id === entry.id
                              ) ?? 0
                            }.designation`
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
                            disabled={isIndicatorSubmitted("4.5")}
                            className={cn(
                              getInputValidationClass(
                                `section4_5.capacityArray.${
                                  formData.section4_5?.capacityArray?.findIndex(
                                    (e) => e.id === entry.id
                                  ) ?? 0
                                }.programName`
                              ),
                              isIndicatorSubmitted("4.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section4_5.capacityArray.${
                              formData.section4_5?.capacityArray?.findIndex(
                                (e) => e.id === entry.id
                              ) ?? 0
                            }.programName`
                          )}
                        </div>
                        <div>
                          <Label>
                            Organizer{" "}
                            <span className="text-destructive">*</span>
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
                            disabled={isIndicatorSubmitted("4.5")}
                            className={cn(
                              getInputValidationClass(
                                `section4_5.capacityArray.${
                                  formData.section4_5?.capacityArray?.findIndex(
                                    (e) => e.id === entry.id
                                  ) ?? 0
                                }.organiser`
                              ),
                              isIndicatorSubmitted("4.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section4_5.capacityArray.${
                              formData.section4_5?.capacityArray?.findIndex(
                                (e) => e.id === entry.id
                              ) ?? 0
                            }.organiser`
                          )}
                        </div>
                        <div>
                          <Label>
                            Type <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={entry.trainingType}
                            onValueChange={(v) => {
                              showErrorsIfNeeded();
                              updateTraining(entry.id, "trainingType", v);
                            }}
                            disabled={isIndicatorSubmitted("4.5")}
                          >
                            <SelectTrigger
                              className={cn(
                                getInputValidationClass(
                                  `section4_5.capacityArray.${
                                    formData.section4_5?.capacityArray?.findIndex(
                                      (e) => e.id === entry.id
                                    ) ?? 0
                                  }.trainingType`
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
                            `section4_5.capacityArray.${
                              formData.section4_5?.capacityArray?.findIndex(
                                (e) => e.id === entry.id
                              ) ?? 0
                            }.trainingType`
                          )}
                        </div>
                        <div>
                          <Label>
                            Training Period (MMYY){" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            type="text"
                            placeholder="MMYY (e.g., 1224)"
                            value={entry.trainingPeriod || ""}
                            onChange={(e) => {
                              showErrorsIfNeeded();
                              // Only allow numbers and limit to 4 characters
                              const value = e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 4);
                              updateTraining(entry.id, "trainingPeriod", value);
                            }}
                            disabled={isIndicatorSubmitted("4.5")}
                            className={cn(
                              getInputValidationClass(
                                `section4_5.capacityArray.${
                                  formData.section4_5?.capacityArray?.findIndex(
                                    (e) => e.id === entry.id
                                  ) ?? 0
                                }.trainingPeriod`
                              ),
                              isIndicatorSubmitted("4.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                            maxLength={4}
                          />
                          {renderFieldError(
                            `section4_5.capacityArray.${
                              formData.section4_5?.capacityArray?.findIndex(
                                (e) => e.id === entry.id
                              ) ?? 0
                            }.trainingPeriod`
                          )}
                        </div>
                        <div className="flex items-center justify-center w-12">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTraining(entry.id)}
                            disabled={isIndicatorSubmitted("4.5")}
                            aria-label="Remove"
                            className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTraining}
                  disabled={isIndicatorSubmitted("4.5")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Officer
                </Button>
              </div>
            )}
            {/* ✅ Table view for Section 4.5 – Officer Participation */}
            {formData.section4_5.participated === "yes" && (
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
                      <th className="py-3 px-4 text-left text-sm font-normal">
                        Training Period (MMYY)
                      </th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.section4_5?.capacityArray || []).map(
                      (entry, index) => (
                        <tr
                          key={entry.id || `entry-${index}`}
                          className="bg-white"
                        >
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
                          <td className="py-3 px-4 text-sm">
                            {entry.trainingPeriod || "-"}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => removeTraining(entry.id)}
                              disabled={isIndicatorSubmitted("4.5")}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ✅ If NO → show comment box */}
            {formData.section4_5.participated === "no" && (
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
                    isIndicatorSubmitted("4.5") &&
                      "bg-gray-50 cursor-not-allowed"
                  )}
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  handleSubmitIndicator("4.5", "Capacity Building")
                }
                disabled={
                  submittingIndicator !== null || isIndicatorSubmitted("4.5")
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                {getSubmitButtonText("4.5", submittingIndicator)}
              </Button>
              <Button
                onClick={() => handleSaveAsDraftIndicator("4.5")}
                disabled={
                  savingDraftIndicators.has("4.5") ||
                  submittingIndicator !== null ||
                  isIndicatorSubmitted("4.5")
                }
                variant="outline"
                size="sm"
                className="disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingDraftIndicators.has("4.5")
                  ? "Saving..."
                  : "Save as Draft"}
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
              {submittingIndicator !== null
                ? "Submitting..."
                : "Confirm & Submit"}
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
