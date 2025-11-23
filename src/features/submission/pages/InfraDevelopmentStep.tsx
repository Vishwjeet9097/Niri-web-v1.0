// Utility to deeply sanitize all file: {} to file: null in formData
function sanitizeFilesInFormData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFilesInFormData);
  } else if (obj && typeof obj === 'object') {
    // If this is a FileUpload object
    if ('file' in obj) {
      if (obj.file && typeof obj.file === 'object' && Object.keys(obj.file).length === 0 && obj.file.constructor === Object) {
        return { ...obj, file: null };
      }
      return { ...obj, file: obj.file };
    }
    // Otherwise, recursively sanitize all properties
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = sanitizeFilesInFormData(obj[key]);
    }
    return newObj;
  }
  return obj;
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
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
import { SectionCard } from "../components/SectionCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import {
  SECTOR_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  OWNERSHIP_OPTIONS,
  MONETIZATION_STATUS_OPTIONS,
  SUBMISSION_STEPS,
} from "../constants/steps";
import type { InfraDevelopmentData, FileUpload } from "../types";
import { FileUploadSection } from "../components/FileUploadSection";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthProvider";
import { FormActions } from "../components/FormActions";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { apiService } from "@/services/api.service";
import { computeStepProgress } from "../utils/progress";
import {
  validateInfraDevelopment,
  type InfraDevelopmentValidationResult,
} from "../validation/infraDevelopmentValidation";

// NOTE: The InfraDevelopmentData shape now wraps arrays inside objects.
// This component was updated to use those nested arrays e.g. formData.section2_1.infraActArray

const defaultData: InfraDevelopmentData = {
  section2_1: { infraActArray: [] },
  section2_2: { specializedEntityArray: [] },
  section2_3: {
    infraDevelopmentArray: [],
    hasInfraDevelopmentPlan: "",
    comment: "",
  },
  section2_4: { investmentReadyArray: [] },
  section2_5: { assetMonetizationArray: [] },
};

const getDefaultFileUpload = (): FileUpload => ({
  id: "",
  file: null,
  fileName: "",
  fileSize: 0,
  uploadedAt: 0,
});

export const InfraDevelopmentStep = () => {
  const {
    currentStep,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep,
    isLastStep,
  } = useStepNavigation(2);
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
  const [sectionStatus, setSectionStatus] = useState<any>(undefined);

  const {
    isNodalOfficer,
    availableIndicators,
    assignedIndicators,
    refresh,
    hasIndicatorAccess,
    loading: indicatorLoading,
    error: indicatorError,
  } = useIndicatorAccess();

  useEffect(() => {
    console.log("🔍 InfraDevelopmentStep: Access control state", {
      isNodalOfficer,
      assignedIndicators,
      availableIndicators,
      indicatorLoading,
      indicatorError,
      user,
    });
  }, [
    isNodalOfficer,
    assignedIndicators,
    availableIndicators,
    indicatorLoading,
    indicatorError,
    user,
  ]);

  // Merge loaded data with defaults
  // Try to get normalizedFormData.byIndicatorCode['2.4'] if available
  let loadedData = (getStepData("infraDevelopment") as Partial<InfraDevelopmentData> | undefined) || {};
  let normalizedSection2_4: any = undefined;
  try {
    // Try to get normalizedFormData from localStorage (if present)
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      const submissionData = JSON.parse(editingSubmission);
      if (submissionData.normalizedFormData && submissionData.normalizedFormData.byIndicatorCode && submissionData.normalizedFormData.byIndicatorCode['2.4']) {
        normalizedSection2_4 = submissionData.normalizedFormData.byIndicatorCode['2.4'];
      }
    }
  } catch (e) {
    // ignore
  }

  const initialData: InfraDevelopmentData = {
    ...defaultData,
    ...loadedData,
    section2_1: {
      infraActArray: (loadedData.section2_1 as any)?.infraActArray || [],
    },
    section2_2: {
      specializedEntityArray:
        (loadedData.section2_2 as any)?.specializedEntityArray || [],
    },
    section2_3: {
      infraDevelopmentArray:
        (loadedData.section2_3 as any)?.infraDevelopmentArray || [],
      hasInfraDevelopmentPlan:
        (loadedData.section2_3 as any)?.hasInfraDevelopmentPlan || "",
      comment: (loadedData.section2_3 as any)?.comment || "",
    },
    section2_4: normalizedSection2_4
      ? {
          ...((loadedData.section2_4 as any) || {}),
          ...normalizedSection2_4,
        }
      : {
          investmentReadyArray:
            (loadedData.section2_4 as any)?.investmentReadyArray || [],
          hasInvestmentReady:
            (loadedData.section2_4 as any)?.hasInvestmentReady || "",
          comment: (loadedData.section2_4 as any)?.comment || "",
          websiteLink: (loadedData.section2_4 as any)?.websiteLink || "",
        },
    section2_5: {
      assetMonetizationArray:
        (loadedData.section2_5 as any)?.assetMonetizationArray || [],
    },
  };

  const [formData, setFormData] = useState<InfraDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // On mount, fetch submission from DB and populate form
  // Helper to merge normalized and legacy data for each section
  function getSectionFromNormalizedOrLegacy(normalized: any, legacy: any, code: string) {
    if (normalized && normalized.byIndicatorCode && normalized.byIndicatorCode[code]) {
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

        let sectionStatusFromDB = undefined;
        if (userSubmission && userSubmission.id) {
          const fullSubmission = await apiService.getSubmission(userSubmission.id);
          let parsedFormData = fullSubmission.formData;
          if (typeof fullSubmission.formData === 'string') {
            try {
              parsedFormData = JSON.parse(fullSubmission.formData);
            } catch (e) {}
          }
          // Restore section_status from DB if present
          sectionStatusFromDB = fullSubmission.section_status;
          setSectionStatus(sectionStatusFromDB);
          const normalized = parsedFormData?.normalizedFormData;
          const legacy = parsedFormData?.infraDevelopment || {};
          const newFormData: InfraDevelopmentData = {
            section2_1: getSectionFromNormalizedOrLegacy(normalized, legacy.section2_1, '2.1'),
            section2_2: getSectionFromNormalizedOrLegacy(normalized, legacy.section2_2, '2.2'),
            section2_3: getSectionFromNormalizedOrLegacy(normalized, legacy.section2_3, '2.3'),
            section2_4: getSectionFromNormalizedOrLegacy(normalized, legacy.section2_4, '2.4'),
            section2_5: getSectionFromNormalizedOrLegacy(normalized, legacy.section2_5, '2.5'),
          };
          setFormData((prev) => ({ ...prev, ...newFormData }));
          setIsDataLoaded(true);
        } else {
          setIsDataLoaded(true);
        }
      } catch (e) {
        setIsDataLoaded(true);
      }
    })();
  }, [user, isDataLoaded]);

  // Calculate allowed indicators for validation - calculate before validation
  const sectionIndicators = useMemo(
    () => ["2.1", "2.2", "2.3", "2.4", "2.5"],
    []
  );
  const allowedIndicators = useMemo(
    () =>
      (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter(
        (ind) => sectionIndicators.includes(ind)
      ) || [],
    [isNodalOfficer, assignedIndicators, availableIndicators, sectionIndicators]
  );

  // Validation - only validate sections that are accessible based on indicators
  const validation: InfraDevelopmentValidationResult = useMemo(() => {
    // Determine which indicators to validate
    // For Nodal Officer or State Approver: only validate assigned/available indicators
    // For others: validate all (no restrictions)
    const indicatorsToValidate =
      (isNodalOfficer || user?.role === "STATE_APPROVER") &&
      allowedIndicators.length > 0
        ? allowedIndicators
        : undefined; // undefined means validate all (backward compatibility)

    return validateInfraDevelopment(formData, {
      allowedIndicators: indicatorsToValidate,
    });
  }, [formData, isNodalOfficer, user?.role, allowedIndicators]);
  const isNextDisabled = !validation.isValid;

  // Debug logging
  useEffect(() => {
    console.log("🔍 InfraDevelopmentStep Validation:", {
      isValid: validation.isValid,
      errors: validation.errors,
      hasInfraDevelopmentPlan: formData.section2_3.hasInfraDevelopmentPlan,
      section2_1_count: Array.isArray(formData.section2_1?.infraActArray) ? formData.section2_1.infraActArray.length : 0,
      section2_2_count: Array.isArray(formData.section2_2?.specializedEntityArray) ? formData.section2_2.specializedEntityArray.length : 0,
      section2_3_count: Array.isArray(formData.section2_3?.infraDevelopmentArray) ? formData.section2_3.infraDevelopmentArray.length : 0,
      section2_4_count: Array.isArray(formData.section2_4?.investmentReadyArray) ? formData.section2_4.investmentReadyArray.length : 0,
      section2_5_count: Array.isArray(formData.section2_5?.assetMonetizationArray) ? formData.section2_5.assetMonetizationArray.length : 0,
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

  useEffect(() => {
    const currentStepData = getStepData(
      "infraDevelopment"
    ) as Partial<InfraDevelopmentData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: InfraDevelopmentData = {
        ...defaultData,
        ...currentStepData,
        section2_1: {
          infraActArray:
            (currentStepData.section2_1 as any)?.infraActArray || [],
        },
        section2_2: {
          specializedEntityArray:
            (currentStepData.section2_2 as any)?.specializedEntityArray || [],
        },
        section2_3: {
          infraDevelopmentArray:
            (currentStepData.section2_3 as any)?.infraDevelopmentArray || [],
          hasInfraDevelopmentPlan:
            (currentStepData.section2_3 as any)?.hasInfraDevelopmentPlan || "",
          comment: (currentStepData.section2_3 as any)?.comment || "",
        },
        section2_4: {
          investmentReadyArray:
            (currentStepData.section2_4 as any)?.investmentReadyArray || [],
          hasInvestmentReady:
            (currentStepData.section2_4 as any)?.hasInvestmentReady || "",
          comment: (currentStepData.section2_4 as any)?.comment || "",
        },
        section2_5: {
          assetMonetizationArray:
            (currentStepData.section2_5 as any)?.assetMonetizationArray || [],
        },
      };
      setFormData((prev) => ({ ...prev, ...syncedData }));
    }
    // ⛔ Run this only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize form data only once when component mounts (editing flow)
  // In edit mode, always fetch and populate from backend/DB, ignore editing_submission localStorage for data (match InfraFinancingStep pattern)
  useEffect(() => {
    if (localStorage.getItem("editing_submission")) {
      console.log("[LocalStorage] Found editing_submission but ignoring in favor of DB data");
      localStorage.removeItem("editing_submission");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync infraDevelopmentArray based on hasInfraDevelopmentPlan
  useEffect(() => {
    setFormData((prev) => {
      const prevInfra = prev.section2_3.infraDevelopmentArray || [];
      const hasPlan = prev.section2_3.hasInfraDevelopmentPlan;

      if (hasPlan === "no") {
        // When "no", keep only comment entries (entries with hasPlan === false)
        const noItems = prevInfra.filter((i: any) => i.hasPlan === false);
        if (noItems.length === 0) {
          // Create a new comment entry if none exists
          return {
            ...prev,
            section2_3: {
              ...prev.section2_3,
              infraDevelopmentArray: [
                {
                  id: Date.now().toString(),
                  sector: "",
                  files: [],
                  comment: prev.section2_3.comment || "",
                },
              ],
            },
          };
        }
        return prev; // Keep existing structure
      } else if (hasPlan === "yes") {
        // When "yes", filter out comment entries (entries with hasPlan === false)
        const keep = prevInfra.filter((i: any) => i.hasPlan !== false);
        return {
          ...prev,
          section2_3: {
            ...prev.section2_3,
            infraDevelopmentArray: keep,
            comment: "", // Clear comment when yes is selected
          },
        };
      }
      return prev;
    });
  }, [formData.section2_3.hasInfraDevelopmentPlan]);

  // Autosave to localStorage with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("infraDevelopment", formData);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData, updateFormData]);

  // Helpers to map section -> array key inside the object
  const sectionArrayKeyMap: Record<string, string> = {
    section2_1: "infraActArray",
    section2_2: "specializedEntityArray",
    section2_3: "infraDevelopmentArray",
    section2_4: "investmentReadyArray",
    section2_5: "assetMonetizationArray",
  };

  // --- Section 2.1, 2.2, 2.3: Add/Remove Entries ---
  const addEntry = (section: "section2_1" | "section2_2" | "section2_3") => {
    const arrKey = sectionArrayKeyMap[section];
    setFormData(
      (prev) =>
        ({
          ...prev,
          [section]: {
            ...(prev as any)[section],
            [arrKey]: [
              ...((prev as any)[section]?.[arrKey] || []),
              { id: crypto.randomUUID(), sector: "", files: [] },
            ],
          },
        } as any)
    );
    if (section === "section2_3") {
      setFormData((prev) => ({
        ...prev,
        section2_3: {
          ...prev.section2_3,
          hasInfraDevelopmentPlan: "yes",
        },
      }));
    }
  };

  const removeEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string
  ) => {
    const arrKey = sectionArrayKeyMap[section];
    setFormData((prev) => {
      const arr = ((prev as any)[section]?.[arrKey] || []).filter((entry: any) => entry.id !== id);
      // Always keep at least one entry for section2_1
      const newArr = (section === "section2_1" && arr.length === 0)
        ? [{ id: crypto.randomUUID(), sector: "", files: [] }]
        : arr;
      return {
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [arrKey]: newArr,
        },
      } as any;
    });
  };

  const updateEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string,
    field: "sector" | "files",
    value: any
  ) => {
    const arrKey = sectionArrayKeyMap[section];
    setFormData((prev) => {
      let newValue = value;
      // If updating files, sanitize: replace any file: {} with file: null
      if (field === "files" && Array.isArray(value)) {
        newValue = value.map(f => {
          if (f && typeof f === 'object' && f.file && Object.keys(f.file).length === 0 && f.file.constructor === Object) {
            return { ...f, file: null };
          }
          // Defensive: Only allow real File or null
          if (f && typeof f === 'object' && !(f.file instanceof File) && f.file !== null) {
            return { ...f, file: null };
          }
          return f;
        });
      }
      // Only update the specific entry's field, preserve all other data
      const updatedArr = (Array.isArray((prev as any)[section]?.[arrKey]) ? (prev as any)[section][arrKey] : []).map(
        (entry: any) =>
          entry.id === id ? { ...entry, [field]: newValue } : entry
      );
      return {
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [arrKey]: updatedArr,
        },
      } as any;
    });
  };
  // Utility: Deeply sanitize files in formData (only real File or null)
  function sanitizeFilesInFormData(obj) {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeFilesInFormData);
    }
    if (obj && typeof obj === 'object') {
      const newObj = {};
      for (const key in obj) {
        if (key === 'files' && Array.isArray(obj[key])) {
          newObj[key] = obj[key].map(f => {
            if (f && typeof f === 'object') {
              if (f.file instanceof File || f.file === null) {
                return f;
              } else {
                return { ...f, file: null };
              }
            }
            return f;
          });
        } else if (key === 'file') {
          if (obj[key] instanceof File || obj[key] === null) {
            newObj[key] = obj[key];
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

  // --- Section 2.4: Add/Remove Project ---
  const addProject = () => {
    const arrKey = sectionArrayKeyMap["section2_4"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_4: {
            ...(prev as any).section2_4,
            [arrKey]: [
              ...((prev as any).section2_4?.[arrKey] || []),
              { id: crypto.randomUUID(), projectName: "", dprFile: null },
            ],
          },
        } as any)
    );
  };

  const removeProject = (id: string) => {
    const arrKey = sectionArrayKeyMap["section2_4"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_4: {
            ...(prev as any).section2_4,
            [arrKey]: ((prev as any).section2_4?.[arrKey] || []).filter(
              (entry: any) => entry.id !== id
            ),
          },
        } as any)
    );
  };

  const updateProject = (
    id: string,
    field:
      | "projectName"
      | "sector"
      | "status"
      | "projectSize"
      | "investmentType"
      | "dprFile",
    value: any
  ) => {
    const arrKey = sectionArrayKeyMap["section2_4"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_4: {
            ...(prev as any).section2_4,
            [arrKey]: (Array.isArray((prev as any).section2_4?.[arrKey]) ? (prev as any).section2_4[arrKey] : []).map(
              (entry: any) =>
                entry.id === id ? { ...entry, [field]: value } : entry
            ),
          },
        } as any)
    );
  };

  // --- Section 2.5: Add/Remove Asset ---
  const addAsset = () => {
    const arrKey = sectionArrayKeyMap["section2_5"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_5: {
            ...(prev as any).section2_5,
            [arrKey]: [
              ...((prev as any).section2_5?.[arrKey] || []),
              {
                id: crypto.randomUUID(),
                projectName: "",
                sector: "",
                type: "",
                ownership: "Asset ownership",
                estimatedMonetization: "",
              },
            ],
          },
        } as any)
    );
  };

  const removeAsset = (id: string) => {
    const arrKey = sectionArrayKeyMap["section2_5"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_5: {
            ...(prev as any).section2_5,
            [arrKey]: ((prev as any).section2_5?.[arrKey] || []).filter(
              (entry: any) => entry.id !== id
            ),
          },
        } as any)
    );
  };

  const updateAsset = (
    id: string,
    field:
      | "projectName"
      | "sector"
      | "type"
      | "ownership"
      | "estimatedMonetization",
    value: any
  ) => {
    const arrKey = sectionArrayKeyMap["section2_5"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_5: {
            ...(prev as any).section2_5,
            [arrKey]: (Array.isArray((prev as any).section2_5?.[arrKey]) ? (prev as any).section2_5[arrKey] : []).map(
              (entry: any) =>
                entry.id === id ? { ...entry, [field]: value } : entry
            ),
          },
        } as any)
    );
  };

  const { toast } = useToast();

  // --- Navigation ---
  const handleNext = () => {
    if (!validation.isValid) {
      setShowValidationErrors(true);
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }
    updateFormData("infraDevelopment", formData);
    goToNext();
  };

  // Remove sectionStatus and section_status from all levels of the payload
  // Remove unwanted keys from all levels of the payload
  function deepRemoveUnwantedKeys(obj) {
    const keysToRemove = [
      'sectionStatus',
      'section_status',
      'completedList',
      'totalIndicators',
      'completedIndicators',
    ];
    if (Array.isArray(obj)) return obj.map(deepRemoveUnwantedKeys);
    if (obj && typeof obj === 'object') {
      const newObj = {};
      for (const key in obj) {
        if (!keysToRemove.includes(key)) {
          // Special handling for normalizedFormData and its 'original' property
          if (key === 'normalizedFormData' && obj[key] && typeof obj[key] === 'object') {
            newObj[key] = deepRemoveUnwantedKeys(obj[key]);
            // Remove section_status from normalizedFormData.original if present
            if (newObj[key].original) {
              newObj[key].original = deepRemoveUnwantedKeys(newObj[key].original);
            }
          } else {
            newObj[key] = deepRemoveUnwantedKeys(obj[key]);
          }
        }
      }
      return newObj;
    }
    return obj;
  }

  const handleSubmitToStateApprover = async () => {
    // Block submit if any file is not a real File object
    const hasInvalidFile = [
      ...(formData.section2_1?.infraActArray || []),
      ...(formData.section2_2?.specializedEntityArray || [])
    ].some(entry =>
      (entry.files || []).some(f => !f.file || !(f.file instanceof File))
    );
    if (hasInvalidFile) {
      toast({
        title: "File upload error",
        description: "One or more files are missing or not valid. Please re-select your files before submitting.",
        variant: "destructive",
      });
      return;
    }
    // Debug: Log files before submit
    console.log("[DEBUG] Submitting InfraDevelopmentStep, files in section2_1:", formData.section2_1?.infraActArray?.map(e => e.files));
    console.log("[DEBUG] Submitting InfraDevelopmentStep, files in section2_2:", formData.section2_2?.specializedEntityArray?.map(e => e.files));
    if (!validation.isValid) {
      setShowValidationErrors(true);
      toast({
        title: "Incomplete section",
        description: "Please complete all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      // Get the indicators for this section
      const sectionIndicators = allowedIndicators || ["2.1", "2.2", "2.3", "2.4", "2.5"];
      // Remove sectionStatus and section_status from payload and deeply sanitize files
      let sanitizedFormData = deepRemoveUnwantedKeys(sanitizeFilesInFormData(formData));
      // If user has selected files, ensure arrays are present and not empty objects
      if (!sanitizedFormData.section2_1 || typeof sanitizedFormData.section2_1 !== 'object' || !Array.isArray(sanitizedFormData.section2_1.infraActArray)) {
        sanitizedFormData.section2_1 = { infraActArray: [] };
      }
      if (!sanitizedFormData.section2_2 || typeof sanitizedFormData.section2_2 !== 'object' || !Array.isArray(sanitizedFormData.section2_2.specializedEntityArray)) {
        sanitizedFormData.section2_2 = { specializedEntityArray: [] };
      }
      const payload = {
        ...sanitizedFormData,
        sectionStatus: undefined,
        section_status: undefined
      };
      // Debug: Log sanitized payload before submit
      console.log("[DEBUG] Payload to submit InfraDevelopmentStep:", payload);
      await apiService.submitSectionToStateApprover(
        payload,
        "infraDevelopment",
        sectionIndicators
      );
      toast({
        title: "Success",
        description: "Infrastructure Development section submitted to State Approver successfully.",
        variant: "default",
      });
      // Update form data
      updateFormData("infraDevelopment", sanitizedFormData);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description: error?.response?.data?.message || error?.message || "Failed to submit section. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitIndicator = async (indicatorCode: string, indicatorTitle: string) => {
    setShowValidationErrors(true);
    
    // Validate only this specific indicator
    const indicatorValidation = validateInfraDevelopment(formData, {
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

    try {
      setIsSubmitting(true);
      // Remove sectionStatus and section_status from payload and deeply sanitize files
      let sanitizedFormData = deepRemoveUnwantedKeys(sanitizeFilesInFormData(formData));
      if (!sanitizedFormData.section2_1 || typeof sanitizedFormData.section2_1 !== 'object' || !Array.isArray(sanitizedFormData.section2_1.infraActArray)) {
        sanitizedFormData.section2_1 = { infraActArray: [] };
      }
      if (!sanitizedFormData.section2_2 || typeof sanitizedFormData.section2_2 !== 'object' || !Array.isArray(sanitizedFormData.section2_2.specializedEntityArray)) {
        sanitizedFormData.section2_2 = { specializedEntityArray: [] };
      }
      const payload = {
        ...sanitizedFormData,
        sectionStatus: undefined,
        section_status: undefined
      };
      await apiService.submitSectionToStateApprover(
        payload,
        "infraDevelopment",
        [indicatorCode]
      );
      toast({
        title: "Success",
        description: `Indicator ${indicatorCode} (${indicatorTitle}) submitted to State Approver successfully.`,
        variant: "default",
      });
      // Update form data
      updateFormData("infraDevelopment", sanitizedFormData);
    } catch (error: any) {
      console.error("Submit error:", error);
      toast({
        title: "Submission Failed",
        description: error?.response?.data?.message || error?.message || "Failed to submit indicator. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      // Remove sectionStatus and section_status from payload and deeply sanitize files
      let sanitizedFormData = deepRemoveUnwantedKeys(sanitizeFilesInFormData(formData));
      if (!sanitizedFormData.section2_1 || typeof sanitizedFormData.section2_1 !== 'object' || !Array.isArray(sanitizedFormData.section2_1.infraActArray)) {
        sanitizedFormData.section2_1 = { infraActArray: [] };
      }
      if (!sanitizedFormData.section2_2 || typeof sanitizedFormData.section2_2 !== 'object' || !Array.isArray(sanitizedFormData.section2_2.specializedEntityArray)) {
        sanitizedFormData.section2_2 = { specializedEntityArray: [] };
      }
      const payload = {
        ...sanitizedFormData,
        sectionStatus: undefined,
        section_status: undefined
      };
      await apiService.submitSectionToStateApprover(
        payload,
        "infraDevelopment",
        allowedIndicators || ["2.1", "2.2", "2.3", "2.4", "2.5"]
      );
      updateFormData("infraDevelopment", sanitizedFormData);
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved to the database.",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Save draft error:", error);
      toast({
        title: "Save Failed",
        description: error?.message || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Access control for NODAL_OFFICER & STATE_APPROVER
  if (isNodalOfficer || user?.role === "STATE_APPROVER") {
    console.log("🔍 InfraDevelopmentStep: Section indicator access", {
      role: user?.role,
      isNodalOfficer,
      assignedIndicators,
      availableIndicators,
      allowedIndicators,
    });

    if (!Array.isArray(allowedIndicators) || allowedIndicators.length === 0) {
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
              title="Infrastructure Development"
              description="Physical infrastructure development and completion metrics"
              points={250}
              completed={0}
              total={5}
              progress={0}
            />
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Data Required
              </h3>
              <p className="text-gray-600 mb-4">
                This section is not applicable for your submission. No data
                entry required here.
              </p>
              <Button onClick={goToNext} className="bg-primary text-white">
                Continue to Next Step
              </Button>
            </div>
          </div>
        </div>
      );
    }
  }

  // --- UI ---
  return (
    <div className="">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />
      {(() => {
        const { completed, total, progress } = computeStepProgress(
          { infraDevelopment: formData } as Record<string, unknown>,
          "infraDevelopment",
          {
            assignedIndicators,
            availableIndicators,
            isNodalOfficer,
            isStateApprover: user?.role === "STATE_APPROVER",
          }
        );
        console.log("Infra Development Progress Debug:", {
          role: user?.role,
          isNodalOfficer,
          isStateApprover: user?.role === "STATE_APPROVER",
          assignedIndicators,
          availableIndicators,
          completed,
          total,
          progress,
        });
        return (
          <ProgressHeader
            title="Infrastructure Development"
            description="Physical infrastructure development and completion metrics. (10 marks per sector, min. 3 sectors)"
            points={250}
            completed={completed}
            total={total}
            progress={progress}
          />
        );
      })()}

      <div>
      {/* Section 2.1 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.1") ||
        assignedIndicators.includes("2.1")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_1.infraActArray) &&
            Array.isArray(formData.section2_1?.infraActArray) && formData.section2_1.infraActArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">2.1 -</span> Availability of
                  Infrastructure Act/Policy{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4 ">
              {(Array.isArray(formData.section2_1?.infraActArray) ? formData.section2_1.infraActArray : []).map((entry) => (
                <div key={entry.id} className=" mb-2 relative">
                  <div className="flex flex-col gap-4 max-w-[70%]">
                    <div className="flex-1 w-full">
                      <Label>
                        Select Sector{" "}
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="inline w-3 h-3 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>Select the sector</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={entry.sector}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateEntry("section2_1", entry.id, "sector", value);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section2_1.infraActArray.${formData.section2_1.infraActArray.findIndex(
                                (e) => e.id === entry.id
                              )}.sector`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select an option" />
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
                    <div className="flex-1 w-full">
                      <FileUploadSection
                        label="Upload File"
                        value={entry.files?.[0] || null}
                        onChange={(file) => {
                          showErrorsIfNeeded();
                          // Always set file to null if not a real FileUpload
                          const safeFile = file && typeof file === 'object' && (file.file instanceof File || file.file === null)
                            ? file
                            : null;
                          updateEntry(
                            "section2_1",
                            entry.id,
                            "files",
                            safeFile ? [safeFile] : []
                          );
                        }}
                        required
                      />
                      {renderFieldError(
                        `section2_1.infraActArray.${formData.section2_1.infraActArray.findIndex(
                          (e) => e.id === entry.id
                        )}.files`
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="self-start absolute top-2 right-2"
                      onClick={() => removeEntry("section2_1", entry.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEntry("section2_1")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add More Entry
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload copy of Act/Policy
                </p>
                {renderFieldError("section2_1.infraActArray")}
              </div>

              {Array.isArray(formData.section2_1?.infraActArray) && formData.section2_1.infraActArray.length > 0 && (
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0 ">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
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
                      {(Array.isArray(formData.section2_1?.infraActArray) ? formData.section2_1.infraActArray : []).map((entry) => (
                        <tr key={entry.id} className="bg-white">
                          <td className="py-3 px-4 text-sm font-normal">
                            {entry.sector}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {entry.files?.[0]?.fileName || "No file uploaded"}
                          </td>
                          <td className="py-3 px-4 text-sm font-normal">
                            {entry.files?.[0]?.fileSize
                              ? `${(
                                  entry.files[0].fileSize /
                                  1024 /
                                  1024
                                ).toFixed(1)} MB`
                              : "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() =>
                                removeEntry("section2_1", entry.id)
                              }
                              className="text-red-600 hover:text-red-800"
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
                  onClick={() => handleSubmitIndicator("2.1", "Infrastructure Sector-Specific Acts")}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

      {/* Section 2.2 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.2") ||
        assignedIndicators.includes("2.2")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_2.specializedEntityArray) &&
            Array.isArray(formData.section2_2?.specializedEntityArray) && formData.section2_2.specializedEntityArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">2.2 -</span> Availability of
                  Specialized Entity{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              {(Array.isArray(formData.section2_2?.specializedEntityArray) ? formData.section2_2.specializedEntityArray : []).map((entry) => (
                <div key={entry.id} className="mb-2 relative">
                  <div className="flex flex-col gap-4 max-w-[70%]">
                    <div className="flex-1 w-full">
                      <Label>
                        Select Sector{" "}
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="inline w-3 h-3 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>Select the sector</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={entry.sector}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateEntry("section2_2", entry.id, "sector", value);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section2_2.specializedEntityArray.${formData.section2_2.specializedEntityArray.findIndex(
                                (e) => e.id === entry.id
                              )}.sector`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select an option" />
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
                    <div className="flex-1 w-full">
                      <FileUploadSection
                        label="Upload File"
                        value={entry.files?.[0] || null}
                        onChange={(file) => {
                          showErrorsIfNeeded();
                          // Always set file to null if not a real FileUpload
                          const safeFile = file && typeof file === 'object' && (file.file instanceof File || file.file === null)
                            ? file
                            : null;
                          updateEntry(
                            "section2_2",
                            entry.id,
                            "files",
                            safeFile ? [safeFile] : []
                          );
                        }}
                        required
                      />
                      {renderFieldError(
                        `section2_2.specializedEntityArray.${formData.section2_2.specializedEntityArray.findIndex(
                          (e) => e.id === entry.id
                        )}.files`
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeEntry("section2_2", entry.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEntry("section2_2")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add More Entry
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload evidence
                </p>
                {renderFieldError("section2_2.specializedEntityArray")}
              </div>

              {Array.isArray(formData.section2_2?.specializedEntityArray) && formData.section2_2.specializedEntityArray.length > 0 && (
                <div className="overflow-x-auto rounded-xl">
                  <table className="min-w-full border-separate border-spacing-0 ">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
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
                      {(Array.isArray(formData.section2_2?.specializedEntityArray) ? formData.section2_2.specializedEntityArray : []).map(
                        (entry) => (
                          <tr key={entry.id} className="bg-white">
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.sector}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.files?.[0]?.fileName || "No file uploaded"}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.files?.[0]?.fileSize
                                ? `${(
                                    entry.files[0].fileSize /
                                    1024 /
                                    1024
                                  ).toFixed(1)} MB`
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() =>
                                  removeEntry("section2_2", entry.id)
                                }
                                className="text-red-600 hover:text-red-800"
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
              <div className="mt-4">
                <Button
                  onClick={() => handleSubmitIndicator("2.2", "Specialized Entity")}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

      {/* Section 2.3 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.3") ||
        assignedIndicators.includes("2.3")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_3.infraDevelopmentArray) &&
            Array.isArray(formData.section2_3?.infraDevelopmentArray) && formData.section2_3.infraDevelopmentArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold">
                  <span className="text-primary">2.3 -</span> Availability of
                  Sector Infra Development Plan{" "}
                </span>
              </div>
            }
            className="mb-6"
          >
            <div className="space-y-6">
              <div>
                <Label>
                  Sector Infra Development Plan Available?{" "}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Select “Yes” if there is a Sector Infra Development Plan
                      available
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="infra-development-plan"
                      value="yes"
                      checked={
                        formData.section2_3.hasInfraDevelopmentPlan === "yes"
                      }
                      onChange={() => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section2_3: {
                            ...prev.section2_3,
                            hasInfraDevelopmentPlan: "yes",
                            comment: "",
                          },
                        }));
                      }}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="infra-development-plan"
                      value="no"
                      checked={
                        formData.section2_3.hasInfraDevelopmentPlan === "no"
                      }
                      onChange={() => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section2_3: {
                            ...prev.section2_3,
                            hasInfraDevelopmentPlan: "no",
                            infraDevelopmentArray: [],
                          },
                        }));
                      }}
                    />
                    No
                  </label>
                </div>
                {renderFieldError("section2_3.hasInfraDevelopmentPlan")}
              </div>

              {/* If Yes → show infra plan fields */}
              {formData.section2_3.hasInfraDevelopmentPlan === "yes" && (
                <div className="space-y-4">
                  {(Array.isArray(formData.section2_3?.infraDevelopmentArray) ? formData.section2_3.infraDevelopmentArray : []).map(
                    (entry: any) => (
                      <div key={entry.id} className="mb-2 relative">
                        <div className="flex flex-col gap-4 max-w-[70%]">
                          <div className="flex-1 w-full">
                            <Label>
                              Select Sector{" "}
                              <span className="text-destructive">*</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="inline w-3 h-3 ml-1" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Select the sector
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Select
                              value={entry.sector}
                              onValueChange={(value) => {
                                showErrorsIfNeeded();
                                updateEntry(
                                  "section2_3",
                                  entry.id,
                                  "sector",
                                  value
                                );
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  getInputValidationClass(
                                    `section2_3.infraDevelopmentArray.${formData.section2_3.infraDevelopmentArray.findIndex(
                                      (e) => e.id === entry.id
                                    )}.sector`
                                  )
                                )}
                              >
                                <SelectValue placeholder="Select an option" />
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

                          <div className="flex-1 w-full">
                            <FileUploadSection
                              label="Upload File"
                              value={entry.files?.[0] || null}
                              onChange={(file) => {
                                showErrorsIfNeeded();
                                updateEntry(
                                  "section2_3",
                                  entry.id,
                                  "files",
                                  file ? [file] : []
                                );
                              }}
                              required
                            />
                            {renderFieldError(
                              `section2_3.infraDevelopmentArray.${formData.section2_3.infraDevelopmentArray.findIndex(
                                (e) => e.id === entry.id
                              )}.files`
                            )}
                          </div>
                        </div>

                        {/* 👇 Delete button now visible, positioned exactly like 2.1 & 2.2 */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => removeEntry("section2_3", entry.id)}
                          aria-label="Remove"
                        >
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                      </div>
                    )
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEntry("section2_3")}
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add More Entry
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload plan
                  </p>
                </div>
              )}

              {/* If No → show comment box */}
              {formData.section2_3.hasInfraDevelopmentPlan === "no" && (
                <div>
                  <Label>Comments (Reason)</Label>
                  <Input
                    placeholder="Enter reason or comment"
                    value={formData.section2_3.comment || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section2_3: {
                          ...prev.section2_3,
                          comment: e.target.value,
                        },
                      }));
                    }}
                    className={cn(
                      getInputValidationClass("section2_3.comment")
                    )}
                  />
                  {renderFieldError("section2_3.comment")}
                </div>
              )}

              {renderFieldError("section2_3.infraDevelopmentArray")}

              {/* Table view */}
              {formData.section2_3.hasInfraDevelopmentPlan === "yes" &&
                Array.isArray(formData.section2_3?.infraDevelopmentArray) && formData.section2_3.infraDevelopmentArray.length > 0 && (
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
                            File Size
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(formData.section2_3?.infraDevelopmentArray) ? formData.section2_3.infraDevelopmentArray : []).map(
                          (entry) => (
                            <tr key={entry.id} className="bg-white">
                              <td className="py-3 px-4 text-sm font-normal">
                                {entry.sector}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {entry.files?.[0]?.fileName ||
                                  "No file uploaded"}
                              </td>
                              <td className="py-3 px-4 text-sm font-normal">
                                {entry.files?.[0]?.fileSize
                                  ? `${(
                                      entry.files[0].fileSize /
                                      1024 /
                                      1024
                                    ).toFixed(1)} MB`
                                  : "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeEntry("section2_3", entry.id)
                                  }
                                  className="text-red-600 hover:text-red-800"
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
                <div className="mt-4">
                  <Button
                    onClick={() => handleSubmitIndicator("2.3", "Infrastructure Development Plan")}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
            </div>
          </SectionCard>
        )}

      {/* Section 2.4 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.4") ||
        assignedIndicators.includes("2.4")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_4.investmentReadyArray) &&
            Array.isArray(formData.section2_4?.investmentReadyArray) && formData.section2_4.investmentReadyArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">2.4 -</span> Investment Ready
                  Project Pipeline
                </span>
              </div>
            }
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              {/* Yes/No selection */}
              <div>
                <Label>
                  Investment Ready Project Pipeline Available?{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="investment-ready"
                      value="yes"
                      checked={formData.section2_4.hasInvestmentReady === "yes"}
                      onChange={() => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section2_4: {
                            ...prev.section2_4,
                            hasInvestmentReady: "yes",
                            comment: "",
                          },
                        }));
                      }}
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="investment-ready"
                      value="no"
                      checked={formData.section2_4.hasInvestmentReady === "no"}
                      onChange={() => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section2_4: {
                            ...prev.section2_4,
                            hasInvestmentReady: "no",
                            investmentReadyArray: [],
                            websiteLink: "",
                          },
                        }));
                      }}
                    />
                    No
                  </label>
                </div>
                {renderFieldError("section2_4.hasInvestmentReady")}
              </div>

              {/* If Yes → show fields */}
              {formData.section2_4.hasInvestmentReady === "yes" && (
                <>
                  {/* Website link (one time) */}
                  <div className="max-w-[60%]">
                    <Label>
                      Website Link <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="url"
                      placeholder="Enter website URL"
                      value={formData.section2_4.websiteLink || ""}
                      onChange={(e) => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section2_4: {
                            ...prev.section2_4,
                            websiteLink: e.target.value,
                          },
                        }));
                      }}
                      className={cn(
                        getInputValidationClass("section2_4.websiteLink")
                      )}
                    />
                    {renderFieldError("section2_4.websiteLink")}
                  </div>

                  {/* Add Projects Section */}
                  {(Array.isArray(formData.section2_4?.investmentReadyArray) ? formData.section2_4.investmentReadyArray : []).map(
                    (entry: any) => (
                      <div key={entry.id} className="mb-2">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
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
                                updateProject(
                                  entry.id,
                                  "projectName",
                                  e.target.value
                                );
                              }}
                              className={cn(
                                getInputValidationClass(
                                  `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                    (e) => e.id === entry.id
                                  )}.projectName`
                                )
                              )}
                            />
                            {renderFieldError(
                              `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                (e) => e.id === entry.id
                              )}.projectName`
                            )}
                          </div>

                          <div>
                            <Label>
                              Sector <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={entry.sector}
                              onValueChange={(value) => {
                                showErrorsIfNeeded();
                                updateProject(entry.id, "sector", value);
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  getInputValidationClass(
                                    `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                      (e) => e.id === entry.id
                                    )}.sector`
                                  )
                                )}
                              >
                                <SelectValue placeholder="Select Sector" />
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
                            <Label>
                              Status <span className="text-destructive">*</span>
                            </Label>
                            <Select
                              value={entry.status}
                              onValueChange={(value) => {
                                showErrorsIfNeeded();
                                updateProject(entry.id, "status", value);
                              }}
                            >
                              <SelectTrigger
                                className={cn(
                                  getInputValidationClass(
                                    `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                      (e) => e.id === entry.id
                                    )}.status`
                                  )
                                )}
                              >
                                <SelectValue placeholder="Select Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {["Tender Done", "Bidding", "Other"].map(
                                  (s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>
                              Project Size (INR Cr){" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter size"
                              value={entry.projectSize || ""}
                              onChange={(e) => {
                                showErrorsIfNeeded();
                                updateProject(
                                  entry.id,
                                  "projectSize",
                                  e.target.value
                                );
                              }}
                              className={cn(
                                getInputValidationClass(
                                  `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                    (e) => e.id === entry.id
                                  )}.projectSize`
                                )
                              )}
                            />
                            {renderFieldError(
                              `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                (e) => e.id === entry.id
                              )}.projectSize`
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Label>
                                Type of Investment{" "}
                                <span className="text-destructive">*</span>
                              </Label>
                              <Select
                                value={entry.investmentType}
                                onValueChange={(value) => {
                                  showErrorsIfNeeded();
                                  updateProject(
                                    entry.id,
                                    "investmentType",
                                    value
                                  );
                                }}
                              >
                                <SelectTrigger
                                  className={cn(
                                    getInputValidationClass(
                                      `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                        (e) => e.id === entry.id
                                      )}.investmentType`
                                    )
                                  )}
                                >
                                  <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {["Partner", "Investor", "Other"].map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="self-start mt-6"
                              onClick={() => removeProject(entry.id)}
                              aria-label="Remove"
                            >
                              <Trash2 className="w-5 h-5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Add button */}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addProject}
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </Button>
                    {renderFieldError("section2_4.investmentReadyArray")}
                  </div>

                  {/* Table view */}
                  {Array.isArray(formData.section2_4?.investmentReadyArray) && formData.section2_4.investmentReadyArray.length > 0 && (
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
                            <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(formData.section2_4?.investmentReadyArray) ? formData.section2_4.investmentReadyArray : []).map(
                            (entry: any) => (
                              <tr key={entry.id} className="bg-white">
                                <td className="py-3 px-4 text-sm">
                                  {entry.projectName}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {entry.sector}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {entry.status}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {entry.projectSize}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {entry.investmentType}
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    onClick={() => removeProject(entry.id)}
                                    className="text-red-600 hover:text-red-800"
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
                </>
              )}

              {/* If No → Comment */}
              {formData.section2_4.hasInvestmentReady === "no" && (
                <div>
                  <Label>Comments (Reason)</Label>
                  <Input
                    type="text"
                    placeholder="Enter reason or comment"
                    value={formData.section2_4.comment || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      setFormData((prev) => ({
                        ...prev,
                        section2_4: {
                          ...prev.section2_4,
                          comment: e.target.value,
                        },
                      }));
                    }}
                    className={cn(
                      getInputValidationClass("section2_4.comment")
                    )}
                  />
                  {renderFieldError("section2_4.comment")}
                </div>
              )}
              <div className="mt-4">
                <Button
                  onClick={() => handleSubmitIndicator("2.4", "Investment Ready Projects")}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

      {/* Section 2.5 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.5") ||
        assignedIndicators.includes("2.5")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_5.assetMonetizationArray) &&
            Array.isArray(formData.section2_5?.assetMonetizationArray) && formData.section2_5.assetMonetizationArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">2.5 -</span> Availability of
                  Asset Monetization Pipeline{" "}
                </span>
              </div>
            }
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              {(Array.isArray(formData.section2_5?.assetMonetizationArray) ? formData.section2_5.assetMonetizationArray : []).map((entry) => (
                <div key={entry.id} className="mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <Label>
                        Project/Asset Name{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter project/asset name"
                        value={entry.projectName}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          updateAsset(entry.id, "projectName", e.target.value);
                        }}
                        className={cn(
                          getInputValidationClass(
                            `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                              (e) => e.id === entry.id
                            )}.projectName`
                          )
                        )}
                      />
                      {renderFieldError(
                        `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                          (e) => e.id === entry.id
                        )}.projectName`
                      )}
                    </div>
                    <div>
                      <Label>
                        Select Sector{" "}
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="inline w-3 h-3 ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>Select the sector</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={entry.sector}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateAsset(entry.id, "sector", value);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                                (e) => e.id === entry.id
                              )}.sector`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select an Option" />
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
                      <Label>
                        Select Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={entry.type}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateAsset(entry.id, "type", value);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                                (e) => e.id === entry.id
                              )}.type`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select an Option" />
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
                      <Label>
                        Asset Ownership{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={entry.ownership}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          updateAsset(entry.id, "ownership", value);
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                                (e) => e.id === entry.id
                              )}.ownership`
                            )
                          )}
                        >
                          <SelectValue placeholder="Asset ownership" />
                        </SelectTrigger>
                        <SelectContent>
                          {OWNERSHIP_OPTIONS.map((own) => (
                            <SelectItem key={own} value={own}>
                              {own}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <Label>Estimated Monetization</Label>
                        <Input
                          type="number"
                          placeholder="Estimated Monetization"
                          value={entry.estimatedMonetization}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            updateAsset(
                              entry.id,
                              "estimatedMonetization",
                              e.target.value
                            );
                          }}
                          className={cn(
                            getInputValidationClass(
                              `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                                (e) => e.id === entry.id
                              )}.estimatedMonetization`
                            )
                          )}
                        />
                        {renderFieldError(
                          `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                            (e) => e.id === entry.id
                          )}.estimatedMonetization`
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-start mt-6"
                        onClick={() => removeAsset(entry.id)}
                        aria-label="Remove"
                      >
                        <Trash2 className="w-5 h-5 text-destructive" />
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
                  onClick={addAsset}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 " />
                  Add More Asset
                </Button>
                {renderFieldError("section2_5.assetMonetizationArray")}
              </div>
              {/* Table view for Asset Monetization entries */}
              {Array.isArray(formData.section2_5?.assetMonetizationArray) && formData.section2_5.assetMonetizationArray.length > 0 && (
                <div className="overflow-x-auto rounded-xl mt-4">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-[#DDE3F9]">
                        <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                          Project / Asset Name
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Sector
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Type
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Ownership
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-normal">
                          Estimated Monetization (INR Cr)
                        </th>
                        <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(formData.section2_5?.assetMonetizationArray) ? formData.section2_5.assetMonetizationArray : []).map(
                        (entry) => (
                          <tr key={entry.id} className="bg-white">
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.projectName}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.sector}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.type}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.ownership}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {entry.estimatedMonetization}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removeAsset(entry.id)}
                                className="text-red-600 hover:text-red-800"
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
              <div className="mt-4">
                <Button
                  onClick={() => handleSubmitIndicator("2.5", "Asset Monetization Pipeline")}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

      {/* Navigation Buttons */}
      {isNextDisabled && showValidationErrors && (
        <p className="text-sm text-destructive mb-4">
          Complete all required fields before continuing.
        </p>
      )}
      
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
    </div>
  );
};
