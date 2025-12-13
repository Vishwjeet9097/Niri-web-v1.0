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
import { computeStepProgress } from "../utils/progress";
import { saveDraftToLocalStorage } from "@/utils/draftUtils";
import {
  validatePPPDevelopment,
  type PPPDevelopmentValidationResult,
} from "../validation/pppDevelopmentValidation";

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

  // Indicator access control
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

  // Merge loaded data with defaults
  const loadedData =
    (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};

  const initialData: PPPDevelopmentData = {
    ...defaultData,
    ...loadedData,
    section3_1: { ...defaultData.section3_1, ...(loadedData.section3_1 || {}) },
    section3_2: { ...defaultData.section3_2, ...(loadedData.section3_2 || {}) },
    section3_3: { VGFArray: (loadedData.section3_3 as any)?.VGFArray || [] },

    section3_4: {
      projects:
        loadedData.section3_4?.projects || defaultData.section3_4.projects,
      totalProjectsAwarded:
        loadedData.section3_4?.totalProjectsAwarded ||
        defaultData.section3_4.totalProjectsAwarded,
      totalProjectCostAwarded:
        loadedData.section3_4?.totalProjectCostAwarded ||
        defaultData.section3_4.totalProjectCostAwarded,
    },
  };

  const [formData, setFormData] = useState<PPPDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Calculate allowed indicators for validation - calculate before validation
  const sectionIndicators = useMemo(() => ["3.1", "3.2", "3.3", "3.4"], []);
  const allowedIndicators = useMemo(
    () =>
      (isNodalOfficer ? effectiveIndicators : availableIndicators)?.filter(
        (ind) => sectionIndicators.includes(ind)
      ) || [],
    [isNodalOfficer, effectiveIndicators, availableIndicators, sectionIndicators]
  );

  // Validation - only validate sections that are accessible based on indicators
  const validation: PPPDevelopmentValidationResult = useMemo(() => {
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

    return validatePPPDevelopment(formData, {
      allowedIndicators: indicatorsToValidate,
    });
  }, [formData, isNodalOfficer, isStateApprover, allowedIndicators]);
  const isNextDisabled = !validation.isValid;

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

  // Sync with localStorage data when component mounts or data changes
  useEffect(() => {
    const currentStepData = getStepData(
      "pppDevelopment"
    ) as Partial<PPPDevelopmentData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: PPPDevelopmentData = {
        ...defaultData,
        ...currentStepData,
        section3_1: {
          ...defaultData.section3_1,
          ...(currentStepData.section3_1 || {}),
        },
        section3_2: {
          ...defaultData.section3_2,
          ...(currentStepData.section3_2 || {}),
        },
        section3_3: {
          VGFArray: (currentStepData.section3_3 as any)?.VGFArray || [],
        },
        section3_4: {
          projects:
            currentStepData.section3_4?.projects ||
            defaultData.section3_4.projects,
          totalProjectsAwarded:
            currentStepData.section3_4?.totalProjectsAwarded ||
            defaultData.section3_4.totalProjectsAwarded,
          totalProjectCostAwarded:
            currentStepData.section3_4?.totalProjectCostAwarded ||
            defaultData.section3_4.totalProjectCostAwarded,
        },
      };
      setFormData(syncedData);
      console.log(
        "🔄 Synced pppDevelopment data from localStorage in normal flow:",
        syncedData
      );
    }
  }, [getStepData]);

  // Initialize form data only once when component mounts
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log(
          "🔍 Direct editing submission check in PPPDevelopmentStep:",
          submissionData
        );

        if (submissionData.formData && submissionData.formData.pppDevelopment) {
          const stepData = submissionData.formData
            .pppDevelopment as Partial<PPPDevelopmentData>;
          const updatedData: PPPDevelopmentData = {
            ...defaultData,
            ...stepData,
            section3_1: {
              ...defaultData.section3_1,
              ...(stepData.section3_1 || {}),
            },
            section3_2: {
              ...defaultData.section3_2,
              ...(stepData.section3_2 || {}),
            },
            section3_3: {
              VGFArray: (stepData.section3_3 as any)?.VGFArray || [],
            },
            section3_4: {
              projects:
                stepData.section3_4?.projects ||
                defaultData.section3_4.projects,
              totalProjectsAwarded:
                stepData.section3_4?.totalProjectsAwarded ||
                defaultData.section3_4.totalProjectsAwarded,
              totalProjectCostAwarded:
                stepData.section3_4?.totalProjectCostAwarded ||
                defaultData.section3_4.totalProjectCostAwarded,
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
          "❌ Failed to parse editing submission in PPPDevelopmentStep:",
          error
        );
        localStorage.removeItem("editing_submission");
      }
    }
  }, []);

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

  const updateProject = (
    id: string,
    field: "projectName" | "sector" | "type" | "submissionDate" | "file",
    value: string | FileUpload | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: prev.section3_3.VGFArray.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
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
      | "totalProjectCost",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: (prev.section3_4.projects || []).map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
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
    updateFormData("pppDevelopment", formData);
    goToNext();
  };

  const handleSaveDraft = async () => {
    const success = saveDraftToLocalStorage("pppDevelopment", formData);

    if (success) {
      updateFormData("pppDevelopment", formData);
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
          hasIndicatorAccess("3.1")) &&
          (!isEditMode ||
            formData.section3_1?.available ||
            !!formData.section3_1?.file ||
            !!formData.section3_1?.comment) && (
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
                      <TooltipContent>
                        Is there a PPP Act/Policy?
                      </TooltipContent>
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
                      value={formData.section3_1.file || null}
                      onChange={(file) => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section3_1: { ...prev.section3_1, file },
                        }));
                      }}
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
                      className={cn(
                        getInputValidationClass("section3_1.comment")
                      )}
                    />
                    {renderFieldError("section3_1.comment")}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

        {/* Section 3.2 */}
        {((!isNodalOfficer && !isStateApprover) ||
          hasIndicatorAccess("3.2")) &&
          (!isEditMode ||
            formData.section3_2?.available ||
            !!formData.section3_2?.file ||
            !!formData.section3_2?.comment) && (
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
                      value={formData.section3_2.file || null}
                      onChange={(file) => {
                        showErrorsIfNeeded();
                        setFormData((prev) => ({
                          ...prev,
                          section3_2: { ...prev.section3_2, file },
                        }));
                      }}
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
                      className={cn(
                        getInputValidationClass("section3_2.comment")
                      )}
                    />
                    {renderFieldError("section3_2.comment")}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

        {/* Section 3.3 */}
        {((!isNodalOfficer && !isStateApprover) ||
          hasIndicatorAccess("3.3")) &&
          (!isEditMode ||
            (Array.isArray(formData.section3_3.VGFArray) &&
              formData.section3_3.VGFArray.length > 0)) && (
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
            >
              <div className="flex flex-col gap-4">
                {formData.section3_3.VGFArray.map((entry, idx) => (
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
                          className={cn(
                            getInputValidationClass(
                              `section3_3.VGFArray.${idx}.projectName`
                            )
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
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                  !entry.submissionDate &&
                                    "text-muted-foreground",
                                  getInputValidationClass(
                                    `section3_3.VGFArray.${idx}.submissionDate`
                                  )
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
                                  showErrorsIfNeeded();
                                  updateProject(
                                    entry.id,
                                    "submissionDate",
                                    date ? date.toISOString() : ""
                                  );
                                }}
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
                          aria-label="Remove"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <FileUploadSection
                        label="Upload File"
                        value={entry.file || null}
                        onChange={(file) => {
                          showErrorsIfNeeded();
                          updateProject(entry.id, "file", file);
                        }}
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
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                        {formData.section3_3.VGFArray.map((entry) => (
                          <tr key={entry.id} className="bg-white">
                            <td className="py-3 px-4 text-sm">
                              {entry.projectName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {entry.sector}
                            </td>
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
                                onClick={() => removeProject(entry.id)}
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
            </SectionCard>
          )}

        {/* Section 3.4 */}
        {((!isNodalOfficer && !isStateApprover) ||
          hasIndicatorAccess("3.4")) &&
          (!isEditMode ||
            (Array.isArray(formData.section3_4?.projects) &&
              formData.section3_4.projects.length > 0)) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.4 – </span> Proportion of
                    TPC of PPP Projects
                  </span>
                </div>
              }
              className="mb-6"
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
                      className={cn(
                        getInputValidationClass(
                          "section3_4.totalProjectsAwarded"
                        )
                      )}
                    />
                    {renderFieldError("section3_4.totalProjectsAwarded")}
                  </div>
                  <div>
                    <Label className="block min-h-[40px] leading-snug">
                      Total Project Cost of Infrastructure Projects awarded in
                      the financial year of assessment (INR - values is in CRORES)
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
                      className={cn(
                        getInputValidationClass(
                          "section3_4.totalProjectCostAwarded"
                        )
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
                            className={cn(
                              getInputValidationClass(
                                `section3_4.projects.${formData.section3_4.projects.findIndex(
                                  (p) => p.id === project.id
                                )}.capexPercentage`
                              )
                            )}
                          />
                          {renderFieldError(
                            `section3_4.projects.${formData.section3_4.projects.findIndex(
                              (p) => p.id === project.id
                            )}.capexPercentage`
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>Date of Award (DD-MM-YYYY)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                  !project.dateOfAward &&
                                    "text-muted-foreground"
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
                                onSelect={(date) =>
                                  updatePPPProject(
                                    project.id,
                                    "dateOfAward",
                                    date ? date.toISOString() : ""
                                  )
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label>Total Project Cost (INR - values is in CRORES)</Label>
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
                            className={cn(
                              getInputValidationClass(
                                `section3_4.projects.${formData.section3_4.projects.findIndex(
                                  (p) => p.id === project.id
                                )}.totalProjectCost`
                              )
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
                            aria-label="Remove"
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
                    className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
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
                          {formData.section3_4.projects.map((project) => (
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
