import { useState, useEffect } from "react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { FileUploadSection } from "@/features/submission/components/FileUploadSection";
import { useReviewFormPersistence } from "../../hooks/useReviewFormPersistence";
import {
  IMPACT_OPTIONS,
  TRAINING_TYPE_OPTIONS,
  SECTOR_OPTIONS,
  OWNERSHIP_OPTIONS,
} from "@/features/submission/constants/steps";
import type { InfraEnablersData, FileUpload } from "@/features/submission/types";

interface EditableInfraEnablersProps {
  submissionId: string;
}

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
    adopted: "",
    file: null,
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

export const EditableInfraEnablers = ({ submissionId }: EditableInfraEnablersProps) => {
  const { getStepData, updateFormData } = useReviewFormPersistence(submissionId);

  // Load data from localStorage or use defaults
  const loadedData = (getStepData("infraEnablers") as Partial<InfraEnablersData>) || {};
  const initialData: InfraEnablersData = {
    ...defaultData,
    ...loadedData,
    section4_1: { ...defaultData.section4_1, ...(loadedData.section4_1 || {}) },
    section4_2: { ...defaultData.section4_2, ...(loadedData.section4_2 || {}) },
    section4_3: { ...defaultData.section4_3, ...(loadedData.section4_3 || {}) },
    section4_4: { ...defaultData.section4_4, ...(loadedData.section4_4 || {}) },
    section4_5: { ...defaultData.section4_5, ...(loadedData.section4_5 || {}) },
    section4_6: loadedData.section4_6 || [],
  };

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);

  // Auto-save to localStorage on every change
  useEffect(() => {
    updateFormData("infraEnablers", formData);
  }, [formData, updateFormData]);

  // Section 4.6 handlers
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
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: prev.section4_6.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section 4.1 */}
        <SectionCard
          title="4.1 - Eligible Infrastructure Projects"
          subtitle="(50 marks)"
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
                <input
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
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div>
              <Label>Website Link</Label>
              <Input
                placeholder="Enter website URL"
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
          subtitle="(50 marks)"
        >
          <div className="flex flex-col gap-4">
            <Label>
              Availability & Use of State/UT PMG{" "}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="inline w-3 h-3 ml-1" />
                </TooltipTrigger>
                <TooltipContent>Is State/UT PMG available and used?</TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <FileUploadSection
                label="Upload File"
                value={formData.section4_2.file}
                onChange={(file) =>
                  setFormData((prev) => ({
                    ...prev,
                    section4_2: { ...prev.section4_2, file },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Upload evidence</p>
            </div>
          </div>
        </SectionCard>

        {/* Section 4.3 */}
        <SectionCard
          title="4.3 - Adoption of PM GatiShakti (5 marks per 1%)"
          subtitle="(50 marks)"
        >
          <div className="flex flex-col gap-4">
            <Label>
              Adoption of PM GatiShakti{" "}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="inline w-3 h-3 ml-1" />
                </TooltipTrigger>
                <TooltipContent>Is PM GatiShakti adopted?</TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gati-shakti"
                  value="yes"
                  checked={formData.section4_3.adopted === "yes"}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      section4_3: { ...prev.section4_3, adopted: "yes" },
                    }))
                  }
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gati-shakti"
                  value="no"
                  checked={formData.section4_3.adopted === "no"}
                  onChange={() =>
                    setFormData((prev) => ({
                      ...prev,
                      section4_3: { ...prev.section4_3, adopted: "no" },
                    }))
                  }
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <FileUploadSection
                label="Upload File"
                value={formData.section4_3.file}
                onChange={(file) =>
                  setFormData((prev) => ({
                    ...prev,
                    section4_3: { ...prev.section4_3, file },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Upload GatiShakti evidence
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Section 4.4 */}
        <SectionCard
          title="4.4 - Adoption of ADR (10 marks per practice)"
          subtitle="(50 marks)"
        >
          <div className="flex flex-col gap-4">
            <Label>
              Adoption of ADR{" "}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="inline w-3 h-3 ml-1" />
                </TooltipTrigger>
                <TooltipContent>Is ADR adopted?</TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <FileUploadSection
                label="Upload File"
                value={formData.section4_4.file}
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
          subtitle="(50 marks)"
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
                <input
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
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Practice Name</Label>
                <Input
                  placeholder="Enter practice name"
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
                <Label>Impact</Label>
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
                    <SelectValue placeholder="Select impact" />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPACT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <FileUploadSection
                label="Upload File"
                value={formData.section4_5.file}
                onChange={(file) =>
                  setFormData((prev) => ({
                    ...prev,
                    section4_5: { ...prev.section4_5, file },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Upload documentation of innovative practices
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Section 4.6 */}
        <SectionCard
          title="4.6 - Officer Training Programs"
          subtitle="(10 marks per officer trained)"
        >
          <div className="space-y-4">
            {formData.section4_6.map((training, index) => (
              <div key={training.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Training Record {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTraining(training.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Officer Name*</Label>
                    <Input
                      placeholder="Enter officer name"
                      value={training.officerName}
                      onChange={(e) =>
                        updateTraining(training.id, "officerName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Designation*</Label>
                    <Input
                      placeholder="Enter designation"
                      value={training.designation}
                      onChange={(e) =>
                        updateTraining(training.id, "designation", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Program Name*</Label>
                    <Input
                      placeholder="Enter program name"
                      value={training.programName}
                      onChange={(e) =>
                        updateTraining(training.id, "programName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Organiser*</Label>
                    <Input
                      placeholder="Enter organiser name"
                      value={training.organiser}
                      onChange={(e) =>
                        updateTraining(training.id, "organiser", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Training Type*</Label>
                    <Select
                      value={training.trainingType}
                      onValueChange={(value) =>
                        updateTraining(training.id, "trainingType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select training type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAINING_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addTraining} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Training Record
            </Button>
          </div>
        </SectionCard>
      </div>
    </TooltipProvider>
  );
};
