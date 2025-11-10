/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
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
import { saveDraftToLocalStorage } from "@/utils/draftUtils";
import { computeStepProgress } from "../utils/progress";

// NOTE: The InfraDevelopmentData shape now wraps arrays inside objects.
// This component was updated to use those nested arrays e.g. formData.section2_1.infraActArray

const defaultData: InfraDevelopmentData = {
  section2_1: { infraActArray: [] },
  section2_2: { specializedEntityArray: [] },
  section2_3: { infraDevelopmentArray: [] },
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
  const loadedData =
    (getStepData("infraDevelopment") as
      | Partial<InfraDevelopmentData>
      | undefined) || {};

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
    },
    section2_4: {
      investmentReadyArray:
        (loadedData.section2_4 as any)?.investmentReadyArray || [],
    },
    section2_5: {
      assetMonetizationArray:
        (loadedData.section2_5 as any)?.assetMonetizationArray || [],
    },
  };

  const [formData, setFormData] = useState<InfraDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync with localStorage data when component mounts or data changes
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
        },
        section2_4: {
          investmentReadyArray:
            (currentStepData.section2_4 as any)?.investmentReadyArray || [],
        },
        section2_5: {
          assetMonetizationArray:
            (currentStepData.section2_5 as any)?.assetMonetizationArray || [],
        },
      };
      setFormData(syncedData);
      console.log(
        "🔄 Synced infraDevelopment data from localStorage in normal flow:",
        syncedData
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStepData]);

  // Initialize form data only once when component mounts (editing flow)
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log(
          "🔍 Direct editing submission check in InfraDevelopmentStep:",
          submissionData
        );

        if (
          submissionData.formData &&
          submissionData.formData.infraDevelopment
        ) {
          const stepData = submissionData.formData
            .infraDevelopment as Partial<InfraDevelopmentData>;
          const updatedData: InfraDevelopmentData = {
            ...defaultData,
            ...stepData,
            section2_1: {
              infraActArray: (stepData.section2_1 as any)?.infraActArray || [],
            },
            section2_2: {
              specializedEntityArray:
                (stepData.section2_2 as any)?.specializedEntityArray || [],
            },
            section2_3: {
              infraDevelopmentArray:
                (stepData.section2_3 as any)?.infraDevelopmentArray || [],
            },
            section2_4: {
              investmentReadyArray:
                (stepData.section2_4 as any)?.investmentReadyArray || [],
            },
            section2_5: {
              assetMonetizationArray:
                (stepData.section2_5 as any)?.assetMonetizationArray || [],
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
          "❌ Failed to parse editing submission in InfraDevelopmentStep:",
          error
        );
        localStorage.removeItem("editing_submission");
      }
    }
  }, []);

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
  };

  const removeEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string
  ) => {
    const arrKey = sectionArrayKeyMap[section];
    setFormData(
      (prev) =>
        ({
          ...prev,
          [section]: {
            ...(prev as any)[section],
            [arrKey]: ((prev as any)[section]?.[arrKey] || []).filter(
              (entry: any) => entry.id !== id
            ),
          },
        } as any)
    );
  };

  const updateEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string,
    field: "sector" | "files",
    value: any
  ) => {
    const arrKey = sectionArrayKeyMap[section];
    setFormData(
      (prev) =>
        ({
          ...prev,
          [section]: {
            ...(prev as any)[section],
            [arrKey]: ((prev as any)[section]?.[arrKey] || []).map(
              (entry: any) =>
                entry.id === id ? { ...entry, [field]: value } : entry
            ),
          },
        } as any)
    );
  };

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
    field: "projectName" | "dprFile",
    value: any
  ) => {
    const arrKey = sectionArrayKeyMap["section2_4"];
    setFormData(
      (prev) =>
        ({
          ...prev,
          section2_4: {
            ...(prev as any).section2_4,
            [arrKey]: ((prev as any).section2_4?.[arrKey] || []).map(
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
            [arrKey]: ((prev as any).section2_5?.[arrKey] || []).map(
              (entry: any) =>
                entry.id === id ? { ...entry, [field]: value } : entry
            ),
          },
        } as any)
    );
  };

  // --- Validation (kept disabled) ---
  const validateFields = () => {
    return true;
  };

  // --- Navigation ---
  const handleNext = () => {
    updateFormData("infraDevelopment", formData);
    goToNext();
  };

  const { toast } = useToast();

  const handleSaveDraft = async () => {
    const success = saveDraftToLocalStorage("infraDevelopment", formData);

    if (success) {
      updateFormData("infraDevelopment", formData);
    }
  };

  // Access control for NODAL_OFFICER & STATE_APPROVER
  if (isNodalOfficer || user?.role === "STATE_APPROVER") {
    const sectionIndicators = ["2.1", "2.2", "2.3", "2.4", "2.5"];
    const allowed = (
      isNodalOfficer ? assignedIndicators : availableIndicators
    )?.filter((ind) => sectionIndicators.includes(ind));

    console.log("🔍 InfraDevelopmentStep: Section indicator access", {
      role: user?.role,
      isNodalOfficer,
      assignedIndicators,
      availableIndicators,
      allowed,
    });

    if (!allowed?.length) {
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

      {/* Section 2.1 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.1") ||
        assignedIndicators.includes("2.1")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_1.infraActArray) &&
            formData.section2_1.infraActArray.length > 0)) && (
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
              {formData.section2_1.infraActArray.map((entry) => (
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
                        onValueChange={(value) =>
                          updateEntry("section2_1", entry.id, "sector", value)
                        }
                      >
                        <SelectTrigger>
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
                        onChange={(file) =>
                          updateEntry(
                            "section2_1",
                            entry.id,
                            "files",
                            file ? [file] : []
                          )
                        }
                        required
                      />
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

                {errors.section2_1 && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.section2_1}
                  </p>
                )}
              </div>

              {formData.section2_1.infraActArray.length > 0 && (
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
                      {formData.section2_1.infraActArray.map((entry) => (
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
            </div>
          </SectionCard>
        )}

      {/* Section 2.2 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.2") ||
        assignedIndicators.includes("2.2")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_2.specializedEntityArray) &&
            formData.section2_2.specializedEntityArray.length > 0)) && (
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
              {formData.section2_2.specializedEntityArray.map((entry) => (
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
                        onValueChange={(value) =>
                          updateEntry("section2_2", entry.id, "sector", value)
                        }
                      >
                        <SelectTrigger>
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
                        onChange={(file) =>
                          updateEntry(
                            "section2_2",
                            entry.id,
                            "files",
                            file ? [file] : []
                          )
                        }
                        required
                      />
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
                {errors.section2_2 && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.section2_2}
                  </p>
                )}
              </div>

              {formData.section2_2.specializedEntityArray.length > 0 && (
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
                      {formData.section2_2.specializedEntityArray.map(
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
            </div>
          </SectionCard>
        )}

      {/* Section 2.3 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.3") ||
        assignedIndicators.includes("2.3")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_3.infraDevelopmentArray) &&
            formData.section2_3.infraDevelopmentArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">2.3 -</span> Availability of
                  Sector Infra Development Plan{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              {formData.section2_3.infraDevelopmentArray.map((entry) => (
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
                        onValueChange={(value) =>
                          updateEntry("section2_3", entry.id, "sector", value)
                        }
                      >
                        <SelectTrigger>
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
                        onChange={(file) =>
                          updateEntry(
                            "section2_3",
                            entry.id,
                            "files",
                            file ? [file] : []
                          )
                        }
                        required
                      />
                    </div>
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
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEntry("section2_3")}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add More Entry
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload plan
                </p>
                {errors.section2_3 && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.section2_3}
                  </p>
                )}
              </div>

              {formData.section2_3.infraDevelopmentArray.length > 0 && (
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
                      {formData.section2_3.infraDevelopmentArray.map(
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
            </div>
          </SectionCard>
        )}

      {/* Section 2.4 */}
      {((!isNodalOfficer && !user?.role?.includes("STATE_APPROVER")) ||
        availableIndicators.includes("2.4") ||
        assignedIndicators.includes("2.4")) &&
        (!isEditMode ||
          (Array.isArray(formData.section2_4.investmentReadyArray) &&
            formData.section2_4.investmentReadyArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">2.4 -</span> Availability of
                  Investment Ready Project Pipeline{" "}
                </span>
              </div>
            }
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              {formData.section2_4.investmentReadyArray.map((entry) => (
                <div key={entry.id} className="mb-2 relative">
                  <div className="flex flex-col gap-4 max-w-[70%]">
                    <div className="flex-1 w-full">
                      <Label>
                        Project Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter project name"
                        value={entry.projectName}
                        onChange={(e) =>
                          updateProject(entry.id, "projectName", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <FileUploadSection
                        label="Upload DPR/Feasibility Report"
                        value={entry.dprFile}
                        onChange={(file) =>
                          updateProject(entry.id, "dprFile", file)
                        }
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => removeProject(entry.id)}
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
                  onClick={addProject}
                  className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Project
                </Button>
                {errors.section2_4 && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.section2_4}
                  </p>
                )}
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
            formData.section2_5.assetMonetizationArray.length > 0)) && (
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
              {formData.section2_5.assetMonetizationArray.map((entry) => (
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
                        onChange={(e) =>
                          updateAsset(entry.id, "projectName", e.target.value)
                        }
                      />
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
                        onValueChange={(value) =>
                          updateAsset(entry.id, "sector", value)
                        }
                      >
                        <SelectTrigger>
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
                        onValueChange={(value) =>
                          updateAsset(entry.id, "type", value)
                        }
                      >
                        <SelectTrigger>
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
                        onValueChange={(value) =>
                          updateAsset(entry.id, "ownership", value)
                        }
                      >
                        <SelectTrigger>
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
                          onChange={(e) =>
                            updateAsset(
                              entry.id,
                              "estimatedMonetization",
                              e.target.value
                            )
                          }
                        />
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
                {errors.section2_5 && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.section2_5}
                  </p>
                )}
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
      />
    </div>
  );
};
