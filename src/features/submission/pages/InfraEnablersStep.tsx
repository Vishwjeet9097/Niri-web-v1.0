import { useEffect, useState } from "react";
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
  const { currentStep, goToNext, goToPrevious, isLastStep } = useStepNavigation(4);
  const { formData: persistedFormData, getStepData, updateFormData } = useFormPersistence();
  const { user } = useAuth();

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
    section4_6: Array.isArray(loadedData.section4_6) ? loadedData.section4_6 : [],
  };

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Also check for editing submission data directly
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log("🔍 Direct editing submission check in InfraEnablersStep:", submissionData);
        
        if (submissionData.formData && submissionData.formData.infraEnablers) {
          const stepData = submissionData.formData.infraEnablers as Partial<InfraEnablersData>;
          const updatedData: InfraEnablersData = {
            ...defaultData,
            ...stepData,
            section4_1: { ...defaultData.section4_1, ...(stepData.section4_1 || {}) },
            section4_2: { ...defaultData.section4_2, ...(stepData.section4_2 || {}) },
            section4_3: { ...defaultData.section4_3, ...(stepData.section4_3 || {}) },
            section4_4: { ...defaultData.section4_4, ...(stepData.section4_4 || {}) },
            section4_5: { ...defaultData.section4_5, ...(stepData.section4_5 || {}) },
            section4_6: stepData.section4_6 || [],
          };
          setFormData(updatedData);
          console.log("✅ Direct prefill from editing submission:", updatedData);
          
          // Clear the editing submission data after successful prefill
          localStorage.removeItem("editing_submission");
        }
      } catch (error) {
        console.error("❌ Failed to parse editing submission in InfraEnablersStep:", error);
        localStorage.removeItem("editing_submission");
      }
    }
  }, []);

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

    setFormData(prev => ({
      ...prev,
      section4_3: {
        ...prev.section4_3,
        marksObtained: section4_3Calc.marksObtained
      },
      section4_4: {
        ...prev.section4_4,
        marksObtained: section4_4Calc.marksObtained
      },
      section4_6: prev.section4_6.map(participant => ({
        ...participant,
        marksObtained: section4_6Calc.marksObtained
      }))
    }));
  }, [formData.section4_3.numberOfProjects, formData.section4_4.adopted, formData.section4_6.length]);

  // Calculation functions
  const calculateSection4_3 = () => {
    // A₁: Number of projects
    const numberOfProjects = parseInt(formData.section4_3.numberOfProjects);
    
    if (isNaN(numberOfProjects)) {
      return { marksObtained: 0 };
    }
    
    // Marks: MIN(A₁ × 5, 20)
    const marksObtained = Math.min(numberOfProjects * 5, 20);
    
    return {
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  };

  const calculateSection4_4 = () => {
    // For section 4.4, marks = IF adopted = 'Yes' THEN 50 ELSE 0
    const marksObtained = formData.section4_4.adopted === "yes" ? 50 : 0;
    
    return {
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  };

  const calculateSection4_6 = () => {
    // For section 4.6, marks = MIN(number of participants × 1, 50)
    const totalParticipants = formData.section4_6.reduce((sum, training) => {
      // Since we don't have participants field, we'll use 1 per training
      return sum + 1;
    }, 0);
    
    const marksObtained = Math.min(totalParticipants * 1, 50);
    
    return {
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  };


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
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: prev.section4_6.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
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
    try {
      // Save to localStorage first
      updateFormData("infraEnablers", formData);
      
      // Generate submission ID if not exists
      const submissionId = `DRAFT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      // Save to backend
      const success = await draftService.saveDraft(
        submissionId, 
        formData, 
        "infraEnablers",
        user?.id,
        user?.state
      );
      
      if (success) {
        toast({
          title: "Draft Saved",
          description: "Your Infra Enablers data has been saved.",
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
    <div className="max-w-6xl mx-auto p-6">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />
      <ProgressHeader
        title="Infrastructure Enablers"
        description="Regulatory and institutional frameworks supporting infrastructure"
        points={250}
        completed={0}
        total={6}
        progress={0}
      />


      {/* Section 4.1 */}
      <SectionCard
        title="4.1 - Eligible Infrastructure Projects"
        subtitle=""
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
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
                    section4_1: { ...prev.section4_1, allEligible: "yes" },
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
          <div>
            <Label>Website Link</Label>
            <Input
              type="url"
              placeholder="Enter project name"
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

      {/* Section 4.2 */}
      <SectionCard
        title="4.2 - Availability & Use of State/UT PMG"
        subtitle=""
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
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
        </div>
      </SectionCard>

      {/* Section 4.3 */}
      <SectionCard
        title="4.3 - Adoption of PM GatiShakti (5 marks per 1%)"
        subtitle=""
        className="mb-6"
      >
        <div className="space-y-4">
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

      {/* Section 4.4 */}
      <SectionCard
        title="4.4 - Adoption of ADR (10 marks per practice)"
        subtitle=""
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
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
          
        </div>
      </SectionCard>

      {/* Section 4.5 */}
      <SectionCard
        title="4.5 - Innovative Practices (10 marks per practice)"
        subtitle=""
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
          <Label>
            Innovation Practices{" "}
            <Tooltip>
              <TooltipTrigger>
                <Info className="inline w-3 h-3 ml-1" />
              </TooltipTrigger>
              <TooltipContent>Are there innovative practices?</TooltipContent>
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
                    section4_5: { ...prev.section4_5, implemented: "yes" },
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Practice Name</Label>
              <Input
                type="text"
                placeholder="Year"
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
            <p className="text-xs text-muted-foreground">Upload evidence</p>
          </div>
        </div>
      </SectionCard>

      {/* Section 4.6 */}
      <SectionCard
        title="4.6 - Capacity Building - Officer Participation (1 marks per officer)"
        subtitle="Annex 11"
        className="mb-6"
      >
        <div className="flex flex-col gap-4">
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
            <label className="flex items-center gap-2">
              <Input
                type="radio"
                name="capacity-building"
                value="yes"
                checked={formData.section4_6.length > 0}
                readOnly
              />
              Yes
            </label>
            <label className="flex items-center gap-2">
              <Input
                type="radio"
                name="capacity-building"
                value="no"
                checked={formData.section4_6.length === 0}
                readOnly
              />
              No
            </label>
          </div>
          {formData.section4_6.map((entry, idx) => (
            <div key={entry.id} className="border rounded-lg p-4 bg-white mb-2">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div>
                  <Label>Officer Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter officer name"
                    value={entry.officerName}
                    onChange={(e) =>
                      updateTraining(entry.id, "officerName", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Designation</Label>
                  <Select
                    value={entry.designation}
                    onValueChange={(value) =>
                      updateTraining(entry.id, "designation", value)
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
                  <Label>Program Name</Label>
                  <Select
                    value={entry.programName}
                    onValueChange={(value) =>
                      updateTraining(entry.id, "programName", value)
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
                  <Label>Organiser</Label>
                  <Select
                    value={entry.organiser}
                    onValueChange={(value) =>
                      updateTraining(entry.id, "organiser", value)
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
                <div>
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
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTraining}
            className="w-fit"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add More Training
          </Button>
          <p className="text-xs text-muted-foreground">Annex 11</p>
          
        </div>
      </SectionCard>

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
