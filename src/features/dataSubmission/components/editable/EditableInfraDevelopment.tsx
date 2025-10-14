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
  OWNERSHIP_OPTIONS,
  MONETIZATION_STATUS_OPTIONS,
} from "@/features/submission/constants/steps";
import type { InfraDevelopmentData, FileUpload } from "@/features/submission/types";

interface EditableInfraDevelopmentProps {
  submissionId: string;
  submission?: any;
}

const defaultData: InfraDevelopmentData = {
  section2_1: [],
  section2_2: [],
  section2_3: [],
  section2_4: [],
  section2_5: [],
};

export const EditableInfraDevelopment = ({ submissionId, submission }: EditableInfraDevelopmentProps) => {
  const { getStepData, updateFormData } = useReviewFormPersistence(submissionId);

  // Initialize form data with submission data if available
  useEffect(() => {
    if (submission?.formData?.infraDevelopment) {
      console.log("🔍 Loading submission data into form:", submission.formData.infraDevelopment);
      const submissionData = submission.formData.infraDevelopment;
      setFormData({
        ...defaultData,
        ...submissionData,
        section2_1: submissionData.section2_1 || [],
        section2_2: submissionData.section2_2 || [],
        section2_3: submissionData.section2_3 || [],
        section2_4: submissionData.section2_4 || [],
        section2_5: submissionData.section2_5 || [],
      });
      updateFormData("infraDevelopment", submissionData);
    }
  }, [submission, updateFormData]);

  // Load data from localStorage or use defaults
  const loadedData = (getStepData("infraDevelopment") as Partial<InfraDevelopmentData>) || {};
  const initialData: InfraDevelopmentData = {
    ...defaultData,
    ...loadedData,
    section2_1: loadedData.section2_1 || [],
    section2_2: loadedData.section2_2 || [],
    section2_3: loadedData.section2_3 || [],
    section2_4: loadedData.section2_4 || [],
    section2_5: loadedData.section2_5 || [],
  };

  const [formData, setFormData] = useState<InfraDevelopmentData>(initialData);

  // Auto-save to localStorage on every change
  useEffect(() => {
    updateFormData("infraDevelopment", formData);
  }, [formData, updateFormData]);

  // Section 2.1, 2.2, 2.3 handlers
  const addEntry = (section: "section2_1" | "section2_2" | "section2_3") => {
    setFormData((prev) => ({
      ...prev,
      [section]: [
        ...prev[section],
        { id: crypto.randomUUID(), sector: "", files: [] },
      ],
    }));
  };

  const removeEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: prev[section].filter((entry) => entry.id !== id),
    }));
  };

  const updateEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string,
    field: "sector" | "files",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: prev[section].map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  // Section 2.4 handlers
  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      section2_4: [
        ...prev.section2_4,
        { id: crypto.randomUUID(), projectName: "", dprFile: null },
      ],
    }));
  };

  const removeProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section2_4: prev.section2_4.filter((entry) => entry.id !== id),
    }));
  };

  const updateProject = (
    id: string,
    field: "projectName" | "dprFile",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section2_4: prev.section2_4.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  // Section 2.5 handlers
  const addAsset = () => {
    setFormData((prev) => ({
      ...prev,
      section2_5: [
        ...prev.section2_5,
        {
          id: crypto.randomUUID(),
          projectName: "",
          sector: "",
          type: "",
          ownership: "",
          estimatedMonetization: "",
        },
      ],
    }));
  };

  const removeAsset = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section2_5: prev.section2_5.filter((entry) => entry.id !== id),
    }));
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
    setFormData((prev) => ({
      ...prev,
      section2_5: prev.section2_5.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section 2.1 */}
        <SectionCard
          title="2.1 - Availability of Infrastructure Act/Policy"
          subtitle="(10 marks per sector, min. 3 sectors)"
        >
          <div className="flex flex-col gap-4">
            {formData.section2_1.map((entry, idx) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-card">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <Label>
                      Select Sector <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={entry.sector}
                      onValueChange={(value) =>
                        updateEntry("section2_1", entry.id, "sector", value)
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
                  <div className="flex-1 w-full">
                    <FileUploadSection
                      label="Upload File"
                      value={entry.files[0] || null}
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
                    className="self-start mt-6"
                    onClick={() => removeEntry("section2_1", entry.id)}
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
              onClick={() => addEntry("section2_1")}
              className="w-fit gap-2"
            >
              <Plus className="w-4 h-4" />
              Add More Entry
            </Button>
            <p className="text-xs text-muted-foreground">Upload copy of Act/Policy</p>
          </div>
        </SectionCard>

        {/* Section 2.2 */}
        <SectionCard
          title="2.2 - Availability of Specialized Entity"
          subtitle="(10 marks per sector, min. 3 sectors)"
        >
          <div className="flex flex-col gap-4">
            {formData.section2_2.map((entry, idx) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-card">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <Label>
                      Select Sector <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={entry.sector}
                      onValueChange={(value) =>
                        updateEntry("section2_2", entry.id, "sector", value)
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
                  <div className="flex-1 w-full">
                    <FileUploadSection
                      label="Upload File"
                      value={entry.files[0] || null}
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
                    className="self-start mt-6"
                    onClick={() => removeEntry("section2_2", entry.id)}
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
              onClick={() => addEntry("section2_2")}
              className="w-fit gap-2"
            >
              <Plus className="w-4 h-4" />
              Add More Entry
            </Button>
            <p className="text-xs text-muted-foreground">Upload evidence</p>
          </div>
        </SectionCard>

        {/* Section 2.3 */}
        <SectionCard
          title="2.3 - Availability of Sector Infra Development Plan"
          subtitle="(10 marks per sector, min. 3 sectors)"
        >
          <div className="flex flex-col gap-4">
            {formData.section2_3.map((entry, idx) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-card">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full">
                    <Label>
                      Select Sector <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={entry.sector}
                      onValueChange={(value) =>
                        updateEntry("section2_3", entry.id, "sector", value)
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
                  <div className="flex-1 w-full">
                    <FileUploadSection
                      label="Upload File"
                      value={entry.files[0] || null}
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
                    className="self-start mt-6"
                    onClick={() => removeEntry("section2_3", entry.id)}
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
              onClick={() => addEntry("section2_3")}
              className="w-fit gap-2"
            >
              <Plus className="w-4 h-4" />
              Add More Entry
            </Button>
            <p className="text-xs text-muted-foreground">Upload development plan</p>
          </div>
        </SectionCard>

        {/* Section 2.4 */}
        <SectionCard
          title="2.4 - Projects with DPR/Feasibility Report"
          subtitle="(10 marks per project)"
        >
          <div className="space-y-4">
            {formData.section2_4.map((project, index) => (
              <div key={project.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Project {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeProject(project.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Project Name*</Label>
                    <Input
                      placeholder="Enter project name"
                      value={project.projectName}
                      onChange={(e) =>
                        updateProject(project.id, "projectName", e.target.value)
                      }
                    />
                  </div>
                  <FileUploadSection
                    label="Upload DPR/Feasibility Report"
                    value={project.dprFile}
                    onChange={(file) => updateProject(project.id, "dprFile", file)}
                    required
                  />
                </div>
              </div>
            ))}
            <Button onClick={addProject} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
          </div>
        </SectionCard>

        {/* Section 2.5 */}
        <SectionCard
          title="2.5 - Asset Monetization Portfolio"
          subtitle="(10 marks per asset)"
        >
          <div className="space-y-4">
            {formData.section2_5.map((asset, index) => (
              <div key={asset.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Asset {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAsset(asset.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Project Name*</Label>
                    <Input
                      placeholder="Enter project name"
                      value={asset.projectName}
                      onChange={(e) =>
                        updateAsset(asset.id, "projectName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Sector*</Label>
                    <Select
                      value={asset.sector}
                      onValueChange={(value) =>
                        updateAsset(asset.id, "sector", value)
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
                    <Label>Type*</Label>
                    <Select
                      value={asset.type}
                      onValueChange={(value) => updateAsset(asset.id, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONETIZATION_STATUS_OPTIONS.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ownership*</Label>
                    <Select
                      value={asset.ownership}
                      onValueChange={(value) =>
                        updateAsset(asset.id, "ownership", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ownership" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_OPTIONS.map((ownership) => (
                          <SelectItem key={ownership} value={ownership}>
                            {ownership}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estimated Monetization Value</Label>
                    <Input
                      placeholder="₹ Crores"
                      value={asset.estimatedMonetization}
                      onChange={(e) =>
                        updateAsset(
                          asset.id,
                          "estimatedMonetization",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addAsset} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Asset
            </Button>
          </div>
        </SectionCard>
      </div>
    </TooltipProvider>
  );
};
