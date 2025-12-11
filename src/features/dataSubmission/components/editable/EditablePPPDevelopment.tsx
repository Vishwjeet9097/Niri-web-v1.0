import { useState, useEffect } from "react";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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
    projects: [],
  },
};

export const EditablePPPDevelopment = ({ submissionId, submission }: EditablePPPDevelopmentProps) => {
  const { getStepData, updateFormData } = useReviewFormPersistence(submissionId);

  // Get data from persistence hook (this will be the source of truth)
  const persistedData = (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};
    // Debug logging removed for performance

  // Create form data by merging persisted data with defaults
  const createFormData = (data: Partial<PPPDevelopmentData>): PPPDevelopmentData => ({
    ...defaultData,
    ...data,
    section3_1: { ...defaultData.section3_1, ...(data.section3_1 || {}) },
    section3_2: { ...defaultData.section3_2, ...(data.section3_2 || {}) },
    section3_3: data.section3_3 || [],
    section3_4: { 
      projects: data.section3_4?.projects || defaultData.section3_4.projects,
    },
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
        projects: (prev.section3_4.projects || []).filter((entry) => entry.id !== id),
      },
    }));
  };

  const updatePPPProject = (
    id: string,
    field: "nameOfProject" | "nipId" | "fundingSource" | "infrastructureSector" | "dateOfAward" | "capexPercentage",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: (prev.section3_4.projects || []).map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry,
        ),
      },
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
            {formData.section3_1.available === "yes" && (
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
            )}
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
            {formData.section3_2.available === "yes" && (
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
            )}
          </div>
        </SectionCard>

        {/* Section 3.3 */}
        <SectionCard
          title="3.3 - Proposals Submitted under VGF/IIPDF"
          subtitle="(50 marks - 10 marks per project)"
        >
          <div className="flex flex-col gap-4">
            {Array.isArray(formData.section3_3?.VGFArray)
              ? formData.section3_3.VGFArray.map((rawEntry, idx) => {
                  const entry = {
                    id: '',
                    projectName: '',
                    sector: '',
                    type: '',
                    submissionDate: '',
                    file: null,
                    marksObtained: 0,
                    ...rawEntry
                  };
                  return (
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                  !entry.submissionDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {entry.submissionDate ? format(new Date(entry.submissionDate), "dd-MM-yyyy") : "DD-MM-YYYY"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={entry.submissionDate ? new Date(entry.submissionDate) : undefined}
                                onSelect={(date) =>
                                  updateProject(entry.id, "submissionDate", date ? date.toISOString() : "")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
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
                  );
                })
              : []}
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
              {/* Annex 7: Provide VGF/IIPDF details */}
            </p>
          </div>
        </SectionCard>

        {/* Section 3.4 */}
        <SectionCard
          title="3.4 - Proportion of TPC of PPP Projects"
          subtitle="(100 marks - 10 marks per 10% PPP funding)"
        >
          <div className="flex flex-col gap-4">
            {(formData.section3_4.projects || []).map((rawProject, idx) => {
              const project = {
                id: '',
                nameOfProject: '',
                nipId: '',
                fundingSource: '',
                infrastructureSector: '',
                dateOfAward: '',
                capexPercentage: '',
                totalProjectCost: '',
                ...rawProject
              };
              return (
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
                          <TooltipContent>Enter the name of the PPP or Bankable project</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter project name"
                        value={project.nameOfProject}
                        onChange={(e) =>
                          updatePPPProject(project.id, "nameOfProject", e.target.value)
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
                          <TooltipContent>Enter the NIP ID of the project</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter NIP ID"
                        value={project.nipId}
                        onChange={(e) =>
                          updatePPPProject(project.id, "nipId", e.target.value)
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
                          <TooltipContent>Enter the funding source name</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter funding source name"
                        value={project.fundingSource}
                        onChange={(e) =>
                          updatePPPProject(project.id, "fundingSource", e.target.value)
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
                          <TooltipContent>Select the infrastructure sector</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select
                        value={project.infrastructureSector}
                        onValueChange={(value) =>
                          updatePPPProject(project.id, "infrastructureSector", value)
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
                          <TooltipContent>Select the date of award</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                              !project.dateOfAward && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {project.dateOfAward ? format(new Date(project.dateOfAward), "dd-MM-yyyy") : "DD-MM-YYYY"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={project.dateOfAward ? new Date(project.dateOfAward) : undefined}
                            onSelect={(date) =>
                              updatePPPProject(project.id, "dateOfAward", date ? date.toISOString() : "")
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
                          <TooltipContent>Enter the percentage of Capex funded by non-government sources</TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        type="text"
                        placeholder="Enter percentage"
                        value={project.capexPercentage}
                        onChange={(e) =>
                          updatePPPProject(project.id, "capexPercentage", e.target.value)
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
              );
            })}

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
      </div>
    </TooltipProvider>
  );
};
