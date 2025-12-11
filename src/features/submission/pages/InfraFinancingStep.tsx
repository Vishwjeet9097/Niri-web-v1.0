/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard } from "../components/SectionCard";
import { FormActions } from "../components/FormActions";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { SUBMISSION_STEPS } from "../constants/steps";
import type { InfraFinancingData } from "../types";
import { getCurrentFinancialYear } from "@/utils/dateUtils";
import { useAuth } from "@/features/auth/AuthProvider";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { apiService } from "@/services/api.service";
import { computeStepProgress } from "../utils/progress";
import { validateInfraFinancing } from "../validation/infraFinancingValidation";
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

export const InfraFinancingStep = () => {
  const { user } = useAuth();
  const [sectionStatus, setSectionStatus] = useState<any>({
    completedIndicators: [],
    completedCount: 0,
    totalAssigned: 0,
  });
  const { getStepData, updateFormData } = useFormPersistence();

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
    effectiveIndicators,
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
    section1_3: { totalULBs: 0, ulbList: [] },
    section1_4: { totalULBs: 0, bondList: [] },
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
        ulbList: Array.isArray(data.section1_3?.ulbList)
          ? data.section1_3.ulbList
          : [],
        // Preserve status field
        status: (data.section1_3 as any)?.status,
      },
      section1_4: {
        ...(data.section1_4 || {}),
        totalULBs:
          data.section1_4?.totalULBs ?? defaultData.section1_4.totalULBs,
        bondList: Array.isArray(data.section1_4?.bondList)
          ? data.section1_4.bondList
          : [],
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

  const [formData, setFormData] = useState<InfraFinancingData>(initialData);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [, forceUpdate] = useState({});
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

  // Calculate allowed indicators for validation
  const sectionIndicators = useMemo(
    () => ["1.1", "1.2", "1.3", "1.4", "1.5"],
    []
  );
  const allowedIndicators = useMemo(
    () =>
      (isNodalOfficer
        ? effectiveIndicators // Use effectiveIndicators (includes fallback to all if empty)
        : isStateApprover
        ? availableIndicators
        : null
      )?.filter((i) => sectionIndicators.includes(i)) || undefined,
    [
      isNodalOfficer,
      isStateApprover,
      effectiveIndicators,
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

  useEffect(() => {
    // Validation state tracking
  }, [
    validation,
    formData.section1_5.hasIntermediary,
    formData.section1_5.ffiArray.length,
  ]);

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

  const getFieldError = (path: string) =>
    showValidationErrors ? validation.errors[path] : undefined;

  const getInputValidationClass = (path: string) =>
    getFieldError(path)
      ? "border-destructive focus-visible:ring-destructive"
      : undefined;

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

  const removeULB = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section1_3: {
        ...prev.section1_3,
        ulbList: prev.section1_3.ulbList.filter((ulb) => ulb.id !== id),
      },
    }));
  };

  const addBond = () => {
    const newBond = {
      id: Date.now().toString(),
      bondType: "",
      cityName: "",
      issuingAuthority: "",
      value: "",
    };
    setFormData((prev) => ({
      ...prev,
      section1_4: {
        ...prev.section1_4,
        bondList: [...prev.section1_4.bondList, newBond],
      },
    }));
  };

  const removeBond = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section1_4: {
        ...prev.section1_4,
        bondList: prev.section1_4.bondList.filter((item) => item.id !== id),
      },
    }));
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

  const removeIntermediary = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section1_5: {
        ...prev.section1_5,
        ffiArray: prev.section1_5.ffiArray.filter((item) => item.id !== id),
      },
    }));
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
      setIsSubmitting(false);
    }
  };

  const handleSubmitIndicator = async (
    indicatorCode: string,
    indicatorTitle: string
  ) => {
    setShowValidationErrors(true);

    // Validate only this specific indicator
    const indicatorValidation = validateInfraFinancing(formData, {
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

      // Sanitize files and remove unwanted keys before submission
      const sanitizedFormData = deepRemoveUnwantedKeys(
        sanitizeFilesInFormData(formData)
      );

      // Create sanitized data with status for the submitted indicator
      const sectionKey = `section${indicatorCode.replace(".", "_")}`;
      const sanitizedFormDataWithStatus = {
        ...sanitizedFormData,
        [sectionKey]: {
          ...sanitizedFormData[sectionKey],
          status: "SUBMITTED_TO_STATE",
        },
      };

      // Submit only this indicator
      await apiService.submitSectionToStateApprover(
        sanitizedFormDataWithStatus,
        "infraFinancing",
        [indicatorCode]
      );
      toast({
        title: "Success",
        description: `Indicator ${indicatorCode} (${indicatorTitle}) submitted to State Approver successfully.`,
        variant: "default",
      });

      // Optimistically update formData to set status to SUBMITTED_TO_STATE
      setFormData((prev: any) => {
        if (prev[sectionKey]) {
          return {
            ...prev,
            [sectionKey]: {
              ...prev[sectionKey],
              status: "SUBMITTED_TO_STATE",
            },
          };
        }
        return prev;
      });

      // Update form data with sanitized data that includes status
      updateFormData("infraFinancing", sanitizedFormDataWithStatus);

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
          setIsSubmitting(false); // Reset isSubmitting after server refresh attempt
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
      setIsSubmitting(false);
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

  // Access check for both NODAL_OFFICER and STATE_APPROVER
  if (isNodalOfficer || isStateApprover) {
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

  // Handle Edit button click for sent back indicators
  const handleEditIndicator = (indicatorCode: string) => {
    setEditingIndicators((prev) => new Set(prev).add(indicatorCode));
  };

  // Handle Save button click for sent back indicators
  const handleSaveIndicator = async (indicatorCode: string) => {
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

      // If indicator was sent back (REVERTED/RESUBMITTED), change status to RESUBMITTED after saving
      // This makes it non-editable again until sent back again
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

      // Update submission using updateSubmission directly to preserve status
      const existingSubmission = await apiService.getSubmission(
        userSubmission.id
      );
      const existingFormData = existingSubmission?.formData || {};

      // Preserve all existing category data and update only this indicator
      const updatedFormData = {
        ...existingFormData,
        infraFinancing: {
          ...(existingFormData.infraFinancing || {}),
          [sectionKey]: sectionDataWithStatus,
        },
      };

      // Update submission with preserved status
      await apiService.updateSubmission(userSubmission.id, {
        formData: updatedFormData,
      });

      // Update local formData state
      setFormData((prev: any) => ({
        ...prev,
        [sectionKey]: sectionDataWithStatus,
      }));

      // Save form data to localStorage (via updateFormData)
      updateFormData("infraFinancing", {
        ...formData,
        [sectionKey]: sectionDataWithStatus,
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
                  <Label>
                    Capital Allocation for FY (INR)
                    <span className="text-red-500">*</span>
                    {/* <Info className="h-4 w-4 text-gray-500 inline-block ml-2" /> */}
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter capital allocation"
                    value={formData.section1_1.capitalAllocation}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        section1_1: {
                          ...prev.section1_1,
                          capitalAllocation: value,
                        },
                      }));
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
                  <Label>
                    GSDP for FY (INR)<span className="text-red-500">*</span>
                    {/* <Info className="h-4 w-4 text-gray-500 ml-2" /> */}
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter GSDP for FY"
                    value={formData.section1_1.gsdpForFY}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        section1_1: {
                          ...prev.section1_1,
                          gsdpForFY: value,
                        },
                      }));
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
                  <Label>
                    % Allocation to GSDP
                    <span className="text-red-500">*</span>
                    {/* <Info className="h-4 w-4 text-gray-500 ml-2" /> */}
                  </Label>
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
                  disabled={isSubmitting || isIndicatorSubmitted("1.1")}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  {isSubmitting
                    ? "Submitting..."
                    : isIndicatorSubmitted("1.1")
                    ? "Submitted"
                    : "Submit"}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Year<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={formData.section1_2.year}
                    readOnly
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    A₁ - Actual Capex (INR)
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter actual capex"
                    value={formData.section1_2.actualCapex}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        section1_2: {
                          ...prev.section1_2,
                          actualCapex: value,
                        },
                      }));
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
                  <Label>
                    State Capex Utilisation (INR)
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="Enter state capex utilisation"
                    value={formData.section1_2.stateCapexUtilisation}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      const value = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        section1_2: {
                          ...prev.section1_2,
                          stateCapexUtilisation: value,
                        },
                      }));
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
                  <Label>
                    % Capex Actuals to GSDP
                    <span className="text-red-500">*</span>
                  </Label>
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
                  disabled={isSubmitting || isIndicatorSubmitted("1.2")}
                  className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  size="sm"
                >
                  {(() => {
                    const isSubmitted = isIndicatorSubmitted("1.2");
                    return isSubmitting
                      ? "Submitting..."
                      : isSubmitted
                      ? "Submitted"
                      : "Submit";
                  })()}
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
              <div className="space-y-4">
                <div className="w-1/3">
                  <Label>
                    Total Number of ULBs <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter total number of ULBs"
                    min="0"
                    value={formData.section1_3.totalULBs || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      const { value } = e.target;
                      setFormData((prev) => ({
                        ...prev,
                        section1_3: {
                          ...prev.section1_3,
                          totalULBs: value
                            ? Math.max(parseInt(value, 10), 0)
                            : 0,
                        },
                      }));
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

                {formData.section1_3.ulbList.map((ulb, index) => (
                  <div key={ulb.id} className="grid grid-cols-12 gap-4">
                    <div className="col-span-2">
                      <Label>
                        City name<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Enter City Name"
                        value={ulb.cityName}
                        onChange={(e) => {
                          showErrorsIfNeeded();
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
                        }}
                        disabled={isIndicatorSubmitted("1.3")}
                        className={cn(
                          getInputValidationClass(
                            `section1_3.ulbList.${index}.cityName`
                          ),
                          isIndicatorSubmitted("1.3") &&
                            "bg-gray-50 cursor-not-allowed"
                        )}
                      />
                      {renderFieldError(`section1_3.ulbList.${index}.cityName`)}
                    </div>
                    <div className="col-span-4">
                      <Label>
                        ULB<span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={ulb.ulb}
                        onValueChange={(value) => {
                          showErrorsIfNeeded();
                          setFormData((prev) => ({
                            ...prev,
                            section1_3: {
                              ...prev.section1_3,
                              ulbList: prev.section1_3.ulbList.map((item) =>
                                item.id === ulb.id
                                  ? { ...item, ulb: value }
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
                              `section1_3.ulbList.${index}.ulb`
                            )
                          )}
                        >
                          <SelectValue placeholder="Select ULB" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pune Municipal Corporation">
                            Pune Municipal Corporation
                          </SelectItem>
                          <SelectItem value="Mumbai Municipal Corporation">
                            Mumbai Municipal Corporation
                          </SelectItem>
                          <SelectItem value="Nagpur Municipal Corporation">
                            Nagpur Municipal Corporation
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {renderFieldError(`section1_3.ulbList.${index}.ulb`)}
                    </div>
                    <div className="col-span-3">
                      <Label>
                        Rating date<span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={isIndicatorSubmitted("1.3")}
                            className={cn(
                              "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                              !ulb.ratingDate && "text-muted-foreground",
                              getInputValidationClass(
                                `section1_3.ulbList.${index}.ratingDate`
                              ),
                              isIndicatorSubmitted("1.3") &&
                                "bg-gray-50 cursor-not-allowed"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {ulb.ratingDate
                              ? format(new Date(ulb.ratingDate), "dd-MM-yyyy")
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={
                              ulb.ratingDate
                                ? new Date(ulb.ratingDate)
                                : undefined
                            }
                            onSelect={(date) => {
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
                                          ratingDate: date
                                            ? date.toISOString()
                                            : "",
                                        }
                                      : item
                                  ),
                                },
                              }));
                            }}
                            disabled={isIndicatorSubmitted("1.3")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                        onClick={() => removeULB(ulb.id)}
                        disabled={isIndicatorSubmitted("1.3")}
                        className="text-red-500 hover:text-red-700 border-none bg-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addULB}
                  disabled={isIndicatorSubmitted("1.3")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add More ULB
                </Button>
                {renderFieldError("section1_3.ulbList")}
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
                        {formData.section1_3.ulbList.map((ulb) => (
                          <tr key={ulb.id} className="bg-white">
                            <td className="py-3 px-4 text-sm font-normal">
                              {ulb.cityName}
                            </td>
                            <td className="py-3 px-4 text-sm font-normal">
                              {ulb.ulb}
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
                                onClick={() => removeULB(ulb.id)}
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
                    disabled={isSubmitting || isIndicatorSubmitted("1.3")}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {(() => {
                      const isSubmitted = isIndicatorSubmitted("1.3");
                      return isSubmitting
                        ? "Submitting..."
                        : isSubmitted
                        ? "Submitted"
                        : "Submit";
                    })()}
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
              <div className="space-y-4">
                <div className="w-1/3">
                  <Label>
                    Total Number of ULBs <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    placeholder="Enter total number of ULBs"
                    min="0"
                    value={formData.section1_4.totalULBs || ""}
                    onChange={(e) => {
                      showErrorsIfNeeded();
                      const { value } = e.target;
                      setFormData((prev) => ({
                        ...prev,
                        section1_4: {
                          ...prev.section1_4,
                          totalULBs: value
                            ? Math.max(parseInt(value, 10), 0)
                            : 0,
                        },
                      }));
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

                {formData.section1_4.bondList.map((bond, index) => (
                  <div key={bond.id} className="grid grid-cols-6 gap-4">
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
                      <Input
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
                      />
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
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeBond(bond.id)}
                        disabled={isIndicatorSubmitted("1.4")}
                        className="text-red-500 hover:text-red-700 border-none bg-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addBond}
                  disabled={isIndicatorSubmitted("1.4")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  Add More Bond
                </Button>

                {renderFieldError("section1_4.bondList")}
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
                          <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.section1_4.bondList.map((bond) => (
                          <tr key={bond.id} className="bg-white">
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
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => removeBond(bond.id)}
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
                    onClick={() =>
                      handleSubmitIndicator("1.4", "% of ULBs issuing Bonds")
                    }
                    disabled={isSubmitting || isIndicatorSubmitted("1.4")}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : isIndicatorSubmitted("1.4")
                      ? "Submitted"
                      : "Submit"}
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
                          setFormData((prev) => ({
                            ...prev,
                            section1_5: {
                              ...prev.section1_5,
                              hasIntermediary: "yes",
                              comment: "",
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
                            onClick={() => removeIntermediary(intermediary.id)}
                            disabled={isIndicatorSubmitted("1.5")}
                            className="text-red-500 hover:text-red-700 border-none bg-none disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-6 w-6" />
                          </Button>
                        </div>
                      </div>
                    ))}

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
                                (intermediary) => (
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
                                          removeIntermediary(intermediary.id)
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
                    disabled={isSubmitting || isIndicatorSubmitted("1.5")}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                  >
                    {isSubmitting
                      ? "Submitting..."
                      : isIndicatorSubmitted("1.5")
                      ? "Submitted"
                      : "Submit"}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm & Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
