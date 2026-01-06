/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard } from "../components/SectionCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { useFieldValidation } from "../hooks/useFieldValidation";
import {
  SECTOR_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  SUBMISSION_STEPS,
} from "../constants/steps";
import type { PPPDevelopmentData, FileUpload } from "../types";
import { FileUploadSection } from "../components/FileUploadSection";
import { draftService } from "@/services/draft.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { FormActions } from "../components/FormActions";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { apiService } from "@/services/api.service";
import { computeStepProgress } from "../utils/progress";
import {
  validatePPPDevelopment,
  type PPPDevelopmentValidationResult,
} from "../validation/pppDevelopmentValidation";
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

const defaultData: PPPDevelopmentData = {
  section3_1: {
    available: "",
    file: null,
  },
  section3_2: {
    available: "",
    file: null,
  },
  section3_3: {
    VGFArray: [
      {
        id: Math.random().toString(36).substr(2, 9),
        projectName: "",
        sector: "",
        scheme: "",
        submissionDate: "",
        totalProjectCost: "",
        statusOfProject: "",
        file: null,
      },
    ],
  },
  section3_4: {
    projects: [],
    totalProjectsAwarded: "",
    totalProjectCostAwarded: "",
  },
};

export const PPPDevelopmentStep = () => {
  const {
    currentStep,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep,
    isLastStep,
  } = useStepNavigation(3);
  const {
    formData: persistedFormData,
    getStepData,
    updateFormData,
    clearFormData,
  } = useFormPersistence();
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

  // Indicator access control
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
    console.log("🔍 PPPDevelopmentStep: Access control state", {
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

  // Defensive: always ensure section3_3 and section3_4 are objects with arrays
  function safePPPFormData(
    data: Partial<PPPDevelopmentData>
  ): PPPDevelopmentData {
    return {
      ...defaultData,
      ...data,
      section3_1: {
        ...defaultData.section3_1,
        ...(data.section3_1 || {}),
        status: (data.section3_1 as any)?.status,
      },
      section3_2: {
        ...defaultData.section3_2,
        ...(data.section3_2 || {}),
        status: (data.section3_2 as any)?.status,
      },
      section3_3: {
        ...(data.section3_3 || {}),
        VGFArray:
          Array.isArray((data.section3_3 as any)?.VGFArray) &&
          (data.section3_3 as any).VGFArray.length > 0
            ? (data.section3_3 as any).VGFArray.map((entry: any) => ({
                ...entry,
                file: typeof entry.file !== "undefined" ? entry.file : null,
              }))
            : defaultData.section3_3.VGFArray,
        status: (data.section3_3 as any)?.status,
      },
      section3_4: {
        ...(data.section3_4 || {}),
        projects: Array.isArray(data.section3_4?.projects)
          ? data.section3_4.projects.map((proj: any) => ({
              ...defaultData.section3_4.projects?.[0],
              ...proj,
              file: typeof proj.file !== "undefined" ? proj.file : null,
            }))
          : [],
        totalProjectsAwarded: data.section3_4?.totalProjectsAwarded || "",
        totalProjectCostAwarded: data.section3_4?.totalProjectCostAwarded || "",
        status: (data.section3_4 as any)?.status,
      },
    };
  }

  // --- Data Initialization and Edit Mode Handling ---
  const [formData, setFormData] = useState<PPPDevelopmentData>(
    safePPPFormData({})
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  // Track which indicators are in edit mode (for sent back indicators)
  const [editingIndicators, setEditingIndicators] = useState<Set<string>>(
    new Set()
  );
  const [savingIndicators, setSavingIndicators] = useState<Set<string>>(
    new Set()
  );
  // Track which indicators are being saved as draft
  const [savingDraftIndicators, setSavingDraftIndicators] = useState<Set<string>>(
    new Set()
  );
  // Store snapshots of original form data when editing starts (for cancel functionality)
  const [originalFormDataSnapshots, setOriginalFormDataSnapshots] = useState<
    Record<string, any>
  >({});
  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveIndicatorCode, setPendingSaveIndicatorCode] = useState<
    string | null
  >(null);
  const [submittingIndicator, setSubmittingIndicator] = useState<string | null>(
    null
  );
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pendingIndicator, setPendingIndicator] = useState<{
    code: string;
    title: string;
  } | null>(null);
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

  // Always prefer backend data in edit mode, clear localStorage
  useEffect(() => {
    if (localStorage.getItem("editing_submission")) {
      console.log(
        "[LocalStorage] Found editing_submission but ignoring in favor of DB data"
      );
      localStorage.removeItem("editing_submission");
    }
  }, []);

  // Fetch submissionId on mount to enable immediate file uploads
  useEffect(() => {
    const fetchSubmissionId = async () => {
      try {
        // Include DRAFT submissions by passing includeDraftOnly = true
        const submissions = await apiService.getSubmissions(1, 100, undefined, undefined, true);
        const userSubmission = submissions.submissions.find(
          (sub: any) =>
            sub.status === "DRAFT" ||
            sub.status === "IN_PROGRESS" ||
            sub.status === "RETURNED_FROM_STATE"
        );

        if (userSubmission) {
          setSubmissionId(userSubmission.id);
          console.log("✅ Found existing submissionId:", userSubmission.id);
        } else {
          console.log(
            "ℹ️ No existing submission found, files will upload on submit"
          );
        }
      } catch (error) {
        console.error("Failed to fetch submissionId:", error);
      }
    };

    fetchSubmissionId();
  }, []);

  useEffect(() => {
    if (!user || (!user.id && !user._id) || isDataLoaded) return;

    (async () => {
      try {
        // Include DRAFT submissions by passing includeDraftOnly = true
        const submissionsResp = await apiService.getSubmissions(1, 100, undefined, undefined, true);
        const userId = user?.id || user?._id;
        const userSubmission = submissionsResp.submissions.find(
          (sub: any) =>
            (sub.status === "DRAFT" ||
            sub.status === "IN_PROGRESS" ||
            sub.status === "RETURNED_FROM_STATE" ||
            sub.status === "PENDING_STATE_APPROVAL") &&
            (sub.submittedBy === userId || sub.user?.id === userId)
        );

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
          const legacy = parsedFormData?.pppDevelopment || {};

          // Helper function to get status: check section data first, then check completedIndicators
          const getStatusForIndicator = (
            indicatorCode: string,
            sectionData: any
          ): string | undefined => {
            // First check if status exists in section data
            if (sectionData?.status) {
              return sectionData.status;
            }
            // If not in section data, check if indicator is in completedIndicators
            const completedIndicators =
              sectionStatusFromDB?.completedIndicators || [];
            if (completedIndicators.includes(indicatorCode)) {
              return "SUBMITTED_TO_STATE";
            }
            return undefined;
          };

          const newFormData: PPPDevelopmentData = safePPPFormData({
            section3_1: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section3_1,
                "3.1"
              ),
              status: getStatusForIndicator(
                "3.1",
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section3_1,
                  "3.1"
                )
              ),
            },
            section3_2: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section3_2,
                "3.2"
              ),
              status: getStatusForIndicator(
                "3.2",
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section3_2,
                  "3.2"
                )
              ),
            },
            section3_3: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section3_3,
                "3.3"
              ),
              status: getStatusForIndicator(
                "3.3",
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section3_3,
                  "3.3"
                )
              ),
            },
            section3_4: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section3_4,
                "3.4"
              ),
              status: getStatusForIndicator(
                "3.4",
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section3_4,
                  "3.4"
                )
              ),
            },
          });
          setFormData(newFormData);
          setIsDataLoaded(true);
        } else {
          // If no backend data found (submission was deleted), clear localStorage and use defaults
          console.log(
            "🧹 No submission found in database - clearing localStorage"
          );
          clearFormData();

          setFormData(safePPPFormData({}));
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
  }, [user, isDataLoaded, getStepData]);

  // Sync with localStorage data when component mounts or data changes (only if not loaded from backend)
  useEffect(() => {
    if (isDataLoaded) return;
    const currentStepData = getStepData(
      "pppDevelopment"
    ) as Partial<PPPDevelopmentData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      setFormData(safePPPFormData(currentStepData));
      console.log(
        "🔄 Synced pppDevelopment data from localStorage in normal flow:",
        currentStepData
      );
    }
  }, [getStepData, isDataLoaded]);

  // --- Indicator Access and Validation ---
  const sectionIndicators = useMemo(() => ["3.1", "3.2", "3.3", "3.4"], []);
  const allowedIndicators = useMemo(
    () =>
      (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter(
        (ind) => sectionIndicators.includes(ind)
      ) || [],
    [isNodalOfficer, assignedIndicators, availableIndicators, sectionIndicators]
  );

  const validation: PPPDevelopmentValidationResult = useMemo(() => {
    const indicatorsToValidate =
      (isNodalOfficer || isStateApprover) && allowedIndicators.length > 0
        ? allowedIndicators
        : undefined;
    return validatePPPDevelopment(formData, {
      allowedIndicators: indicatorsToValidate,
    });
  }, [formData, isNodalOfficer, isStateApprover, allowedIndicators]);
  const isNextDisabled = false; // Validation disabled - Next button always enabled

  // Clear errors for fields that are now valid (when user fixes invalid fields)
  useEffect(() => {
    if (
      validatingIndicator &&
      Object.keys(indicatorValidationErrors).length > 0
    ) {
      clearValidFieldErrors(validation.errors, setIndicatorValidationErrors);
    }
  }, [validation.errors, validatingIndicator, clearValidFieldErrors]);

  // Debug logging
  useEffect(() => {
    console.log("🔍 PPPDevelopmentStep Validation:", {
      isValid: validation.isValid,
      errors: validation.errors,
      section3_1_available: formData.section3_1.available,
      section3_2_available: formData.section3_2.available,
      section3_3_count: formData.section3_3.VGFArray.length,
      section3_4_projects_count: formData.section3_4.projects.length,
    });
  }, [validation, formData]);

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

  // Use shared validation styling utility
  const getInputValidationClass = (fieldPath: string): string => {
    const hasError = !!getFieldError(fieldPath);
    return getInputValidationClassUtil(hasError, showValidationErrors);
  };

  const showErrorsIfNeeded = () => {
    if (!validation.isValid) {
      setShowValidationErrors(true);
    }
  };

  // Auto-calculate Total of all TPC of all Projects as sum of all project costs
  const calculatedTotalTPC = useMemo(() => {
    const projects = formData.section3_4?.projects || [];
    const sum = projects.reduce((total: number, project: any) => {
      const cost = project.totalProjectCost
        ? parseFloat(String(project.totalProjectCost))
        : 0;
      return total + (isNaN(cost) ? 0 : cost);
    }, 0);
    return sum.toFixed(2);
  }, [formData.section3_4?.projects]);

  useEffect(() => {
    // Only update if the calculated value is different from current value
    const currentValue = formData.section3_4?.totalProjectCostAwarded || "";
    if (currentValue !== calculatedTotalTPC) {
      setFormData((prev) => ({
        ...prev,
        section3_4: {
          ...prev.section3_4,
          totalProjectCostAwarded: calculatedTotalTPC,
        },
      }));
    }
  }, [calculatedTotalTPC, formData.section3_4?.totalProjectCostAwarded]);

  // Autosave to localStorage with debouncing (avoid infinite loop)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("pppDevelopment", formData);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, updateFormData]);

  // Calculation functions
  const calculateSection3_3 = useCallback(() => {
    // For section 3.3, marks = MIN(number of proposals × 5, 50)
    const numberOfProposals = formData.section3_3.VGFArray.length;
    const marksObtained = Math.min(numberOfProposals * 5, 50);

    return {
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section3_3.VGFArray.length]);

  const calculateSection3_4 = useCallback(() => {
    const projects = formData.section3_4.projects || [];
    const tpcOfPPPProjects = 0; // Placeholder

    return {
      tpcOfPPPProjects: 0,
      proportion: 0,
      marksObtained: 0,
    };
  }, [formData.section3_4.projects]);

  // Auto-calculate Total of all TPC of all Projects as sum of all project costs
  const calculatedTotalProjectCostAwarded = useMemo(() => {
    const projects = formData.section3_4?.projects || [];
    const sum = projects.reduce((total: number, project: any) => {
      const cost = project.totalProjectCost
        ? parseFloat(String(project.totalProjectCost))
        : 0;
      return total + (isNaN(cost) ? 0 : cost);
    }, 0);
    return sum > 0 ? sum.toFixed(2) : "";
  }, [formData.section3_4?.projects]);

  // Update totalProjectCostAwarded when calculated value changes
  useEffect(() => {
    if (calculatedTotalProjectCostAwarded !== "") {
      const currentValue = formData.section3_4?.totalProjectCostAwarded || "";
      if (currentValue !== calculatedTotalProjectCostAwarded) {
        setFormData((prev) => ({
          ...prev,
          section3_4: {
            ...prev.section3_4,
            totalProjectCostAwarded: calculatedTotalProjectCostAwarded,
          },
        }));
      }
    }
  }, [calculatedTotalProjectCostAwarded]);

  useEffect(() => {
    const section3_3Calc = calculateSection3_3();
    const section3_4Calc = calculateSection3_4();

    const shouldUpdate3_3 = formData.section3_3.VGFArray.some(
      (project) => project.marksObtained !== section3_3Calc.marksObtained
    );
    const shouldUpdate3_4 =
      (formData.section3_4 as any).proportion !== section3_4Calc.proportion ||
      (formData.section3_4 as any).marksObtained !==
        section3_4Calc.marksObtained;

    if (shouldUpdate3_3 || shouldUpdate3_4) {
      setFormData((prev) => ({
        ...prev,
        section3_3: {
          ...(prev.section3_3 as any),
          VGFArray: prev.section3_3.VGFArray.map((project) => ({
            ...project,
            marksObtained: section3_3Calc.marksObtained,
          })),
        },
        section3_4: {
          ...prev.section3_4,
          proportion: section3_4Calc.proportion,
          marksObtained: section3_4Calc.marksObtained,
        },
      }));
    }
  }, [
    calculateSection3_3,
    calculateSection3_4,
    formData.section3_3.VGFArray,
    formData.section3_3.VGFArray.length,
    formData.section3_4,
    formData.section3_4.projects.length,
  ]);

  // --- Section 3.3: Add/Remove Project ---
  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: [
          ...prev.section3_3.VGFArray,
          {
            id: crypto.randomUUID(),
            projectName: "",
            sector: "",
            scheme: "",
            submissionDate: "",
            totalProjectCost: "",
            statusOfProject: "",
            file: null,
          },
        ],
      },
    }));
  };

  const removeProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: prev.section3_3.VGFArray.filter((entry) => entry.id !== id),
      },
    }));
  };

  // Deep merge utility for robust updates
  function deepMerge(target: any, source: any): any {
    if (typeof target !== "object" || target === null) return source;
    if (typeof source !== "object" || source === null) return source;
    const result = Array.isArray(target) ? [...target] : { ...target };
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  const updateProject = (
    id: string,
    field:
      | "projectName"
      | "sector"
      | "scheme"
      | "submissionDate"
      | "totalProjectCost"
      | "statusOfProject"
      | "file",
    value: string | FileUpload | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: prev.section3_3.VGFArray.map((entry) => {
          if (entry.id !== id) return entry;
          // Deep merge for file and nested objects
          if (typeof value === "object" && value !== null && field === "file") {
            return deepMerge(entry, { [field]: value });
          }
          return { ...entry, [field]: value };
        }),
      },
    }));
  };

  // --- Section 3.4: Add/Remove PPP Project ---
  const addPPPProject = () => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: [
          ...(prev.section3_4.projects || []),
          {
            id: crypto.randomUUID(),
            nameOfProject: "",
            infrastructureSector: "",
            dateOfAward: "",
            totalProjectCost: "",
            // file: null,
          },
        ],
      },
    }));
  };

  const removePPPProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: (prev.section3_4.projects || []).filter(
          (entry) => entry.id !== id
        ),
      },
    }));
  };

  const updatePPPProject = (
    id: string,
    field:
      | "nameOfProject"
      | "infrastructureSector"
      | "dateOfAward"
      | "totalProjectCost",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: (prev.section3_4.projects || []).map((entry) => {
          if (entry.id !== id) return entry;
          return { ...entry, [field]: value };
        }),
      },
    }));
  };

  const { toast } = useToast();

  // --- Navigation ---
  const handleNext = () => {
    // Validation disabled - allow navigation without checking required fields
    updateFormData("pppDevelopment", formData);
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
    // Enforce file required for section3_1 if available is 'yes'
    if (formData.section3_1.available === "yes" && !formData.section3_1.file) {
      toast({
        title: "File Required",
        description:
          "Please upload a file for 3.1 - Availability of PPP Act/Policy before submitting.",
        variant: "destructive",
      });
      return;
    }
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
    console.log("[DEBUG] Submitting PPPDevelopmentStep, formData:", formData);

    try {
      setSubmittingIndicator(indicatorCode);
      // Get the indicators for this section
      const sectionIndicators = allowedIndicators || [
        "3.1",
        "3.2",
        "3.3",
        "3.4",
      ];
      // Remove unwanted keys (preserves File instances for upload)
      let sanitizedFormData = deepRemoveUnwantedKeys(formData);
      // Debug: Log sanitized payload before submit
      console.log(
        "[DEBUG] Payload to submit PPPDevelopmentStep:",
        sanitizedFormData
      );
      await apiService.submitSectionToStateApprover(
        sanitizedFormData,
        "pppDevelopment",
        sectionIndicators
      );
      toast({
        title: "Success",
        description:
          "PPP Development section submitted to State Approver successfully.",
        variant: "default",
      });
      updateFormData("pppDevelopment", sanitizedFormData);
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
    const indicatorValidation = validatePPPDevelopment(formData, {
      allowedIndicators: [indicatorCode],
    });
    if (!indicatorValidation.isValid) {
      // Mark all fields with errors in this indicator as touched so errors show
      markIndicatorFieldsAsTouched(indicatorCode, indicatorValidation.errors);

      // Store indicator-specific errors
      setIndicatorValidationErrors(indicatorValidation.errors);
      setShowValidationErrors(true);
      // Errors are displayed inline in the UI via renderFieldError, no toast needed
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
        },
      };

      const result = await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "pppDevelopment",
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
      const finalSectionKey = sectionKey;
      setFormData((prev: any) => {
        const updated = {
          ...prev,
          [finalSectionKey]: {
            ...prev[finalSectionKey],
            ...sanitizedFormData[sectionKey],
            status: newStatus,
          },
        };
        // Update form persistence with the merged data
        updateFormData("pppDevelopment", {
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
      if (user?.role === "STATE_APPROVER" && user?.id) {
        console.log(
          "📢 [PPPDevelopmentStep] Dispatching indicatorsUpdated event after indicator submission"
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

      // Update form data with sanitized data that includes status
      updateFormData("pppDevelopment", sanitizedFormDataWithStatus);

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
        const submissionsResp = await apiService.getSubmissions(1, 100, undefined, undefined, true);
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
        "pppDevelopment",
        allowedIndicators || ["3.1", "3.2", "3.3", "3.4"]
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

      updateFormData("pppDevelopment", formData);
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

  // Access control for NODAL_OFFICER
  console.log("🔍 PPPDevelopmentStep: Allowed indicators", {
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    allowedIndicators,
  });

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
            title="PPP Development"
            description="Public-Private Partnership projects and initiatives"
            points={250}
            completed={0}
            total={4}
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

  // Check if indicator has been sent back from STATE_APPROVER
  // If sent back, "Save as Draft" should not be available
  const isIndicatorSentBack = (indicatorCode: string): boolean => {
    const status = getIndicatorStatus(indicatorCode);
    if (!status) return false;
    const upperStatus = status.toUpperCase();
    // Check for statuses that indicate the indicator was sent back
    return (
      upperStatus === "REVERTED" ||
      upperStatus === "RESUBMITTED" ||
      upperStatus === "RETURNED_FROM_STATE" ||
      upperStatus === "RETURNED_FROM_MOSPI"
    );
  };

  // Check if indicator is submitted or accepted (non-editable)
  // Note: REVERTED/RESUBMITTED indicators are non-editable by default, but can be edited via Edit button
  // SAVE_AS_DRAFT indicators remain editable
  const isIndicatorSubmitted = (indicatorCode: string): boolean => {
    const status = getIndicatorStatus(indicatorCode);
    if (!status) return false;
    const upperStatus = status.toUpperCase();
    // If indicator is in edit mode, it's editable
    if (editingIndicators.has(indicatorCode)) {
      return false;
    }
    // SAVE_AS_DRAFT indicators remain editable
    if (upperStatus === "SAVE_AS_DRAFT") {
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
      const validationResult = validatePPPDevelopment(formData, {
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
        if (indicatorCode === "3.1") {
          allIndicatorFields.push(`${sectionPrefix}.file`);
        } else if (indicatorCode === "3.2") {
          allIndicatorFields.push(`${sectionPrefix}.file`);
        } else if (indicatorCode === "3.3") {
          allIndicatorFields.push(`${sectionPrefix}.VGFArray`);
          if (
            formData.section3_3?.VGFArray &&
            Array.isArray(formData.section3_3.VGFArray)
          ) {
            formData.section3_3.VGFArray.forEach((_: any, index: number) => {
              allIndicatorFields.push(
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
        } else if (indicatorCode === "3.4") {
          // Add all project fields for section 3.4
          if (
            formData.section3_4?.projects &&
            Array.isArray(formData.section3_4.projects)
          ) {
            formData.section3_4.projects.forEach((_: any, index: number) => {
              allIndicatorFields.push(
                `${sectionPrefix}.projects.${index}.nameOfProject`,
                `${sectionPrefix}.projects.${index}.nipId`,
                `${sectionPrefix}.projects.${index}.fundingSource`,
                `${sectionPrefix}.projects.${index}.infrastructureSector`,
                `${sectionPrefix}.projects.${index}.dateOfAward`,
                `${sectionPrefix}.projects.${index}.capexPercentage`,
                `${sectionPrefix}.projects.${index}.totalProjectCost`
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
        // Set section-level validation message with specific error details
        const errorCount = Object.keys(sectionErrors).length;
        const errorMessages = Object.values(sectionErrors).slice(0, 3); // Show first 3 errors
        const errorMessage =
          errorMessages.length > 0
            ? `${errorMessages.join("; ")}${
                errorCount > 3 ? ` and ${errorCount - 3} more error(s).` : "."
              }`
            : `Please fill all mandatory fields. ${errorCount} field(s) are missing.`;
        setSectionValidationMessages((prev) => ({
          ...prev,
          [indicatorCode]: errorMessage,
        }));
        console.log(
          `[PPPDevelopmentStep] Validation failed for indicator ${indicatorCode}:`,
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
      const indicatorValidation = validatePPPDevelopment(formData, {
        allowedIndicators: [indicatorCode],
      });

      if (!indicatorValidation.isValid) {
        // Mark all fields with errors as touched so they show inline
        Object.keys(indicatorValidation.errors).forEach((errorKey) => {
          const sectionPrefix = `section${indicatorCode.replace(".", "_")}`;
          if (errorKey.startsWith(sectionPrefix)) {
            markFieldAsTouched(errorKey);
          }
        });
        setShowValidationErrors(true);
        setIndicatorValidationErrors((prev) => ({
          ...prev,
          ...indicatorValidation.errors,
        }));
        // Errors are displayed inline in the UI, no toast needed
        return;
      }

      // Get current submission to preserve status
      const submissionsResp = await apiService.getSubmissions(1, 100, undefined, undefined, true);
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
        "pppDevelopment",
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
          [sectionKey]: sectionDataWithStatus,
        };
        // Also update form persistence with the merged data
        updateFormData("pppDevelopment", {
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
    // Optionally reload the original data for this indicator
    // For now, just exit edit mode
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

      // Prepare data with SAVE_AS_DRAFT status
      const sectionDataWithStatus = {
        ...sanitizedFormData[sectionKey],
        status: "SAVE_AS_DRAFT",
      };

      // Create sanitized data with status for the draft indicator
      const sanitizedFormDataWithStatus = {
        ...sanitizedFormData,
        [sectionKey]: sectionDataWithStatus,
      };

      // Use submitSectionToStateApprover API to save with SAVE_AS_DRAFT status
      await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "pppDevelopment",
        [indicatorCode]
      );

      // Update local formData state immediately to reflect SAVE_AS_DRAFT status
      setFormData((prev: any) => {
        const updated = {
          ...prev,
          [sectionKey]: sectionDataWithStatus,
        };
        // Also update form persistence with the merged data
        updateFormData("pppDevelopment", {
          ...prev,
          ...sanitizedFormDataWithStatus,
        });
        return updated;
      });

      toast({
        title: "Draft Saved",
        description: `Indicator ${indicatorCode} has been saved as draft. You can edit it later.`,
        variant: "default",
      });
    } catch (error) {
      console.error(`Failed to save indicator ${indicatorCode} as draft:`, error);
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
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        <Stepper
          steps={SUBMISSION_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
        />
        {(() => {
          const { completed, total, progress } = computeStepProgress(
            { pppDevelopment: formData } as Record<string, unknown>,
            "pppDevelopment",
            {
              assignedIndicators,
              availableIndicators,
              isNodalOfficer,
              isStateApprover,
            }
          );
          console.log("📊 PPP Development Progress Debug:", {
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
              title="PPP Development"
              description="Public-Private Partnership projects and initiatives"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}

        {/* Section 3.1 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.1") ||
          availableIndicators.includes("3.1")) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">3.1 - </span> Availability of
                  PPP Act/Policy
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorStatus={getIndicatorStatus("3.1")}
            indicatorCode="3.1"
            isEditable={editingIndicators.has("3.1")}
            onEdit={() => handleEditIndicator("3.1")}
            onSave={() => handleSaveIndicator("3.1")}
            onCancel={() => handleCancelEdit("3.1")}
            isSaving={savingIndicators.has("3.1")}
          >
            {renderSectionValidationMessage("3.1")}
            <div className="flex flex-col gap-4">
              <div>
                <Label>
                  PPP Act/Policy Available?{" "}
                  <span className="text-red-500">*</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>Is there a PPP Act/Policy?</TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="ppp-act-policy"
                      value="yes"
                      checked={formData.section3_1.available === "yes"}
                      onChange={() => {
                        if (isIndicatorSubmitted("3.1")) return;
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section3_1: {
                            ...prev.section3_1,
                            available: "yes",
                            comment: "",
                          },
                        }));
                      }}
                      disabled={isIndicatorSubmitted("3.1")}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="ppp-act-policy"
                      value="no"
                      checked={formData.section3_1.available === "no"}
                      onChange={() => {
                        if (isIndicatorSubmitted("3.1")) return;
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section3_1: {
                            ...prev.section3_1,
                            available: "no",
                            file: null,
                          },
                        }));
                      }}
                      disabled={isIndicatorSubmitted("3.1")}
                    />
                    No
                  </label>
                </div>
                {renderFieldError("section3_1.available")}
              </div>

              {/* If Yes → show File Upload */}
              {formData.section3_1.available === "yes" && (
                <div className="flex flex-col gap-2">
                  <FileUploadSection
                    label="Upload File"
                    value={formData.section3_1.file ?? null}
                    onChange={(fileUpload) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section3_1: {
                          ...prev.section3_1,
                          file: fileUpload,
                        },
                      }));
                    }}
                    submissionId={submissionId}
                    required
                    disabled={isIndicatorSubmitted("3.1")}
                    deferFileDeletion={editingIndicators.has("3.1")}
                    className={getInputValidationClass("section3_1.file")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload copy of Act/Policy
                  </p>
                  {renderFieldError("section3_1.file")}
                </div>
              )}

              {/* If No → show Comment */}
              {formData.section3_1.available === "no" && (
                <div className="flex flex-col gap-2">
                  <Label>
                    <span className="text-red-500">*</span>
                    Comments (Reason)
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter reason or comment"
                    value={formData.section3_1.comment || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section3_1: {
                          ...prev.section3_1,
                          comment: e.target.value,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("3.1")}
                    className={cn(
                      getInputValidationClass("section3_1.comment"),
                      isIndicatorSubmitted("3.1") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section3_1.comment")}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() =>
                    handleSubmitIndicator(
                      "3.1",
                      "Availability of PPP Act/Policy"
                    )
                  }
                  disabled={
                    submittingIndicator !== null || isIndicatorSubmitted("3.1")
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("3.1", submittingIndicator)}
                </Button>
                {!isIndicatorSentBack("3.1") && (
                  <Button
                    onClick={() => handleSaveAsDraftIndicator("3.1")}
                    disabled={
                      savingDraftIndicators.has("3.1") ||
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("3.1")
                    }
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDraftIndicators.has("3.1") ? "Saving..." : "Save as Draft"}
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 3.2 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.2") ||
          availableIndicators.includes("3.2")) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">3.2 - </span> Functional PPP
                  Cell/Unit
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorStatus={getIndicatorStatus("3.2")}
            indicatorCode="3.2"
            isEditable={editingIndicators.has("3.2")}
            onEdit={() => handleEditIndicator("3.2")}
            onSave={() => handleSaveIndicator("3.2")}
            onCancel={() => handleCancelEdit("3.2")}
            isSaving={savingIndicators.has("3.2")}
          >
            {renderSectionValidationMessage("3.2")}
            <div className="flex flex-col gap-4">
              <div>
                <Label>
                  Functional State/UT PPP Cell/Unit{" "}
                  <span className="text-red-500">*</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Is there a functional PPP Cell/Unit?
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="ppp-cell-unit"
                      value="yes"
                      checked={formData.section3_2.available === "yes"}
                      onChange={() => {
                        if (isIndicatorSubmitted("3.2")) return;
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section3_2: {
                            ...prev.section3_2,
                            available: "yes",
                            comment: "",
                          },
                        }));
                      }}
                      disabled={isIndicatorSubmitted("3.2")}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="ppp-cell-unit"
                      value="no"
                      checked={formData.section3_2.available === "no"}
                      onChange={() => {
                        if (isIndicatorSubmitted("3.2")) return;
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section3_2: {
                            ...prev.section3_2,
                            available: "no",
                            file: null,
                          },
                        }));
                      }}
                      disabled={isIndicatorSubmitted("3.2")}
                    />
                    No
                  </label>
                </div>
                {renderFieldError("section3_2.available")}
              </div>

              {/* If Yes → show File Upload */}
              {formData.section3_2.available === "yes" && (
                <div className="flex flex-col gap-2">
                  <FileUploadSection
                    label="Upload File"
                    value={formData.section3_2.file ?? null}
                    onChange={(fileUpload) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section3_2: {
                          ...prev.section3_2,
                          file: fileUpload,
                        },
                      }));
                    }}
                    submissionId={submissionId}
                    required
                    disabled={isIndicatorSubmitted("3.2")}
                    deferFileDeletion={editingIndicators.has("3.2")}
                    className={getInputValidationClass("section3_2.file")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload notification or mandate
                  </p>
                  {renderFieldError("section3_2.file")}
                </div>
              )}

              {/* If No → show Comment */}
              {formData.section3_2.available === "no" && (
                <div className="flex flex-col gap-2">
                  <Label>
                    Comments (Reason)
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="Enter reason or comment"
                    value={formData.section3_2.comment || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section3_2: {
                          ...prev.section3_2,
                          comment: e.target.value,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("3.2")}
                    className={cn(
                      getInputValidationClass("section3_2.comment"),
                      isIndicatorSubmitted("3.2") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section3_2.comment")}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() =>
                    handleSubmitIndicator(
                      "3.2",
                      "Availability of PPP Cell/Unit"
                    )
                  }
                  disabled={
                    submittingIndicator !== null || isIndicatorSubmitted("3.2")
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("3.2", submittingIndicator)}
                </Button>
                {!isIndicatorSentBack("3.2") && (
                  <Button
                    onClick={() => handleSaveAsDraftIndicator("3.2")}
                    disabled={
                      savingDraftIndicators.has("3.2") ||
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("3.2")
                    }
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDraftIndicators.has("3.2") ? "Saving..." : "Save as Draft"}
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 3.3 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.3") ||
          availableIndicators.includes("3.3")) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">3.3 - </span> Proposals
                  Submitted under VGF/IIPDF{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
            indicatorStatus={getIndicatorStatus("3.3")}
            indicatorCode="3.3"
            isEditable={editingIndicators.has("3.3")}
            onEdit={() => handleEditIndicator("3.3")}
            onSave={() => handleSaveIndicator("3.3")}
            onCancel={() => handleCancelEdit("3.3")}
            isSaving={savingIndicators.has("3.3")}
          >
            {renderSectionValidationMessage("3.3")}
            <div className="flex flex-col gap-4">
              {(Array.isArray(formData.section3_3?.VGFArray)
                ? formData.section3_3.VGFArray
                : []
              ).map((entry, idx) => (
                <div key={entry.id} className="mb-2">
                  {/* Row 1: Project Name, Sector, Scheme */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                    <div>
                      <Label>
                        Project Name
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter project name"
                        value={entry.projectName}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          updateProject(
                            entry.id,
                            "projectName",
                            e.target.value
                          );
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                        className={cn(
                          getInputValidationClass(
                            `section3_3.VGFArray.${idx}.projectName`
                          ),
                          isIndicatorSubmitted("3.3") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section3_3.VGFArray.${idx}.projectName`
                      )}
                    </div>
                    <div>
                      <Label>
                        Select Sector
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={entry.sector}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateProject(entry.id, "sector", value);
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section3_3.VGFArray.${idx}.sector`
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
                      {renderFieldError(`section3_3.VGFArray.${idx}.sector`)}
                    </div>
                    <div>
                      <Label>
                        Select Scheme
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={entry.scheme}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateProject(entry.id, "scheme", value);
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section3_3.VGFArray.${idx}.scheme`
                            )
                          )}
                        >
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
                      {renderFieldError(`section3_3.VGFArray.${idx}.scheme`)}
                    </div>
                  </div>
                  {/* Row 2: Total Project Cost, Status of Project, Submission Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                    <div>
                      <Label>
                        Total Project Cost (INR-CRORE)
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="Enter project cost in crores"
                        value={entry.totalProjectCost || ""}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          clearIndicatorValidationMessage("3.3");
                          const value = e.target.value;
                          if (value === "" || /^\d*\.?\d*$/.test(value)) {
                            updateProject(entry.id, "totalProjectCost", value);
                          }
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                        className={cn(
                          getInputValidationClass(
                            `section3_3.VGFArray.${idx}.totalProjectCost`
                          ),
                          isIndicatorSubmitted("3.3") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section3_3.VGFArray.${idx}.totalProjectCost`
                      )}
                    </div>
                    <div>
                      <Label>
                        Status of Project
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={entry.statusOfProject || ""}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          clearIndicatorValidationMessage("3.3");
                          updateProject(entry.id, "statusOfProject", value);
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section3_3.VGFArray.${idx}.statusOfProject`
                            )
                          )}
                        >
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
                      {renderFieldError(
                        `section3_3.VGFArray.${idx}.statusOfProject`
                      )}
                    </div>
                    <div>
                      <Label>
                        Submission Date
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        value={
                          entry.submissionDate
                            ? (() => {
                                // Convert ISO string to YYYY-MM-DD format for date input
                                const d = new Date(entry.submissionDate);
                                if (isNaN(d.getTime())) return "";
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(
                                  2,
                                  "0"
                                );
                                const day = String(d.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                return `${year}-${month}-${day}`;
                              })()
                            : ""
                        }
                        onChange={(e) => {
                          if (isIndicatorSubmitted("3.3")) return;
                          showErrorsIfNeeded();
                          updateProject(
                            entry.id,
                            "submissionDate",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : ""
                          );
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                        className={cn(
                          getInputValidationClass(
                            `section3_3.VGFArray.${idx}.submissionDate`
                          ),
                          isIndicatorSubmitted("3.3") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section3_3.VGFArray.${idx}.submissionDate`
                      )}
                    </div>
                  </div>
                  {/* Row 3: File Upload with Delete button */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <FileUploadSection
                        label="Upload File"
                        value={entry.file ?? null}
                        onChange={(fileUpload) => {
                          showErrorsIfNeeded();
                          updateProject(entry.id, "file", fileUpload);
                        }}
                        submissionId={submissionId}
                        disabled={isIndicatorSubmitted("3.3")}
                        deferFileDeletion={editingIndicators.has("3.3")}
                        // Note: Upload file is NON-mandatory in section 3.3, so no required prop
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProject(entry.id)}
                      disabled={isIndicatorSubmitted("3.3")}
                      aria-label="Remove"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}

              {renderFieldError("section3_3.VGFArray")}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addProject}
                  disabled={isIndicatorSubmitted("3.3")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
                <p className="text-xs text-muted-foreground mt-1"></p>
              </div>
              {/* ✅ Table view for VGF/IIPDF proposals (with File Size) */}
              {formData.section3_3.VGFArray.length > 0 && (
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
                          File Uploaded
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
                      {(Array.isArray(formData.section3_3?.VGFArray)
                        ? formData.section3_3.VGFArray
                        : []
                      ).map((entry, index) => {
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
                                {entry.scheme}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {entry.totalProjectCost || "-"}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {entry.statusOfProject || "-"}
                              </td>
                              <td className="py-3 px-4 text-sm min-w-[180px]">
                                {entry.submissionDate
                                  ? format(
                                      new Date(entry.submissionDate),
                                      "dd-MM-yyyy"
                                    )
                                  : "-"}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                No file uploaded
                              </td>
                              <td className="py-3 px-4 text-sm">N/A</td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => removeProject(entry.id)}
                                  disabled={isIndicatorSubmitted("3.3")}
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
                            <td className="py-3 px-4 text-sm">
                              {entry.scheme}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.totalProjectCost || "-"}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.statusOfProject || "-"}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.submissionDate
                                ? format(
                                    new Date(entry.submissionDate),
                                    "dd-MM-yyyy"
                                  )
                                : "-"}
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
                                onClick={() => removeProject(entry.id)}
                                disabled={isIndicatorSubmitted("3.3")}
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
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() =>
                    handleSubmitIndicator("3.3", "VGF Proposals Submitted")
                  }
                  disabled={
                    submittingIndicator !== null || isIndicatorSubmitted("3.3")
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("3.3", submittingIndicator)}
                </Button>
                {!isIndicatorSentBack("3.3") && (
                  <Button
                    onClick={() => handleSaveAsDraftIndicator("3.3")}
                    disabled={
                      savingDraftIndicators.has("3.3") ||
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("3.3")
                    }
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDraftIndicators.has("3.3") ? "Saving..." : "Save as Draft"}
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 3.4 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.4") ||
          availableIndicators.includes("3.4")) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">3.4 – </span> Proportion of TPC
                  of PPP Projects
                </span>
              </div>
            }
            className="mb-6"
            indicatorStatus={getIndicatorStatus("3.4")}
            indicatorCode="3.4"
            isEditable={editingIndicators.has("3.4")}
            onEdit={() => handleEditIndicator("3.4")}
            onSave={() => handleSaveIndicator("3.4")}
            onCancel={() => handleCancelEdit("3.4")}
            isSaving={savingIndicators.has("3.4")}
          >
            {renderSectionValidationMessage("3.4")}
            <div className="flex flex-col gap-6">
              {/* ✅ Single-instance summary fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block min-h-[40px] leading-snug">
                    Total Budgeted capital allocation (INR-CRORE)
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter total budgeted capital allocation"
                    value={formData.section3_4.totalProjectsAwarded || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section3_4: {
                          ...prev.section3_4,
                          totalProjectsAwarded: e.target.value,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("3.4")}
                    className={cn(
                      getInputValidationClass(
                        "section3_4.totalProjectsAwarded"
                      ),
                      isIndicatorSubmitted("3.4") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section3_4.totalProjectsAwarded")}
                </div>
                <div>
                  <Label className="block min-h-[40px] leading-snug">
                    Total of all TPC of all Projects (INR-CRORE)
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={calculatedTotalProjectCostAwarded || ""}
                    readOnly
                    disabled
                    className={cn(
                      "bg-gray-50 cursor-not-allowed",
                      isIndicatorSubmitted("3.4") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />

                  {renderFieldError("section3_4.totalProjectCostAwarded")}
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically calculated from sum of all project costs
                  </p>
                </div>
              </div>

              {/* Existing per-project list */}
              {(formData.section3_4.projects || []).map((project, index) => (
                <div key={project.id || `project-${index}`} className="mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
                    <div>
                      <Label>
                        Name of PPP/Bankable Projects that have been awarded
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter project name"
                        value={project.nameOfProject}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          clearIndicatorValidationMessage("3.4");
                          updatePPPProject(
                            project.id,
                            "nameOfProject",
                            e.target.value
                          );
                        }}
                        disabled={isIndicatorSubmitted("3.4")}
                        className={cn(
                          getInputValidationClass(
                            `section3_4.projects.${formData.section3_4.projects.findIndex(
                              (p) => p.id === project.id
                            )}.nameOfProject`
                          ),
                          isIndicatorSubmitted("3.4") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section3_4.projects.${formData.section3_4.projects.findIndex(
                          (p) => p.id === project.id
                        )}.nameOfProject`
                      )}
                    </div>

                    <div>
                      <Label>
                        Infrastructure Sector{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={project.infrastructureSector}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updatePPPProject(
                            project.id,
                            "infrastructureSector",
                            value
                          );
                        }}
                        disabled={isIndicatorSubmitted("3.4")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section3_4.projects.${formData.section3_4.projects.findIndex(
                                (p) => p.id === project.id
                              )}.infrastructureSector`
                            ),
                            isIndicatorSubmitted("3.4") &&
                              "bg-gray-50 cursor-not-allowed"
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
                        `section3_4.projects.${formData.section3_4.projects.findIndex(
                          (p) => p.id === project.id
                        )}.infrastructureSector`
                      )}
                    </div>

                    <div>
                      <Label>Date of Award (DD-MM-YYYY)</Label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        value={
                          project.dateOfAward
                            ? (() => {
                                // Convert ISO string to YYYY-MM-DD format for date input
                                const d = new Date(project.dateOfAward);
                                if (isNaN(d.getTime())) return "";
                                const year = d.getFullYear();
                                const month = String(d.getMonth() + 1).padStart(
                                  2,
                                  "0"
                                );
                                const day = String(d.getDate()).padStart(
                                  2,
                                  "0"
                                );
                                return `${year}-${month}-${day}`;
                              })()
                            : ""
                        }
                        onChange={(e) => {
                          if (isIndicatorSubmitted("3.4")) return;
                          showErrorsIfNeeded();
                          updatePPPProject(
                            project.id,
                            "dateOfAward",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : ""
                          );
                        }}
                        disabled={isIndicatorSubmitted("3.4")}
                        className={cn(
                          getInputValidationClass(
                            `section3_4.projects.${formData.section3_4.projects.findIndex(
                              (p) => p.id === project.id
                            )}.dateOfAward`
                          ),
                          isIndicatorSubmitted("3.4") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section3_4.projects.${formData.section3_4.projects.findIndex(
                          (p) => p.id === project.id
                        )}.dateOfAward`
                      )}
                    </div>

                    <div>
                      <Label>
                        Total Project Cost (INR-CRORE)
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Enter cost in crore"
                        value={project.totalProjectCost || ""}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          updatePPPProject(
                            project.id,
                            "totalProjectCost",
                            e.target.value
                          );
                        }}
                        disabled={isIndicatorSubmitted("3.4")}
                        className={cn(
                          getInputValidationClass(
                            `section3_4.projects.${formData.section3_4.projects.findIndex(
                              (p) => p.id === project.id
                            )}.totalProjectCost`
                          ),
                          isIndicatorSubmitted("3.4") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section3_4.projects.${formData.section3_4.projects.findIndex(
                          (p) => p.id === project.id
                        )}.totalProjectCost`
                      )}
                    </div>

                    <div className="flex items-center justify-center w-12">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePPPProject(project.id)}
                        disabled={isIndicatorSubmitted("3.4")}
                        aria-label="Remove"
                        className="text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPPPProject}
                  disabled={isIndicatorSubmitted("3.4")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Project
                </Button>
                {/* ✅ Table view for PPP/Bankable projects */}
                {formData.section3_4.projects.length > 0 && (
                  <div className="overflow-x-auto rounded-xl mt-4">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-2 px-2 text-left rounded-tl-xl text-sm font-normal">
                            Project Name
                          </th>
                          <th className="py-2 px-2 text-left text-sm font-normal">
                            Infra Sector
                          </th>
                          <th className="py-2 px-2 text-left text-sm font-normal">
                            Date of Award
                          </th>
                          <th className="py-2 px-2 text-left text-sm font-normal">
                            Total Cost (INR-CRORE)
                          </th>
                          <th className="py-2 px-2 text-center rounded-tr-xl text-sm font-normal w-12">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(formData.section3_4?.projects)
                          ? formData.section3_4.projects
                          : []
                        ).map((project, index) => (
                          <tr
                            key={project.id || `project-${index}`}
                            className="bg-white"
                          >
                            <td className="py-2 px-2 text-sm">
                              {project.nameOfProject}
                            </td>
                            <td className="py-2 px-2 text-sm">
                              {project.infrastructureSector}
                            </td>
                            <td className="py-2 px-2 text-sm">
                              {project.dateOfAward
                                ? format(
                                    new Date(project.dateOfAward),
                                    "dd-MM-yyyy"
                                  )
                                : "-"}
                            </td>
                            <td className="py-2 px-2 text-sm">
                              {project.totalProjectCost}
                            </td>
                            <td className="py-2 px-2 text-center w-12">
                              <button
                                type="button"
                                onClick={() => removePPPProject(project.id)}
                                disabled={isIndicatorSubmitted("3.4")}
                                className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8 flex items-center justify-center"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() =>
                      handleSubmitIndicator(
                        "3.4",
                        "Proportion of TPC of PPP Projects"
                      )
                    }
                    disabled={
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("3.4")
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {getSubmitButtonText("3.4", submittingIndicator)}
                  </Button>
                  {!isIndicatorSentBack("3.4") && (
                    <Button
                      onClick={() => handleSaveAsDraftIndicator("3.4")}
                      disabled={
                        savingDraftIndicators.has("3.4") ||
                        submittingIndicator !== null ||
                        isIndicatorSubmitted("3.4")
                      }
                      variant="outline"
                      size="sm"
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingDraftIndicators.has("3.4") ? "Saving..." : "Save as Draft"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Navigation Buttons */}

        <FormActions
          onPrevious={goToPrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          nextLabel={isLastStep ? "Review & Submit" : "Next"}
          showSaveDraft={true}
          isNextDisabled={isNextDisabled}
        />
      </div>

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
