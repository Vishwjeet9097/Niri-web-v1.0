/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info, CalendarIcon } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard } from "../components/SectionCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import {
  SECTOR_OPTIONS,
  PROJECT_TYPE_OPTIONS,
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
  section3_3: { VGFArray: [] },
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
        VGFArray: Array.isArray((data.section3_3 as any)?.VGFArray)
          ? (data.section3_3 as any).VGFArray.map((entry: any) => ({
              ...entry,
              file: typeof entry.file !== "undefined" ? entry.file : null,
            }))
          : [],
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
  // State for save confirmation dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSaveIndicatorCode, setPendingSaveIndicatorCode] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [pendingIndicator, setPendingIndicator] = useState<{
    code: string;
    title: string;
  } | null>(null);
  
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
        const submissions = await apiService.getSubmissions(1, 100);
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
          console.log("ℹ️ No existing submission found, files will upload on submit");
        }
      } catch (error) {
        console.error("Failed to fetch submissionId:", error);
      }
    };
    
    fetchSubmissionId();
  }, []);

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
          // If no backend data, use local storage or defaults
          const loadedData =
            (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) ||
            {};
          setFormData(safePPPFormData(loadedData));
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

  // Helper functions for error display
  const getFieldError = (fieldPath: string): string | undefined => {
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
            type: "",
            submissionDate: "",
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
    field: "projectName" | "sector" | "type" | "submissionDate" | "file",
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
            nipId: "",
            fundingSource: "",
            infrastructureSector: "",
            dateOfAward: "",
            capexPercentage: "",
            totalProjectCost: "",
            file: null,
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
      | "nipId"
      | "fundingSource"
      | "infrastructureSector"
      | "dateOfAward"
      | "capexPercentage"
      | "totalProjectCost"
      | "file",
    value: string | FileUpload | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: (prev.section3_4.projects || []).map((entry) => {
          if (entry.id !== id) return entry;
          if (typeof value === "object" && value !== null && field === "file") {
            return deepMerge(entry, { [field]: value });
          }
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
      setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  };

  const handleSubmitIndicator = async (
    indicatorCode: string,
    indicatorTitle: string
  ) => {
    setShowValidationErrors(true);
    // Validate only this specific indicator
    const indicatorValidation = validatePPPDevelopment(formData, {
      allowedIndicators: [indicatorCode],
    });
    if (!indicatorValidation.isValid) {
      toast({
        title: "Incomplete Indicator",
        description: `Please complete all required fields for indicator ${indicatorCode} before submitting.`,
        variant: "destructive",
      });
      return;
    }

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
      setIsSubmitting(true);
      setShowSubmitDialog(false);

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
      setIsSubmitting(false);
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
          console.log("✅ Updated submissionId after draft save:", newSubmissionId);
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
    isSubmitting: boolean
  ): string => {
    if (isSubmitting) return "Submitting...";

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
      const indicatorValidation = validatePPPDevelopment(formData, {
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
        "pppDevelopment",
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
    setEditingIndicators((prev) => {
      const newSet = new Set(prev);
      newSet.delete(indicatorCode);
      return newSet;
    });
    // Optionally reload the original data for this indicator
    // For now, just exit edit mode
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
                    disabled={isIndicatorSubmitted("3.1")}
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
              <div className="mt-4">
                <Button
                  onClick={() =>
                    handleSubmitIndicator(
                      "3.1",
                      "Availability of PPP Act/Policy"
                    )
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("3.1")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("3.1", isSubmitting)}
                </Button>
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
                    disabled={isIndicatorSubmitted("3.2")}
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
              <div className="mt-4">
                <Button
                  onClick={() =>
                    handleSubmitIndicator(
                      "3.2",
                      "Availability of PPP Cell/Unit"
                    )
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("3.2")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("3.2", isSubmitting)}
                </Button>
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
            <div className="flex flex-col gap-4">
              {(Array.isArray(formData.section3_3?.VGFArray)
                ? formData.section3_3.VGFArray
                : []
              ).map((entry, idx) => (
                <div key={entry.id} className="mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                        Select Type
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={entry.type}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateProject(entry.id, "type", value);
                        }}
                        disabled={isIndicatorSubmitted("3.3")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section3_3.VGFArray.${idx}.type`
                            )
                          )}
                        >
                          <SelectValue placeholder="Enter year" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFieldError(`section3_3.VGFArray.${idx}.type`)}
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-full">
                        <Label>
                          Submission Date
                          <span className="text-red-500">*</span>
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isIndicatorSubmitted("3.3")}
                              className={cn(
                                "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                !entry.submissionDate &&
                                  "text-muted-foreground",
                                getInputValidationClass(
                                  `section3_3.VGFArray.${idx}.submissionDate`
                                ),
                                isIndicatorSubmitted("3.3") &&
                                  "bg-gray-50 cursor-not-allowed"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {entry.submissionDate
                                ? format(
                                    new Date(entry.submissionDate),
                                    "dd-MM-yyyy"
                                  )
                                : "DD-MM-YYYY"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                entry.submissionDate
                                  ? new Date(entry.submissionDate)
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (isIndicatorSubmitted("3.3")) return;
                                showErrorsIfNeeded();
                                updateProject(
                                  entry.id,
                                  "submissionDate",
                                  date ? date.toISOString() : ""
                                );
                              }}
                              disabled={isIndicatorSubmitted("3.3")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProject(entry.id)}
                        disabled={isIndicatorSubmitted("3.3")}
                        aria-label="Remove"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <FileUploadSection
                      label="Upload File"
                      value={entry.file ?? null}
                      onChange={(fileUpload) => {
                        showErrorsIfNeeded();
                        updateProject(entry.id, "file", fileUpload);
                      }}
                      submissionId={submissionId}
                      disabled={isIndicatorSubmitted("3.3")}
                    />
                  </div>
                  {renderFieldError(
                    `section3_3.VGFArray.${idx}.submissionDate`
                  )}
                </div>
              ))}
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
                {renderFieldError("section3_3.VGFArray")}
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
                          Type
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
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
                      ).map((entry) => {
                        const file = entry.file;
                        if (!file) {
                          return (
                            <tr key={entry.id} className="bg-white">
                              <td className="py-3 px-4 text-sm">{entry.projectName}</td>
                              <td className="py-3 px-4 text-sm">{entry.sector}</td>
                              <td className="py-3 px-4 text-sm">{entry.type}</td>
                              <td className="py-3 px-4 text-sm">
                                {entry.submissionDate
                                  ? format(new Date(entry.submissionDate), "dd-MM-yyyy")
                                  : "-"}
                              </td>
                              <td className="py-3 px-4 text-sm">No file uploaded</td>
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
                          <td className="py-3 px-4 text-sm">{entry.sector}</td>
                          <td className="py-3 px-4 text-sm">{entry.type}</td>
                          <td className="py-3 px-4 text-sm">
                            {entry.submissionDate
                              ? format(
                                  new Date(entry.submissionDate),
                                  "dd-MM-yyyy"
                                )
                              : "-"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {displayName}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {entry.file?.fileSize
                              ? `${(entry.file.fileSize / 1024 / 1024).toFixed(
                                  1
                                )} MB`
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
              <div className="mt-4">
                <Button
                  onClick={() =>
                    handleSubmitIndicator("3.3", "VGF Proposals Submitted")
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("3.3")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("3.3", isSubmitting)}
                </Button>
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
            <div className="flex flex-col gap-6">
              {/* ✅ Single-instance summary fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block min-h-[40px] leading-snug">
                    Total Number of Infrastructure Projects awarded in the
                    financial year of assessment
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter number of projects awarded"
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
                    Total Project Cost of Infrastructure Projects awarded in the
                    financial year of assessment (INR - values is in CRORES)
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter total cost"
                    value={formData.section3_4.totalProjectCostAwarded || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section3_4: {
                          ...prev.section3_4,
                          totalProjectCostAwarded: e.target.value,
                        },
                      }));
                    }}
                    disabled={isIndicatorSubmitted("3.4")}
                    className={cn(
                      getInputValidationClass(
                        "section3_4.totalProjectCostAwarded"
                      ),
                      isIndicatorSubmitted("3.4") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section3_4.totalProjectCostAwarded")}
                </div>
              </div>

              {/* Existing per-project list */}
              {(formData.section3_4.projects || []).map((project) => (
                <div key={project.id} className="mb-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                      <div>
                        <Label>
                          Name of PPP/Bankable Projects that have been awarded
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter project name"
                          value={project.nameOfProject}
                          onChange={(e) =>
                            updatePPPProject(
                              project.id,
                              "nameOfProject",
                              e.target.value
                            )
                          }
                          disabled={isIndicatorSubmitted("3.4")}
                          className={cn(
                            isIndicatorSubmitted("3.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                      </div>
                      <div>
                        <Label>NIP ID</Label>
                        <Input
                          type="text"
                          placeholder="Enter NIP ID"
                          value={project.nipId}
                          onChange={(e) =>
                            updatePPPProject(
                              project.id,
                              "nipId",
                              e.target.value
                            )
                          }
                          disabled={isIndicatorSubmitted("3.4")}
                          className={cn(
                            isIndicatorSubmitted("3.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                      </div>
                      <div>
                        <Label>
                          Source of Funding (in case of Bankable project)
                        </Label>
                        <Input
                          type="text"
                          placeholder="Enter funding source"
                          value={project.fundingSource}
                          onChange={(e) =>
                            updatePPPProject(
                              project.id,
                              "fundingSource",
                              e.target.value
                            )
                          }
                          disabled={isIndicatorSubmitted("3.4")}
                          className={cn(
                            isIndicatorSubmitted("3.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                      </div>
                      <div>
                        <Label>% of Capex funded by non-Govt sources</Label>
                        <Input
                          type="text"
                          placeholder="Enter percentage"
                          value={project.capexPercentage}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updatePPPProject(
                              project.id,
                              "capexPercentage",
                              e.target.value
                            );
                          }}
                          disabled={isIndicatorSubmitted("3.4")}
                          className={cn(
                            getInputValidationClass(
                              `section3_4.projects.${formData.section3_4.projects.findIndex(
                                (p) => p.id === project.id
                              )}.capexPercentage`
                            ),
                            isIndicatorSubmitted("3.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section3_4.projects.${formData.section3_4.projects.findIndex(
                            (p) => p.id === project.id
                          )}.capexPercentage`
                        )}
                      </div>
                      {/* File Upload for each project */}
                      <div>
                        <FileUploadSection
                          label="Upload File"
                          value={project.file ?? null}
                          onChange={(fileUpload) => {
                            showErrorsIfNeeded();
                            updatePPPProject(project.id, "file", fileUpload);
                          }}
                          submissionId={submissionId}
                          disabled={isIndicatorSubmitted("3.4")}
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload supporting document (if any)
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Date of Award (DD-MM-YYYY)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isIndicatorSubmitted("3.4")}
                              className={cn(
                                "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                !project.dateOfAward && "text-muted-foreground",
                                isIndicatorSubmitted("3.4") &&
                                  "bg-gray-50 cursor-not-allowed"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {project.dateOfAward
                                ? format(
                                    new Date(project.dateOfAward),
                                    "dd-MM-yyyy"
                                  )
                                : "DD-MM-YYYY"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                project.dateOfAward
                                  ? new Date(project.dateOfAward)
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (isIndicatorSubmitted("3.4")) return;
                                updatePPPProject(
                                  project.id,
                                  "dateOfAward",
                                  date ? date.toISOString() : ""
                                );
                              }}
                              disabled={isIndicatorSubmitted("3.4")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>
                          Total Project Cost (INR - values is in CRORES)
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

                      <div>
                        <Label>Infrastructure Sector</Label>
                        <Select
                          value={project.infrastructureSector}
                          onValueChange={(value) =>
                            updatePPPProject(
                              project.id,
                              "infrastructureSector",
                              value
                            )
                          }
                          disabled={isIndicatorSubmitted("3.4")}
                        >
                          <SelectTrigger>
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

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePPPProject(project.id)}
                          disabled={isIndicatorSubmitted("3.4")}
                          aria-label="Remove"
                          className="disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                      </div>
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
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Project Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            NIP ID
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Funding Source
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            % of Capex from Non-Govt
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Infra Sector
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Date of Award
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Total Cost (INR - values is in CRORES)
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(formData.section3_4?.projects)
                          ? formData.section3_4.projects
                          : []
                        ).map((project) => (
                          <tr key={project.id} className="bg-white">
                            <td className="py-3 px-4 text-sm">
                              {project.nameOfProject}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {project.nipId}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {project.fundingSource}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {project.capexPercentage}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {project.infrastructureSector}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {project.dateOfAward
                                ? format(
                                    new Date(project.dateOfAward),
                                    "dd-MM-yyyy"
                                  )
                                : "-"}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {project.totalProjectCost}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removePPPProject(project.id)}
                                disabled={isIndicatorSubmitted("3.4")}
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
                <div className="mt-4">
                  <Button
                    onClick={() =>
                      handleSubmitIndicator(
                        "3.4",
                        "Proportion of TPC of PPP Projects"
                      )
                    }
                    disabled={isSubmitting || isIndicatorSubmitted("3.4")}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {getSubmitButtonText("3.4", isSubmitting)}
                  </Button>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm & Submit"}
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
