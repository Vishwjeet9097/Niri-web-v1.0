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
// import { draftService } from "@/services/draft.service"; // Commented out - no backend API calls for draft
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { saveDraftToLocalStorage } from "@/utils/draftUtils";

const defaultData: InfraDevelopmentData = {
  section2_1: [],
  section2_2: [],
  section2_3: [],
  section2_4: [],
  section2_5: [],
};

const getDefaultFileUpload = (): FileUpload => ({
  id: "",
  file: null,
  fileName: "",
  fileSize: 0,
  uploadedAt: 0,
});

export const InfraDevelopmentStep = () => {
  const { currentStep, goToStep, goToNext, goToPrevious, isFirstStep, isLastStep } =
    useStepNavigation(2);
  const { formData: persistedFormData, getStepData, updateFormData } = useFormPersistence();
  const { user } = useAuth();
  
  // Indicator access control
  const { 
    loading: indicatorLoading, 
    error: indicatorError, 
    assignedIndicators, 
    hasIndicatorAccess, 
    isNodalOfficer 
  } = useIndicatorAccess();

  // Delete file function
  const onDelete = (fileId: string) => {
    // Implementation for deleting file
    console.log("Delete file:", fileId);
  };

  // Note: Editing submission data is handled by useFormPersistence hook

  // Merge loaded data with defaults
  const loadedData =
    (getStepData("infraDevelopment") as Partial<InfraDevelopmentData>) || {};
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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync with localStorage data when component mounts or data changes
  useEffect(() => {
    const currentStepData = getStepData("infraDevelopment") as Partial<InfraDevelopmentData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: InfraDevelopmentData = {
        ...defaultData,
        ...currentStepData,
        section2_1: currentStepData.section2_1 || [],
        section2_2: currentStepData.section2_2 || [],
        section2_3: currentStepData.section2_3 || [],
        section2_4: currentStepData.section2_4 || [],
        section2_5: currentStepData.section2_5 || [],
      };
      setFormData(syncedData);
      console.log("🔄 Synced infraDevelopment data from localStorage in normal flow:", syncedData);
    }
  }, [getStepData]);

  // Initialize form data only once when component mounts
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log("🔍 Direct editing submission check in InfraDevelopmentStep:", submissionData);

        if (submissionData.formData && submissionData.formData.infraDevelopment) {
          const stepData = submissionData.formData.infraDevelopment as Partial<InfraDevelopmentData>;
          const updatedData: InfraDevelopmentData = {
            ...defaultData,
            ...stepData,
            section2_1: stepData.section2_1 || [],
            section2_2: stepData.section2_2 || [],
            section2_3: stepData.section2_3 || [],
            section2_4: stepData.section2_4 || [],
            section2_5: stepData.section2_5 || [],
          };
          setFormData(updatedData);
          console.log("✅ Direct prefill from editing submission:", updatedData);

          // Clear the editing submission data after successful prefill
          localStorage.removeItem("editing_submission");
        }
      } catch (error) {
        console.error("❌ Failed to parse editing submission in InfraDevelopmentStep:", error);
        localStorage.removeItem("editing_submission");
      }
    }
  }, []); // Empty dependency array to run only once

  // Autosave to localStorage with debouncing (avoid infinite loop)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("infraDevelopment", formData);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [formData]);

  // --- Section 2.1, 2.2, 2.3: Add/Remove Entries ---
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
    id: string,
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
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: prev[section].map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  // --- Section 2.4: Add/Remove Project ---
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
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      section2_4: prev.section2_4.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  // --- Section 2.5: Add/Remove Asset ---
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
          ownership: "Asset ownership",
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
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      section2_5: prev.section2_5.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  // --- Validation ---
  // Validation is currently disabled (commented out for all fields)
  const validateFields = () => {
    // const newErrors: { [key: string]: string } = {};

    // // Section 2.1: At least one entry, all fields filled, at least one file
    // if (
    //   formData.section2_1.length === 0 ||
    //   formData.section2_1.some(
    //     (entry) => !entry.sector || entry.files.length === 0,
    //   )
    // ) {
    //   newErrors.section2_1 =
    //     "Please add at least one entry and fill all fields with file(s).";
    // }
    // // Section 2.2
    // if (
    //   formData.section2_2.length === 0 ||
    //   formData.section2_2.some(
    //     (entry) => !entry.sector || entry.files.length === 0,
    //   )
    // ) {
    //   newErrors.section2_2 =
    //     "Please add at least one entry and fill all fields with file(s).";
    // }
    // // Section 2.3
    // if (
    //   formData.section2_3.length === 0 ||
    //   formData.section2_3.some(
    //     (entry) => !entry.sector || entry.files.length === 0,
    //   )
    // ) {
    //   newErrors.section2_3 =
    //     "Please add at least one entry and fill all fields with file(s).";
    // }
    // // Section 2.4: At least one project, projectName required, dprFile required
    // if (
    //   formData.section2_4.length === 0 ||
    //   formData.section2_4.some((entry) => !entry.projectName || !entry.dprFile)
    // ) {
    //   newErrors.section2_4 =
    //     "Please add at least one project and upload DPR/Feasibility Report.";
    // }
    // // Section 2.5: At least one asset, all fields except estimatedMonetization required
    // if (
    //   formData.section2_5.length === 0 ||
    //   formData.section2_5.some(
    //     (entry) =>
    //       !entry.projectName ||
    //       !entry.sector ||
    //       !entry.type ||
    //       !entry.ownership,
    //   )
    // ) {
    //   newErrors.section2_5 =
    //     "Please add at least one asset and fill all required fields.";
    // }

    // setErrors(newErrors);
    // return Object.keys(newErrors).length === 0;
    return true;
  };

  // --- Navigation ---
  const handleNext = () => {
    // Always save to localStorage before navigating
    updateFormData("infraDevelopment", formData);
    goToNext();
  };

  const { toast } = useToast();


  const handleSaveDraft = async () => {
    // Save to localStorage with toast message
    const success = saveDraftToLocalStorage("infraDevelopment", formData);
    
    if (success) {
      // Also update form data in persistence hook
      updateFormData("infraDevelopment", formData);
    }
  };

  // Access control for NODAL_OFFICER
  if (isNodalOfficer) {
    // Check if user has access to any indicator in this section
    const hasAccessToSection = hasIndicatorAccess('2.1') || hasIndicatorAccess('2.2') || 
                              hasIndicatorAccess('2.3') || hasIndicatorAccess('2.4') || hasIndicatorAccess('2.5');
    
    console.log("🔍 InfraDevelopmentStep: Access control check", {
      isNodalOfficer,
      assignedIndicators,
      hasAccessToSection,
      hasAccess2_1: hasIndicatorAccess('2.1'),
      hasAccess2_2: hasIndicatorAccess('2.2'),
      hasAccess2_3: hasIndicatorAccess('2.3'),
      hasAccess2_4: hasIndicatorAccess('2.4'),
      hasAccess2_5: hasIndicatorAccess('2.5')
    });

    if (!hasAccessToSection) {
      return (
        <div className="w-full -mx-6 lg:-mx-8">
          <div className="px-6 lg:px-8">
            <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} onStepClick={goToStep} />
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Required</h3>
              <p className="text-gray-600 mb-4">
                This section is not applicable for your submission. No data entry required here.
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
      <ProgressHeader
        title="Infrastructure Development"
        description="Physical infrastructure development and completion metrics. (10 marks per sector, min. 3 sectors)"
        points={250}
        completed={1}
        total={5}
        progress={10}
      />
      {/* Section 2.1 */}
      {(!isNodalOfficer || hasIndicatorAccess('2.1')) && (
        <SectionCard
          title={<div className="flex flex-col">
            <span className="text-base font-semibold ">
              <span className="text-primary">2.1 -</span> Availability of Infrastructure Act/Policy{" "}
            </span>
          </div>}
          subtitle=""
          className="mb-6"
        >
        <div className="flex flex-col gap-4 ">
          {formData.section2_1.map((entry, idx) => (
            <div key={entry.id} className=" mb-2 relative">
              <div className="flex flex-col gap-4 max-w-[70%]">
                <div className="flex-1 w-full">
                  <Label>
                    Select Sector <span className="text-destructive">*</span>
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
                        file ? [file] : [],
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
              <p className="text-xs text-destructive mt-1">{errors.section2_1}</p>
            )}
          </div>
          {formData.section2_1.length > 0 && (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full border-separate border-spacing-0 ">
                <thead>
                  <tr className="bg-[#DDE3F9]">
                    <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                      Sector
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">Uploaded File</th>
                    <th className="py-3 px-4 text-left text-sm font-normal">File Size</th>
                    <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.section2_1.map((entry, idx) => (
                    <tr key={entry.id} className="bg-white">
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.sector}
                      </td>
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.files?.[0]?.fileName || "No file uploaded"}
                      </td>
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.files?.[0]?.fileSize ? `${(entry.files[0].fileSize / 1024 / 1024).toFixed(1)} MB` : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => removeEntry("section2_1", entry.id)}
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
      {(!isNodalOfficer || hasIndicatorAccess('2.2')) && (
        <SectionCard
          title={<div className="flex flex-col">
            <span className="text-base font-semibold ">
              <span className="text-primary">2.2 -</span> Availability of Specialized Entity{" "}
            </span>
          </div>}
          subtitle=""
          className="mb-6"
        >
        <div className="flex flex-col gap-4">
          {formData.section2_2.map((entry, idx) => (
            <div key={entry.id} className="mb-2 relative">
              <div className="flex flex-col gap-4 max-w-[70%]">
                <div className="flex-1 w-full">
                  <Label>
                    Select Sector <span className="text-destructive">*</span>
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
                        file ? [file] : [],
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
            <p className="text-xs text-muted-foreground mt-1">Upload evidence</p>
            {errors.section2_2 && (
              <p className="text-xs text-destructive mt-1">{errors.section2_2}</p>
            )}
          </div>
          {formData.section2_2.length > 0 && (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full border-separate border-spacing-0 ">
                <thead>
                  <tr className="bg-[#DDE3F9]">
                    <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                      Sector
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">Uploaded File</th>
                    <th className="py-3 px-4 text-left text-sm font-normal">File Size</th>
                    <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.section2_2.map((entry, idx) => (
                    <tr key={entry.id} className="bg-white">
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.sector}
                      </td>
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.files?.[0]?.fileName || "No file uploaded"}
                      </td>
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.files?.[0]?.fileSize ? `${(entry.files[0].fileSize / 1024 / 1024).toFixed(1)} MB` : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => removeEntry("section2_2", entry.id)}
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

      {/* Section 2.3 */}
      {(!isNodalOfficer || hasIndicatorAccess('2.3')) && (
        <SectionCard
          title={<div className="flex flex-col">
            <span className="text-base font-semibold ">
              <span className="text-primary">2.3 -</span> Availability of Sector Infra Development Plan{" "}
            </span>
          </div>}
          subtitle=""
          className="mb-6"
        >
        <div className="flex flex-col gap-4">
          {formData.section2_3.map((entry, idx) => (
            <div key={entry.id} className="mb-2 relative">
              <div className="flex flex-col gap-4 max-w-[70%]">
                <div className="flex-1 w-full">
                  <Label>
                    Select Sector <span className="text-destructive">*</span>
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
                        file ? [file] : [],
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
            <p className="text-xs text-muted-foreground mt-1">Upload plan</p>
            {errors.section2_3 && (
              <p className="text-xs text-destructive mt-1">{errors.section2_3}</p>
            )}
          </div>
          {formData.section2_3.length > 0 && (
            <div className="overflow-x-auto rounded-xl">
              <table className="min-w-full border-separate border-spacing-0 ">
                <thead>
                  <tr className="bg-[#DDE3F9]">
                    <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">
                      Sector
                    </th>
                    <th className="py-3 px-4 text-left text-sm font-normal">Uploaded File</th>
                    <th className="py-3 px-4 text-left text-sm font-normal">File Size</th>
                    <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.section2_3.map((entry, idx) => (
                    <tr key={entry.id} className="bg-white">
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.sector}
                      </td>
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.files?.[0]?.fileName || "No file uploaded"}
                      </td>
                      <td className="py-3 px-4 text-sm font-normal">
                        {entry.files?.[0]?.fileSize ? `${(entry.files[0].fileSize / 1024 / 1024).toFixed(1)} MB` : "N/A"}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => removeEntry("section2_3", entry.id)}
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

      {/* Section 2.4 */}
      {(!isNodalOfficer || hasIndicatorAccess('2.4')) && (
        <SectionCard
          title={<div className="flex flex-col">
            <span className="text-base font-semibold ">
              <span className="text-primary">2.4 -</span> Availability of Investment Ready Project Pipeline{" "}
            </span>
          </div>}
          subtitle="Annex 5: Upload DPR/Feasibility Report"
          className="mb-6"
        >
        <div className="flex flex-col gap-4">
          {formData.section2_4.map((entry, idx) => (
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
              <p className="text-xs text-destructive mt-1">{errors.section2_4}</p>
            )}
          </div>
        </div>
        </SectionCard>
      )}

      {/* Section 2.5 */}
      {(!isNodalOfficer || hasIndicatorAccess('2.5')) && (
        <SectionCard
          title={<div className="flex flex-col">
            <span className="text-base font-semibold ">
              <span className="text-primary">2.5 -</span> Availability of Asset Monetization Pipeline{" "}
            </span>
          </div>}
          subtitle="Annex 6"
          className="mb-6"
        >
        <div className="flex flex-col gap-4">
          {formData.section2_5.map((entry, idx) => (
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
                    Select Sector <span className="text-destructive">*</span>
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
                    Asset Ownership <span className="text-destructive">*</span>
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
                          e.target.value,
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
              <p className="text-xs text-destructive mt-1">{errors.section2_5}</p>
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
