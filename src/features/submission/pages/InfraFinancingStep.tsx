import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard } from "../components/SectionCard";
import { FormActions } from "../components/FormActions";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { MandatoryFieldLabel } from "../components/MandatoryFieldLabel";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { useFieldValidation } from "../hooks/useFieldValidation";
import { SUBMISSION_STEPS } from "../constants/steps";
import type { InfraFinancingData } from "../types";
import { getCurrentFinancialYear } from "@/utils/dateUtils";
import { useAuth } from "@/features/auth/AuthProvider";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { apiService } from "@/services/api.service";
import { ulbService, ULB } from "@/services/ulb.service";
import { computeStepProgress } from "../utils/progress";
import { validateInfraFinancing } from "../validation/infraFinancingValidation";
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
import { dropdownValues } from "@/utils/getDropDowns";

export const InfraFinancingStep = () => {
  // ULB dropdown state
  const [ulbOptions, setUlbOptions] = useState<ULB[]>([]);
  // Per-row search state for ULB dropdowns
  const [ulbSearchMap, setUlbSearchMap] = useState<{ [id: string]: string }>(
    {}
  );
  // Per-row visible count for infinite scroll
  const [ulbVisibleCountMap, setUlbVisibleCountMap] = useState<{
    [id: string]: number;
  }>({});

  // Make sure user is initialized before use
  const { user } = useAuth();

  // Fetch ULBs for the logged-in user's state (dynamic API call)
  useEffect(() => {
    let mounted = true;
    if (!user) {
      console.error(
        "User not found in context. ULB dropdown will not populate."
      );
      setUlbOptions([]);
      return;
    }
    if (!user.state || user.state.trim() === "") {
      toast({
        title: "User state missing",
        description:
          "Your user profile does not have a state assigned. ULB dropdown cannot be populated.",
        variant: "destructive",
      });
      setUlbOptions([]);
      console.error("User state missing. User:", user);
      return;
    }
    (async () => {
      try {
        // Call the API with the dynamic state name
        const response = await ulbService.getULBsByState(user.state);
        let ulbs = [];
        // Handle new API response structure: { status, data: { total, data: [...] } }
        if (response && response.data && Array.isArray(response.data.data)) {
          ulbs = response.data.data;
        } else if (Array.isArray(response)) {
          ulbs = response;
        } else if (response && Array.isArray(response.data)) {
          ulbs = response.data;
        } else if (Array.isArray(response.data)) {
          ulbs = response.data;
        }
        console.log("ULB API raw:", ulbs);
        if (!Array.isArray(ulbs) || ulbs.length === 0) {
          toast({
            title: "No ULBs found",
            description: `No ULBs are available for the state: ${user.state}. Please check the API response or contact admin.`,
            variant: "destructive",
          });
          if (mounted) setUlbOptions([]);
          return;
        }
        // Remove duplicates by ulb_name + city_name + ulb_type
        const unique = Array.from(
          new Map(
            ulbs.map((u) => [
              (u.ulb_name || u.ulbName || u.name || "") +
                (u.city_name || u.cityName || "") +
                (u.ulb_type || u.ulbType || ""),
              u,
            ])
          ).values()
        );
        console.log("ULB options set:", unique);
        if (mounted) setUlbOptions(unique);
      } catch (err) {
        console.error("Failed to fetch ULBs:", err);
        setUlbOptions([]);
        toast({
          title: "ULB Fetch Error",
          description: "Failed to fetch ULBs for the selected state.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);
  const [sectionStatus, setSectionStatus] = useState<any>({
    completedIndicators: [],
    completedCount: 0,
    totalAssigned: 0,
  });
  const { getStepData, updateFormData, clearFormData } = useFormPersistence();

  const {
    currentStep,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep,
    isLastStep,
  } = useStepNavigation(1);
  // Detect edit mode to decide hiding of empty indicators
  const isEditMode =
    typeof window !== "undefined" &&
    localStorage.getItem("is_edit_mode") === "true";

  // Indicator access
  const {
    loading: indicatorLoading,
    error: indicatorError,
    assignedIndicators,
    availableIndicators,
    hasIndicatorAccess,
    isNodalOfficer,
    isStateApprover,
    refresh,
  } = useIndicatorAccess();

  const currentFY = getCurrentFinancialYear();
  const { toast } = useToast();

  // ------------------------
  // Default / initial data
  // ------------------------
  const defaultData: InfraFinancingData = {
    section1_1: {
      year: "",
      capitalAllocation: "",
      gsdpForFY: "",
      stateCapexUtilisation: "",
      allocationToGSDP: "",
      capexToCapexActuals: "",
    },
    section1_2: {
      year: "",
      gsdpForFY: "",
      actualCapex: "",
      budgetaryCapex: "",
      stateCapexUtilisation: "",
      capexActualsToGSDP: "",
    },
    section1_3: {
      totalULBs: 0,
      ulbList: [
        {
          id: Math.random().toString(36).substr(2, 9),
          cityName: "",
          ulb: "",
          ratingDate: "",
          rating: "",
        },
      ],
    },
    section1_4: {
      totalULBs: 0,
      bondList: [
        {
          id: Math.random().toString(36).substr(2, 9),
          bondType: "",
          cityName: "",
          issuingAuthority: "",
          value: "",
          tenorOfBond: "",
        },
      ],
    },
    section1_5: { ffiArray: [], hasIntermediary: "", comment: "" },
  };

  // Merge loaded / persisted data with defaults
  // Defensive: always ensure array fields are initialized
  function safeInfraFinancingFormData(
    data: Partial<InfraFinancingData>
  ): InfraFinancingData {
    const result = {
      ...defaultData,
      ...data,
      section1_1: {
        ...defaultData.section1_1,
        ...(data.section1_1 || {}),
        // Preserve status field
        status: (data.section1_1 as any)?.status,
      },
      section1_2: {
        ...defaultData.section1_2,
        ...(data.section1_2 || {}),
        // Preserve status field
        status: (data.section1_2 as any)?.status,
      },
      section1_3: {
        ...(data.section1_3 || {}),
        totalULBs:
          data.section1_3?.totalULBs ?? defaultData.section1_3.totalULBs,
        ulbList:
          Array.isArray(data.section1_3?.ulbList) &&
          data.section1_3.ulbList.length > 0
            ? data.section1_3.ulbList
            : defaultData.section1_3.ulbList,
        // Preserve status field
        status: (data.section1_3 as any)?.status,
      },
      section1_4: {
        ...(data.section1_4 || {}),
        totalULBs:
          data.section1_4?.totalULBs ?? defaultData.section1_4.totalULBs,
        bondList:
          Array.isArray(data.section1_4?.bondList) &&
          data.section1_4.bondList.length > 0
            ? data.section1_4.bondList
            : defaultData.section1_4.bondList,
        // Preserve status field
        status: (data.section1_4 as any)?.status,
      },
      section1_5: {
        ...(data.section1_5 || {}),
        ffiArray: Array.isArray(data.section1_5?.ffiArray)
          ? data.section1_5.ffiArray
          : [],
        hasIntermediary: data.section1_5?.hasIntermediary || "",
        comment: data.section1_5?.comment || "",
        // Preserve status field
        status: (data.section1_5 as any)?.status,
      },
    };

    return result;
  }

  const loadedData =
    (getStepData("infraFinancing") as Partial<InfraFinancingData>) || {};
  const initialData: InfraFinancingData =
    safeInfraFinancingFormData(loadedData);

  // Ensure at least one row in ulbList and bondList for mandatory entries
  const ensureMandatoryArrays = (data: InfraFinancingData) => {
    let updatedData = { ...data };

    // Ensure ulbList has at least 1 entry
    if (
      !Array.isArray(updatedData.section1_3.ulbList) ||
      updatedData.section1_3.ulbList.length === 0
    ) {
      updatedData = {
        ...updatedData,
        section1_3: {
          ...updatedData.section1_3,
          ulbList: [
            {
              id: Math.random().toString(36).substr(2, 9),
              ulb: "",
              cityName: "",
              rating: "",
              ratingDate: "",
            },
          ],
        },
      };
    }

    // Ensure bondList has at least 1 entry
    if (
      !Array.isArray(updatedData.section1_4.bondList) ||
      updatedData.section1_4.bondList.length === 0
    ) {
      updatedData = {
        ...updatedData,
        section1_4: {
          ...updatedData.section1_4,
          bondList: [
            {
              id: Math.random().toString(36).substr(2, 9),
              bondType: "",
              cityName: "",
              issuingAuthority: "",
              value: "",
              tenorOfBond: "",
            },
          ],
        },
      };
    }

    return updatedData;
  };
  const [formData, setFormData] = useState<InfraFinancingData>(
    ensureMandatoryArrays(initialData)
  );
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [submittingIndicator, setSubmittingIndicator] = useState<string | null>(
    null
  );
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [, forceUpdate] = useState({});
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
  // Track which indicators are in edit mode (for sent back indicators)
  const [editingIndicators, setEditingIndicators] = useState<Set<string>>(
    new Set()
  );
  const [savingIndicators, setSavingIndicators] = useState<Set<string>>(
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

  // Calculate allowed indicators for validation
  const sectionIndicators = useMemo(
    () => ["1.1", "1.2", "1.3", "1.4", "1.5"],
    []
  );
  const allowedIndicators = useMemo(
    () =>
      (isNodalOfficer
        ? assignedIndicators
        : isStateApprover
        ? availableIndicators
        : null
      )?.filter((i) => sectionIndicators.includes(i)) || undefined,
    [
      isNodalOfficer,
      isStateApprover,
      assignedIndicators,
      availableIndicators,
      sectionIndicators,
    ]
  );

  const validation = useMemo(() => {
    // Determine which indicators to validate
    // For Nodal Officer: only validate assigned indicators
    // For State Approver: only validate available indicators (not assigned to NODAL_OFFICERs)
    // For others: validate all (no restrictions)
    let indicatorsToValidate: string[] | undefined;

    if (isNodalOfficer) {
      // NODAL_OFFICER: validate only assigned indicators
      // If no assigned indicators, validate nothing (empty array)
      indicatorsToValidate =
        allowedIndicators && allowedIndicators.length > 0
          ? allowedIndicators
          : []; // Empty array means validate nothing
    } else if (isStateApprover) {
      // STATE_APPROVER: validate only available indicators (indicators not assigned to any NODAL_OFFICER)
      // If availableIndicators is empty, it means all indicators are assigned to NODAL_OFFICERs,
      // so STATE_APPROVER shouldn't validate anything
      indicatorsToValidate =
        allowedIndicators && allowedIndicators.length > 0
          ? allowedIndicators
          : []; // Empty array means validate nothing (all indicators are assigned to NODAL_OFFICERs)
    } else {
      // Other roles: validate all (backward compatibility)
      indicatorsToValidate = undefined; // undefined means validate all
    }

    return validateInfraFinancing(formData, {
      allowedIndicators: indicatorsToValidate,
    });
  }, [formData, isNodalOfficer, isStateApprover, allowedIndicators]);

  // Clear errors for fields that are now valid (when user fixes invalid fields)
  useEffect(() => {
    if (
      validatingIndicator &&
      Object.keys(indicatorValidationErrors).length > 0
    ) {
      clearValidFieldErrors(validation.errors, setIndicatorValidationErrors);
    }
  }, [validation.errors, validatingIndicator, clearValidFieldErrors]);

  useEffect(() => {
    // Validation state tracking
  }, [
    validation,
    formData.section1_5.hasIntermediary,
    formData.section1_5.ffiArray.length,
  ]);

  // Ensure ffiArray has at least 1 entry when hasIntermediary is "yes"
  useEffect(() => {
    if (
      formData.section1_5.hasIntermediary === "yes" &&
      formData.section1_5.ffiArray.length === 0
    ) {
      setFormData((prev) => ({
        ...prev,
        section1_5: {
          ...prev.section1_5,
          ffiArray: [
            {
              id: Date.now().toString(),
              organisationName: "",
              organisationType: "",
              yearEstablished: "",
              totalFunding: "",
              website: "",
            },
          ],
        },
      }));
    }
  }, [
    formData.section1_5.hasIntermediary,
    formData.section1_5.ffiArray.length,
  ]);

  // Validate totalULBs vs ulbList.length
  useEffect(() => {
    const totalULBs = formData.section1_3.totalULBs || 0;
    const listLength = formData.section1_3.ulbList.length;

    if (totalULBs > 0 && listLength > totalULBs) {
      // Set validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section1_3.ulbList": `Number of rows (${listLength}) cannot exceed Total Number of ULBs (${totalULBs}). Please remove excess rows or increase the Total Number of ULBs.`,
      }));
    } else {
      // Clear error if valid
      setIndicatorValidationErrors((prev) => {
        const newErrors = { ...prev };
        // Only clear if it's about the count, not about duplicates
        if (
          newErrors["section1_3.ulbList"]?.includes("cannot exceed") ||
          newErrors["section1_3.ulbList"]?.includes("Cannot add more rows")
        ) {
          delete newErrors["section1_3.ulbList"];
        }
        return newErrors;
      });
    }
  }, [formData.section1_3.totalULBs, formData.section1_3.ulbList.length]);

  // Validate totalULBs vs bondList.length for section 1.4
  useEffect(() => {
    const totalULBs = formData.section1_4.totalULBs || 0;
    const listLength = formData.section1_4.bondList.length;

    if (totalULBs > 0 && listLength > totalULBs) {
      // Set validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section1_4.bondList": `Number of rows (${listLength}) cannot exceed Total Number of ULBs (${totalULBs}). Please remove excess rows or increase the Total Number of ULBs.`,
      }));
    } else {
      // Clear error if valid
      setIndicatorValidationErrors((prev) => {
        const newErrors = { ...prev };
        // Only clear if it's about the count, not about other validation errors
        if (
          newErrors["section1_4.bondList"]?.includes("cannot exceed") ||
          newErrors["section1_4.bondList"]?.includes("Cannot add more rows")
        ) {
          delete newErrors["section1_4.bondList"];
        }
        return newErrors;
      });
    }
  }, [formData.section1_4.totalULBs, formData.section1_4.bondList.length]);

  // Validate for duplicate ULBs in section 1.3
  useEffect(() => {
    const ulbList = formData.section1_3.ulbList || [];
    const ulbIds = ulbList.map((item) => item.ulb).filter(Boolean);
    const duplicates = new Map<string, number[]>();

    // Find duplicate ULB selections
    ulbIds.forEach((ulbId, index) => {
      const indices: number[] = [];
      ulbIds.forEach((id, idx) => {
        if (id === ulbId) {
          indices.push(idx);
        }
      });
      if (indices.length > 1) {
        duplicates.set(ulbId, indices);
      }
    });

    // Update validation errors for duplicates
    setIndicatorValidationErrors((prev) => {
      const newErrors = { ...prev };

      // Clear existing duplicate errors first
      Object.keys(newErrors).forEach((key) => {
        if (
          key.startsWith("section1_3.ulbList.") &&
          key.endsWith(".ulb") &&
          newErrors[key]?.includes("already been selected")
        ) {
          delete newErrors[key];
        }
      });

      // Set errors for all duplicates (except the first occurrence)
      duplicates.forEach((indices, ulbId) => {
        indices.forEach((idx, i) => {
          if (i > 0) {
            // Mark all except the first as duplicates
            newErrors[`section1_3.ulbList.${idx}.ulb`] =
              "This ULB has already been selected in another row. Please choose a different ULB.";
          }
        });
      });

      return newErrors;
    });
  }, [formData.section1_3.ulbList]);

  // On mount, fetch submission from DB and populate form (ignore localStorage)
  // Helper to merge normalized and legacy data for each section
  function getSectionFromNormalizedOrLegacy(
    normalized: any,
    legacy: any,
    code: string
  ) {
    // If normalized data for this indicator exists, use it; else fallback to legacy
    let result;
    if (
      normalized &&
      normalized.byIndicatorCode &&
      normalized.byIndicatorCode[code]
    ) {
      result = normalized.byIndicatorCode[code];
    } else {
      result = legacy || {};
    }
    return result;
  }

  useEffect(() => {
    // Only run if user is logged in and data not yet loaded
    if (!user || !user.id || isDataLoaded) return;

    (async () => {
      try {
        // Always fetch from backend DB, not localStorage
        const submissionsResp = await apiService.getSubmissions(1, 100);
        // Find user's latest submission (any editable status)
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
            } catch (e) {
              // ignore parse error
            }
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

          // Prefer normalized indicator data for all sections, fallback to legacy
          const normalized = parsedFormData?.normalizedFormData;
          const legacy = parsedFormData?.infraFinancing || {};

          const newFormData: InfraFinancingData = safeInfraFinancingFormData({
            section1_1: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_1,
                "1.1"
              ),
              year:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_1,
                  "1.1"
                )?.year || currentFY,
              capitalAllocation:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_1,
                  "1.1"
                )?.capitalAllocation?.toString() || "",
              gsdpForFY:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_1,
                  "1.1"
                )?.gsdpForFY?.toString() || "",
              stateCapexUtilisation:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_1,
                  "1.1"
                )?.stateCapexUtilisation?.toString() || "",
              allocationToGSDP:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_1,
                  "1.1"
                )?.allocationToGSDP?.toString() || "",
              capexToCapexActuals:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_1,
                  "1.1"
                )?.capexToCapexActuals?.toString() || "",
              percentage: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_1,
                "1.1"
              )?.percentage,
              marksObtained: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_1,
                "1.1"
              )?.marksObtained,
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_1,
                "1.1"
              )?.status,
            },
            section1_2: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_2,
                "1.2"
              ),
              year:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_2,
                  "1.2"
                )?.year || currentFY,
              gsdpForFY:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_2,
                  "1.2"
                )?.gsdpForFY?.toString() || "",
              actualCapex:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_2,
                  "1.2"
                )?.actualCapex?.toString() || "",
              budgetaryCapex:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_2,
                  "1.2"
                )?.budgetaryCapex?.toString() || "",
              stateCapexUtilisation:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_2,
                  "1.2"
                )?.stateCapexUtilisation?.toString() || "",
              capexActualsToGSDP:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_2,
                  "1.2"
                )?.capexActualsToGSDP?.toString() || "",
              percentage: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_2,
                "1.2"
              )?.percentage,
              marksObtained: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_2,
                "1.2"
              )?.marksObtained,
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_2,
                "1.2"
              )?.status,
            },
            section1_3: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_3,
                "1.3"
              ),
              totalULBs:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_3,
                  "1.3"
                )?.totalULBs ?? 0,
              ulbList: Array.isArray(
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_3,
                  "1.3"
                )?.ulbList
              )
                ? getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section1_3,
                    "1.3"
                  ).ulbList
                : [],
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_3,
                "1.3"
              )?.status,
            },
            section1_4: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_4,
                "1.4"
              ),
              totalULBs:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_4,
                  "1.4"
                )?.totalULBs ?? 0,
              bondList: Array.isArray(
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_4,
                  "1.4"
                )?.bondList
              )
                ? getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section1_4,
                    "1.4"
                  ).bondList
                : [],
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_4,
                "1.4"
              )?.status,
            },
            section1_5: {
              ...getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_5,
                "1.5"
              ),
              ffiArray: Array.isArray(
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_5,
                  "1.5"
                )?.ffiArray
              )
                ? getSectionFromNormalizedOrLegacy(
                    normalized,
                    legacy.section1_5,
                    "1.5"
                  ).ffiArray
                : [],
              hasIntermediary:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_5,
                  "1.5"
                )?.hasIntermediary || "",
              comment:
                getSectionFromNormalizedOrLegacy(
                  normalized,
                  legacy.section1_5,
                  "1.5"
                )?.comment || "",
              // Preserve status field from database
              status: getSectionFromNormalizedOrLegacy(
                normalized,
                legacy.section1_5,
                "1.5"
              )?.status,
            },
          });

          setFormData(newFormData);
          setIsDataLoaded(true);
          setTimeout(() => forceUpdate({}), 50);
        } else {
          // No submission found in database (submission was deleted), clear localStorage
          console.log(
            "🧹 No submission found in database - clearing localStorage"
          );
          clearFormData();

          setFormData(safeInfraFinancingFormData({}));
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

  const isNextDisabled = false; // Validation disabled - Next button always enabled

  // Use the hook's getFieldError function
  const getFieldError = (path: string) => {
    return getFieldErrorFromHook(
      path,
      validation.errors,
      indicatorValidationErrors,
      showValidationErrors
    );
  };

  // Use shared validation styling utility
  const getInputValidationClass = (path: string): string => {
    const hasError = !!getFieldError(path);
    return getInputValidationClassUtil(hasError, showValidationErrors);
  };

  const showErrorsIfNeeded = () => {
    if (!showValidationErrors) {
      setShowValidationErrors(true);
    }
  };

  const renderFieldError = (path: string) => {
    const message = getFieldError(path);
    return message ? (
      <p className="text-xs text-destructive mt-1">{message}</p>
    ) : null;
  };

  // ensure year defaults to current FY (but don't overwrite data loaded from DB)
  useEffect(() => {
    if (!isDataLoaded) return; // Wait for DB data to load first

    setFormData((prev) => ({
      ...prev,
      section1_1: {
        ...prev.section1_1,
        year: prev.section1_1.year ? prev.section1_1.year : currentFY,
      },
      section1_2: {
        ...prev.section1_2,
        year: prev.section1_2.year ? prev.section1_2.year : currentFY,
      },
    }));
  }, [currentFY, isDataLoaded]);

  // Sync persisted step data into local formData if present (run on mount)
  // DISABLED: Now fetching directly from DB instead of localStorage
  useEffect(() => {
    // Skip localStorage sync, we fetch from DB instead
    if (isDataLoaded) return;

    const currentStepData = getStepData(
      "infraFinancing"
    ) as Partial<InfraFinancingData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      console.log(
        "[LocalStorage] Found localStorage data but ignoring in favor of DB data"
      );
      // Don't sync from localStorage, wait for DB data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStepData, isDataLoaded]);

  // Initialize from local editing_submission (once)
  // DISABLED: Now fetching directly from DB instead
  useEffect(() => {
    // Skip editing_submission localStorage, we fetch from DB instead
    if (isDataLoaded) return;

    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      console.log(
        "[LocalStorage] Found editing_submission but ignoring in favor of DB data"
      );
      // Don't load from localStorage, wait for DB data
      localStorage.removeItem("editing_submission");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDataLoaded]);

  // ------------------------
  // Calculation helpers
  // ------------------------
  const calculateSection1_1 = useCallback(() => {
    const capitalAllocation = parseFloat(
      (formData.section1_1.capitalAllocation || "")
        .toString()
        .replace(/[₹,]/g, "")
    );
    const gsdpForFY = parseFloat(
      (formData.section1_1.gsdpForFY || "").toString().replace(/[₹,]/g, "")
    );

    if (isNaN(capitalAllocation) || isNaN(gsdpForFY) || gsdpForFY === 0) {
      return { percentage: 0, marksObtained: 0 };
    }

    const percentage = (capitalAllocation / gsdpForFY) * 100;
    const marksObtained = Math.min(percentage * 10, 50); // Max 50 marks

    return {
      percentage: Math.round(percentage * 100) / 100,
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section1_1.capitalAllocation, formData.section1_1.gsdpForFY]);

  const calculateSection1_2 = useCallback(() => {
    const actualCapex = parseFloat(
      (formData.section1_2.actualCapex || "").toString().replace(/[₹,]/g, "")
    );
    const stateCapexUtilisation = parseFloat(
      (formData.section1_2.stateCapexUtilisation || "")
        .toString()
        .replace(/[₹,]/g, "")
    );

    if (
      isNaN(actualCapex) ||
      isNaN(stateCapexUtilisation) ||
      stateCapexUtilisation === 0
    ) {
      return { percentage: 0, marksObtained: 0 };
    }

    const percentage = (actualCapex / stateCapexUtilisation) * 100;
    const marksObtained = Math.min(percentage / 2, 50); // Max 50 marks

    return {
      percentage: Math.round(percentage * 100) / 100,
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [
    formData.section1_2.actualCapex,
    formData.section1_2.stateCapexUtilisation,
  ]);

  // ------------------------
  // Arrays helpers (use interface paths)
  // ------------------------
  const addULB = () => {
    const totalULBs = formData.section1_3.totalULBs || 0;
    const currentListLength = formData.section1_3.ulbList.length;

    // Check if we can add more rows
    if (currentListLength >= totalULBs) {
      // Set validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section1_3.ulbList": `Cannot add more rows. Total Number of ULBs is ${totalULBs}, and you already have ${currentListLength} row(s). Please increase the Total Number of ULBs first.`,
      }));
      showErrorsIfNeeded();
      return;
    }

    // Clear any existing error
    setIndicatorValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors["section1_3.ulbList"];
      return newErrors;
    });

    const newULB = {
      id: Date.now().toString(),
      cityName: "",
      ulb: "",
      ratingDate: "",
      rating: "",
    };

    setFormData((prev) => ({
      ...prev,
      section1_3: {
        ...prev.section1_3,
        ulbList: [...prev.section1_3.ulbList, newULB],
      },
    }));
  };

  const removeULB = (idOrIndex: string | number, targetIndex?: number) => {
    setFormData((prev) => {
      const currentList = prev.section1_3.ulbList || [];
      // Always use index-based deletion when index is provided (most reliable)
      if (targetIndex !== undefined && targetIndex >= 0) {
        // Clear any duplicate errors when removing a ULB
        const removedULB = currentList[targetIndex];
        setIndicatorValidationErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          // Clear duplicate errors for all rows since a ULB was removed
          Object.keys(newErrors).forEach((key) => {
            if (key.startsWith("section1_3.ulbList.") && key.endsWith(".ulb")) {
              // Check if this error is a duplicate error
              if (newErrors[key]?.includes("already been selected")) {
                delete newErrors[key];
              }
            }
          });
          return newErrors;
        });

        return {
          ...prev,
          section1_3: {
            ...prev.section1_3,
            ulbList: currentList.filter((ulb, index) => index !== targetIndex),
          },
        };
      }
      // Fallback to ID-based deletion if index not provided
      const targetId = String(idOrIndex);
      return {
        ...prev,
        section1_3: {
          ...prev.section1_3,
          ulbList: currentList.filter((ulb, index) => {
            // If ulb has an id, compare by id, but also match by index if it's a number
            if (ulb.id !== undefined && ulb.id !== null) {
              const ulbId = String(ulb.id);
              if (ulbId === targetId) {
                // If targetId is a number, also check index to ensure we delete the right one
                const parsedIndex = parseInt(targetId, 10);
                if (!isNaN(parsedIndex) && parsedIndex >= 0) {
                  return index !== parsedIndex;
                }
                // For ID-only match, delete only first match to prevent deleting duplicates
                return false;
              }
              return true;
            }
            // If no id, try to match by index
            const parsedIndex = parseInt(targetId, 10);
            if (!isNaN(parsedIndex) && parsedIndex >= 0) {
              return index !== parsedIndex;
            }
            return true;
          }),
        },
      };
    });
  };

  const addBond = () => {
    const totalULBs = formData.section1_4.totalULBs || 0;
    const currentListLength = formData.section1_4.bondList.length;

    // Check if we can add more rows
    if (currentListLength >= totalULBs) {
      // Set validation error
      setIndicatorValidationErrors((prev) => ({
        ...prev,
        "section1_4.bondList": `Cannot add more rows. Total Number of ULBs is ${totalULBs}, and you already have ${currentListLength} row(s). Please increase the Total Number of ULBs first.`,
      }));
      showErrorsIfNeeded();
      return;
    }

    // Clear any existing error
    setIndicatorValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors["section1_4.bondList"];
      return newErrors;
    });

    const newBond = {
      id: Date.now().toString(),
      bondType: "",
      cityName: "",
      issuingAuthority: "",
      value: "",
      tenorOfBond: "",
    };
    setFormData((prev) => ({
      ...prev,
      section1_4: {
        ...prev.section1_4,
        bondList: [...prev.section1_4.bondList, newBond],
      },
    }));
  };

  const removeBond = (idOrIndex: string | number, targetIndex?: number) => {
    setFormData((prev) => {
      const currentList = prev.section1_4.bondList || [];
      // Always use index-based deletion when index is provided (most reliable)
      if (targetIndex !== undefined && targetIndex >= 0) {
        return {
          ...prev,
          section1_4: {
            ...prev.section1_4,
            bondList: currentList.filter(
              (bond, index) => index !== targetIndex
            ),
          },
        };
      }
      // Fallback to ID-based deletion if index not provided
      const targetId = String(idOrIndex);
      return {
        ...prev,
        section1_4: {
          ...prev.section1_4,
          bondList: currentList.filter((bond, index) => {
            // If bond has an id, compare by id, but also match by index if it's a number
            if (bond.id !== undefined && bond.id !== null) {
              const bondId = String(bond.id);
              if (bondId === targetId) {
                // If targetId is a number, also check index to ensure we delete the right one
                const parsedIndex = parseInt(targetId, 10);
                if (!isNaN(parsedIndex) && parsedIndex >= 0) {
                  return index !== parsedIndex;
                }
                // For ID-only match, delete only first match to prevent deleting duplicates
                return false;
              }
              return true;
            }
            // If no id, try to match by index
            const parsedIndex = parseInt(targetId, 10);
            if (!isNaN(parsedIndex) && parsedIndex >= 0) {
              return index !== parsedIndex;
            }
            return true;
          }),
        },
      };
    });
  };

  // section1_5 -> use ffiArray per interface
  const addIntermediary = () => {
    const newIntermediary = {
      id: Date.now().toString(),
      organisationName: "",
      organisationType: "",
      yearEstablished: "",
      totalFunding: "",
      website: "",
    };
    setFormData((prev) => ({
      ...prev,
      section1_5: {
        ...prev.section1_5,
        ffiArray: [...prev.section1_5.ffiArray, newIntermediary],
        hasIntermediary: "yes",
      },
    }));
  };

  const removeIntermediary = (
    idOrIndex: string | number,
    targetIndex?: number
  ) => {
    setFormData((prev) => {
      const currentList = prev.section1_5.ffiArray || [];
      // Always use index-based deletion when index is provided (most reliable)
      if (targetIndex !== undefined && targetIndex >= 0) {
        return {
          ...prev,
          section1_5: {
            ...prev.section1_5,
            ffiArray: currentList.filter(
              (item, index) => index !== targetIndex
            ),
          },
        };
      }
      // Fallback to ID-based deletion if index not provided
      const targetId = String(idOrIndex);
      return {
        ...prev,
        section1_5: {
          ...prev.section1_5,
          ffiArray: currentList.filter((item, index) => {
            // If item has an id, compare by id, but also match by index if it's a number
            if (item.id !== undefined && item.id !== null) {
              const itemId = String(item.id);
              if (itemId === targetId) {
                // If targetId is a number, also check index to ensure we delete the right one
                const parsedIndex = parseInt(targetId, 10);
                if (!isNaN(parsedIndex) && parsedIndex >= 0) {
                  return index !== parsedIndex;
                }
                // For ID-only match, delete only first match to prevent deleting duplicates
                return false;
              }
              return true;
            }
            // If no id, try to match by index
            const parsedIndex = parseInt(targetId, 10);
            if (!isNaN(parsedIndex) && parsedIndex >= 0) {
              return index !== parsedIndex;
            }
            return true;
          }),
        },
      };
    });
  };

  // ------------------------
  // Derived calculations -> write back into formData
  // ------------------------
  useEffect(() => {
    const section1_1Calc = calculateSection1_1();
    const section1_2Calc = calculateSection1_2();

    // Calculate % Allocation to GSDP
    const capitalAllocation = parseFloat(
      (formData.section1_1.capitalAllocation || "")
        .toString()
        .replace(/[₹,]/g, "")
    );
    const gsdpForFY = parseFloat(
      (formData.section1_1.gsdpForFY || "").toString().replace(/[₹,]/g, "")
    );
    let allocationToGSDP = "";

    if (!isNaN(capitalAllocation) && !isNaN(gsdpForFY) && gsdpForFY > 0) {
      const percentage = (capitalAllocation / gsdpForFY) * 100;
      allocationToGSDP = percentage.toFixed(1) + "%";
    }

    // Calculate % Capex Actuals to GSDP
    const actualCapex = parseFloat(
      (formData.section1_2.actualCapex || "").toString().replace(/[₹,]/g, "")
    );
    const stateCapexUtilisation = parseFloat(
      (formData.section1_2.stateCapexUtilisation || "")
        .toString()
        .replace(/[₹,]/g, "")
    );
    let capexActualsToGSDP = "";

    if (
      !isNaN(actualCapex) &&
      !isNaN(stateCapexUtilisation) &&
      stateCapexUtilisation > 0
    ) {
      const percentage = (actualCapex / stateCapexUtilisation) * 100;
      capexActualsToGSDP = percentage.toFixed(1) + "%";
    }

    setFormData((prev) => {
      const section1_1Changed =
        prev.section1_1.percentage !== section1_1Calc.percentage ||
        prev.section1_1.marksObtained !== section1_1Calc.marksObtained ||
        prev.section1_1.allocationToGSDP !== allocationToGSDP;

      const section1_2Changed =
        prev.section1_2.percentage !== section1_2Calc.percentage ||
        prev.section1_2.marksObtained !== section1_2Calc.marksObtained ||
        prev.section1_2.capexActualsToGSDP !== capexActualsToGSDP;

      if (!section1_1Changed && !section1_2Changed) {
        return prev;
      }

      return {
        ...prev,
        section1_1: {
          ...prev.section1_1,
          percentage: section1_1Calc.percentage,
          marksObtained: section1_1Calc.marksObtained,
          allocationToGSDP: allocationToGSDP,
        },
        section1_2: {
          ...prev.section1_2,
          percentage: section1_2Calc.percentage,
          marksObtained: section1_2Calc.marksObtained,
          capexActualsToGSDP: capexActualsToGSDP,
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.section1_1.capitalAllocation,
    formData.section1_1.gsdpForFY,
    formData.section1_2.actualCapex,
    formData.section1_2.stateCapexUtilisation,
  ]);

  // Autosave to persistence hook
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("infraFinancing", formData);
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // ------------------------
  // Navigation / Save
  // ------------------------
  const validateFields = () => true;

  const handleNext = () => {
    // Validation disabled - allow navigation without checking required fields
    updateFormData("infraFinancing", formData);
    goToNext();
  };

  const handleSubmitToStateApprover = async () => {
    setShowValidationErrors(true);
    if (!validation.isValid) {
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
        "1.1",
        "1.2",
        "1.3",
        "1.4",
        "1.5",
      ];
      // Submit section to state approver
      await apiService.submitSectionToStateApprover(
        formData,
        "infraFinancing",
        sectionIndicators
      );
      toast({
        title: "Success",
        description:
          "Infrastructure Financing section submitted to State Approver successfully.",
        variant: "default",
      });
      // Update form data
      updateFormData("infraFinancing", formData);
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
    const indicatorValidation = validateInfraFinancing(formData, {
      allowedIndicators: [indicatorCode],
    });

    if (!indicatorValidation.isValid) {
      // Mark all fields with errors in this indicator as touched so errors show
      markIndicatorFieldsAsTouched(indicatorCode, indicatorValidation.errors);

      // Store indicator-specific errors
      setIndicatorValidationErrors(indicatorValidation.errors);
      // Don't show toast - errors will be displayed in the UI instead
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

      // Sanitize files and remove unwanted keys before submission
      const sanitizedFormData = deepRemoveUnwantedKeys(
        sanitizeFilesInFormData(formData)
      );

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

      // Submit only this indicator
      const result = await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraFinancing",
        [indicatorCode]
      );

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
        updateFormData("infraFinancing", {
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
          "📢 [InfraFinancingStep] Dispatching indicatorsUpdated event after indicator submission"
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
      // Use functional update to ensure we have the latest state
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
          console.log(
            `🔍 Button should be disabled:`,
            updatedStatus.completedIndicators?.includes(indicatorCode)
          );
          return updatedStatus;
        }
        console.log(
          `⚠️ Indicator ${indicatorCode} already in completedIndicators`
        );
        return prev || {};
      });

      // Refresh sectionStatus to update completedIndicators from server
      // Use a small delay to ensure optimistic update is applied first
      setTimeout(async () => {
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
            console.log(
              `🔄 Refreshed sectionStatus from server:`,
              fullSubmission.section_status
            );
            // Merge server response with optimistic update to ensure we don't lose the indicator
            setSectionStatus((prevStatus: any) => {
              const serverCompleted =
                fullSubmission.section_status?.completedIndicators || [];
              const currentOptimisticCompleted =
                prevStatus?.completedIndicators || [];
              const mergedCompleted = Array.from(
                new Set([...currentOptimisticCompleted, ...serverCompleted])
              );

              if (mergedCompleted.includes(indicatorCode)) {
                return {
                  ...(prevStatus || {}),
                  ...fullSubmission.section_status, // Merge server status
                  completedIndicators: mergedCompleted,
                  completedCount: mergedCompleted.length,
                };
              } else {
                console.log(
                  `⚠️ Server doesn't have ${indicatorCode} yet, keeping optimistic update`
                );
                return prevStatus || {};
              }
            });
          }
        } catch (err) {
          console.error("Failed to refresh section status:", err);
        } finally {
          setSubmittingIndicator(null); // Reset isSubmitting after server refresh attempt
        }
      }, 100);
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

  // Remove unwanted keys and sanitize files before submit
  function deepRemoveUnwantedKeys(obj: any): any {
    const keysToRemove = [
      "sectionStatus",
      "section_status",
      "completedList",
      "totalIndicators",
      "completedIndicators",
    ];
    if (Array.isArray(obj)) return obj.map(deepRemoveUnwantedKeys);
    if (obj && typeof obj === "object") {
      const newObj: any = {};
      for (const key in obj) {
        if (!keysToRemove.includes(key)) {
          if (
            key === "normalizedFormData" &&
            obj[key] &&
            typeof obj[key] === "object"
          ) {
            newObj[key] = deepRemoveUnwantedKeys(obj[key]);
            if (newObj[key].original) {
              newObj[key].original = deepRemoveUnwantedKeys(
                newObj[key].original
              );
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

  function sanitizeFilesInFormData(obj: any): any {
    if (Array.isArray(obj)) return obj.map(sanitizeFilesInFormData);
    if (obj && typeof obj === "object") {
      const newObj: any = {};
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

  const handleCancelSubmit = () => {
    setShowSubmitDialog(false);
    setPendingIndicator(null);
  };

  if (indicatorLoading) {
    return (
      <div className="w-full -mx-6 lg:-mx-8">
        <div className="px-6 lg:px-8">
          <Stepper
            steps={SUBMISSION_STEPS}
            currentStep={currentStep}
            onStepClick={goToStep}
          />
        </div>
        <div className="px-6 lg:px-8 text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading indicator access...
          </h3>
          <p className="text-gray-600">
            Fetching which indicators are available for you. Please wait a
            moment.
          </p>
        </div>
      </div>
    );
  }

  // Nodal access check (unchanged logic)
  if (isNodalOfficer) {
    const hasAccessToSection =
      hasIndicatorAccess("1.1") ||
      hasIndicatorAccess("1.2") ||
      hasIndicatorAccess("1.3") ||
      hasIndicatorAccess("1.4") ||
      hasIndicatorAccess("1.5");
    if (!hasAccessToSection) {
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
              title="Infrastructure Financing"
              description="Data related to infrastructure financing and budget allocation"
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

  const codesForVisibility = isNodalOfficer
    ? assignedIndicators
    : isStateApprover
    ? availableIndicators
    : null;

  const showIndicator = (indicatorCode: string) => {
    if (codesForVisibility === null) return true;
    return codesForVisibility.includes(indicatorCode);
  };

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
      const validationResult = validateInfraFinancing(formData, {
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
        if (indicatorCode === "1.1") {
          allIndicatorFields.push(
            `${sectionPrefix}.year`,
            `${sectionPrefix}.capitalAllocation`,
            `${sectionPrefix}.gsdpForFY`
          );
        } else if (indicatorCode === "1.2") {
          allIndicatorFields.push(
            `${sectionPrefix}.year`,
            `${sectionPrefix}.actualCapex`,
            `${sectionPrefix}.stateCapexUtilisation`
          );
        } else if (indicatorCode === "1.3") {
          allIndicatorFields.push(
            `${sectionPrefix}.totalULBs`,
            `${sectionPrefix}.ulbList`
          );
          if (
            formData.section1_3?.ulbList &&
            Array.isArray(formData.section1_3.ulbList)
          ) {
            formData.section1_3.ulbList.forEach((_: any, index: number) => {
              allIndicatorFields.push(
                `${sectionPrefix}.ulbList.${index}.cityName`,
                `${sectionPrefix}.ulbList.${index}.ulb`,
                `${sectionPrefix}.ulbList.${index}.ratingDate`,
                `${sectionPrefix}.ulbList.${index}.rating`
              );
            });
          }
        } else if (indicatorCode === "1.4") {
          allIndicatorFields.push(
            `${sectionPrefix}.totalULBs`,
            `${sectionPrefix}.bondList`
          );
          if (
            formData.section1_4?.bondList &&
            Array.isArray(formData.section1_4.bondList)
          ) {
            formData.section1_4.bondList.forEach((_: any, index: number) => {
              allIndicatorFields.push(
                `${sectionPrefix}.bondList.${index}.cityName`,
                `${sectionPrefix}.bondList.${index}.bondType`,
                `${sectionPrefix}.bondList.${index}.issuingAuthority`,
                `${sectionPrefix}.bondList.${index}.value`,
                `${sectionPrefix}.bondList.${index}.tenorOfBond`
              );
            });
          }
        } else if (indicatorCode === "1.5") {
          allIndicatorFields.push(
            `${sectionPrefix}.hasIntermediary`,
            `${sectionPrefix}.comment`,
            `${sectionPrefix}.ffiArray`
          );
          if (
            formData.section1_5?.ffiArray &&
            Array.isArray(formData.section1_5.ffiArray)
          ) {
            formData.section1_5.ffiArray.forEach((_: any, index: number) => {
              allIndicatorFields.push(
                `${sectionPrefix}.ffiArray.${index}.organisationName`,
                `${sectionPrefix}.ffiArray.${index}.organisationType`,
                `${sectionPrefix}.ffiArray.${index}.yearEstablished`,
                `${sectionPrefix}.ffiArray.${index}.totalFunding`,
                `${sectionPrefix}.ffiArray.${index}.website`
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
          `[InfraFinancingStep] Validation failed for indicator ${indicatorCode}:`,
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
      const indicatorValidation = validateInfraFinancing(formData, {
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

      // Prepare data with updated status - use the same approach as Submit to ensure status is preserved
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
      await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraFinancing",
        [indicatorCode]
      );

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
        updateFormData("infraFinancing", {
          ...prev,
          ...sanitizedFormDataWithStatus,
        });
        return updated;
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

  return (
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        <Stepper
          steps={SUBMISSION_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
          onStepClick={goToStep}
        />
      </div>

      <div className="px-6 lg:px-8">
        {(() => {
          const { completed, total, progress } = computeStepProgress(
            { infraFinancing: formData },
            "infraFinancing",
            {
              assignedIndicators,
              availableIndicators,
              isNodalOfficer,
              isStateApprover,
            }
          );
          return (
            <ProgressHeader
              title="Infrastructure Financing"
              description="Data related to infrastructure financing and budget allocation"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}

        <div>
          {/* Section 1.1 */}
          {showIndicator("1.1") && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.1 -</span> % Capex to GSDP{" "}
                  </span>
                </div>
              }
              className="mb-6"
              indicatorStatus={getIndicatorStatus("1.1")}
              indicatorCode="1.1"
              isEditable={editingIndicators.has("1.1")}
              onEdit={() => handleEditIndicator("1.1")}
              onSave={() => handleSaveIndicator("1.1")}
              onCancel={() => handleCancelEdit("1.1")}
              isSaving={savingIndicators.has("1.1")}
            >
              {renderSectionValidationMessage("1.1")}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    Year<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.section1_1.year}
                    readOnly
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <MandatoryFieldLabel
                    sectionKey="section1_1"
                    fieldName="capitalAllocation"
                  >
                    Capital Allocation for FY (INR)
                    {/* <Info className="h-4 w-4 text-gray-500 inline-block ml-2" /> */}
                  </MandatoryFieldLabel>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter capital allocation"
                    value={formData.section1_1.capitalAllocation}
                    onBlur={() =>
                      markFieldAsTouched("section1_1.capitalAllocation")
                    }
                    onChange={(e) => {
                      markFieldAsTouched("section1_1.capitalAllocation");
                      showErrorsIfNeeded();
                      clearIndicatorValidationMessage("1.1");
                      const value = e.target.value;

                      setFormData((prev) => ({
                        ...prev,
                        section1_1: {
                          ...prev.section1_1,
                          capitalAllocation: value,
                        },
                      }));

                      // Mark percentage field as touched when values change (validation file handles the logic)
                      if (value && formData.section1_1.gsdpForFY) {
                        markFieldAsTouched("section1_1.allocationToGSDP");
                      }
                    }}
                    disabled={isIndicatorSubmitted("1.1")}
                    className={cn(
                      getInputValidationClass("section1_1.capitalAllocation"),
                      isIndicatorSubmitted("1.1") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section1_1.capitalAllocation")}
                </div>
                <div>
                  <MandatoryFieldLabel
                    sectionKey="section1_1"
                    fieldName="gsdpForFY"
                  >
                    GSDP for FY (INR)
                    {/* <Info className="h-4 w-4 text-gray-500 ml-2" /> */}
                  </MandatoryFieldLabel>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter GSDP for FY"
                    value={formData.section1_1.gsdpForFY}
                    onBlur={() => markFieldAsTouched("section1_1.gsdpForFY")}
                    onChange={(e) => {
                      markFieldAsTouched("section1_1.gsdpForFY");
                      showErrorsIfNeeded();
                      clearIndicatorValidationMessage("1.1");
                      const value = e.target.value;

                      setFormData((prev) => ({
                        ...prev,
                        section1_1: {
                          ...prev.section1_1,
                          gsdpForFY: value,
                        },
                      }));

                      // Mark percentage field as touched when values change (validation file handles the logic)
                      if (value && formData.section1_1.capitalAllocation) {
                        markFieldAsTouched("section1_1.allocationToGSDP");
                      }
                    }}
                    disabled={isIndicatorSubmitted("1.1")}
                    className={cn(
                      getInputValidationClass("section1_1.gsdpForFY"),
                      isIndicatorSubmitted("1.1") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section1_1.gsdpForFY")}
                </div>
                <div>
                  <MandatoryFieldLabel
                    sectionKey="section1_1"
                    fieldName="allocationToGSDP"
                    data={formData.section1_1}
                  >
                    % Allocation to GSDP
                    {/* <Info className="h-4 w-4 text-gray-500 ml-2" /> */}
                  </MandatoryFieldLabel>
                  <Input
                    placeholder="Auto-calculated"
                    value={(() => {
                      const capitalAllocation = parseFloat(
                        (formData.section1_1.capitalAllocation || "")
                          .toString()
                          .replace(/[₹,]/g, "")
                      );
                      const gsdpForFY = parseFloat(
                        (formData.section1_1.gsdpForFY || "")
                          .toString()
                          .replace(/[₹,]/g, "")
                      );

                      if (
                        isNaN(capitalAllocation) ||
                        isNaN(gsdpForFY) ||
                        gsdpForFY === 0
                      ) {
                        return "";
                      }

                      const percentage = (capitalAllocation / gsdpForFY) * 100;
                      // Show actual percentage even if > 100% (error will be shown via validation)
                      return percentage.toFixed(1) + "%";
                    })()}
                    readOnly
                    className={cn(
                      "bg-gray-50 cursor-not-allowed",
                      getInputValidationClass("section1_1.allocationToGSDP")
                    )}
                  />
                  {renderFieldError("section1_1.allocationToGSDP")}
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() =>
                    handleSubmitIndicator("1.1", "% Capex to GSDP")
                  }
                  disabled={
                    submittingIndicator !== null || isIndicatorSubmitted("1.1")
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  {getSubmitButtonText("1.1", submittingIndicator)}
                </Button>
              </div>
            </SectionCard>
          )}

          {/* Section 1.2 */}
          {showIndicator("1.2") && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.2 -</span> % Capex
                    Utilization{" "}
                    <span className="font-normal text-xs text-muted-foreground">
                      (10 marks per 1%)
                    </span>
                  </span>
                </div>
              }
              indicatorStatus={getIndicatorStatus("1.2")}
              indicatorCode="1.2"
              isEditable={editingIndicators.has("1.2")}
              onEdit={() => handleEditIndicator("1.2")}
              onSave={() => handleSaveIndicator("1.2")}
              onCancel={() => handleCancelEdit("1.2")}
              isSaving={savingIndicators.has("1.2")}
            >
              {renderSectionValidationMessage("1.2")}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <MandatoryFieldLabel sectionKey="section1_2" fieldName="year">
                    Year
                  </MandatoryFieldLabel>
                  <Input
                    type="text"
                    value={formData.section1_2.year}
                    readOnly
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <MandatoryFieldLabel
                    sectionKey="section1_2"
                    fieldName="actualCapex"
                  >
                    A₁ - Actual Capex (INR)
                  </MandatoryFieldLabel>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter actual capex"
                    value={formData.section1_2.actualCapex}
                    onBlur={() => markFieldAsTouched("section1_2.actualCapex")}
                    onChange={(e) => {
                      markFieldAsTouched("section1_2.actualCapex");
                      showErrorsIfNeeded();
                      clearIndicatorValidationMessage("1.2");
                      const value = e.target.value;

                      setFormData((prev) => ({
                        ...prev,
                        section1_2: {
                          ...prev.section1_2,
                          actualCapex: value,
                        },
                      }));

                      // Mark percentage field as touched when values change (validation file handles the logic)
                      if (value && formData.section1_2.stateCapexUtilisation) {
                        markFieldAsTouched("section1_2.capexActualsToGSDP");
                      }
                    }}
                    disabled={isIndicatorSubmitted("1.2")}
                    className={cn(
                      getInputValidationClass("section1_2.actualCapex"),
                      isIndicatorSubmitted("1.2") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section1_2.actualCapex")}
                </div>
                <div className="space-y-2">
                  <MandatoryFieldLabel
                    sectionKey="section1_2"
                    fieldName="stateCapexUtilisation"
                  >
                    State Capex Utilisation (INR)
                  </MandatoryFieldLabel>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter state capex utilisation"
                    value={formData.section1_2.stateCapexUtilisation}
                    onBlur={() =>
                      markFieldAsTouched("section1_2.stateCapexUtilisation")
                    }
                    onChange={(e) => {
                      markFieldAsTouched("section1_2.stateCapexUtilisation");
                      showErrorsIfNeeded();
                      clearIndicatorValidationMessage("1.2");
                      const value = e.target.value;

                      setFormData((prev) => ({
                        ...prev,
                        section1_2: {
                          ...prev.section1_2,
                          stateCapexUtilisation: value,
                        },
                      }));

                      // Mark percentage field as touched when values change (validation file handles the logic)
                      if (value && formData.section1_2.actualCapex) {
                        markFieldAsTouched("section1_2.capexActualsToGSDP");
                      }
                    }}
                    disabled={isIndicatorSubmitted("1.2")}
                    className={cn(
                      getInputValidationClass(
                        "section1_2.stateCapexUtilisation"
                      ),
                      isIndicatorSubmitted("1.2") &&
                        "bg-gray-50 cursor-not-allowed"
                    )}
                  />
                  {renderFieldError("section1_2.stateCapexUtilisation")}
                </div>
                <div className="space-y-2">
                  <MandatoryFieldLabel
                    sectionKey="section1_2"
                    fieldName="capexActualsToGSDP"
                    data={formData.section1_2}
                  >
                    % Capex Actuals to GSDP
                  </MandatoryFieldLabel>
                  <Input
                    placeholder="Auto-calculated"
                    value={(() => {
                      const actualCapex = parseFloat(
                        (formData.section1_2.actualCapex || "")
                          .toString()
                          .replace(/[₹,]/g, "")
                      );
                      const stateCapexUtilisation = parseFloat(
                        (formData.section1_2.stateCapexUtilisation || "")
                          .toString()
                          .replace(/[₹,]/g, "")
                      );

                      if (
                        isNaN(actualCapex) ||
                        isNaN(stateCapexUtilisation) ||
                        stateCapexUtilisation === 0
                      ) {
                        return "";
                      }

                      const percentage =
                        (actualCapex / stateCapexUtilisation) * 100;
                      return percentage.toFixed(1) + "%";
                    })()}
                    readOnly
                    className={cn(
                      "bg-gray-50 cursor-not-allowed",
                      getInputValidationClass("section1_2.capexActualsToGSDP")
                    )}
                  />
                  {renderFieldError("section1_2.capexActualsToGSDP")}
                </div>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() =>
                    handleSubmitIndicator("1.2", "% Capex Utilization")
                  }
                  disabled={
                    submittingIndicator !== null || isIndicatorSubmitted("1.2")
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  {getSubmitButtonText("1.2", submittingIndicator)}
                </Button>
              </div>
            </SectionCard>
          )}

          {/* Section 1.3 */}
          {showIndicator("1.3") && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold">
                    <span className="text-primary">1.3 -</span> % of Credit
                    Rated ULBs{" "}
                  </span>
                </div>
              }
              className="mb-6"
              indicatorStatus={getIndicatorStatus("1.3")}
              indicatorCode="1.3"
              isEditable={editingIndicators.has("1.3")}
              onEdit={() => handleEditIndicator("1.3")}
              onSave={() => handleSaveIndicator("1.3")}
              onCancel={() => handleCancelEdit("1.3")}
              isSaving={savingIndicators.has("1.3")}
            >
              {renderSectionValidationMessage("1.3")}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <Label>
                      Total Number of ULBs{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter total number of ULBs"
                      min="0"
                      value={formData.section1_3.totalULBs || ""}
                      onChange={(e) => {
                        showErrorsIfNeeded();
                        const { value } = e.target;
                        const newTotalULBs = value
                          ? Math.max(parseInt(value, 10), 0)
                          : 0;

                        setFormData((prev) => {
                          const currentListLength =
                            prev.section1_3.ulbList.length;

                          let updatedList = [...prev.section1_3.ulbList];

                          // If new total is less than current rows, trim the list
                          if (newTotalULBs < currentListLength) {
                            updatedList = prev.section1_3.ulbList.slice(
                              0,
                              newTotalULBs
                            );
                          }
                          // If new total is greater than 0 and list is empty, add at least one entry
                          else if (
                            newTotalULBs > 0 &&
                            currentListLength === 0
                          ) {
                            updatedList = [
                              {
                                id: Date.now().toString(),
                                cityName: "",
                                ulb: "",
                                ratingDate: "",
                                rating: "",
                              },
                            ];
                          }

                          // Clear validation error if totalULBs is now valid
                          setIndicatorValidationErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            if (newTotalULBs >= updatedList.length) {
                              delete newErrors["section1_3.ulbList"];
                            }
                            return newErrors;
                          });

                          return {
                            ...prev,
                            section1_3: {
                              ...prev.section1_3,
                              totalULBs: newTotalULBs,
                              ulbList: updatedList,
                            },
                          };
                        });
                      }}
                      disabled={isIndicatorSubmitted("1.3")}
                      className={cn(
                        getInputValidationClass("section1_3.totalULBs"),
                        isIndicatorSubmitted("1.3") &&
                          "bg-gray-50 cursor-not-allowed"
                      )}
                      required
                    />
                    {renderFieldError("section1_3.totalULBs")}
                  </div>
                  <div className="w-1/3">
                    <Label>Credit rated ULBs</Label>
                    <Input
                      type="number"
                      value={formData.section1_3.ulbList.length || 0}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {formData.section1_3.ulbList.map((ulb, index) => (
                  <div
                    key={ulb.id || `ulb-${index}`}
                    className="grid grid-cols-12 gap-4"
                  >
                    <div className="col-span-4">
                      <Label>
                        ULB<span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Select
                          value={ulb.ulb}
                          onValueChange={(value) => {
                            showErrorsIfNeeded();
                            clearIndicatorValidationMessage("1.3");

                            // Check if this ULB is already selected in another row
                            const isDuplicate =
                              formData.section1_3.ulbList.some(
                                (item) =>
                                  item.id !== ulb.id &&
                                  item.ulb === value &&
                                  value !== ""
                              );

                            if (isDuplicate) {
                              // Set error for duplicate ULB
                              setIndicatorValidationErrors((prev) => ({
                                ...prev,
                                [`section1_3.ulbList.${index}.ulb`]:
                                  "This ULB has already been selected in another row. Please choose a different ULB.",
                              }));
                              return; // Don't update form data
                            }

                            // Clear any existing error for this field
                            setIndicatorValidationErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors[
                                `section1_3.ulbList.${index}.ulb`
                              ];
                              // Also clear duplicate errors from other rows since this ULB is now free
                              Object.keys(newErrors).forEach((key) => {
                                if (
                                  key.startsWith("section1_3.ulbList.") &&
                                  key.endsWith(".ulb") &&
                                  key !== `section1_3.ulbList.${index}.ulb` &&
                                  newErrors[key]?.includes(
                                    "already been selected"
                                  )
                                ) {
                                  // Check if the error was related to this ULB
                                  // We'll clear it and let the useEffect/validation handle it
                                  delete newErrors[key];
                                }
                              });
                              return newErrors;
                            });

                            // Find selected ULB object
                            const selectedULB = ulbOptions.find(
                              (u) => u.id === value
                            );
                            setFormData((prev) => ({
                              ...prev,
                              section1_3: {
                                ...prev.section1_3,
                                ulbList: prev.section1_3.ulbList.map((item) =>
                                  item.id === ulb.id
                                    ? {
                                        ...item,
                                        ulb: value,
                                        cityName: selectedULB?.city_name || "",
                                        ulbType: selectedULB?.ulb_type || "",
                                      }
                                    : item
                                ),
                              },
                            }));
                          }}
                          onOpenChange={(open) => {
                            if (open) {
                              setUlbSearchMap((prev) => ({
                                ...prev,
                                [ulb.id]: "",
                              }));
                              setUlbVisibleCountMap((prev) => ({
                                ...prev,
                                [ulb.id]: 10,
                              }));
                            }
                          }}
                          disabled={isIndicatorSubmitted("1.3")}
                        >
                          <SelectTrigger
                            className={cn(
                              getInputValidationClass(
                                `section1_3.ulbList.${index}.ulb`
                              ),
                              "cursor-pointer"
                            )}
                            tabIndex={0}
                          >
                            <SelectValue placeholder="Select ULB" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1 transition-all duration-200 ease-in-out">
                              <Input
                                placeholder="Search by ULB name, city, or type..."
                                value={ulbSearchMap[ulb.id] || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setUlbSearchMap((prev) => ({
                                    ...prev,
                                    [ulb.id]: value,
                                  }));
                                  setUlbVisibleCountMap((prev) => ({
                                    ...prev,
                                    [ulb.id]: 10,
                                  }));
                                }}
                                className="mb-2 focus:shadow-lg focus:border-blue-400 transition-all duration-200 ease-in-out"
                                disabled={isIndicatorSubmitted("1.3")}
                                autoFocus
                                onClick={(e) => {
                                  e.currentTarget.focus();
                                }}
                              />
                            </div>
                            {(ulbSearchMap[ulb.id] || "").trim() ? (
                              <div>
                                {(() => {
                                  // Get ULBs already selected in other rows (excluding current row)
                                  const selectedULBIds =
                                    formData.section1_3.ulbList
                                      .filter(
                                        (item) => item.id !== ulb.id && item.ulb
                                      )
                                      .map((item) => item.ulb);

                                  const filtered = ulbOptions.filter((u) => {
                                    // Filter by search term
                                    const matchesSearch =
                                      `${u.ulb_name} ${u.city_name} ${u.ulb_type}`
                                        .toLowerCase()
                                        .includes(
                                          (
                                            ulbSearchMap[ulb.id] || ""
                                          ).toLowerCase()
                                        );
                                    // Exclude already selected ULBs (unless it's the currently selected one)
                                    const notDuplicate =
                                      !selectedULBIds.includes(u.id) ||
                                      u.id === ulb.ulb;
                                    return matchesSearch && notDuplicate;
                                  });
                                  if (filtered.length === 0) {
                                    return (
                                      <div className="px-3 py-2 text-gray-500 text-sm">
                                        No results found
                                      </div>
                                    );
                                  }
                                  return filtered.map((u) => (
                                    <SelectItem
                                      key={u.id}
                                      value={u.id}
                                      className="cursor-pointer"
                                    >
                                      {u.ulb_name} - {u.city_name} ({u.ulb_type}
                                      )
                                    </SelectItem>
                                  ));
                                })()}
                              </div>
                            ) : (
                              <div
                                style={{ maxHeight: 240, overflowY: "auto" }}
                                onScroll={(e) => {
                                  const el = e.currentTarget;
                                  if (
                                    el.scrollTop + el.clientHeight >=
                                      el.scrollHeight - 10 &&
                                    (ulbVisibleCountMap[ulb.id] || 10) <
                                      ulbOptions.length
                                  ) {
                                    setUlbVisibleCountMap((prev) => ({
                                      ...prev,
                                      [ulb.id]: Math.min(
                                        (prev[ulb.id] || 10) + 10,
                                        ulbOptions.length
                                      ),
                                    }));
                                  }
                                }}
                              >
                                {(() => {
                                  // Get ULBs already selected in other rows (excluding current row)
                                  const selectedULBIds =
                                    formData.section1_3.ulbList
                                      .filter(
                                        (item) => item.id !== ulb.id && item.ulb
                                      )
                                      .map((item) => item.ulb);

                                  // Filter out already selected ULBs (unless it's the currently selected one)
                                  const availableULBs = ulbOptions.filter(
                                    (u) =>
                                      !selectedULBIds.includes(u.id) ||
                                      u.id === ulb.ulb
                                  );

                                  return availableULBs
                                    .slice(0, ulbVisibleCountMap[ulb.id] || 10)
                                    .map((u) => (
                                      <SelectItem
                                        key={u.id}
                                        value={u.id}
                                        className="cursor-pointer"
                                      >
                                        {u.ulb_name} - {u.city_name} (
                                        {u.ulb_type})
                                      </SelectItem>
                                    ));
                                })()}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {renderFieldError(`section1_3.ulbList.${index}.ulb`)}
                    </div>
                    <div className="col-span-2">
                      <Label>
                        City name<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="City Name"
                        value={ulb.cityName}
                        readOnly={!!ulb.ulb}
                        onChange={(e) => {
                          if (!ulb.ulb) {
                            showErrorsIfNeeded();
                            clearIndicatorValidationMessage("1.3");
                            const value = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              section1_3: {
                                ...prev.section1_3,
                                ulbList: prev.section1_3.ulbList.map((item) =>
                                  item.id === ulb.id
                                    ? { ...item, cityName: value }
                                    : item
                                ),
                              },
                            }));
                          }
                        }}
                        disabled={isIndicatorSubmitted("1.3")}
                        className={cn(
                          getInputValidationClass(
                            `section1_3.ulbList.${index}.cityName`
                          ),
                          (isIndicatorSubmitted("1.3") || ulb.ulb) &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(`section1_3.ulbList.${index}.cityName`)}
                    </div>
                    <div className="col-span-3">
                      <Label>
                        Rating date<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        value={
                          ulb.ratingDate
                            ? (() => {
                                // Convert ISO string to YYYY-MM-DD format for date input
                                const d = new Date(ulb.ratingDate);
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
                          if (isIndicatorSubmitted("1.3")) return;
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_3: {
                              ...prev.section1_3,
                              ulbList: prev.section1_3.ulbList.map((item) =>
                                item.id === ulb.id
                                  ? {
                                      ...item,
                                      ratingDate: e.target.value
                                        ? new Date(e.target.value).toISOString()
                                        : "",
                                    }
                                  : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.3")}
                        className={cn(
                          getInputValidationClass(
                            `section1_3.ulbList.${index}.ratingDate`
                          ),
                          isIndicatorSubmitted("1.3") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(
                        `section1_3.ulbList.${index}.ratingDate`
                      )}
                    </div>
                    <div className="col-span-2">
                      <Label>
                        Select Rating<span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={ulb.rating}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_3: {
                              ...prev.section1_3,
                              ulbList: prev.section1_3.ulbList.map((item) =>
                                item.id === ulb.id
                                  ? { ...item, rating: value }
                                  : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.3")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section1_3.ulbList.${index}.rating`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AAA">AAA</SelectItem>
                          <SelectItem value="AA+">AA+</SelectItem>
                          <SelectItem value="AA">AA</SelectItem>
                          <SelectItem value="AA-">AA-</SelectItem>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="BBB+">BBB+</SelectItem>
                          <SelectItem value="BBB">BBB</SelectItem>
                          <SelectItem value="BBB-">BBB-</SelectItem>
                          <SelectItem value="BB+">BB+</SelectItem>
                          <SelectItem value="BB">BB</SelectItem>
                          <SelectItem value="BB-">BB-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="CCC">CCC</SelectItem>
                          <SelectItem value="CC">CC</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                      {renderFieldError(`section1_3.ulbList.${index}.rating`)}
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeULB(ulb.id, index)}
                        disabled={isIndicatorSubmitted("1.3")}
                        className="text-red-500 hover:text-red-700 border-none bg-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                ))}

                {renderFieldError("section1_3.ulbList")}

                {/* Show Add More button only if totalULBs > 0 and not at limit */}
                {(formData.section1_3.totalULBs || 0) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addULB}
                    disabled={
                      isIndicatorSubmitted("1.3") ||
                      formData.section1_3.ulbList.length >=
                        (formData.section1_3.totalULBs || 0)
                    }
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Add More ULB
                  </Button>
                )}
                {renderFieldError("section1_3.ulbList") && (
                  <p className="text-sm text-red-500 mt-1">
                    {renderFieldError("section1_3.ulbList")}
                  </p>
                )}
                {formData.section1_3.ulbList.length > 0 && (
                  <div className="overflow-x-auto rounded-xl mt-4">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            City Name
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            ULB
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Rating Date
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Rating
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.section1_3.ulbList.map((ulb, index) => (
                          <tr
                            key={ulb.id || `ulb-${index}`}
                            className="bg-white"
                          >
                            <td className="py-3 px-4 text-sm font-normal">
                              {ulb.cityName}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {(() => {
                                const found = ulbOptions?.find(
                                  (u) => u.id === ulb.ulb
                                );
                                return found ? found.ulb_name : ulb.ulb;
                              })()}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {ulb.ratingDate
                                ? format(new Date(ulb.ratingDate), "dd-MM-yyyy")
                                : "-"}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {ulb.rating}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removeULB(ulb.id, index)}
                                disabled={isIndicatorSubmitted("1.3")}
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
                      handleSubmitIndicator("1.3", "% of Credit Rated ULBs")
                    }
                    disabled={
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("1.3")
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {getSubmitButtonText("1.3", submittingIndicator)}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Section 1.4 */}
          {showIndicator("1.4") && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.4 -</span> % of ULBs
                    issuing Bonds{" "}
                  </span>
                </div>
              }
              className="mb-6"
              indicatorStatus={getIndicatorStatus("1.4")}
              indicatorCode="1.4"
              isEditable={editingIndicators.has("1.4")}
              onEdit={() => handleEditIndicator("1.4")}
              onSave={() => handleSaveIndicator("1.4")}
              onCancel={() => handleCancelEdit("1.4")}
              isSaving={savingIndicators.has("1.4")}
            >
              {renderSectionValidationMessage("1.4")}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <Label>
                      Total Number of ULBs{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter total number of ULBs"
                      min="0"
                      value={formData.section1_4.totalULBs || ""}
                      onChange={(e) => {
                        showErrorsIfNeeded();
                        clearIndicatorValidationMessage("1.4");
                        const { value } = e.target;
                        const newTotalULBs = value
                          ? Math.max(parseInt(value, 10), 0)
                          : 0;

                        setFormData((prev) => {
                          const currentListLength =
                            prev.section1_4.bondList.length;

                          let updatedList = [...prev.section1_4.bondList];

                          // If new total is less than current rows, trim the list
                          if (newTotalULBs < currentListLength) {
                            updatedList = prev.section1_4.bondList.slice(
                              0,
                              newTotalULBs
                            );
                          }
                          // If new total is greater than 0 and list is empty, add at least one entry
                          else if (
                            newTotalULBs > 0 &&
                            currentListLength === 0
                          ) {
                            updatedList = [
                              {
                                id: Date.now().toString(),
                                bondType: "",
                                cityName: "",
                                issuingAuthority: "",
                                value: "",
                                tenorOfBond: "",
                              },
                            ];
                          }

                          // Clear validation error if totalULBs is now valid
                          setIndicatorValidationErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            if (newTotalULBs >= updatedList.length) {
                              delete newErrors["section1_4.bondList"];
                            }
                            return newErrors;
                          });

                          return {
                            ...prev,
                            section1_4: {
                              ...prev.section1_4,
                              totalULBs: newTotalULBs,
                              bondList: updatedList,
                            },
                          };
                        });
                      }}
                      disabled={isIndicatorSubmitted("1.4")}
                      className={cn(
                        getInputValidationClass("section1_4.totalULBs"),
                        isIndicatorSubmitted("1.4") &&
                          "bg-gray-50 cursor-not-allowed"
                      )}
                      required
                    />
                    {renderFieldError("section1_4.totalULBs")}
                  </div>
                  <div className="w-1/3">
                    <Label>ULB issuing bond</Label>
                    <Input
                      type="number"
                      value={formData.section1_4.bondList.length || 0}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                {formData.section1_4.bondList.map((bond, index) => (
                  <div
                    key={bond.id}
                    className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center"
                  >
                    <div>
                      <Label>
                        Select Bond Type
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={bond.bondType}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_4: {
                              ...prev.section1_4,
                              bondList: prev.section1_4.bondList.map((item) =>
                                item.id === bond.id
                                  ? { ...item, bondType: value }
                                  : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.4")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section1_4.bondList.${index}.bondType`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select bond type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Municipal">Municipal</SelectItem>
                          <SelectItem value="Green">Green</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {renderFieldError(
                        `section1_4.bondList.${index}.bondType`
                      )}
                    </div>

                    <div>
                      <Label>
                        City Name<span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={bond.cityName}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_4: {
                              ...prev.section1_4,
                              bondList: prev.section1_4.bondList.map((item) =>
                                item.id === bond.id
                                  ? { ...item, cityName: value }
                                  : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.4")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section1_4.bondList.${index}.cityName`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mumbai">Mumbai</SelectItem>
                          <SelectItem value="Pune">Pune</SelectItem>
                          <SelectItem value="Nagpur">Nagpur</SelectItem>
                          <SelectItem value="Nashik">Nashik</SelectItem>
                        </SelectContent>
                      </Select>
                      {renderFieldError(
                        `section1_4.bondList.${index}.cityName`
                      )}
                    </div>

                    <div>
                      <Label>
                        Issuing Authority
                        <span className="text-red-500">*</span>
                      </Label>
                      {/* <Input
                        placeholder="Enter issuing authority"
                        value={bond.issuingAuthority}
                        maxLength={100}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            section1_4: {
                              ...prev.section1_4,
                              bondList: prev.section1_4.bondList.map((item) =>
                                item.id === bond.id
                                  ? { ...item, issuingAuthority: value }
                                  : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.4")}
                        className={cn(
                          getInputValidationClass(
                            `section1_4.bondList.${index}.issuingAuthority`
                          ),
                          isIndicatorSubmitted("1.4") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      /> */}
                      <Select
                        value={bond.issuingAuthority}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_4: {
                              ...prev.section1_4,
                              bondList: prev.section1_4.bondList.map((item) =>
                                item.id === bond.id
                                  ? { ...item, issuingAuthority: value }
                                  : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.4")}
                      >
                        <SelectTrigger
                          className={cn(
                            getInputValidationClass(
                              `section1_4.bondList.${index}.issuingAuthority`
                            ),
                            isIndicatorSubmitted("1.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        >
                          <SelectValue placeholder="Select issuing authority" />
                        </SelectTrigger>
                        <SelectContent>
                          {dropdownValues.issuingAuthorityList.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {renderFieldError(
                        `section1_4.bondList.${index}.issuingAuthority`
                      )}
                    </div>

                    <div>
                      <Label>
                        Value (INR - values is in CRORES)
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="Enter value"
                        value={bond.value}
                        onChange={(e) => {
                          showErrorsIfNeeded();
                          clearIndicatorValidationMessage("1.4");
                          const value = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            section1_4: {
                              ...prev.section1_4,
                              bondList: prev.section1_4.bondList.map((item) =>
                                item.id === bond.id ? { ...item, value } : item
                              ),
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.4")}
                        className={cn(
                          getInputValidationClass(
                            `section1_4.bondList.${index}.value`
                          ),
                          isIndicatorSubmitted("1.4") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(`section1_4.bondList.${index}.value`)}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label>
                          Tenor of Bond (in years)
                          <span className="text-red-500">*</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="inline w-3 h-3 ml-1" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Tenor – Maturity Period of Bond
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          placeholder="Enter tenor in years"
                          value={bond.tenorOfBond}
                          onChange={(e) => {
                            showErrorsIfNeeded();
                            clearIndicatorValidationMessage("1.4");
                            const value = e.target.value;
                            // Only allow numbers and decimal point
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              setFormData((prev) => ({
                                ...prev,
                                section1_4: {
                                  ...prev.section1_4,
                                  bondList: prev.section1_4.bondList.map(
                                    (item) =>
                                      item.id === bond.id
                                        ? { ...item, tenorOfBond: value }
                                        : item
                                  ),
                                },
                              }));
                            }
                          }}
                          disabled={isIndicatorSubmitted("1.4")}
                          className={cn(
                            getInputValidationClass(
                              `section1_4.bondList.${index}.tenorOfBond`
                            ),
                            isIndicatorSubmitted("1.4") &&
                              "bg-gray-50 cursor-not-allowed"
                          )}
                        />
                        {renderFieldError(
                          `section1_4.bondList.${index}.tenorOfBond`
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="self-start mt-6"
                        onClick={() => removeBond(bond.id, index)}
                        disabled={isIndicatorSubmitted("1.4")}
                        aria-label="Remove"
                      >
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Show Add More button only if totalULBs > 0 and not at limit */}
                {(formData.section1_4.totalULBs || 0) > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBond}
                    disabled={
                      isIndicatorSubmitted("1.4") ||
                      formData.section1_4.bondList.length >=
                        (formData.section1_4.totalULBs || 0)
                    }
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Add More Bond
                  </Button>
                )}
                {renderFieldError("section1_4.bondList") && (
                  <p className="text-sm text-red-500 mt-1">
                    {renderFieldError("section1_4.bondList")}
                  </p>
                )}
                {formData.section1_4.bondList.length > 0 && (
                  <div className="overflow-x-auto rounded-xl mt-4">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-[#DDE3F9]">
                          <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                            Bond Type
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            City
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Issuing Authority
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Value (INR Cr)
                          </th>
                          <th className="py-3 px-4 text-left text-sm font-normal">
                            Tenor of Bond (in years)
                          </th>
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.section1_4.bondList.map((bond, index) => (
                          <tr
                            key={bond.id || `bond-${index}`}
                            className="bg-white"
                          >
                            <td className="py-3 px-4 text-sm font-normal">
                              {bond.bondType}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {bond.cityName}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {bond.issuingAuthority}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {bond.value}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {bond.tenorOfBond}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removeBond(bond.id, index)}
                                disabled={isIndicatorSubmitted("1.4")}
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
                      handleSubmitIndicator("1.4", "% of ULBs issuing Bonds")
                    }
                    disabled={
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("1.4")
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {getSubmitButtonText("1.4", submittingIndicator)}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Section 1.5 */}
          {showIndicator("1.5") && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.5 -</span> Functional
                    Financial Intermediary{" "}
                  </span>
                </div>
              }
              className="mb-6"
              indicatorStatus={getIndicatorStatus("1.5")}
              indicatorCode="1.5"
              isEditable={editingIndicators.has("1.5")}
              onEdit={() => handleEditIndicator("1.5")}
              onSave={() => handleSaveIndicator("1.5")}
              onCancel={() => handleCancelEdit("1.5")}
              isSaving={savingIndicators.has("1.5")}
            >
              {renderSectionValidationMessage("1.5")}
              <div className="space-y-6">
                <div>
                  <Label>
                    Functional Financial Intermediary Available?{" "}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="inline w-3 h-3 ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Select “Yes” if there is a functional financial
                        intermediary
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2">
                      <Input
                        type="radio"
                        name="functional-financial-intermediary"
                        value="yes"
                        checked={formData.section1_5.hasIntermediary === "yes"}
                        onChange={() => {
                          if (isIndicatorSubmitted("1.5")) return;
                          showErrorsIfNeeded();
                          clearIndicatorValidationMessage("1.5");
                          setFormData((prev) => ({
                            ...prev,
                            section1_5: {
                              ...prev.section1_5,
                              hasIntermediary: "yes",
                              comment: "",
                              // Initialize with 1 entry if empty
                              ffiArray:
                                prev.section1_5.ffiArray.length === 0
                                  ? [
                                      {
                                        id: Date.now().toString(),
                                        organisationName: "",
                                        organisationType: "",
                                        yearEstablished: "",
                                        totalFunding: "",
                                        website: "",
                                      },
                                    ]
                                  : prev.section1_5.ffiArray,
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.5")}
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <Input
                        type="radio"
                        name="functional-financial-intermediary"
                        value="no"
                        checked={formData.section1_5.hasIntermediary === "no"}
                        onChange={() => {
                          if (isIndicatorSubmitted("1.5")) return;
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_5: {
                              ...prev.section1_5,
                              hasIntermediary: "no",
                              ffiArray: [],
                            },
                          }));
                        }}
                        disabled={isIndicatorSubmitted("1.5")}
                      />
                      No
                    </label>
                  </div>
                  {renderFieldError("section1_5.hasIntermediary")}
                </div>

                {/* If Yes → show intermediary fields (bound to section1_5.ffiArray) */}
                {formData.section1_5.hasIntermediary === "yes" && (
                  <div className="space-y-4">
                    {formData.section1_5.ffiArray.map((intermediary, index) => (
                      <div
                        key={intermediary.id}
                        className="grid grid-cols-6 gap-4"
                      >
                        <div>
                          <Label>
                            Organisation Name
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Enter organisation name"
                            value={intermediary.organisationName}
                            onChange={(e) => {
                              showErrorsIfNeeded();
                              clearIndicatorValidationMessage("1.5");
                              const value = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                section1_5: {
                                  ...prev.section1_5,
                                  ffiArray: prev.section1_5.ffiArray.map(
                                    (item) =>
                                      item.id === intermediary.id
                                        ? {
                                            ...item,
                                            organisationName: value,
                                          }
                                        : item
                                  ),
                                },
                              }));
                            }}
                            disabled={isIndicatorSubmitted("1.5")}
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.organisationName`
                              ),
                              isIndicatorSubmitted("1.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section1_5.ffiArray.${index}.organisationName`
                          )}
                        </div>

                        <div>
                          <Label>
                            Organisation Type
                            <span className="text-red-500">*</span>
                          </Label>
                          <Select
                            value={intermediary.organisationType}
                            onValueChange={(value) => {
                              showErrorsIfNeeded();
                              setFormData((prev) => ({
                                ...prev,
                                section1_5: {
                                  ...prev.section1_5,
                                  ffiArray: prev.section1_5.ffiArray.map(
                                    (item) =>
                                      item.id === intermediary.id
                                        ? {
                                            ...item,
                                            organisationType: value,
                                          }
                                        : item
                                  ),
                                },
                              }));
                            }}
                            disabled={isIndicatorSubmitted("1.5")}
                          >
                            <SelectTrigger
                              className={cn(
                                getInputValidationClass(
                                  `section1_5.ffiArray.${index}.organisationType`
                                )
                              )}
                            >
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Trust">Trust</SelectItem>
                              <SelectItem value="Society">Society</SelectItem>
                              <SelectItem value="Corporation">
                                Corporation
                              </SelectItem>
                              <SelectItem value="Company">Company</SelectItem>
                            </SelectContent>
                          </Select>
                          {renderFieldError(
                            `section1_5.ffiArray.${index}.organisationType`
                          )}
                        </div>

                        <div>
                          <Label>
                            Year of Establishment
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="YYYY"
                            value={intermediary.yearEstablished}
                            min="1900"
                            max="9999"
                            onChange={(e) => {
                              showErrorsIfNeeded();
                              const value = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                section1_5: {
                                  ...prev.section1_5,
                                  ffiArray: prev.section1_5.ffiArray.map(
                                    (item) =>
                                      item.id === intermediary.id
                                        ? {
                                            ...item,
                                            yearEstablished: value,
                                          }
                                        : item
                                  ),
                                },
                              }));
                            }}
                            disabled={isIndicatorSubmitted("1.5")}
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.yearEstablished`
                              ),
                              isIndicatorSubmitted("1.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section1_5.ffiArray.${index}.yearEstablished`
                          )}
                        </div>

                        <div>
                          <Label>
                            Total Funding (INR)
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Enter total funding in INR"
                            value={intermediary.totalFunding}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            onChange={(e) => {
                              showErrorsIfNeeded();
                              clearIndicatorValidationMessage("1.5");
                              const value = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                section1_5: {
                                  ...prev.section1_5,
                                  ffiArray: prev.section1_5.ffiArray.map(
                                    (item) =>
                                      item.id === intermediary.id
                                        ? {
                                            ...item,
                                            totalFunding: value,
                                          }
                                        : item
                                  ),
                                },
                              }));
                            }}
                            disabled={isIndicatorSubmitted("1.5")}
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.totalFunding`
                              ),
                              isIndicatorSubmitted("1.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section1_5.ffiArray.${index}.totalFunding`
                          )}
                        </div>

                        <div>
                          <Label>
                            Website
                            <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            placeholder="Website link"
                            value={intermediary.website}
                            type="url"
                            onChange={(e) => {
                              showErrorsIfNeeded();
                              const value = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                section1_5: {
                                  ...prev.section1_5,
                                  ffiArray: prev.section1_5.ffiArray.map(
                                    (item) =>
                                      item.id === intermediary.id
                                        ? {
                                            ...item,
                                            website: value,
                                          }
                                        : item
                                  ),
                                },
                              }));
                            }}
                            disabled={isIndicatorSubmitted("1.5")}
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.website`
                              ),
                              isIndicatorSubmitted("1.5") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          />
                          {renderFieldError(
                            `section1_5.ffiArray.${index}.website`
                          )}
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              removeIntermediary(intermediary.id, index)
                            }
                            disabled={isIndicatorSubmitted("1.5")}
                            className="text-red-500 hover:text-red-700 border-none bg-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {renderFieldError("section1_5.ffiArray")}

                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addIntermediary}
                        disabled={isIndicatorSubmitted("1.5")}
                        className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-4 w-4" />
                        Add More Financial Intermediary
                      </Button>
                    </div>
                    {formData.section1_5.hasIntermediary === "yes" &&
                      formData.section1_5.ffiArray.length > 0 && (
                        <div className="overflow-x-auto rounded-xl mt-4">
                          <table className="min-w-full border-separate border-spacing-0">
                            <thead>
                              <tr className="bg-[#DDE3F9]">
                                <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                                  Organisation Name
                                </th>
                                <th className="py-3 px-4 text-left text-sm font-normal">
                                  Organisation Type
                                </th>
                                <th className="py-3 px-4 text-left text-sm font-normal">
                                  Year Established
                                </th>
                                <th className="py-3 px-4 text-left text-sm font-normal">
                                  Total Funding (INR)
                                </th>
                                <th className="py-3 px-4 text-left text-sm font-normal">
                                  Website
                                </th>
                                <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.section1_5.ffiArray.map(
                                (intermediary, index) => (
                                  <tr
                                    key={intermediary.id}
                                    className="bg-white"
                                  >
                                    <td className="py-3 px-4 text-sm font-normal">
                                      {intermediary.organisationName}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-normal">
                                      {intermediary.organisationType}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-normal">
                                      {intermediary.yearEstablished}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-normal">
                                      {intermediary.totalFunding}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-normal">
                                      {intermediary.website}
                                    </td>
                                    <td className="py-3 px-4">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeIntermediary(
                                            intermediary.id,
                                            index
                                          )
                                        }
                                        disabled={isIndicatorSubmitted("1.5")}
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
                  </div>
                )}

                {/* If 'No' -> show comment box */}
                {formData.section1_5.hasIntermediary === "no" && (
                  <div>
                    <Label>Comments (Reason)</Label>
                    <Textarea
                      placeholder="Enter comments or reason"
                      value={formData.section1_5.comment || ""}
                      onChange={(e) => {
                        showErrorsIfNeeded();
                        clearIndicatorValidationMessage("1.5");
                        setFormData((prev) => ({
                          ...prev,
                          section1_5: {
                            ...prev.section1_5,
                            comment: e.target.value,
                          },
                        }));
                      }}
                      disabled={isIndicatorSubmitted("1.5")}
                      className={cn(
                        getInputValidationClass("section1_5.comment"),
                        "min-h-[100px]",
                        isIndicatorSubmitted("1.5") &&
                          "bg-gray-50 cursor-not-allowed"
                      )}
                    />
                    {renderFieldError("section1_5.comment")}
                  </div>
                )}
                <div className="mt-4">
                  <Button
                    onClick={() =>
                      handleSubmitIndicator(
                        "1.5",
                        "Functional Financial Intermediary"
                      )
                    }
                    disabled={
                      submittingIndicator !== null ||
                      isIndicatorSubmitted("1.5")
                    }
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {getSubmitButtonText("1.5", submittingIndicator)}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

          <FormActions
            onPrevious={isFirstStep ? undefined : goToPrevious}
            onNext={handleNext}
            onSaveDraft={async () => {
              // Save to database via API instead of localStorage
              try {
                await apiService.submitSectionToStateApprover(
                  formData,
                  "infraFinancing",
                  allowedIndicators || ["1.1", "1.2", "1.3", "1.4", "1.5"]
                );
                updateFormData("infraFinancing", formData);
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
            }}
            isFirstStep={isFirstStep}
            isLastStep={isLastStep}
            nextLabel={isLastStep ? "Review & Submit" : "Next"}
            showSaveDraft={true}
            isNextDisabled={isNextDisabled}
          />
        </div>
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
