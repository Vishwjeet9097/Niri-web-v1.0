import React, { useState, useEffect } from "react";
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
  SUBMISSION_STEPS,
} from "../constants/steps";
import type { PPPDevelopmentData, FileUpload } from "../types";
import { FileUploadSection } from "../components/FileUploadSection";
import { draftService } from "@/services/draft.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { FormActions } from "../components/FormActions";

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
    tpcOfPPPProjects: "",
    totalTPC: "",
  },
};

export const PPPDevelopmentStep = () => {
  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep } = useStepNavigation(3);
  const { formData: persistedFormData, getStepData, updateFormData } = useFormPersistence();
  const { user } = useAuth();

  // Note: Editing submission data is handled by useFormPersistence hook

  // Merge loaded data with defaults
  const loadedData =
    (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};
  const initialData: PPPDevelopmentData = {
    ...defaultData,
    ...loadedData,
    section3_1: { ...defaultData.section3_1, ...(loadedData.section3_1 || {}) },
    section3_2: { ...defaultData.section3_2, ...(loadedData.section3_2 || {}) },
    section3_3: loadedData.section3_3 || [],
    section3_4: { ...defaultData.section3_4, ...(loadedData.section3_4 || {}) },
  };

  const [formData, setFormData] = useState<PPPDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync with localStorage data when component mounts or data changes
  useEffect(() => {
    const currentStepData = getStepData("pppDevelopment") as Partial<PPPDevelopmentData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: PPPDevelopmentData = {
        ...defaultData,
        ...currentStepData,
        section3_1: { ...defaultData.section3_1, ...(currentStepData.section3_1 || {}) },
        section3_2: { ...defaultData.section3_2, ...(currentStepData.section3_2 || {}) },
        section3_3: currentStepData.section3_3 || [],
        section3_4: { ...defaultData.section3_4, ...(currentStepData.section3_4 || {}) },
      };
      setFormData(syncedData);
      console.log("🔄 Synced pppDevelopment data from localStorage in normal flow:", syncedData);
    }
  }, [getStepData]);

  // Initialize form data only once when component mounts
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log("🔍 Direct editing submission check in PPPDevelopmentStep:", submissionData);

        if (submissionData.formData && submissionData.formData.pppDevelopment) {
          const stepData = submissionData.formData.pppDevelopment as Partial<PPPDevelopmentData>;
          const updatedData: PPPDevelopmentData = {
            ...defaultData,
            ...stepData,
            section3_1: { ...defaultData.section3_1, ...(stepData.section3_1 || {}) },
            section3_2: { ...defaultData.section3_2, ...(stepData.section3_2 || {}) },
            section3_3: stepData.section3_3 || [],
            section3_4: { ...defaultData.section3_4, ...(stepData.section3_4 || {}) },
          };
          setFormData(updatedData);
          console.log("✅ Direct prefill from editing submission:", updatedData);

          // Clear the editing submission data after successful prefill
          localStorage.removeItem("editing_submission");
        }
      } catch (error) {
        console.error("❌ Failed to parse editing submission in PPPDevelopmentStep:", error);
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
  const calculateSection3_3 = () => {
    // For section 3.3, marks = MIN(number of proposals × 5, 50)
    const numberOfProposals = formData.section3_3.length;
    const marksObtained = Math.min(numberOfProposals * 5, 50);

    return {
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  };

  const calculateSection3_4 = () => {
    // A₁: TPC of PPP projects, A₂: Total TPC
    const tpcOfPPPProjects = parseFloat(formData.section3_4.tpcOfPPPProjects);
    const totalTPC = parseFloat(formData.section3_4.totalTPC);

    if (isNaN(tpcOfPPPProjects) || isNaN(totalTPC) || totalTPC === 0) {
      return { proportion: 0, marksObtained: 0 };
    }

    // Proportion (P): (A₁ / A₂) × 100
    const proportion = (tpcOfPPPProjects / totalTPC) * 100;
    // Marks: MIN(P × 2, 100)
    const marksObtained = Math.min(proportion * 2, 100);

    return {
      proportion: Math.round(proportion * 100) / 100, // Round to 2 decimal places
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  };

  // Update calculations when form data changes
  useEffect(() => {
    const section3_3Calc = calculateSection3_3();
    const section3_4Calc = calculateSection3_4();

    setFormData(prev => ({
      ...prev,
      section3_3: prev.section3_3.map(project => ({
        ...project,
        marksObtained: section3_3Calc.marksObtained
      })),
      section3_4: {
        ...prev.section3_4,
        proportion: section3_4Calc.proportion,
        marksObtained: section3_4Calc.marksObtained
      }
    }));
  }, [formData.section3_3.length, formData.section3_4.tpcOfPPPProjects, formData.section3_4.totalTPC]);

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
    value: string | FileUpload | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: prev.section3_3.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
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
    try {
      // Save to localStorage first
      updateFormData("pppDevelopment", formData);

      // Generate submission ID if not exists
      const submissionId = `DRAFT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Save to backend
      const success = await draftService.saveDraft(
        submissionId,
        formData,
        "pppDevelopment",
        user?.id,
        user?.state
      );

      if (success) {
        toast({
          title: "Draft Saved",
          description: "Your data has been saved as a draft.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />
      <ProgressHeader
        title="PPP Development"
        description="Public-Private Partnership projects and initiatives"
        points={250}
        completed={0}
        total={4}
        progress={0}
      />


      {/* Section 3.1 */}
      <SectionCard
        title={<div className="flex flex-col">
          <span className="text-base font-semibold ">
            <span className="text-primary">3.1 - </span> Availability of Infrastructure Act/Policy{" "}
          </span>
        </div>}

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
                <TooltipContent>Is there a PPP Act/Policy?</TooltipContent>
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
                      section3_1: { ...prev.section3_1, available: "yes" },
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
        </div>
      </SectionCard>

      {/* Section 3.2 */}
      <SectionCard
        title={<div className="flex flex-col">
          <span className="text-base font-semibold ">
            <span className="text-primary">3.2 - </span> Functional PPP Cell/Unit{" "}
          </span>
        </div>}
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
                      section3_2: { ...prev.section3_2, available: "yes" },
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
        </div>
      </SectionCard>

      {/* Section 3.3 */}
      <SectionCard
        title={<div className="flex flex-col">
          <span className="text-base font-semibold ">
            <span className="text-primary">3.3 - </span> Proposals Submitted under VGF/IIPDF{" "}
          </span>
        </div>}
        subtitle=""
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
          {formData.section3_3.map((entry, idx) => (
            <div key={entry.id} className="mb-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <Label>Project Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter practice name"
                    value={entry.projectName}
                    onChange={(e) =>
                      updateProject(entry.id, "projectName", e.target.value)
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
                  <Input
                    type="date"
                    value={entry.submissionDate}
                    onChange={(e) =>
                      updateProject(entry.id, "submissionDate", e.target.value)
                    }
                  />
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
              <div className="mt-4">
                <FileUploadSection
                  label="Upload File"
                  value={entry.file || null}
                  onChange={(file) => updateProject(entry.id, "file", file)}
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
            Annex 7: Provide VGF/IIPDF details
          </p>
          </div>

        </div>
      </SectionCard>

      {/* Section 3.4 */}
      <SectionCard
        title={<div className="flex flex-col">
          <span className="text-base font-semibold ">
            <span className="text-primary">3.4 - </span> Proportion of TPC of PPP Projects{" "}
          </span>
        </div>}
        subtitle=""
        className="mb-6"
      >
        <div className="grid grid-cols-2 gap-4 w-[70%]">
          <div>
            <Label>A₁ - TPC of PPP Projects*</Label>
            <Input
              type="number"
              placeholder="500"
              value={formData.section3_4.tpcOfPPPProjects}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section3_4: {
                    ...formData.section3_4,
                    tpcOfPPPProjects: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <Label>A₂ - Total TPC*</Label>
            <Input
              type="number"
              placeholder="1000"
              value={formData.section3_4.totalTPC}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section3_4: {
                    ...formData.section3_4,
                    totalTPC: e.target.value,
                  },
                })
              }
            />
          </div>
        </div>
      </SectionCard>

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
