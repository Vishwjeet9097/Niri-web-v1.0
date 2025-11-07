/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
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


const defaultData: InfraEnablersData = {
  section4_1: {
    allEligible: "",
    websiteLink: "",
  },
  section4_2: {
    available: "",
    file: null,
  },
  section4_3: {
    numberOfProjects: "",
  },
  section4_4: {
    adopted: "",
    file: null,
  },
  section4_5: {
    implemented: "",
    practiceName: "",
    impact: "",
    file: null,
  },
  section4_6: [],
};

export const InfraEnablersStep = () => {
  const { currentStep, goToStep, goToNext, goToPrevious, isLastStep } =
    useStepNavigation(4);
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

  // ✅ New unified indicator access control
  const {
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    refresh,
    loading: indicatorLoading,
    error: indicatorError,
  } = useIndicatorAccess();

  // useEffect(() => {
  //   refresh?.({ clearCache: true });
  // }, [refresh]);

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

  // Note: Editing submission data is handled by useFormPersistence hook

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
    section4_6: Array.isArray(loadedData.section4_6)
      ? loadedData.section4_6
      : [],
  };

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync with localStorage data when component mounts or data changes
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
        section4_6: Array.isArray(currentStepData.section4_6)
          ? currentStepData.section4_6
          : [],
      };
      setFormData(syncedData);
      console.log(
        "🔄 Synced infraEnablers data from localStorage in normal flow:",
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
            section4_6: stepData.section4_6 || [],
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
  }, []); // Empty dependency array to run only once

  // Always load latest data from localStorage on mount
  useEffect(() => {
    const loaded =
      (getStepData("infraEnablers") as Partial<InfraEnablersData>) || {};
    setFormData((prev) => ({
      ...prev,
      ...loaded,
      section4_1: { ...defaultData.section4_1, ...(loaded.section4_1 || {}) },
      section4_2: { ...defaultData.section4_2, ...(loaded.section4_2 || {}) },
      section4_3: { ...defaultData.section4_3, ...(loaded.section4_3 || {}) },
      section4_4: { ...defaultData.section4_4, ...(loaded.section4_4 || {}) },
      section4_5: { ...defaultData.section4_5, ...(loaded.section4_5 || {}) },
      section4_6: loaded.section4_6 || [],
    }));
    // eslint-disable-next-line
  }, []);

  // Update calculations when specific fields change (avoid infinite loop)
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
      section4_6: prev.section4_6.map((participant) => ({
        ...participant,
        marksObtained: section4_6Calc.marksObtained,
      })),
    }));
  }, [
    formData.section4_3.numberOfProjects,
    formData.section4_4.adopted,
    formData.section4_6.length,
  ]);

  // Calculation functions
  const calculateSection4_3 = useCallback(() => {
    // A₁: Number of projects
    const numberOfProjects = parseInt(formData.section4_3.numberOfProjects);

    if (isNaN(numberOfProjects)) {
      return { marksObtained: 0 };
    }

    // Marks: MIN(A₁ × 5, 20)
    const marksObtained = Math.min(numberOfProjects * 5, 20);

    return {
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section4_3.numberOfProjects]);

  const calculateSection4_4 = useCallback(() => {
    // For section 4.4, marks = IF adopted = 'Yes' THEN 50 ELSE 0
    const marksObtained = formData.section4_4.adopted === "yes" ? 50 : 0;

    return {
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section4_4.adopted]);

  const calculateSection4_6 = useCallback(() => {
    // For section 4.6, marks = MIN(number of participants × 1, 50)
    const totalParticipants = formData.section4_6.reduce((sum, training) => {
      // Since we don't have participants field, we'll use 1 per training
      return sum + 1;
    }, 0);

    const marksObtained = Math.min(totalParticipants * 1, 50);

    return {
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section4_6.length]);

  // Autosave to localStorage with debouncing (avoid infinite loop)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Ensure form data has proper structure before saving
      const structuredData = {
        section4_1: formData.section4_1 || defaultData.section4_1,
        section4_2: formData.section4_2 || defaultData.section4_2,
        section4_3: formData.section4_3 || defaultData.section4_3,
        section4_4: formData.section4_4 || defaultData.section4_4,
        section4_5: formData.section4_5 || defaultData.section4_5,
        section4_6: formData.section4_6 || defaultData.section4_6,
      };

      updateFormData("infraEnablers", structuredData);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [formData]);

  // --- Section 4.6: Add/Remove Officer Training ---
  const addTraining = () => {
    setFormData((prev) => ({
      ...prev,
      section4_6: [
        ...prev.section4_6,
        {
          id: crypto.randomUUID(),
          officerName: "",
          designation: "",
          programName: "",
          organiser: "",
          trainingType: "",
        },
      ],
    }));
  };

  const removeTraining = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: prev.section4_6.filter((entry) => entry.id !== id),
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
      section4_6: prev.section4_6.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  // --- Validation (commented out for now) ---
  // const validateFields = () => {
  //   const newErrors: { [key: string]: string } = {};
  //   // Add validation logic for required fields here if needed
  //   setErrors(newErrors);
  //   return Object.keys(newErrors).length === 0;
  // };

  // --- Navigation ---
  const handleNext = () => {
    updateFormData("infraEnablers", formData);
    goToNext();
  };

  const { toast } = useToast();

  const handleSaveDraft = async () => {
    // Save to localStorage with toast message
    const success = saveDraftToLocalStorage("infraEnablers", formData);

    if (success) {
      // Also update form data in persistence hook
      updateFormData("infraEnablers", formData);
    }
  };

  // ✅ Unified access control for both Nodal Officer & State Approver
  const sectionIndicators = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"];
  const allowedIndicators =
    (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter((i) =>
      sectionIndicators.includes(i)
    ) || [];

  console.log("🟢 InfraEnablersStep: Allowed indicators", allowedIndicators);

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
        assignedIndicators.includes("4.1") ||
        availableIndicators.includes("4.1")) &&
        (!isEditMode ||
          (formData.section4_1?.allEligible &&
            formData.section4_1.allEligible !== "") ||
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
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_1: {
                            ...prev.section4_1,
                            allEligible: "yes",
                          },
                        }))
                      }
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="all-eligible"
                      value="no"
                      checked={formData.section4_1.allEligible === "no"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_1: { ...prev.section4_1, allEligible: "no" },
                        }))
                      }
                    />
                    No
                  </label>
                </div>
              </div>
              <div>
                <Label>Website Link</Label>
                <Input
                  type="url"
                  placeholder="Enter Website Link"
                  value={formData.section4_1.websiteLink}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      section4_1: {
                        ...prev.section4_1,
                        websiteLink: e.target.value,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </SectionCard>
        )}

      {/* Section 4.2 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.2") ||
        availableIndicators.includes("4.2")) &&
        (!isEditMode ||
          (formData.section4_2?.available &&
            formData.section4_2.available !== "") ||
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
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_2: { ...prev.section4_2, available: "yes" },
                        }))
                      }
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="pmg-available"
                      value="no"
                      checked={formData.section4_2.available === "no"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_2: { ...prev.section4_2, available: "no" },
                        }))
                      }
                    />
                    No
                  </label>
                </div>
              </div>
              {formData.section4_2.available === "yes" && (
                <div className="flex flex-col gap-2">
                  <FileUploadSection
                    label="Upload File"
                    value={formData.section4_2.file || null}
                    onChange={(file) =>
                      setFormData((prev) => ({
                        ...prev,
                        section4_2: { ...prev.section4_2, file },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">Description</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.3 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.3") ||
        availableIndicators.includes("4.3")) &&
        (!isEditMode ||
          (formData.section4_3?.numberOfProjects !== undefined &&
            formData.section4_3.numberOfProjects !== "")) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.3 - </span> Adoption of PM
                  GatiShakti
                  <span className="font-normal text-xs text-muted-foreground ml-1">
                    (10 marks per 1%)
                  </span>
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="space-y-4 w-[40%]">
              <div>
                <Label>A₁ - Number of Projects*</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={formData.section4_3.numberOfProjects}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      section4_3: {
                        ...formData.section4_3,
                        numberOfProjects: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          </SectionCard>
        )}

      {/* Section 4.4 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.4") ||
        availableIndicators.includes("4.4")) &&
        (!isEditMode ||
          (formData.section4_4?.adopted &&
            formData.section4_4.adopted !== "") ||
          !!formData.section4_4?.file) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.4 - </span> Adoption of ADR
                  <span className="font-normal text-xs text-muted-foreground ml-1">
                    (10 marks per practice)
                  </span>
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              <div>
                <Label>
                  Adoption of PM GatiShakti{" "}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>Is ADR adopted?</TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="adr-adopted"
                      value="yes"
                      checked={formData.section4_4.adopted === "yes"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_4: { ...prev.section4_4, adopted: "yes" },
                        }))
                      }
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="adr-adopted"
                      value="no"
                      checked={formData.section4_4.adopted === "no"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_4: { ...prev.section4_4, adopted: "no" },
                        }))
                      }
                    />
                    No
                  </label>
                </div>
              </div>
              {formData.section4_4.adopted === "yes" && (
                <div className="flex flex-col gap-2">
                  <FileUploadSection
                    label="Upload File"
                    value={formData.section4_4.file || null}
                    onChange={(file) =>
                      setFormData((prev) => ({
                        ...prev,
                        section4_4: { ...prev.section4_4, file },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload ADR orders/notifications
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.5 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.5") ||
        availableIndicators.includes("4.5")) &&
        (!isEditMode ||
          (formData.section4_5?.implemented &&
            formData.section4_5.implemented !== "") ||
          (formData.section4_5?.practiceName &&
            formData.section4_5.practiceName !== "") ||
          (formData.section4_5?.impact && formData.section4_5.impact !== "") ||
          !!formData.section4_5?.file) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.5 - </span> Innovative
                  Practices
                  <span className="font-normal text-xs text-muted-foreground ml-1">
                    (10 marks per practice)
                  </span>
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4 w-[70%]">
              <div>
                <Label>
                  Innovation Practices{" "}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Are there innovative practices?
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="innovation-practices"
                      value="yes"
                      checked={formData.section4_5.implemented === "yes"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_5: {
                            ...prev.section4_5,
                            implemented: "yes",
                          },
                        }))
                      }
                    />
                    Yes
                  </label>
                  <label className="flex items-center gap-2">
                    <Input
                      type="radio"
                      name="innovation-practices"
                      value="no"
                      checked={formData.section4_5.implemented === "no"}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          section4_5: { ...prev.section4_5, implemented: "no" },
                        }))
                      }
                    />
                    No
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Practice Name</Label>
                  <Input
                    type="text"
                    placeholder="Practice Name"
                    value={formData.section4_5.practiceName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: {
                          ...prev.section4_5,
                          practiceName: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>
                    Impact{" "}
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="inline w-3 h-3 ml-1" />
                      </TooltipTrigger>
                      <TooltipContent>Impact of the practice</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={formData.section4_5.impact}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: { ...prev.section4_5, impact: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Capital allocation (INR)" />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPACT_OPTIONS.map((impact) => (
                        <SelectItem key={impact} value={impact}>
                          {impact}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.section4_5.implemented === "yes" && (
                <div className="flex flex-col gap-2">
                  <FileUploadSection
                    label="Upload File"
                    value={formData.section4_5.file || null}
                    onChange={(file) =>
                      setFormData((prev) => ({
                        ...prev,
                        section4_5: { ...prev.section4_5, file },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload evidence
                  </p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

      {/* Section 4.6 */} 
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.6") ||
        availableIndicators.includes("4.6")) && (!isEditMode ||
          (Array.isArray(formData.section4_6) &&
            formData.section4_6.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.6 - </span> Capacity Building
                  - Officer Participation
                  <span className="font-normal text-xs text-muted-foreground ml-1">
                    (1 marks per officer)
                  </span>
                </span>
              </div>
            }
            // subtitle="Annex 11"
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              <div>
                <Label>
                  Capacity Building – Officer Participation{" "}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Has there been officer participation in capacity building?
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-6">
                  <label
                    htmlFor="capacity-yes-step"
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      if (formData.section4_6.length === 0) {
                        addTraining();
                      }
                    }}
                  >
                    <input
                      id="capacity-yes-step"
                      type="radio"
                      name="capacity-building-step"
                      value="yes"
                      checked={formData.section4_6.length > 0}
                      onChange={() => {
                        if (formData.section4_6.length === 0) {
                          addTraining();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer select-none">Yes</span>
                  </label>
                  <label
                    htmlFor="capacity-no-step"
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      if (formData.section4_6.length > 0) {
                        setFormData((prev) => ({
                          ...prev,
                          section4_6: [],
                        }));
                      }
                    }}
                  >
                    <input
                      id="capacity-no-step"
                      type="radio"
                      name="capacity-building-step"
                      value="no"
                      checked={formData.section4_6.length === 0}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          section4_6: [],
                        }));
                      }}
                      className="w-4 h-4 text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer select-none">No</span>
                  </label>
                </div>
              </div>
              {formData.section4_6.map((entry, idx) => (
                <div key={entry.id} className="mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <Label>Officer Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter officer name"
                        value={entry.officerName}
                        onChange={(e) =>
                          updateTraining(
                            entry.id,
                            "officerName",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Designation</Label>
                      <Input
                        type="text"
                        placeholder="Enter designation"
                        value={entry.designation}
                        onChange={(e) =>
                          updateTraining(
                            entry.id,
                            "designation",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Program Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter program name"
                        value={entry.programName}
                        onChange={(e) =>
                          updateTraining(
                            entry.id,
                            "programName",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Organiser</Label>
                      <Input
                        type="text"
                        placeholder="Enter organiser"
                        value={entry.organiser}
                        onChange={(e) =>
                          updateTraining(entry.id, "organiser", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                      <div className="w-full">
                        <Label>Training Type</Label>
                        <Select
                          value={entry.trainingType}
                          onValueChange={(value) =>
                            updateTraining(entry.id, "trainingType", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRAINING_TYPE_OPTIONS.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
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
                        onClick={() => removeTraining(entry.id)}
                        aria-label="Remove"
                      >
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTraining}
                className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 "
              >
                <Plus className="w-4 h-4" />
                Add More Training
              </Button>
              {/* <p className="text-xs text-muted-foreground">Annex 11</p> */}
            </div>
          </SectionCard>
        )}

      {/* Navigation Buttons */}
      <FormActions
        onPrevious={goToPrevious}
        onNext={handleNext}
        onSaveDraft={handleSaveDraft}
        isFirstStep={false}
        isLastStep={isLastStep}
        nextLabel={isLastStep ? "Review & Submit" : "Next"}
        showSaveDraft={true}
      />
    </div>
  );
};
