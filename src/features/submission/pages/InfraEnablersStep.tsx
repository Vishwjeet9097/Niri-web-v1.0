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
import { saveDraftToLocalStorage } from "@/utils/draftUtils";
import { computeStepProgress } from "../utils/progress";
import { cn } from "@/lib/utils";
import {
  validateInfraEnablers,
  type InfraEnablersValidationResult,
} from "../validation/infraEnablersValidation";

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

  // Indicator access
  const {
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    effectiveIndicators,
    hasIndicatorAccess,
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

  // Merge loaded data with defaults
  const loadedData =
    (getStepData("infraEnablers") as Partial<InfraEnablersData>) || {};
  const initialData: InfraEnablersData = {
    ...defaultData,
    ...loadedData,
    section4_1: { ...defaultData.section4_1, ...(loadedData.section4_1 || {}) },
    section4_2: { ...defaultData.section4_2, ...(loadedData.section4_2 || {}) },
    section4_3: { ...defaultData.section4_3, ...(loadedData.section4_3 || {}) },
    section4_4: { ...defaultData.section4_4, ...(loadedData.section4_4 || {}) },
    section4_5: { ...defaultData.section4_5, ...(loadedData.section4_5 || {}) },
    section4_6: { ...defaultData.section4_6, ...(loadedData.section4_6 || {}) },
  };

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const { toast } = useToast();

  // Unified access control for both roles - calculate before validation
  const sectionIndicators = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"];
  const allowedIndicators =
    (isNodalOfficer ? effectiveIndicators : availableIndicators)?.filter((i) =>
      sectionIndicators.includes(i)
    ) || [];

  console.log("🟢 InfraEnablersStep: Allowed indicators", allowedIndicators);

  // Validation - only validate sections that are accessible based on indicators
  const validation: InfraEnablersValidationResult = useMemo(() => {
    // Determine which indicators to validate
    // For Nodal Officer or State Approver: only validate assigned/available indicators
    // For others: validate all (no restrictions)
    let indicatorsToValidate: string[] | undefined;
    
    if (isNodalOfficer || isStateApprover) {
      // If no indicators assigned/available in this category, validate nothing (empty array = skip validation)
      indicatorsToValidate = allowedIndicators.length > 0 
        ? allowedIndicators 
        : []; // Empty array means validate nothing (category not applicable)
    } else {
      // Other roles: validate all (backward compatibility)
      indicatorsToValidate = undefined; // undefined means validate all
    }

    return validateInfraEnablers(formData, {
      allowedIndicators: indicatorsToValidate,
    });
  }, [formData, isNodalOfficer, isStateApprover, allowedIndicators]);
  const isNextDisabled = !validation.isValid;

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
      const syncedData: InfraEnablersData = {
        ...defaultData,
        ...currentStepData,
        section4_1: {
          ...defaultData.section4_1,
          ...(currentStepData.section4_1 || {}),
        },
        section4_2: {
          ...defaultData.section4_2,
          ...(currentStepData.section4_2 || {}),
        },
        section4_3: {
          ...defaultData.section4_3,
          ...(currentStepData.section4_3 || {}),
        },
        section4_4: {
          ...defaultData.section4_4,
          ...(currentStepData.section4_4 || {}),
        },
        section4_5: {
          ...defaultData.section4_5,
          ...(currentStepData.section4_5 || {}),
        },
        section4_6: {
          ...defaultData.section4_6,
          ...(currentStepData.section4_6 || {}),
        },
      };
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
          const updatedData: InfraEnablersData = {
            ...defaultData,
            ...stepData,
            section4_1: {
              ...defaultData.section4_1,
              ...(stepData.section4_1 || {}),
            },
            section4_2: {
              ...defaultData.section4_2,
              ...(stepData.section4_2 || {}),
            },
            section4_3: {
              ...defaultData.section4_3,
              ...(stepData.section4_3 || {}),
            },
            section4_4: {
              ...defaultData.section4_4,
              ...(stepData.section4_4 || {}),
            },
            section4_5: {
              ...defaultData.section4_5,
              ...(stepData.section4_5 || {}),
            },
            section4_6: {
              ...defaultData.section4_6,
              ...(stepData.section4_6 || {}),
            },
          };
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
    if (!validation.isValid) {
      setShowValidationErrors(true);
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }
    updateFormData("infraEnablers", formData);
    goToNext();
  };

  const handleSaveDraft = async () => {
    const success = saveDraftToLocalStorage("infraEnablers", formData);
    if (success) {
      updateFormData("infraEnablers", formData);
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

  return (
    <div className="">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />
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
        hasIndicatorAccess("4.1")) &&
        (!isEditMode ||
          formData.section4_1?.allEligible ||
          (formData.section4_1?.websiteLink &&
            formData.section4_1.websiteLink !== "")) && (
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
                    className={cn(
                      getInputValidationClass("section4_1.websiteLink")
                    )}
                  />
                  {renderFieldError("section4_1.websiteLink")}
                </div>
              )}

              {formData.section4_1.allEligible === "no" && (
                <div className="flex flex-col gap-2">
                  <Label>
                    Comments (Reason){" "}
                    <span className="text-destructive">*</span>
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
                    className={cn(
                      getInputValidationClass("section4_1.comment")
                    )}
                  />
                  {renderFieldError("section4_1.comment")}
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.2 */}
      {((!isNodalOfficer && !isStateApprover) ||
        hasIndicatorAccess("4.2")) &&
        (!isEditMode ||
          formData.section4_2?.available ||
          !!formData.section4_2?.file) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.2 - </span> Availability &
                  Use of State/UT PMG{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
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
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section4_2: { ...prev.section4_2, available: "yes" },
                        }));
                      }}
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
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section4_2: { ...prev.section4_2, available: "no" },
                        }));
                      }}
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
                  />
                  <p className="text-xs text-muted-foreground">Description</p>
                  {renderFieldError("section4_2.file")}
                </div>
              )}
              {formData.section4_2.available === "no" && (
                <div className="flex flex-col gap-2">
                  <Label>
                    Comments (Reason){" "}
                    <span className="text-destructive">*</span>
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
                    className={cn(
                      getInputValidationClass("section4_2.comment")
                    )}
                  />
                  {renderFieldError("section4_2.comment")}
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.3 */}
      {((!isNodalOfficer && !isStateApprover) ||
        hasIndicatorAccess("4.3")) &&
        (!isEditMode ||
          formData.section4_3?.adopted ||
          (Array.isArray(formData.section4_3?.projects) &&
            formData.section4_3.projects.length > 0) ||
          formData.section4_3?.comment) && (
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
                    />
                    No
                  </label>
                </div>
                {renderFieldError("section4_3.adopted")}
              </div>

              {/* --- If YES --- */}
              {formData.section4_3.adopted === "yes" && (
                <div className="flex flex-col gap-4">
                  {formData.section4_3.projects.map((entry) => (
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
                            className={cn(
                              getInputValidationClass(
                                `section4_3.projects.${formData.section4_3.projects.findIndex(
                                  (p) => p.id === entry.id
                                )}.projectName`
                              )
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
                            aria-label="Remove"
                            className="text-destructive hover:bg-destructive/10"
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
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                          {formData.section4_3.projects.map((entry) => (
                            <tr key={entry.id} className="bg-white">
                              <td className="py-3 px-4 text-sm">
                                {entry.projectName}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {entry.sector}
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {entry.file?.fileName || "No file uploaded"}
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
                </div>
              )}

              {/* --- If NO --- (same style as Section 4.1) */}
              {formData.section4_3.adopted === "no" && (
                <div className="flex flex-col gap-2 w-[60%]">
                  <Label>
                    Comments (Reason){" "}
                    <span className="text-destructive">*</span>
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
                    className={cn(
                      getInputValidationClass("section4_3.comment")
                    )}
                  />
                  {renderFieldError("section4_3.comment")}
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.4 */}
      {((!isNodalOfficer && !isStateApprover) ||
        hasIndicatorAccess("4.4")) &&
        (!isEditMode ||
          formData.section4_4?.adopted ||
          !!formData.section4_4?.file ||
          formData.section4_4?.comment) && (
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
                    Comments (Reason){" "}
                    <span className="text-destructive">*</span>
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
                    className={cn(
                      getInputValidationClass("section4_4.comment")
                    )}
                  />
                  {renderFieldError("section4_4.comment")}
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.5 */}
      {((!isNodalOfficer && !isStateApprover) ||
        hasIndicatorAccess("4.5")) &&
        (!isEditMode ||
          formData.section4_5?.implemented ||
          (Array.isArray(formData.section4_5?.practices) &&
            formData.section4_5.practices.length > 0) ||
          formData.section4_5?.comment) && (
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
          >
            <div className="flex flex-col gap-4 w-[70%]">
              {/* Toggle */}
              <div>
                <Label>
                  Innovative Practices{" "}
                  <span className="text-destructive">*</span>
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
                            className={cn(
                              getInputValidationClass(
                                `section4_5.practices.${formData.section4_5.practices.findIndex(
                                  (p) => p.id === entry.id
                                )}.practiceName`
                              )
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
                              {[
                                "Rollout",
                                "Viability",
                                "Tech",
                                "Monitoring",
                                "Capacity",
                                "Other",
                              ].map((impact) => (
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
                            aria-label="Remove"
                            className="text-destructive hover:bg-destructive/10"
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
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                    Comments (Reason){" "}
                    <span className="text-destructive">*</span>
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
                    className={cn(
                      getInputValidationClass("section4_5.comment")
                    )}
                  />
                  {renderFieldError("section4_5.comment")}
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.6 */}
      {((!isNodalOfficer && !isStateApprover) ||
        hasIndicatorAccess("4.6")) &&
        (!isEditMode ||
          formData.section4_6?.participated ||
          (Array.isArray(formData.section4_6?.capacityArray) &&
            formData.section4_6.capacityArray.length > 0) ||
          formData.section4_6?.comment) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.6 – </span> Capacity Building
                  – Officer Participation
                </span>
              </div>
            }
            className="mb-6"
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
                            className={cn(
                              getInputValidationClass(
                                `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                  (e) => e.id === entry.id
                                )}.officerName`
                              )
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
                            className={cn(
                              getInputValidationClass(
                                `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                  (e) => e.id === entry.id
                                )}.designation`
                              )
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
                            className={cn(
                              getInputValidationClass(
                                `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                  (e) => e.id === entry.id
                                )}.programName`
                              )
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
                            className={cn(
                              getInputValidationClass(
                                `section4_6.capacityArray.${formData.section4_6.capacityArray.findIndex(
                                  (e) => e.id === entry.id
                                )}.organiser`
                              )
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
                            aria-label="Remove"
                            className="text-destructive hover:bg-destructive/10 mt-6"
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
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                </div>
              )}

              {/* ✅ If NO → show comment box */}
              {formData.section4_6.participated === "no" && (
                <div className="flex flex-col gap-2 w-[60%]">
                  <Label>
                    Comments (Reason){" "}
                    <span className="text-destructive">*</span>
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
                    className={cn(
                      getInputValidationClass("section4_6.comment")
                    )}
                  />
                  {renderFieldError("section4_6.comment")}
                </div>
              )}
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
        isFirstStep={false}
        isLastStep={isLastStep}
        nextLabel={isLastStep ? "Review & Submit" : "Next"}
        showSaveDraft={true}
        isNextDisabled={isNextDisabled}
      />
    </div>
  );
};
