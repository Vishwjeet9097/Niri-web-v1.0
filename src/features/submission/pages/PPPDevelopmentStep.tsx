import React, { useState, useEffect, useCallback } from "react";
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

const defaultData: PPPDevelopmentData = {
  section3_1: {
    available: "",
    file: null,
  },
  section3_2: {
    available: "",
    file: null,
  },
  section3_3: [],
  section3_4: {
    projects: [],
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

  // useEffect(() => {
  //   refresh?.({ clearCache: true });
  // }, [refresh]);
  // Note: Editing submission data is handled by useFormPersistence hook

  // Merge loaded data with defaults
  const loadedData =
    (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};
  // const initialData: PPPDevelopmentData = {
  //   ...defaultData,
  //   ...loadedData,
  //   section3_1: { ...defaultData.section3_1, ...(loadedData.section3_1 || {}) },
  //   section3_2: { ...defaultData.section3_2, ...(loadedData.section3_2 || {}) },
  //   section3_3: loadedData.section3_3 || [],
  //   section3_4: { ...defaultData.section3_4, ...(loadedData.section3_4 || {}) },
  // };

  const initialData: PPPDevelopmentData = {
    ...defaultData,
    ...loadedData,
    section3_1: { ...defaultData.section3_1, ...(loadedData.section3_1 || {}) },
    section3_2: { ...defaultData.section3_2, ...(loadedData.section3_2 || {}) },
    section3_3: loadedData.section3_3 || [],
    section3_4: {
      projects:
        loadedData.section3_4?.projects || defaultData.section3_4.projects,
    },
  };
  const [formData, setFormData] = useState<PPPDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
        section3_3: currentStepData.section3_3 || [],
        section3_4: {
          projects:
            currentStepData.section3_4?.projects ||
            defaultData.section3_4.projects,
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
            section3_3: stepData.section3_3 || [],
            section3_4: {
              projects:
                stepData.section3_4?.projects ||
                defaultData.section3_4.projects,
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
  }, []); // Empty dependency array to run only once

  // Autosave to localStorage with debouncing (avoid infinite loop)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("pppDevelopment", formData);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [formData]);

  // Calculation functions
  const calculateSection3_3 = useCallback(() => {
    // For section 3.3, marks = MIN(number of proposals × 5, 50)
    const numberOfProposals = formData.section3_3.length;
    const marksObtained = Math.min(numberOfProposals * 5, 50);

    return {
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section3_3.length]);

  const calculateSection3_4 = useCallback(() => {
    // Calculate from projects array
    const projects = formData.section3_4.projects || [];

    // For now, just mark based on number of projects
    // The actual calculation may need TPC value per project which we don't have yet
    const tpcOfPPPProjects = 0; // Placeholder - may need to calculate from projects array

    return {
      tpcOfPPPProjects: 0,
      proportion: 0,
      marksObtained: 0,
    };
  }, [formData.section3_4.projects]);

  // Update calculations when form data changes
  // useEffect(() => {
  //   const section3_3Calc = calculateSection3_3();
  //   const section3_4Calc = calculateSection3_4();

  //   setFormData(prev => ({
  //     ...prev,
  //     section3_3: prev.section3_3.map(project => ({
  //       ...project,
  //       marksObtained: section3_3Calc.marksObtained
  //     })),
  //     section3_4: {
  //       ...prev.section3_4,
  //       proportion: section3_4Calc.proportion,
  //       marksObtained: section3_4Calc.marksObtained
  //     }
  //   }));
  // }, [formData.section3_3.length, formData.section3_4.tpcOfPPPProjects, formData.section3_4.totalTPC]);

  useEffect(() => {
    const section3_3Calc = calculateSection3_3();
    const section3_4Calc = calculateSection3_4();

    // Check if update is needed
    const shouldUpdate3_3 = formData.section3_3.some(
      (project) => project.marksObtained !== section3_3Calc.marksObtained
    );
    const shouldUpdate3_4 =
      formData.section3_4.proportion !== section3_4Calc.proportion ||
      formData.section3_4.marksObtained !== section3_4Calc.marksObtained;

    if (shouldUpdate3_3 || shouldUpdate3_4) {
      setFormData((prev) => ({
        ...prev,
        section3_3: prev.section3_3.map((project) => ({
          ...project,
          marksObtained: section3_3Calc.marksObtained,
        })),
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
    formData.section3_3.length,
    formData.section3_4.projects.length,
    formData.section3_4.proportion,
    formData.section3_4.marksObtained,
  ]);
  // --- Section 3.3: Add/Remove Project ---
  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      section3_3: [
        ...prev.section3_3,
        {
          id: crypto.randomUUID(),
          projectName: "",
          sector: "",
          type: "",
          submissionDate: "",
          file: null,
        },
      ],
    }));
  };

  const removeProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: prev.section3_3.filter((entry) => entry.id !== id),
    }));
  };

  const updateProject = (
    id: string,
    field: "projectName" | "sector" | "type" | "submissionDate" | "file",
    value: string | FileUpload | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: prev.section3_3.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
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
      | "capexPercentage",
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

  // --- Navigation ---
  const handleNext = () => {
    // Always save to localStorage before navigating
    updateFormData("pppDevelopment", formData);
    goToNext();
  };

  const { toast } = useToast();

  const handleSaveDraft = async () => {
    // Save to localStorage with toast message
    const success = saveDraftToLocalStorage("pppDevelopment", formData);

    if (success) {
      // Also update form data in persistence hook
      updateFormData("pppDevelopment", formData);
    }
  };

  // Access control for NODAL_OFFICER
  // ✅ Unified access control for both Nodal Officer and State Approver
  const sectionIndicators = ["3.1", "3.2", "3.3", "3.4"];
  const allowedIndicators =
    (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter((ind) =>
      sectionIndicators.includes(ind)
    ) || [];

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
            { assignedIndicators, isNodalOfficer }
          );
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
          availableIndicators.includes("3.1")) &&
          (!isEditMode ||
            (formData.section3_1?.available &&
              formData.section3_1.available !== "") ||
            !!formData.section3_1?.file) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.1 - </span> Availability of
                    Infrastructure Act/Policy{" "}
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
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            section3_1: {
                              ...prev.section3_1,
                              available: "yes",
                            },
                          }))
                        }
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <Input
                        type="radio"
                        name="ppp-act-policy"
                        value="no"
                        checked={formData.section3_1.available === "no"}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            section3_1: { ...prev.section3_1, available: "no" },
                          }))
                        }
                      />
                      No
                    </label>
                  </div>
                </div>
                {formData.section3_1.available === "yes" && (
                  <div className="flex flex-col gap-2">
                    <FileUploadSection
                      label="Upload File"
                      value={formData.section3_1.file || null}
                      onChange={(file) =>
                        setFormData((prev) => ({
                          ...prev,
                          section3_1: { ...prev.section3_1, file },
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload copy of Act/Policy
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}{" "}
        {/* Section 3.2 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.2") ||
          availableIndicators.includes("3.2")) &&
          (!isEditMode ||
            (formData.section3_2?.available &&
              formData.section3_2.available !== "") ||
            !!formData.section3_2?.file) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.2 - </span> Functional PPP
                    Cell/Unit{" "}
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
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            section3_2: {
                              ...prev.section3_2,
                              available: "yes",
                            },
                          }))
                        }
                      />
                      Yes
                    </label>
                    <label className="flex items-center gap-2">
                      <Input
                        type="radio"
                        name="ppp-cell-unit"
                        value="no"
                        checked={formData.section3_2.available === "no"}
                        onChange={() =>
                          setFormData((prev) => ({
                            ...prev,
                            section3_2: { ...prev.section3_2, available: "no" },
                          }))
                        }
                      />
                      No
                    </label>
                  </div>
                </div>
                {formData.section3_2.available === "yes" && (
                  <div className="flex flex-col gap-2">
                    <FileUploadSection
                      label="Upload File"
                      value={formData.section3_2.file || null}
                      onChange={(file) =>
                        setFormData((prev) => ({
                          ...prev,
                          section3_2: { ...prev.section3_2, file },
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload notification or mandate
                    </p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}{" "}
        {/* Section 3.3 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.3") ||
          availableIndicators.includes("3.3")) &&
          (!isEditMode ||
            (Array.isArray(formData.section3_3) &&
              formData.section3_3.length > 0)) && (
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
                {formData.section3_3.map((entry, idx) => (
                  <div key={entry.id} className="mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <Label>Project Name</Label>
                        <Input
                          type="text"
                          placeholder="Enter project name"
                          value={entry.projectName}
                          onChange={(e) =>
                            updateProject(
                              entry.id,
                              "projectName",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label>Select Sector</Label>
                        <Select
                          value={entry.sector}
                          onValueChange={(value) =>
                            updateProject(entry.id, "sector", value)
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
                      <div>
                        <Label>Select Type</Label>
                        <Select
                          value={entry.type}
                          onValueChange={(value) =>
                            updateProject(entry.id, "type", value)
                          }
                        >
                          <SelectTrigger>
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
                      </div>
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-full">
                          <Label>Submission Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                  !entry.submissionDate &&
                                    "text-muted-foreground"
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
                                onSelect={(date) =>
                                  updateProject(
                                    entry.id,
                                    "submissionDate",
                                    date ? date.toISOString() : ""
                                  )
                                }
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
                        onChange={(file) =>
                          updateProject(entry.id, "file", file)
                        }
                      />
                    </div>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {/* Annex 7: Provide VGF/IIPDF details */}
                  </p>
                </div>
              </div>
            </SectionCard>
          )}{" "}
        {/* Section 3.4 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.4") ||
          availableIndicators.includes("3.4")) &&
          (!isEditMode ||
            (Array.isArray(formData.section3_4?.projects) &&
              formData.section3_4.projects.length > 0)) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.4 - </span> Proportion of
                    TPC of PPP Projects{" "}
                  </span>
                </div>
              }
              subtitle=""
              className="mb-6"
            >
              <div className="flex flex-col gap-4">
                {(formData.section3_4.projects || []).map((project, idx) => (
                  <div key={project.id} className="mb-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Column 1 */}
                      <div className="space-y-4">
                        {/* Name of PPP/Bankable Projects */}
                        <div>
                          <Label>
                            Name of PPP/Bankable Projects{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the name of the PPP or Bankable project
                              </TooltipContent>
                            </Tooltip>
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

                        {/* NIP ID */}
                        <div>
                          <Label>
                            NIP ID{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the NIP ID of the project
                              </TooltipContent>
                            </Tooltip>
                          </Label>
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

                        {/* Funding Source */}
                        <div>
                          <Label>
                            Funding Source (In case of bankable project){" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the funding source name
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter funding source name"
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
                      </div>

                      {/* Column 2 */}
                      <div className="space-y-4">
                        {/* Infrastructure Sector */}
                        <div>
                          <Label>
                            Infrastructure Sector{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Select the infrastructure sector
                              </TooltipContent>
                            </Tooltip>
                          </Label>
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
                              <SelectValue placeholder="Select a sector" />
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

                        {/* Date of Award */}
                        <div>
                          <Label>
                            Date of Award{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Select the date of award
                              </TooltipContent>
                            </Tooltip>
                          </Label>
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

                        {/* % of Capex funded by non-Govt sources */}
                        <div>
                          <Label>
                            % of Capex funded by non-Govt sources{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the percentage of Capex funded by
                                non-government sources
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter percentage"
                            value={project.capexPercentage}
                            onChange={(e) =>
                              updatePPPProject(
                                project.id,
                                "capexPercentage",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
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
                ))}

                {/* Add More Project Button */}
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
                </div>
              </div>
            </SectionCard>
          )}
        {/* Navigation Buttons */}{" "}
        <FormActions
          onPrevious={goToPrevious}
          onNext={handleNext}
          onSaveDraft={handleSaveDraft}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          nextLabel={isLastStep ? "Review & Submit" : "Next"}
          showSaveDraft={true}
        />
      </div>
    </div>
  );
};
