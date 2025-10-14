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
  SECTOR_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from "@/features/submission/constants/steps";
import type { PPPDevelopmentData, FileUpload } from "@/features/submission/types";

interface EditablePPPDevelopmentProps {
  submissionId: string;
  submission?: any;
}

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
    projectName: "",
    sector: "",
    nipId: "",
    dateOfAward: "",
    fundingSource: "",
    capexFundedPercentage: "",
  },
};

export const EditablePPPDevelopment = ({ submissionId, submission }: EditablePPPDevelopmentProps) => {
  const { getStepData, updateFormData } = useReviewFormPersistence(submissionId);

  // Get data from persistence hook (this will be the source of truth)
  const persistedData = (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};
  
  console.log("🔍 EditablePPPDevelopment - persistedData:", persistedData);
  
  // Create form data by merging persisted data with defaults
  const createFormData = (data: Partial<PPPDevelopmentData>): PPPDevelopmentData => ({
    ...defaultData,
    ...data,
    section3_1: { ...defaultData.section3_1, ...(data.section3_1 || {}) },
    section3_2: { ...defaultData.section3_2, ...(data.section3_2 || {}) },
    section3_3: data.section3_3 || [],
    section3_4: { ...defaultData.section3_4, ...(data.section3_4 || {}) },
  });

  const [formData, setFormData] = useState<PPPDevelopmentData>(() => 
    createFormData(persistedData)
  );

  // Sync with persisted data when it changes
  useEffect(() => {
    const currentPersistedData = (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};
    const newFormData = createFormData(currentPersistedData);
    
    // Only update if data has actually changed
    if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
      console.log("🔄 Syncing form data with persisted data:", newFormData);
      setFormData(newFormData);
    }
  }, [persistedData]); // Depend on persistedData from hook

  // Auto-save to localStorage on every change
  useEffect(() => {
    updateFormData("pppDevelopment", formData);
  }, [formData, updateFormData]);

  // Section 3.3 handlers
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
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: prev.section3_3.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  // Section 3.4 handlers
  const updateProportion = (
    field:
      | "projectName"
      | "sector"
      | "nipId"
      | "dateOfAward"
      | "fundingSource"
      | "capexFundedPercentage",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: { ...prev.section3_4, [field]: value },
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section 3.1 */}
        <SectionCard
          title="3.1 - Availability of Infrastructure Act/Policy"
          subtitle="(50 marks)"
        >
          <div className="flex flex-col gap-4">
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
                <input
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
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <FileUploadSection
                label="Upload File"
                value={formData.section3_1.file}
                onChange={(file) =>
                  setFormData((prev) => ({
                    ...prev,
                    section3_1: { ...prev.section3_1, file },
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Upload copy of Act/Policy</p>
            </div>
          </div>
        </SectionCard>

        {/* Section 3.2 */}
        <SectionCard
          title="3.2 - Functional PPP Cell/Unit"
          subtitle="(50 marks)"
        >
          <div className="flex flex-col gap-4">
            <Label>
              Functional State/UT PPP Cell/Unit{" "}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="inline w-3 h-3 ml-1" />
                </TooltipTrigger>
                <TooltipContent>Is there a functional PPP Cell/Unit?</TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
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
                  className="w-4 h-4"
                />
                No
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <FileUploadSection
                label="Upload File"
                value={formData.section3_2.file}
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
          title="3.3 - Proposals Submitted under VGF/IIPDF"
          subtitle="(50 marks - 10 marks per project)"
        >
          <div className="flex flex-col gap-4">
            {formData.section3_3.map((entry, idx) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Project {idx + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProject(entry.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Project Name*</Label>
                    <Input
                      placeholder="Enter project name"
                      value={entry.projectName}
                      onChange={(e) =>
                        updateProject(entry.id, "projectName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Select Sector*</Label>
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
                    <Label>Select Type*</Label>
                    <Select
                      value={entry.type}
                      onValueChange={(value) => updateProject(entry.id, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
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
                    <Label>Submission Date*</Label>
                    <Input
                      type="date"
                      value={entry.submissionDate}
                      onChange={(e) =>
                        updateProject(entry.id, "submissionDate", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <FileUploadSection
                    label="Upload File"
                    value={entry.file}
                    onChange={(file) => updateProject(entry.id, "file", file)}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProject}
              className="w-fit gap-2"
            >
              <Plus className="w-4 h-4" />
              Add More Project
            </Button>
            <p className="text-xs text-muted-foreground">
              Annex 7: Provide VGF/IIPDF details
            </p>
          </div>
        </SectionCard>

        {/* Section 3.4 */}
        <SectionCard
          title="3.4 - Proportion of TPC of PPP Projects"
          subtitle="(100 marks - 10 marks per 10% PPP funding)"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Name of PPP/Bankable Projects*</Label>
              <Input
                placeholder="Enter project name"
                value={formData.section3_4.projectName}
                onChange={(e) => updateProportion("projectName", e.target.value)}
              />
            </div>
            <div>
              <Label>Infrastructure Sector*</Label>
              <Select
                value={formData.section3_4.sector}
                onValueChange={(value) => updateProportion("sector", value)}
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
            <div>
              <Label>NIP ID</Label>
              <Input
                placeholder="Enter NIP ID"
                value={formData.section3_4.nipId}
                onChange={(e) => updateProportion("nipId", e.target.value)}
              />
            </div>
            <div>
              <Label>Date of Award*</Label>
              <Input
                type="date"
                value={formData.section3_4.dateOfAward}
                onChange={(e) => updateProportion("dateOfAward", e.target.value)}
              />
            </div>
            <div>
              <Label>Funding Source (in case of bankable project)</Label>
              <Input
                placeholder="Enter funding source name"
                value={formData.section3_4.fundingSource}
                onChange={(e) => updateProportion("fundingSource", e.target.value)}
              />
            </div>
            <div>
              <Label>% of Capex funded by non-Govt sources*</Label>
              <Input
                placeholder="Enter percentage"
                value={formData.section3_4.capexFundedPercentage}
                onChange={(e) =>
                  updateProportion("capexFundedPercentage", e.target.value)
                }
              />
            </div>
          </div>
        </SectionCard>
      </div>
    </TooltipProvider>
  );
};
