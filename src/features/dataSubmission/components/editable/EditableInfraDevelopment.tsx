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
import type {
  InfraDevelopmentData,
  FileUpload,
} from "@/features/submission/types";

interface EditableInfraDevelopmentProps {
  submissionId: string;
  submission?: any;
}

const defaultData: InfraDevelopmentData = {
  section2_1: { infraActArray: [] },
  section2_2: { specializedEntityArray: [] },
  section2_3: { infraDevelopmentArray: [] },
  section2_4: { investmentReadyArray: [] },
  section2_5: {
    assetMonetizationArray: [],
    hasAssetMonetization: "",
    comment: "",
  },
};

export const EditableInfraDevelopment = ({
  submissionId,
  submission,
}: EditableInfraDevelopmentProps) => {
  const { getStepData, updateFormData } =
    useReviewFormPersistence(submissionId);

  // Get data from persistence hook (this will be the source of truth)
  const persistedData =
    (getStepData("infraDevelopment") as Partial<InfraDevelopmentData>) || {};
  // Debug logging removed for performance

  // Create form data by merging persisted data with defaults
  const createFormData = (
    data: Partial<InfraDevelopmentData>
  ): InfraDevelopmentData => ({
    ...defaultData,
    ...data,
    section2_1:
      data.section2_1 && Array.isArray(data.section2_1.infraActArray)
        ? { infraActArray: data.section2_1.infraActArray }
        : { infraActArray: [] },
    section2_2:
      data.section2_2 && Array.isArray(data.section2_2.specializedEntityArray)
        ? { specializedEntityArray: data.section2_2.specializedEntityArray }
        : { specializedEntityArray: [] },
    section2_3:
      data.section2_3 && Array.isArray(data.section2_3.infraDevelopmentArray)
        ? { infraDevelopmentArray: data.section2_3.infraDevelopmentArray }
        : { infraDevelopmentArray: [] },
    section2_4:
      data.section2_4 && Array.isArray(data.section2_4.investmentReadyArray)
        ? { investmentReadyArray: data.section2_4.investmentReadyArray }
        : { investmentReadyArray: [] },
    section2_5:
      data.section2_5 && Array.isArray(data.section2_5.assetMonetizationArray)
        ? {
            assetMonetizationArray: data.section2_5.assetMonetizationArray,
            hasAssetMonetization: data.section2_5.hasAssetMonetization || "",
            comment: data.section2_5.comment || "",
          }
        : {
            assetMonetizationArray: [],
            hasAssetMonetization: "",
            comment: "",
          },
  });

  const [formData, setFormData] = useState<InfraDevelopmentData>(() =>
    createFormData(persistedData)
  );

  // Sync with persisted data when it changes
  useEffect(() => {
    const currentPersistedData =
      (getStepData("infraDevelopment") as Partial<InfraDevelopmentData>) || {};
    const newFormData = createFormData(currentPersistedData);

    // Only update if data has actually changed
    if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
      console.log("🔄 Syncing form data with persisted data:", newFormData);
      setFormData(newFormData);
    }
  }, [persistedData]); // Depend on persistedData from hook

  // Auto-save to localStorage on every change
  useEffect(() => {
    updateFormData("infraDevelopment", formData);
  }, [formData, updateFormData]);

  // Section 2.1, 2.2, 2.3 handlers
  const addEntry = (section: "section2_1" | "section2_2" | "section2_3") => {
    const arrayKey =
      section === "section2_1"
        ? "infraActArray"
        : section === "section2_2"
        ? "specializedEntityArray"
        : "infraDevelopmentArray";
    setFormData((prev) => ({
      ...prev,
      [section]: {
        [arrayKey]: [
          ...(prev[section]?.[arrayKey] || []),
          { id: crypto.randomUUID(), sector: "", files: [] },
        ],
      },
    }));
  };

  const removeEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string
  ) => {
    const arrayKey =
      section === "section2_1"
        ? "infraActArray"
        : section === "section2_2"
        ? "specializedEntityArray"
        : "infraDevelopmentArray";
    setFormData((prev) => ({
      ...prev,
      [section]: {
        [arrayKey]: (prev[section]?.[arrayKey] || []).filter(
          (entry) => entry.id !== id
        ),
      },
    }));
  };

  const updateEntry = (
    section: "section2_1" | "section2_2" | "section2_3",
    id: string,
    field: "sector" | "files",
    value: any
  ) => {
    const arrayKey =
      section === "section2_1"
        ? "infraActArray"
        : section === "section2_2"
        ? "specializedEntityArray"
        : "infraDevelopmentArray";
    setFormData((prev) => ({
      ...prev,
      [section]: {
        [arrayKey]: (prev[section]?.[arrayKey] || []).map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  // Section 2.4 handlers
  const addProject = () => {
    const generateId = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return Math.random().toString(36).substr(2, 9);
    };
    setFormData((prev) => ({
      ...prev,
      section2_4: {
        investmentReadyArray: [
          ...(prev.section2_4?.investmentReadyArray || []),
          {
            id: generateId(),
            projectName: "",
            dprFile: null,
            sector: "",
            status: "",
            projectSize: "",
            investmentType: "",
          },
        ],
      },
    }));
  };

  const removeProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section2_4: {
        investmentReadyArray: (
          prev.section2_4?.investmentReadyArray || []
        ).filter((entry) => entry.id !== id),
      },
    }));
  };

  const updateProject = (
    id: string,
    field: "projectName" | "dprFile",
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      section2_4: {
        investmentReadyArray: (prev.section2_4?.investmentReadyArray || []).map(
          (entry) => (entry.id === id ? { ...entry, [field]: value } : entry)
        ),
      },
    }));
  };

  // Section 2.5 handlers
  const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substr(2, 9);
  };

  const addAsset = () => {
    setFormData((prev) => ({
      ...prev,
      section2_5: {
        assetMonetizationArray: [
          ...(prev.section2_5?.assetMonetizationArray || []),
          {
            id: generateId(),
            projectName: "",
            sector: "",
            type: "",
            ownership: "",
            estimatedMonetization: "",
          },
        ],
      },
    }));
  };

  const removeAsset = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section2_5: {
        assetMonetizationArray: (
          prev.section2_5?.assetMonetizationArray || []
        ).filter((entry) => entry.id !== id),
      },
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
      section2_5: {
        assetMonetizationArray: (
          prev.section2_5?.assetMonetizationArray || []
        ).map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section 2.1 */}
        <SectionCard
          title="2.1 - Availability of Infrastructure Act/Policy"
          // subtitle="(10 marks per sector, min. 3 sectors)"
        >
          <div className="flex flex-col gap-4">
            {formData.section2_1.infraActArray.map((entry, idx) => (
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
            <p className="text-xs text-muted-foreground">
              Upload copy of Act/Policy
            </p>
          </div>
        </SectionCard>

        {/* Section 2.2 */}
        <SectionCard
          title="2.2 - Availability of Specialized Entity"
          // subtitle="(10 marks per sector, min. 3 sectors)"
        >
          <div className="flex flex-col gap-4">
            {formData.section2_2.specializedEntityArray.map((entry, idx) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-card">
                <div className="flex flex-col md:flex-row gap-4 items-center">
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
          // subtitle="(10 marks per sector, min. 3 sectors)"
        >
          <div className="flex flex-col gap-4">
            {formData.section2_3.infraDevelopmentArray.map((entry, idx) => (
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
            <p className="text-xs text-muted-foreground">
              Upload development plan
            </p>
          </div>
        </SectionCard>

        {/* Section 2.4 */}
        <SectionCard
          title="2.4 - Projects with DPR/Feasibility Report"
          // subtitle="(10 marks per project)"
        >
          <div className="space-y-4">
            {formData.section2_4.investmentReadyArray.map(
              (rawProject, index) => {
                const project = {
                  dprFile: null,
                  ...rawProject,
                };
                return (
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
                            updateProject(
                              project.id,
                              "projectName",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <FileUploadSection
                        label="Upload DPR/Feasibility Report"
                        value={project.dprFile}
                        onChange={(file) =>
                          updateProject(project.id, "dprFile", file)
                        }
                        required
                      />
                    </div>
                  </div>
                );
              }
            )}
            <Button
              onClick={addProject}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Add More Project
            </Button>
          </div>
        </SectionCard>

        {/* Section 2.5 */}
        <SectionCard
          title="2.5 - Asset Monetization Portfolio"
          // subtitle="(10 marks per asset)"
        >
          <div className="space-y-4">
            {/* Yes/No selection */}
            <div>
              <Label className="mb-3 block">
                Asset Monetization Pipeline Available?*
              </Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="asset-monetization"
                    value="yes"
                    checked={formData.section2_5.hasAssetMonetization === "yes"}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        section2_5: {
                          ...prev.section2_5,
                          hasAssetMonetization: "yes",
                          comment: "",
                          // Initialize with 1 entry if empty
                          assetMonetizationArray:
                            prev.section2_5?.assetMonetizationArray &&
                            prev.section2_5.assetMonetizationArray.length > 0
                              ? prev.section2_5.assetMonetizationArray
                              : [
                                  {
                                    id: Date.now().toString(),
                                    projectName: "",
                                    sector: "",
                                    type: "",
                                    ownership: "",
                                    location: "",
                                    websiteLink: "",
                                    estimatedMonetization: "",
                                  },
                                ],
                        },
                      }));
                    }}
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2">
                  <Input
                    type="radio"
                    name="asset-monetization"
                    value="no"
                    checked={formData.section2_5.hasAssetMonetization === "no"}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        section2_5: {
                          ...prev.section2_5,
                          hasAssetMonetization: "no",
                          assetMonetizationArray: [],
                        },
                      }));
                    }}
                  />
                  No
                </label>
              </div>
            </div>

            {/* If Yes → show fields */}
            {formData.section2_5.hasAssetMonetization === "yes" && (
              <>
                {formData.section2_5.assetMonetizationArray.map(
                  (asset, index) => (
                    <div
                      key={asset.id}
                      className="p-4 border rounded-lg space-y-4"
                    >
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
                              updateAsset(
                                asset.id,
                                "projectName",
                                e.target.value
                              )
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
                            onValueChange={(value) =>
                              updateAsset(asset.id, "type", value)
                            }
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
                          <Label>Estimated Monetization (INR-CRORE)</Label>
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
                  )
                )}
                <Button
                  onClick={addAsset}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </Button>
              </>
            )}

            {/* If No → Comment (mandatory) */}
            {formData.section2_5.hasAssetMonetization === "no" && (
              <div>
                <Label>
                  Comments (Reason) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Enter reason or comment"
                  value={formData.section2_5.comment || ""}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      section2_5: {
                        ...prev.section2_5,
                        comment: e.target.value,
                      },
                    }));
                  }}
                />
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </TooltipProvider>
  );
};
