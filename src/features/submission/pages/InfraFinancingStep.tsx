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

export const InfraFinancingStep = () => {
  const { user } = useAuth();
  const [sectionStatus, setSectionStatus] = useState<any>(undefined);
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
  function safeInfraFinancingFormData(data: Partial<InfraFinancingData>): InfraFinancingData {
    return {
      ...defaultData,
      ...data,
      section1_1: { ...defaultData.section1_1, ...(data.section1_1 || {}) },
      section1_2: { ...defaultData.section1_2, ...(data.section1_2 || {}) },
      section1_3: {
        totalULBs: data.section1_3?.totalULBs ?? defaultData.section1_3.totalULBs,
        ulbList: Array.isArray(data.section1_3?.ulbList) ? data.section1_3.ulbList : [],
      },
      section1_4: {
        totalULBs: data.section1_4?.totalULBs ?? defaultData.section1_4.totalULBs,
        bondList: Array.isArray(data.section1_4?.bondList) ? data.section1_4.bondList : [],
      },
      section1_5: {
        ffiArray: Array.isArray(data.section1_5?.ffiArray) ? data.section1_5.ffiArray : [],
        hasIntermediary: data.section1_5?.hasIntermediary || "",
        comment: data.section1_5?.comment || "",
      },
    };
  }

  const loadedData = (getStepData("infraFinancing") as Partial<InfraFinancingData>) || {};
  const initialData: InfraFinancingData = safeInfraFinancingFormData(loadedData);

  const [formData, setFormData] = useState<InfraFinancingData>(initialData);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [, forceUpdate] = useState({});

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
      indicatorsToValidate = allowedIndicators && allowedIndicators.length > 0 
        ? allowedIndicators 
        : []; // Empty array means validate nothing
    } else if (isStateApprover) {
      // STATE_APPROVER: validate only available indicators (indicators not assigned to any NODAL_OFFICER)
      // If availableIndicators is empty, it means all indicators are assigned to NODAL_OFFICERs,
      // so STATE_APPROVER shouldn't validate anything
      indicatorsToValidate = allowedIndicators && allowedIndicators.length > 0 
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
    console.log("InfraFinancing validation state", {
      isValid: validation.isValid,
      errors: validation.errors,
      hasIntermediary: formData.section1_5.hasIntermediary,
      hasFfiEntries: formData.section1_5.ffiArray.length,
    });
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
    if (normalized && normalized.byIndicatorCode && normalized.byIndicatorCode[code]) {
      return normalized.byIndicatorCode[code];
    }
    return legacy || {};
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
          const fullSubmission = await apiService.getSubmission(userSubmission.id);
          let parsedFormData = fullSubmission.formData;
          if (typeof fullSubmission.formData === 'string') {
            try {
              parsedFormData = JSON.parse(fullSubmission.formData);
            } catch (e) {
              // ignore parse error
            }
          }

          // Restore section_status from DB if present
          sectionStatusFromDB = fullSubmission.section_status;
          setSectionStatus(sectionStatusFromDB);

          // Prefer normalized indicator data for all sections, fallback to legacy
          const normalized = parsedFormData?.normalizedFormData;
          const legacy = parsedFormData?.infraFinancing || {};

          const newFormData: InfraFinancingData = safeInfraFinancingFormData({
            section1_1: {
              ...getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1'),
              year: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.year || currentFY,
              capitalAllocation: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.capitalAllocation?.toString() || "",
              gsdpForFY: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.gsdpForFY?.toString() || "",
              stateCapexUtilisation: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.stateCapexUtilisation?.toString() || "",
              allocationToGSDP: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.allocationToGSDP?.toString() || "",
              capexToCapexActuals: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.capexToCapexActuals?.toString() || "",
              percentage: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.percentage,
              marksObtained: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_1, '1.1')?.marksObtained,
            },
            section1_2: {
              ...getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2'),
              year: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.year || currentFY,
              gsdpForFY: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.gsdpForFY?.toString() || "",
              actualCapex: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.actualCapex?.toString() || "",
              budgetaryCapex: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.budgetaryCapex?.toString() || "",
              stateCapexUtilisation: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.stateCapexUtilisation?.toString() || "",
              capexActualsToGSDP: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.capexActualsToGSDP?.toString() || "",
              percentage: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.percentage,
              marksObtained: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_2, '1.2')?.marksObtained,
            },
            section1_3: {
              ...getSectionFromNormalizedOrLegacy(normalized, legacy.section1_3, '1.3'),
              totalULBs: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_3, '1.3')?.totalULBs ?? 0,
              ulbList: Array.isArray(getSectionFromNormalizedOrLegacy(normalized, legacy.section1_3, '1.3')?.ulbList)
                ? getSectionFromNormalizedOrLegacy(normalized, legacy.section1_3, '1.3').ulbList
                : [],
            },
            section1_4: {
              ...getSectionFromNormalizedOrLegacy(normalized, legacy.section1_4, '1.4'),
              totalULBs: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_4, '1.4')?.totalULBs ?? 0,
              bondList: Array.isArray(getSectionFromNormalizedOrLegacy(normalized, legacy.section1_4, '1.4')?.bondList)
                ? getSectionFromNormalizedOrLegacy(normalized, legacy.section1_4, '1.4').bondList
                : [],
            },
            section1_5: {
              ...getSectionFromNormalizedOrLegacy(normalized, legacy.section1_5, '1.5'),
              ffiArray: Array.isArray(getSectionFromNormalizedOrLegacy(normalized, legacy.section1_5, '1.5')?.ffiArray)
                ? getSectionFromNormalizedOrLegacy(normalized, legacy.section1_5, '1.5').ffiArray
                : [],
              hasIntermediary: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_5, '1.5')?.hasIntermediary || "",
              comment: getSectionFromNormalizedOrLegacy(normalized, legacy.section1_5, '1.5')?.comment || "",
            },
          });

          setFormData(newFormData);
          setIsDataLoaded(true);
          setTimeout(() => forceUpdate({}), 50);

        } else {
          setIsDataLoaded(true);
        }
      } catch (e) {
        setIsDataLoaded(true);
      }
    })();
  }, [user, isDataLoaded]);

  const isNextDisabled = !validation.isValid;

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
      console.log("[LocalStorage] Found localStorage data but ignoring in favor of DB data");
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
      console.log("[LocalStorage] Found editing_submission but ignoring in favor of DB data");
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
    setShowValidationErrors(true);
    if (!validation.isValid) {
      toast({
        title: "Incomplete section",
        description: "Please complete all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }
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
      const sectionIndicators = allowedIndicators || ["1.1", "1.2", "1.3", "1.4", "1.5"];
      // Submit section to state approver
      await apiService.submitSectionToStateApprover(
        formData,
        "infraFinancing",
        sectionIndicators
      );
      toast({
        title: "Success",
        description: "Infrastructure Financing section submitted to State Approver successfully.",
        variant: "default",
      });
      // Update form data
      updateFormData("infraFinancing", formData);
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

    try {
      setIsSubmitting(true);
      // Submit only this indicator
      await apiService.submitSectionToStateApprover(
        formData,
        "infraFinancing",
        [indicatorCode]
      );
      toast({
        title: "Success",
        description: `Indicator ${indicatorCode} (${indicatorTitle}) submitted to State Approver successfully.`,
        variant: "default",
      });
      // Update form data
      updateFormData("infraFinancing", formData);
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
    console.log("🔍 InfraFinancingStep: Access control check", {
      isNodalOfficer,
      assignedIndicators,
      hasAccessToSection,
      hasAccess1_1: hasIndicatorAccess("1.1"),
      hasAccess1_2: hasIndicatorAccess("1.2"),
      hasAccess1_3: hasIndicatorAccess("1.3"),
      hasAccess1_4: hasIndicatorAccess("1.4"),
      hasAccess1_5: hasIndicatorAccess("1.5"),
    });
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
        {showIndicator("1.1") &&
          (!isEditMode ||
            !!(
              formData.section1_1 &&
              (formData.section1_1.year ||
                formData.section1_1.capitalAllocation ||
                formData.section1_1.gsdpForFY ||
                formData.section1_1.allocationToGSDP ||
                formData.section1_1.capexToCapexActuals)
            )) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.1 -</span> % Capex to GSDP{" "}
                  </span>
                </div>
              }
              className="mb-6"
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
                    className={cn(
                      getInputValidationClass("section1_1.capitalAllocation")
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
                    className={cn(
                      getInputValidationClass("section1_1.gsdpForFY")
                    )}
                  />
                  {renderFieldError("section1_1.gsdpForFY")}
                </div>
                <div>
                  <Label>
                    % Allocation to GSDP<span className="text-red-500">*</span>
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
                  onClick={() => handleSubmitIndicator("1.1", "% Capex to GSDP")}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </SectionCard>
          )}

        {/* Section 1.2 */}
        {showIndicator("1.2") &&
          (!isEditMode ||
            !!(
              formData.section1_2 &&
              (formData.section1_2.year ||
                formData.section1_2.actualCapex ||
                formData.section1_2.stateCapexUtilisation ||
                formData.section1_2.capexActualsToGSDP)
            )) && (
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
                    className={cn(
                      getInputValidationClass("section1_2.actualCapex")
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
                    className={cn(
                      getInputValidationClass(
                        "section1_2.stateCapexUtilisation"
                      )
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
                  onClick={() => handleSubmitIndicator("1.2", "% Capex Utilization")}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </SectionCard>
          )}

        {/* Section 1.3 */}
        {showIndicator("1.3") &&
          (!isEditMode ||
            (Array.isArray(formData.section1_3.ulbList) &&
              formData.section1_3.ulbList.length > 0)) && (
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
                    className={cn(
                      getInputValidationClass("section1_3.totalULBs")
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
                        className={cn(
                          getInputValidationClass(
                            `section1_3.ulbList.${index}.cityName`
                          )
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
                            className={cn(
                              "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                              !ulb.ratingDate && "text-muted-foreground",
                              getInputValidationClass(
                                `section1_3.ulbList.${index}.ratingDate`
                              )
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
                        className="text-red-500 hover:text-red-700 border-none bg-none"
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
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 "
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
                    onClick={() => handleSubmitIndicator("1.3", "% of Credit Rated ULBs")}
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

        {/* Section 1.4 */}
        {showIndicator("1.4") &&
          (!isEditMode ||
            (Array.isArray(formData.section1_4.bondList) &&
              formData.section1_4.bondList.length > 0)) && (
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
                    className={cn(
                      getInputValidationClass("section1_4.totalULBs")
                    )}
                    required
                  />
                  {renderFieldError("section1_4.totalULBs")}
                </div>

                {formData.section1_4.bondList.map((bond, index) => (
                  <div key={bond.id} className="grid grid-cols-6 gap-4">
                    <div>
                      <Label>
                        Select Bond Type<span className="text-red-500">*</span>
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
                        Issuing Authority<span className="text-red-500">*</span>
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
                        className={cn(
                          getInputValidationClass(
                            `section1_4.bondList.${index}.issuingAuthority`
                          )
                        )}
                      />
                      {renderFieldError(
                        `section1_4.bondList.${index}.issuingAuthority`
                      )}
                    </div>

                    <div>
                      <Label>
                        Value (INR crore)
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
                                item.id === bond.id
                                  ? { ...item, value }
                                  : item
                              ),
                            },
                          }));
                        }}
                        className={cn(
                          getInputValidationClass(
                            `section1_4.bondList.${index}.value`
                          )
                        )}
                      />
                      {renderFieldError(`section1_4.bondList.${index}.value`)}
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeBond(bond.id)}
                        className="text-red-500 hover:text-red-700 border-none bg-none"
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
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                    onClick={() => handleSubmitIndicator("1.4", "% of ULBs issuing Bonds")}
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

        {/* Section 1.5 */}
        {showIndicator("1.5") &&
          (!isEditMode ||
            (Array.isArray(formData.section1_5.ffiArray) &&
              formData.section1_5.ffiArray.length > 0)) && (
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
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.organisationName`
                              )
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
                                        ? { ...item, organisationType: value }
                                        : item
                                  ),
                                },
                              }));
                            }}
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
                                        ? { ...item, yearEstablished: value }
                                        : item
                                  ),
                                },
                              }));
                            }}
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.yearEstablished`
                              )
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
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.totalFunding`
                              )
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
                            className={cn(
                              getInputValidationClass(
                                `section1_5.ffiArray.${index}.website`
                              )
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
                            className="text-red-500 hover:text-red-700 border-none bg-none"
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
                      className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                      className={cn(
                        getInputValidationClass("section1_5.comment"),
                        "min-h-[100px]"
                      )}
                    />
                    {renderFieldError("section1_5.comment")}
                  </div>
                )}
                <div className="mt-4">
                  <Button
                    onClick={() => handleSubmitIndicator("1.5", "Functional Financial Intermediary")}
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

        {isNextDisabled && (
          <p className="text-sm text-destructive mb-4">
            Complete all required fields before continuing.
          </p>
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
                  description: error?.message || "Failed to save draft. Please try again.",
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
    </div>
  );
};
