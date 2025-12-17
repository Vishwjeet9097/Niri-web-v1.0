// Utility to deeply sanitize all file: {} to file: null in formData
function sanitizeFilesInFormData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFilesInFormData);
  } else if (obj && typeof obj === "object") {
    // If this is a FileUpload object
    if ("file" in obj) {
      if (
        obj.file &&
        typeof obj.file === "object" &&
        Object.keys(obj.file).length === 0 &&
        obj.file.constructor === Object
      ) {
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
  section2_4: {
    investmentReadyArray: [],
    hasInvestmentReady: "",
    comment: "",
    websiteLink: "",
  },
  section2_5: { assetMonetizationArray: [] },
};

// Defensive: always ensure array fields are initialized and preserve status field
function safeInfraDevelopmentFormData(
  data: Partial<InfraDevelopmentData>
): InfraDevelopmentData {
  return {
    ...defaultData,
    ...data,
    section2_1: {
      ...defaultData.section2_1,
      ...(data.section2_1 || {}),
      infraActArray: Array.isArray(data.section2_1?.infraActArray)
        ? data.section2_1.infraActArray
        : [],
      // Preserve status field
      status: (data.section2_1 as any)?.status,
    } as any,
    section2_2: {
      ...defaultData.section2_2,
      ...(data.section2_2 || {}),
      specializedEntityArray: Array.isArray(
        data.section2_2?.specializedEntityArray
      )
        ? data.section2_2.specializedEntityArray
        : [],
      // Preserve status field
      status: (data.section2_2 as any)?.status,
    } as any,
    section2_3: {
      ...defaultData.section2_3,
      ...(data.section2_3 || {}),
      infraDevelopmentArray: Array.isArray(
        data.section2_3?.infraDevelopmentArray
      )
        ? data.section2_3.infraDevelopmentArray
        : [],
      hasInfraDevelopmentPlan: data.section2_3?.hasInfraDevelopmentPlan || "",
      comment: data.section2_3?.comment || "",
      status: (data.section2_3 as any)?.status,
    } as any,
    section2_4: {
      ...defaultData.section2_4,
      ...(data.section2_4 || {}),
      investmentReadyArray: Array.isArray(data.section2_4?.investmentReadyArray)
        ? data.section2_4.investmentReadyArray
        : [],
      hasInvestmentReady: data.section2_4?.hasInvestmentReady || "",
      comment: data.section2_4?.comment || "",
      websiteLink: data.section2_4?.websiteLink || "",
      status: (data.section2_4 as any)?.status,
    } as any,
    section2_5: {
      ...defaultData.section2_5,
      ...(data.section2_5 || {}),
      assetMonetizationArray: Array.isArray(
        data.section2_5?.assetMonetizationArray
      )
        ? data.section2_5.assetMonetizationArray
        : [],
      // Preserve status field
      status: (data.section2_5 as any)?.status,
    } as any,
  };
}

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
  const [sectionStatus, setSectionStatus] = useState<any>({
    completedIndicators: [],
    completedCount: 0,
    totalAssigned: 0,
  });

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

  // Initialize with default data - DB data will load via useEffect
  // Don't use localStorage data here to avoid overwriting DB data with stale localStorage data
  const initialData: InfraDevelopmentData = safeInfraDevelopmentFormData({});

  const [formData, setFormData] = useState<InfraDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  
  // State for submissionId to enable immediate file uploads
  const [submissionId, setSubmissionId] = useState<string | undefined>();

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
          const legacy = parsedFormData?.infraDevelopment || {};

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

          const newFormData: InfraDevelopmentData =
            safeInfraDevelopmentFormData({
              section2_1: {
                ...getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section2_1,
                  "2.1"
                ),
                status: getStatusForIndicator(
                  "2.1",
                  getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section2_1,
                    "2.1"
                  )
                ),
              },
              section2_2: {
                ...getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section2_2,
                  "2.2"
                ),
                status: getStatusForIndicator(
                  "2.2",
                  getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section2_2,
                    "2.2"
                  )
                ),
              },
              section2_3: {
                ...getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section2_3,
                  "2.3"
                ),
                status: getStatusForIndicator(
                  "2.3",
                  getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section2_3,
                    "2.3"
                  )
                ),
              },
              section2_4: {
                ...getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section2_4,
                  "2.4"
                ),
                status: getStatusForIndicator(
                  "2.4",
                  getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section2_4,
                    "2.4"
                  )
                ),
              },
              section2_5: {
                ...getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section2_5,
                  "2.5"
                ),
                status: getStatusForIndicator(
                  "2.5",
                  getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section2_5,
                    "2.5"
                  )
                ),
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
  const isNextDisabled = false; // Validation disabled - Next button always enabled

  // Debug logging
  useEffect(() => {
    console.log("🔍 InfraDevelopmentStep Validation:", {
      isValid: validation.isValid,
      errors: validation.errors,
      hasInfraDevelopmentPlan: formData.section2_3.hasInfraDevelopmentPlan,
      section2_1_count: Array.isArray(formData.section2_1?.infraActArray)
        ? formData.section2_1.infraActArray.length
        : 0,
      section2_2_count: Array.isArray(
        formData.section2_2?.specializedEntityArray
      )
        ? formData.section2_2.specializedEntityArray.length
        : 0,
      section2_3_count: Array.isArray(
        formData.section2_3?.infraDevelopmentArray
      )
        ? formData.section2_3.infraDevelopmentArray.length
        : 0,
      section2_4_count: Array.isArray(formData.section2_4?.investmentReadyArray)
        ? formData.section2_4.investmentReadyArray.length
        : 0,
      section2_5_count: Array.isArray(
        formData.section2_5?.assetMonetizationArray
      )
        ? formData.section2_5.assetMonetizationArray.length
        : 0,
    });

    // 🔍 DEBUG: Detailed logging for section2_4
    console.log("🔍 [SECTION 2.4 DEBUG] Form Data:", {
      hasInvestmentReady: formData.section2_4?.hasInvestmentReady,
      websiteLink: formData.section2_4?.websiteLink,
      comment: formData.section2_4?.comment,
      investmentReadyArray: formData.section2_4?.investmentReadyArray,
      arrayLength: Array.isArray(formData.section2_4?.investmentReadyArray)
        ? formData.section2_4.investmentReadyArray.length
        : 0,
      firstEntry:
        Array.isArray(formData.section2_4?.investmentReadyArray) &&
        formData.section2_4.investmentReadyArray.length > 0
          ? formData.section2_4.investmentReadyArray[0]
          : null,
      validationErrors: Object.keys(validation.errors).filter((key) =>
        key.startsWith("section2_4")
      ),
      section2_4Errors: Object.keys(validation.errors)
        .filter((key) => key.startsWith("section2_4"))
        .reduce((acc, key) => {
          acc[key] = validation.errors[key];
          return acc;
        }, {} as Record<string, string>),
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
    // Only sync from localStorage if data hasn't been loaded from backend yet
    if (isDataLoaded) return;

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
          // Preserve status field
          status: (currentStepData.section2_1 as any)?.status,
        },
        section2_2: {
          specializedEntityArray:
            (currentStepData.section2_2 as any)?.specializedEntityArray || [],
          // Preserve status field
          status: (currentStepData.section2_2 as any)?.status,
        },
        section2_3: {
          infraDevelopmentArray:
            (currentStepData.section2_3 as any)?.infraDevelopmentArray || [],
          hasInfraDevelopmentPlan:
            (currentStepData.section2_3 as any)?.hasInfraDevelopmentPlan || "",
          comment: (currentStepData.section2_3 as any)?.comment || "",
          // Preserve status field
          status: (currentStepData.section2_3 as any)?.status,
        },
        section2_4: {
          investmentReadyArray:
            (currentStepData.section2_4 as any)?.investmentReadyArray || [],
          hasInvestmentReady:
            (currentStepData.section2_4 as any)?.hasInvestmentReady || "",
          comment: (currentStepData.section2_4 as any)?.comment || "",
          websiteLink: (currentStepData.section2_4 as any)?.websiteLink || "",
          // Preserve status field
          status: (currentStepData.section2_4 as any)?.status,
        },
        section2_5: {
          assetMonetizationArray:
            (currentStepData.section2_5 as any)?.assetMonetizationArray || [],
          // Preserve status field
          status: (currentStepData.section2_5 as any)?.status,
        },
      };

      // 🔍 DEBUG: Log synced data before setting
      console.log("🔍 [LOAD FROM LOCALSTORAGE] syncedData.section2_4:", {
        section2_4: syncedData.section2_4,
        hasInvestmentReady: syncedData.section2_4.hasInvestmentReady,
        websiteLink: syncedData.section2_4.websiteLink,
        comment: syncedData.section2_4.comment,
        arrayLength: Array.isArray(syncedData.section2_4.investmentReadyArray)
          ? syncedData.section2_4.investmentReadyArray.length
          : 0,
        status: syncedData.section2_4.status,
      });

      setFormData((prev) => ({ ...prev, ...syncedData }));
    }
    // ⛔ Run this only once on mount, but check isDataLoaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded]);

  // Initialize form data only once when component mounts (editing flow)
  // In edit mode, always fetch and populate from backend/DB, ignore editing_submission localStorage for data (match InfraFinancingStep pattern)
  useEffect(() => {
    if (localStorage.getItem("editing_submission")) {
      console.log(
        "[LocalStorage] Found editing_submission but ignoring in favor of DB data"
      );
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
      const arr = ((prev as any)[section]?.[arrKey] || []).filter(
        (entry: any) => entry.id !== id
      );
      // Always keep at least one entry for section2_1
      const newArr =
        section === "section2_1" && arr.length === 0
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
        newValue = value.map((f) => {
          if (
            f &&
            typeof f === "object" &&
            f.file &&
            Object.keys(f.file).length === 0 &&
            f.file.constructor === Object
          ) {
            return { ...f, file: null };
          }
          // Defensive: Only allow real File or null
          if (
            f &&
            typeof f === "object" &&
            !(f.file instanceof File) &&
            f.file !== null
          ) {
            return { ...f, file: null };
          }
          return f;
        });
      }
      // Only update the specific entry's field, preserve all other data
      const updatedArr = (
        Array.isArray((prev as any)[section]?.[arrKey])
          ? (prev as any)[section][arrKey]
          : []
      ).map((entry: any) =>
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
    if (obj && typeof obj === "object") {
      const newObj = {};
      for (const key in obj) {
        if (key === "files" && Array.isArray(obj[key])) {
          newObj[key] = obj[key].map((f) => {
            if (f && typeof f === "object") {
              if (f.file instanceof File || f.file === null) {
                return f;
              } else {
                return { ...f, file: null };
              }
            }
            return f;
          });
        } else if (key === "file") {
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
            [arrKey]: (Array.isArray((prev as any).section2_4?.[arrKey])
              ? (prev as any).section2_4[arrKey]
              : []
            ).map((entry: any) =>
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
            [arrKey]: (Array.isArray((prev as any).section2_5?.[arrKey])
              ? (prev as any).section2_5[arrKey]
              : []
            ).map((entry: any) =>
              entry.id === id ? { ...entry, [field]: value } : entry
            ),
          },
        } as any)
    );
  };

  const { toast } = useToast();

  // --- Navigation ---
  const handleNext = () => {
    // Validation disabled - allow navigation without checking required fields
    updateFormData("infraDevelopment", formData);
    goToNext();
  };

  // Remove sectionStatus and section_status from all levels of the payload
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
            // Use Object.assign to preserve all properties including the File instance
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

  const handleSubmitToStateApprover = async () => {
    // Block submit if any file is not a real File object
    const hasInvalidFile = [
      ...(formData.section2_1?.infraActArray || []),
      ...(formData.section2_2?.specializedEntityArray || []),
    ].some((entry) =>
      (entry.files || []).some((f) => !f.file || !(f.file instanceof File))
    );
    if (hasInvalidFile) {
      toast({
        title: "File upload error",
        description:
          "One or more files are missing or not valid. Please re-select your files before submitting.",
        variant: "destructive",
      });
      return;
    }
    // Debug: Log files before submit
    console.log(
      "[DEBUG] Submitting InfraDevelopmentStep, files in section2_1:",
      formData.section2_1?.infraActArray?.map((e) => e.files)
    );
    console.log(
      "[DEBUG] Submitting InfraDevelopmentStep, files in section2_2:",
      formData.section2_2?.specializedEntityArray?.map((e) => e.files)
    );
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
      const sectionIndicators = allowedIndicators || [
        "2.1",
        "2.2",
        "2.3",
        "2.4",
        "2.5",
      ];
      // Remove sectionStatus and section_status from payload and deeply sanitize files
      let sanitizedFormData = deepRemoveUnwantedKeys(
        sanitizeFilesInFormData(formData)
      );
      // If user has selected files, ensure arrays are present and not empty objects
      if (
        !sanitizedFormData.section2_1 ||
        typeof sanitizedFormData.section2_1 !== "object" ||
        !Array.isArray(sanitizedFormData.section2_1.infraActArray)
      ) {
        sanitizedFormData.section2_1 = { infraActArray: [] };
      }
      if (
        !sanitizedFormData.section2_2 ||
        typeof sanitizedFormData.section2_2 !== "object" ||
        !Array.isArray(sanitizedFormData.section2_2.specializedEntityArray)
      ) {
        sanitizedFormData.section2_2 = { specializedEntityArray: [] };
      }
      const payload = {
        ...sanitizedFormData,
        sectionStatus: undefined,
        section_status: undefined,
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
        description:
          "Infrastructure Development section submitted to State Approver successfully.",
        variant: "default",
      });
      // Update form data
      updateFormData("infraDevelopment", sanitizedFormData);
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

      // 🔍 DEBUG: Log raw formData before sanitization
      console.log(`🔍 [SUBMIT ${indicatorCode}] Raw formData:`, {
        sectionKey: `section${indicatorCode.replace(".", "_")}`,
        sectionData: formData[`section${indicatorCode.replace(".", "_")}`],
        fullFormData: formData,
      });

      // ✅ Check for File objects BEFORE sanitization
      // Helper to check for File objects
      const hasFileObjects = (obj: any): boolean => {
        if (!obj || typeof obj !== "object") return false;
        if (obj instanceof File) return true;
        if (Array.isArray(obj)) return obj.some(hasFileObjects);
        for (const value of Object.values(obj)) {
          if (value instanceof File) return true;
          if (value && typeof value === "object") {
            if ((value as any).file instanceof File) return true;
            if (hasFileObjects(value)) return true;
          }
        }
        return false;
      };

      const hasFiles = hasFileObjects(formData);
      console.log(`🔍 [SUBMIT ${indicatorCode}] File objects detected in formData:`, hasFiles);

      // ✅ If files exist, pass original formData (with File objects) to submitSectionToStateApprover
      // The API service will handle sanitization internally after uploading files
      // If no files, use sanitized data as before
      let dataToSubmit: any;
      
      if (hasFiles) {
        console.log(`📤 [SUBMIT ${indicatorCode}] Files detected - passing original formData with File objects`);
        // Only remove unwanted keys, don't sanitize files yet
        // The API service will upload files and sanitize them
        dataToSubmit = deepRemoveUnwantedKeys(formData);
      } else {
        // No files, sanitize as before
        dataToSubmit = deepRemoveUnwantedKeys(
          sanitizeFilesInFormData(formData)
        );
      }

      // Use dataToSubmit for all subsequent operations
      const sanitizedFormData = dataToSubmit;

      // 🔍 DEBUG: Log after sanitization
      const debugSectionKey = `section${indicatorCode.replace(".", "_")}`;
      console.log(`🔍 [SUBMIT ${indicatorCode}] After sanitization:`, {
        sectionKey: debugSectionKey,
        sectionData: sanitizedFormData[debugSectionKey],
        hasInfraDevelopmentPlan:
          sanitizedFormData.section2_3?.hasInfraDevelopmentPlan,
        section2_3_comment: sanitizedFormData.section2_3?.comment,
        section2_3_array: sanitizedFormData.section2_3?.infraDevelopmentArray,
        hasInvestmentReady: sanitizedFormData.section2_4?.hasInvestmentReady,
        section2_4_comment: sanitizedFormData.section2_4?.comment,
        section2_4_array: sanitizedFormData.section2_4?.investmentReadyArray,
      });

      if (
        !sanitizedFormData.section2_1 ||
        typeof sanitizedFormData.section2_1 !== "object" ||
        !Array.isArray(sanitizedFormData.section2_1.infraActArray)
      ) {
        sanitizedFormData.section2_1 = { infraActArray: [] };
      }
      if (
        !sanitizedFormData.section2_2 ||
        typeof sanitizedFormData.section2_2 !== "object" ||
        !Array.isArray(sanitizedFormData.section2_2.specializedEntityArray)
      ) {
        sanitizedFormData.section2_2 = { specializedEntityArray: [] };
      }

      // 🔍 DEBUG: Ensure section2_3 and section2_4 are properly structured
      if (indicatorCode === "2.3") {
        if (
          !sanitizedFormData.section2_3 ||
          typeof sanitizedFormData.section2_3 !== "object"
        ) {
          sanitizedFormData.section2_3 = {
            infraDevelopmentArray: [],
            hasInfraDevelopmentPlan: "",
            comment: "",
          };
        }
        console.log(
          `🔍 [SUBMIT 2.3] Final section2_3 structure:`,
          sanitizedFormData.section2_3
        );
      }
      if (indicatorCode === "2.4") {
        if (
          !sanitizedFormData.section2_4 ||
          typeof sanitizedFormData.section2_4 !== "object"
        ) {
          sanitizedFormData.section2_4 = {
            investmentReadyArray: [],
            hasInvestmentReady: "",
            comment: "",
            websiteLink: "",
          };
        }
        // Ensure all required fields are present
        if (!sanitizedFormData.section2_4.investmentReadyArray) {
          sanitizedFormData.section2_4.investmentReadyArray = [];
        }
        if (!sanitizedFormData.section2_4.hasInvestmentReady) {
          sanitizedFormData.section2_4.hasInvestmentReady = "";
        }
        if (!sanitizedFormData.section2_4.comment) {
          sanitizedFormData.section2_4.comment = "";
        }
        if (!sanitizedFormData.section2_4.websiteLink) {
          sanitizedFormData.section2_4.websiteLink = "";
        }
        console.log(
          `🔍 [SUBMIT 2.4] Final section2_4 structure:`,
          sanitizedFormData.section2_4
        );
      }

      const payload = {
        ...sanitizedFormData,
        sectionStatus: undefined,
        section_status: undefined,
      };

      // 🔍 DEBUG: Log final payload
      const finalSectionKey = `section${indicatorCode.replace(".", "_")}`;

      // Check current status - if REVERTED, set to RESUBMITTED, otherwise SUBMITTED_TO_STATE
      const currentStatus = getIndicatorStatus(indicatorCode);
      const upperStatus = (currentStatus || "").toUpperCase();
      const newStatus =
        upperStatus === "REVERTED" || upperStatus === "RESUBMITTED"
          ? "RESUBMITTED"
          : "SUBMITTED_TO_STATE";

      const sanitizedFormDataWithStatus = {
        ...sanitizedFormData,
        [finalSectionKey]: {
          ...sanitizedFormData[finalSectionKey],
          status: newStatus,
        },
      };
      
      // ✅ Verify File instances are still present before sending to API
      const verifyFileInstances = (obj: any, path: string = ""): boolean => {
        if (!obj || typeof obj !== "object") return false;
        if (obj instanceof File) return true;
        if (Array.isArray(obj)) {
          return obj.some((item, idx) => verifyFileInstances(item, `${path}[${idx}]`));
        }
        for (const [key, value] of Object.entries(obj)) {
          if (value instanceof File) {
            console.log(`✅ File instance found at ${path}.${key}`);
            return true;
          }
          if (value && typeof value === "object" && "file" in value && value.file instanceof File) {
            console.log(`✅ File instance found in FileUpload at ${path}.${key}.file`);
            return true;
          }
          if (verifyFileInstances(value, path ? `${path}.${key}` : key)) return true;
        }
        return false;
      };
      
      const stillHasFiles = verifyFileInstances(sanitizedFormDataWithStatus);
      console.log(`🔍 [SUBMIT ${indicatorCode}] File instances verification before API call:`, stillHasFiles);
      
      console.log(`🔍 [SUBMIT ${indicatorCode}] Final payload being sent:`, {
        indicatorCode,
        category: "infraDevelopment",
        payloadSection: payload[finalSectionKey],
        fullPayload: payload,
        previousStatus: currentStatus,
        newStatus: newStatus,
        hasFileInstances: stillHasFiles,
      });

      const result = await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraDevelopment",
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
      const sectionKey = finalSectionKey;
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
        updateFormData("infraDevelopment", {
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

      // 🔍 DEBUG: Log before updating form data
      console.log(`🔍 [SUBMIT ${indicatorCode}] Before updateFormData:`, {
        indicatorCode,
        sanitizedSection: sanitizedFormData[finalSectionKey],
        fullSanitizedData: sanitizedFormData,
      });

      console.log(`🔍 [SUBMIT ${indicatorCode}] Updating with status:`, {
        section: sanitizedFormDataWithStatus[finalSectionKey],
      });

      // Update form data
      updateFormData("infraDevelopment", sanitizedFormDataWithStatus);

      // 🔍 DEBUG: Log after updating form data
      setTimeout(() => {
        const stored = localStorage.getItem("submission_form_data");
        console.log(
          `🔍 [SUBMIT ${indicatorCode}] After updateFormData, localStorage:`,
          {
            indicatorCode,
            stored: stored ? JSON.parse(stored) : null,
          }
        );
      }, 100);

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
      // Remove sectionStatus and section_status from payload and deeply sanitize files
      let sanitizedFormData = deepRemoveUnwantedKeys(
        sanitizeFilesInFormData(formData)
      );
      if (
        !sanitizedFormData.section2_1 ||
        typeof sanitizedFormData.section2_1 !== "object" ||
        !Array.isArray(sanitizedFormData.section2_1.infraActArray)
      ) {
        sanitizedFormData.section2_1 = { infraActArray: [] };
      }
      if (
        !sanitizedFormData.section2_2 ||
        typeof sanitizedFormData.section2_2 !== "object" ||
        !Array.isArray(sanitizedFormData.section2_2.specializedEntityArray)
      ) {
        sanitizedFormData.section2_2 = { specializedEntityArray: [] };
      }
      const payload = {
        ...sanitizedFormData,
        sectionStatus: undefined,
        section_status: undefined,
      };
      const result = await apiService.submitSectionToStateApprover(
        payload,
        "infraDevelopment",
        allowedIndicators || ["2.1", "2.2", "2.3", "2.4", "2.5"]
      );
      
      // Update submissionId if it was created/updated
      if (result?.id || result?.submissionId) {
        const newSubmissionId = result.id || result.submissionId;
        if (newSubmissionId && newSubmissionId !== submissionId) {
          setSubmissionId(newSubmissionId);
          console.log("✅ Updated submissionId after draft save:", newSubmissionId);
        }
      }
      
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
        description:
          error?.message || "Failed to save draft. Please try again.",
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
      const indicatorValidation = validateInfraDevelopment(formData, {
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

      // Sanitize files and remove unwanted keys before saving
      const sanitizedFormData = deepRemoveUnwantedKeys(
        sanitizeFilesInFormData(formData)
      );

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
        "infraDevelopment",
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
        updateFormData("infraDevelopment", {
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

  // --- UI ---
  return (
    <div className="">
      <Stepper
        steps={SUBMISSION_STEPS}
        currentStep={currentStep}
        onStepClick={goToStep}
      />
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
        // 🔍 DEBUG: Check if section2_4 is considered filled
        const section2_4Data = formData.section2_4;
        const isSection2_4Filled = (() => {
          const hasInvestmentReady = section2_4Data?.hasInvestmentReady;
          if (!hasInvestmentReady || hasInvestmentReady === "") return false;

          if (hasInvestmentReady === "yes") {
            const hasWebsiteLink =
              section2_4Data?.websiteLink &&
              section2_4Data.websiteLink.trim() !== "";
            const hasArray =
              Array.isArray(section2_4Data?.investmentReadyArray) &&
              section2_4Data.investmentReadyArray.length > 0 &&
              section2_4Data.investmentReadyArray.some(
                (entry: any) =>
                  entry?.projectName &&
                  entry.projectName.trim() !== "" &&
                  entry?.sector &&
                  entry.sector.trim() !== "" &&
                  entry?.status &&
                  entry.status.trim() !== "" &&
                  entry?.investmentType &&
                  entry.investmentType.trim() !== ""
              );
            return hasWebsiteLink && hasArray;
          }

          if (hasInvestmentReady === "no") {
            return (
              section2_4Data?.comment && section2_4Data.comment.trim() !== ""
            );
          }

          return false;
        })();

        console.log("🔍 Infra Development Progress Debug:", {
          role: user?.role,
          isNodalOfficer,
          isStateApprover: user?.role === "STATE_APPROVER",
          assignedIndicators,
          availableIndicators,
          completed,
          total,
          progress,
          section2_4Data: {
            hasInvestmentReady: section2_4Data?.hasInvestmentReady,
            websiteLink: section2_4Data?.websiteLink,
            comment: section2_4Data?.comment,
            arrayLength: Array.isArray(section2_4Data?.investmentReadyArray)
              ? section2_4Data.investmentReadyArray.length
              : 0,
          },
          isSection2_4Filled,
          section2_4InAllowedIndicators: allowedIndicators.includes("2.4"),
        });
        return (
          <ProgressHeader
            title="Infrastructure Development"
            description="Physical infrastructure development and completion metrics. (10 marks per sector, min. 1 sector)"
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
          assignedIndicators.includes("2.1")) && (
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
            indicatorStatus={getIndicatorStatus("2.1")}
            indicatorCode="2.1"
            isEditable={editingIndicators.has("2.1")}
            onEdit={() => handleEditIndicator("2.1")}
            onSave={() => handleSaveIndicator("2.1")}
            onCancel={() => handleCancelEdit("2.1")}
            isSaving={savingIndicators.has("2.1")}
          >
            <div className="flex flex-col gap-4 ">
              {(Array.isArray(formData.section2_1?.infraActArray)
                ? formData.section2_1.infraActArray
                : []
              ).map((entry) => (
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
                        disabled={isIndicatorSubmitted("2.1")}
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
                          const safeFile =
                            file &&
                            typeof file === "object" &&
                            (file.file instanceof File || file.file === null)
                              ? file
                              : null;
                          updateEntry(
                            "section2_1",
                            entry.id,
                            "files",
                            safeFile ? [safeFile] : []
                          );
                        }}
                        submissionId={submissionId}
                        required
                        disabled={isIndicatorSubmitted("2.1")}
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
                      disabled={isIndicatorSubmitted("2.1")}
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
                  disabled={isIndicatorSubmitted("2.1")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Entry
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload copy of Act/Policy
                </p>
                {renderFieldError("section2_1.infraActArray")}
              </div>

              {Array.isArray(formData.section2_1?.infraActArray) &&
                formData.section2_1.infraActArray.length > 0 && (
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
                        {(Array.isArray(formData.section2_1?.infraActArray)
                          ? formData.section2_1.infraActArray
                          : []
                        ).map((entry) => (
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
                                disabled={isIndicatorSubmitted("2.1")}
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
                      "2.1",
                      "Infrastructure Sector-Specific Acts"
                    )
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("2.1")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("2.1", isSubmitting)}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 2.2 */}
        {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
          availableIndicators.includes("2.2") ||
          assignedIndicators.includes("2.2")) && (
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
            indicatorStatus={getIndicatorStatus("2.2")}
            indicatorCode="2.2"
            isEditable={editingIndicators.has("2.2")}
            onEdit={() => handleEditIndicator("2.2")}
            onSave={() => handleSaveIndicator("2.2")}
            onCancel={() => handleCancelEdit("2.2")}
            isSaving={savingIndicators.has("2.2")}
          >
            <div className="flex flex-col gap-4">
              {(Array.isArray(formData.section2_2?.specializedEntityArray)
                ? formData.section2_2.specializedEntityArray
                : []
              ).map((entry) => (
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
                        disabled={isIndicatorSubmitted("2.2")}
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
                          const safeFile =
                            file &&
                            typeof file === "object" &&
                            (file.file instanceof File || file.file === null)
                              ? file
                              : null;
                          updateEntry(
                            "section2_2",
                            entry.id,
                            "files",
                            safeFile ? [safeFile] : []
                          );
                        }}
                        submissionId={submissionId}
                        required
                        disabled={isIndicatorSubmitted("2.2")}
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
                      disabled={isIndicatorSubmitted("2.2")}
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
                  disabled={isIndicatorSubmitted("2.2")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add More Entry
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload evidence
                </p>
                {renderFieldError("section2_2.specializedEntityArray")}
              </div>

              {Array.isArray(formData.section2_2?.specializedEntityArray) &&
                formData.section2_2.specializedEntityArray.length > 0 && (
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
                        {(Array.isArray(
                          formData.section2_2?.specializedEntityArray
                        )
                          ? formData.section2_2.specializedEntityArray
                          : []
                        ).map((entry) => (
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
                                disabled={isIndicatorSubmitted("2.2")}
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
                    handleSubmitIndicator("2.2", "Specialized Entity")
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("2.2")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("2.2", isSubmitting)}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 2.3 */}
        {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
          availableIndicators.includes("2.3") ||
          assignedIndicators.includes("2.3")) && (
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
            indicatorStatus={getIndicatorStatus("2.3")}
            indicatorCode="2.3"
            isEditable={editingIndicators.has("2.3")}
            onEdit={() => handleEditIndicator("2.3")}
            onSave={() => handleSaveIndicator("2.3")}
            onCancel={() => handleCancelEdit("2.3")}
            isSaving={savingIndicators.has("2.3")}
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
                        if (isIndicatorSubmitted("2.3")) return;
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
                      disabled={isIndicatorSubmitted("2.3")}
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
                        if (isIndicatorSubmitted("2.3")) return;
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
                      disabled={isIndicatorSubmitted("2.3")}
                    />
                    No
                  </label>
                </div>
                {renderFieldError("section2_3.hasInfraDevelopmentPlan")}
              </div>

              {/* If Yes → show infra plan fields */}
              {formData.section2_3.hasInfraDevelopmentPlan === "yes" && (
                <div className="space-y-4">
                  {(Array.isArray(formData.section2_3?.infraDevelopmentArray)
                    ? formData.section2_3.infraDevelopmentArray
                    : []
                  ).map((entry: any) => (
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
                              updateEntry(
                                "section2_3",
                                entry.id,
                                "sector",
                                value
                              );
                            }}
                            disabled={isIndicatorSubmitted("2.3")}
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
                            submissionId={submissionId}
                            required
                            disabled={isIndicatorSubmitted("2.3")}
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
                        disabled={isIndicatorSubmitted("2.3")}
                        aria-label="Remove"
                      >
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEntry("section2_3")}
                    disabled={isIndicatorSubmitted("2.3")}
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isIndicatorSubmitted("2.3")}
                    className={cn(
                      getInputValidationClass("section2_3.comment"),
                      isIndicatorSubmitted("2.3") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section2_3.comment")}
                </div>
              )}

              {renderFieldError("section2_3.infraDevelopmentArray")}

              {/* Table view */}
              {formData.section2_3.hasInfraDevelopmentPlan === "yes" &&
                Array.isArray(formData.section2_3?.infraDevelopmentArray) &&
                formData.section2_3.infraDevelopmentArray.length > 0 && (
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
                        {(Array.isArray(
                          formData.section2_3?.infraDevelopmentArray
                        )
                          ? formData.section2_3.infraDevelopmentArray
                          : []
                        ).map((entry) => (
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
                                  removeEntry("section2_3", entry.id)
                                }
                                disabled={isIndicatorSubmitted("2.3")}
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
                      "2.3",
                      "Infrastructure Development Plan"
                    )
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("2.3")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("2.3", isSubmitting)}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 2.4 */}
        {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
          availableIndicators.includes("2.4") ||
          assignedIndicators.includes("2.4")) && (
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
            indicatorStatus={getIndicatorStatus("2.4")}
            indicatorCode="2.4"
            isEditable={editingIndicators.has("2.4")}
            onEdit={() => handleEditIndicator("2.4")}
            onSave={() => handleSaveIndicator("2.4")}
            onCancel={() => handleCancelEdit("2.4")}
            isSaving={savingIndicators.has("2.4")}
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
                        if (isIndicatorSubmitted("2.4")) return;
                        showErrorsIfNeeded();
                        console.log(
                          "🔍 [2.4] Setting hasInvestmentReady to 'yes'"
                        );
                        setFormData((prev) => {
                          const newData = {
                            ...prev,
                            section2_4: {
                              ...prev.section2_4,
                              hasInvestmentReady: "yes",
                              comment: "",
                            },
                          };
                          console.log(
                            "🔍 [2.4] New formData after yes:",
                            newData.section2_4
                          );
                          return newData;
                        });
                      }}
                      disabled={isIndicatorSubmitted("2.4")}
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
                        if (isIndicatorSubmitted("2.4")) return;
                        showErrorsIfNeeded();
                        console.log(
                          "🔍 [2.4] Setting hasInvestmentReady to 'no'"
                        );
                        setFormData((prev) => {
                          const newData = {
                            ...prev,
                            section2_4: {
                              ...prev.section2_4,
                              hasInvestmentReady: "no",
                              investmentReadyArray: [],
                              websiteLink: "",
                            },
                          };
                          console.log(
                            "🔍 [2.4] New formData after no:",
                            newData.section2_4
                          );
                          return newData;
                        });
                      }}
                      disabled={isIndicatorSubmitted("2.4")}
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
                      disabled={isIndicatorSubmitted("2.4")}
                      className={cn(
                        getInputValidationClass("section2_4.websiteLink"),
                        isIndicatorSubmitted("2.4") &&
                          "bg-gray-50 cursor-not-allowed"
                      )}
                    />
                    {renderFieldError("section2_4.websiteLink")}
                  </div>

                  {/* Add Projects Section */}
                  {(Array.isArray(formData.section2_4?.investmentReadyArray)
                    ? formData.section2_4.investmentReadyArray
                    : []
                  ).map((entry: any) => (
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
                            disabled={isIndicatorSubmitted("2.4")}
                            className={cn(
                              getInputValidationClass(
                                `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                  (e) => e.id === entry.id
                                )}.projectName`
                              ),
                              isIndicatorSubmitted("2.4") &&
                                "bg-gray-50 cursor-not-allowed"
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
                            disabled={isIndicatorSubmitted("2.4")}
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
                            disabled={isIndicatorSubmitted("2.4")}
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
                              {["Tender Done", "Bidding", "Other"].map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            disabled={isIndicatorSubmitted("2.4")}
                            className={cn(
                              getInputValidationClass(
                                `section2_4.investmentReadyArray.${formData.section2_4.investmentReadyArray.findIndex(
                                  (e) => e.id === entry.id
                                )}.projectSize`
                              ),
                              isIndicatorSubmitted("2.4") &&
                                "bg-gray-50 cursor-not-allowed"
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
                              disabled={isIndicatorSubmitted("2.4")}
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
                            disabled={isIndicatorSubmitted("2.4")}
                            aria-label="Remove"
                          >
                            <Trash2 className="w-5 h-5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add button */}
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addProject}
                      disabled={isIndicatorSubmitted("2.4")}
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      Add Project
                    </Button>
                    {renderFieldError("section2_4.investmentReadyArray")}
                  </div>

                  {/* Table view */}
                  {Array.isArray(formData.section2_4?.investmentReadyArray) &&
                    formData.section2_4.investmentReadyArray.length > 0 && (
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
                            {(Array.isArray(
                              formData.section2_4?.investmentReadyArray
                            )
                              ? formData.section2_4.investmentReadyArray
                              : []
                            ).map((entry: any) => (
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
                                    disabled={isIndicatorSubmitted("2.4")}
                                    className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isIndicatorSubmitted("2.4")}
                    className={cn(
                      getInputValidationClass("section2_4.comment"),
                      isIndicatorSubmitted("2.4") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section2_4.comment")}
                </div>
              )}
              <div className="mt-4">
                <Button
                  onClick={() =>
                    handleSubmitIndicator("2.4", "Investment Ready Projects")
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("2.4")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("2.4", isSubmitting)}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Section 2.5 */}
        {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
          availableIndicators.includes("2.5") ||
          assignedIndicators.includes("2.5")) && (
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
            indicatorStatus={getIndicatorStatus("2.5")}
            indicatorCode="2.5"
            isEditable={editingIndicators.has("2.5")}
            onEdit={() => handleEditIndicator("2.5")}
            onSave={() => handleSaveIndicator("2.5")}
            onCancel={() => handleCancelEdit("2.5")}
            isSaving={savingIndicators.has("2.5")}
          >
            <div className="flex flex-col gap-4">
              {(Array.isArray(formData.section2_5?.assetMonetizationArray)
                ? formData.section2_5.assetMonetizationArray
                : []
              ).map((entry) => (
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
                        disabled={isIndicatorSubmitted("2.5")}
                        className={cn(
                          getInputValidationClass(
                            `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                              (e) => e.id === entry.id
                            )}.projectName`
                          ),
                          isIndicatorSubmitted("2.5") &&
                            "bg-gray-50 cursor-not-allowed"
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
                        disabled={isIndicatorSubmitted("2.5")}
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
                        disabled={isIndicatorSubmitted("2.5")}
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
                        disabled={isIndicatorSubmitted("2.5")}
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
                          disabled={isIndicatorSubmitted("2.5")}
                          className={cn(
                            getInputValidationClass(
                              `section2_5.assetMonetizationArray.${formData.section2_5.assetMonetizationArray.findIndex(
                                (e) => e.id === entry.id
                              )}.estimatedMonetization`
                            ),
                            isIndicatorSubmitted("2.5") &&
                              "bg-gray-50 cursor-not-allowed"
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
                        disabled={isIndicatorSubmitted("2.5")}
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
                  disabled={isIndicatorSubmitted("2.5")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 " />
                  Add More Asset
                </Button>
                {renderFieldError("section2_5.assetMonetizationArray")}
              </div>
              {/* Table view for Asset Monetization entries */}
              {Array.isArray(formData.section2_5?.assetMonetizationArray) &&
                formData.section2_5.assetMonetizationArray.length > 0 && (
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
                        {(Array.isArray(
                          formData.section2_5?.assetMonetizationArray
                        )
                          ? formData.section2_5.assetMonetizationArray
                          : []
                        ).map((entry) => (
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
                                disabled={isIndicatorSubmitted("2.5")}
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
                    handleSubmitIndicator("2.5", "Asset Monetization Pipeline")
                  }
                  disabled={isSubmitting || isIndicatorSubmitted("2.5")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {getSubmitButtonText("2.5", isSubmitting)}
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
