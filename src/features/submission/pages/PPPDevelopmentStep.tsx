/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Info, CalendarIcon, CheckCircle } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard } from "../components/SectionCard";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import { useIndicatorSubmission } from "../hooks/useIndicatorSubmission";
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
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { computeStepProgress } from "../utils/progress";
import { saveDraftToLocalStorage } from "@/utils/draftUtils";
import { setIndicatorSubmitted, areAllIndicatorsSubmitted, getSubmittedIndicators, clearSubmittedIndicators } from "../utils/globalSubmissionUtils";
import { notificationService } from "@/services/NotificationBus";
import { apiService } from "@/services/api.service";

const defaultData: PPPDevelopmentData = {
  section3_1: {
    available: "",
    file: null,
  },
  section3_2: {
    available: "",
    file: null,
  },
  section3_3: { VGFArray: [] },
  section3_4: {
    projects: [],
  },
};

export const PPPDevelopmentStep = () => {
  // Tab status state for visual feedback
  const [tabStatus, setTabStatus] = useState({
    infraFinancing: false,
    infraDevelopment: false,
    pppDevelopment: false,
    infraEnablers: false,
  });

  const navigate = useNavigate();
  const {
    currentStep,
    goToStep,
    goToNext,
    goToPrevious,
    isFirstStep,
    isLastStep,
  } = useStepNavigation(3);
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

  // Indicator access control
  const {
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    refresh,
    loading: indicatorLoading,
    error: indicatorError,
  } = useIndicatorAccess();

  useEffect(() => {
    console.log("🔍 PPPDevelopmentStep: Access control state", {
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

  // Update tab status on mount and when indicators change
  useEffect(() => {
    const submitted = getSubmittedIndicators();
    setTabStatus({
      infraFinancing: submitted.infraFinancing?.length === 5,
      infraDevelopment: submitted.infraDevelopment?.length === 5,
      pppDevelopment: submitted.pppDevelopment?.length === 4,
      infraEnablers: submitted.infraEnablers?.length === 6,
    });
  }, []);

  // Merge loaded data with defaults
  const loadedData =
    (getStepData("pppDevelopment") as Partial<PPPDevelopmentData>) || {};

  const initialData: PPPDevelopmentData = {
    ...defaultData,
    ...loadedData,
    section3_1: { ...defaultData.section3_1, ...(loadedData.section3_1 || {}) },
    section3_2: { ...defaultData.section3_2, ...(loadedData.section3_2 || {}) },
    section3_3: { VGFArray: (loadedData.section3_3 as any)?.VGFArray || [] },
    section3_4: {
      projects:
        loadedData.section3_4?.projects || defaultData.section3_4.projects,
    },
  };

  const [formData, setFormData] = useState<PPPDevelopmentData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sync with localStorage data when component mounts or data changes
  useEffect(() => {
    const currentStepData = getStepData(
      "pppDevelopment"
    ) as Partial<PPPDevelopmentData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: PPPDevelopmentData = {
        ...defaultData,
        ...currentStepData,
        section3_1: {
          ...defaultData.section3_1,
          ...(currentStepData.section3_1 || {}),
        },
        section3_2: {
          ...defaultData.section3_2,
          ...(currentStepData.section3_2 || {}),
        },
        section3_3: {
          VGFArray: (currentStepData.section3_3 as any)?.VGFArray || [],
        },
        section3_4: {
          projects:
            currentStepData.section3_4?.projects ||
            defaultData.section3_4.projects,
        },
      };
      setFormData(syncedData);
      console.log(
        "🔄 Synced pppDevelopment data from localStorage in normal flow:",
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
          "🔍 Direct editing submission check in PPPDevelopmentStep:",
          submissionData
        );

        if (submissionData.formData && submissionData.formData.pppDevelopment) {
          const stepData = submissionData.formData
            .pppDevelopment as Partial<PPPDevelopmentData>;
          const updatedData: PPPDevelopmentData = {
            ...defaultData,
            ...stepData,
            section3_1: {
              ...defaultData.section3_1,
              ...(stepData.section3_1 || {}),
            },
            section3_2: {
              ...defaultData.section3_2,
              ...(stepData.section3_2 || {}),
            },
            section3_3: {
              VGFArray: (stepData.section3_3 as any)?.VGFArray || [],
            },
            section3_4: {
              projects:
                stepData.section3_4?.projects ||
                defaultData.section3_4.projects,
            },
          };
          setFormData(updatedData);
          console.log(
            "✅ Direct prefill from editing submission:",
            updatedData
          );

          // Clear the editing submission data after successful prefill
          localStorage.removeItem("editing_submission");
          localStorage.removeItem("editing_submission_id");
        }
      } catch (error) {
        console.error(
          "❌ Failed to parse editing submission in PPPDevelopmentStep:",
          error
        );
        localStorage.removeItem("editing_submission");
        localStorage.removeItem("editing_submission_id");
      }
    }
  }, []);

  // Autosave to localStorage with debouncing (avoid infinite loop)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("pppDevelopment", formData);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [formData, updateFormData]);

  // Calculation functions
  const calculateSection3_3 = useCallback(() => {
    // For section 3.3, marks = MIN(number of proposals × 5, 50)
    const numberOfProposals = formData.section3_3.VGFArray.length;
    const marksObtained = Math.min(numberOfProposals * 5, 50);

    return {
      marksObtained: Math.round(marksObtained * 100) / 100,
    };
  }, [formData.section3_3.VGFArray.length]);

  const calculateSection3_4 = useCallback(() => {
    const projects = formData.section3_4.projects || [];
    const tpcOfPPPProjects = 0; // Placeholder

    return {
      tpcOfPPPProjects: 0,
      proportion: 0,
      marksObtained: 0,
    };
  }, [formData.section3_4.projects]);

  useEffect(() => {
    const section3_3Calc = calculateSection3_3();
    const section3_4Calc = calculateSection3_4();

    const shouldUpdate3_3 = formData.section3_3.VGFArray.some(
      (project) => project.marksObtained !== section3_3Calc.marksObtained
    );
    const shouldUpdate3_4 =
      (formData.section3_4 as any).proportion !== section3_4Calc.proportion ||
      (formData.section3_4 as any).marksObtained !==
        section3_4Calc.marksObtained;

    if (shouldUpdate3_3 || shouldUpdate3_4) {
      setFormData((prev) => ({
        ...prev,
        section3_3: {
          ...(prev.section3_3 as any),
          VGFArray: prev.section3_3.VGFArray.map((project) => ({
            ...project,
            marksObtained: section3_3Calc.marksObtained,
          })),
        },
        section3_4: {
          ...prev.section3_4,
          proportion: section3_4Calc.proportion,
          marksObtained: section3_4Calc.marksObtained,
        },
      }));
    }
  }, [
    calculateSection3_3,
    calculateSection3_4,
    formData.section3_3.VGFArray.length,
    formData.section3_4.projects.length,
    (formData.section3_4 as any).proportion,
    (formData.section3_4 as any).marksObtained,
  ]);

  // --- Section 3.3: Add/Remove Project ---
  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: [
          ...prev.section3_3.VGFArray,
          {
            id: crypto.randomUUID(),
            projectName: "",
            sector: "",
            type: "",
            submissionDate: "",
            file: null,
          },
        ],
      },
    }));
  };

  const removeProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: prev.section3_3.VGFArray.filter((entry) => entry.id !== id),
      },
    }));
  };

  const updateProject = (
    id: string,
    field: "projectName" | "sector" | "type" | "submissionDate" | "file",
    value: string | FileUpload | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_3: {
        ...(prev.section3_3 as any),
        VGFArray: prev.section3_3.VGFArray.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  // --- Section 3.4: Add/Remove PPP Project ---
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
        projects: (prev.section3_4.projects || []).filter(
          (entry) => entry.id !== id
        ),
      },
    }));
  };

  const updatePPPProject = (
    id: string,
    field:
      | "nameOfProject"
      | "nipId"
      | "fundingSource"
      | "infrastructureSector"
      | "dateOfAward"
      | "capexPercentage",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      section3_4: {
        ...prev.section3_4,
        projects: (prev.section3_4.projects || []).map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  // --- Navigation ---
  const handleNext = () => {
    updateFormData("pppDevelopment", formData);
    goToNext();
  };

  const { toast } = useToast();

  // Field preparation function for indicator submission
  const prepareFieldsForPPP = (indicatorCode: string, sectionData: any) => {
    const fields: any[] = [];
    
    switch (indicatorCode) {
      case "3.1": // PPP Policy
        fields.push({
          available: sectionData?.available || "no",
          file: sectionData?.file || null,
        });
        break;
      case "3.2": // PPP Framework
        fields.push({
          available: sectionData?.available || "no",
          file: sectionData?.file || null,
        });
        break;
      case "3.3": // VGF
        if (sectionData?.VGFArray && sectionData.VGFArray.length > 0) {
          sectionData.VGFArray.forEach((vgf: any) => {
            fields.push({
              projectName: vgf.projectName || "",
              sector: vgf.sector || "",
              type: vgf.type || "",
              submissionDate: vgf.submissionDate || "",
              file: vgf.file || null,
            });
          });
        }
        break;
      case "3.4": // PPP Projects
        if (sectionData?.projects && sectionData.projects.length > 0) {
          sectionData.projects.forEach((project: any) => {
            fields.push({
              nameOfProject: project.nameOfProject || "",
              nipId: project.nipId || "",
              fundingSource: project.fundingSource || "",
              infrastructureSector: project.infrastructureSector || "",
              dateOfAward: project.dateOfAward || "",
              capexPercentage: project.capexPercentage || "",
            });
          });
        }
        break;
    }
    
    return fields;
  };

  // Use the indicator submission hook
  const {
    submittingIndicators,
    submittedIndicators: hookSubmittedIndicators,
    handleIndicatorSubmit,
  } = useIndicatorSubmission({
    category: "pppDevelopment",
    formData,
    assignedIndicators: isNodalOfficer ? assignedIndicators : availableIndicators,
    isNodalOfficer,
    onAllSubmitted: undefined, // handled globally
  });

  // Check backend status on initial load to see if all sections are already complete
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (!user?.id) return;
      
      try {
        console.log("🔍 [PPPDevelopmentStep - INITIAL CHECK] Checking backend submission status on mount");
        const submission = await apiService.getSubmissionByUser(user.id);
        
        if (!submission || !submission.id) {
          console.log("⚠️ No submission found yet");
          return;
        }

        const sectionStatus = submission.section_status || [];
        const infraFinancing = sectionStatus.find((s: any) => s.sectionId === "infraFinancing");
        const infraDevelopment = sectionStatus.find((s: any) => s.sectionId === "infraDevelopment");
        const pppDevelopment = sectionStatus.find((s: any) => s.sectionId === "pppDevelopment");
        const infraEnablers = sectionStatus.find((s: any) => s.sectionId === "infraEnablers");
        
        const allSectionsComplete = 
          infraFinancing?.isCompleted === true &&
          infraDevelopment?.isCompleted === true &&
          pppDevelopment?.isCompleted === true &&
          infraEnablers?.isCompleted === true;
        
        if (allSectionsComplete) {
          console.log("✅ [PPPDevelopmentStep - INITIAL CHECK] All sections completed, redirecting");
          toast({
            title: "Success",
            description: "All indicators completed. Redirecting to review page...",
          });
          setTimeout(() => {
            navigate(`/data-submission/review/${submission.id}`);
          }, 1500);
        }
      } catch (error) {
        console.error("❌ [PPPDevelopmentStep - INITIAL CHECK] Error:", error);
      }
    };

    checkInitialStatus();
  }, [user, navigate, toast]);

  // Check backend after each indicator submission to see if all sections complete
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        console.log("🔍 [PPPDevelopmentStep] Checking backend submission status");
        const submission = await apiService.getSubmissionByUser(user.id);
        
        if (!submission || !submission.id) {
          console.log("⚠️ No submission found yet");
          return;
        }

        const sectionStatus = submission.section_status || [];
        console.log("📊 Backend section status:", sectionStatus);
        
        // Find each section in the array and check isCompleted
        const infraFinancing = sectionStatus.find((s: any) => s.sectionId === "infraFinancing");
        const infraDevelopment = sectionStatus.find((s: any) => s.sectionId === "infraDevelopment");
        const pppDevelopment = sectionStatus.find((s: any) => s.sectionId === "pppDevelopment");
        const infraEnablers = sectionStatus.find((s: any) => s.sectionId === "infraEnablers");
        
        console.log("🔍 Section completion status:", {
          infraFinancing: infraFinancing?.isCompleted,
          infraDevelopment: infraDevelopment?.isCompleted,
          pppDevelopment: pppDevelopment?.isCompleted,
          infraEnablers: infraEnablers?.isCompleted
        });
        
        const allSectionsComplete = 
          infraFinancing?.isCompleted === true &&
          infraDevelopment?.isCompleted === true &&
          pppDevelopment?.isCompleted === true &&
          infraEnablers?.isCompleted === true;
        
        if (allSectionsComplete) {
          console.log("✅ All sections completed on backend, redirecting to review page");
          toast({
            title: "Success",
            description: "All indicators in all steps submitted. Moving to review page.",
          });
          setTimeout(() => {
            navigate(`/data-submission/review/${submission.id}`);
          }, 1500);
        } else {
          console.log("ℹ️ Not all sections are completed yet, staying on current step");
        }
      } catch (error) {
        console.error("❌ Error checking backend status:", error);
      }
    };

    // Only check backend if we have submitted indicators
    if (Object.keys(hookSubmittedIndicators).length > 0) {
      checkBackendStatus();
    }
  }, [hookSubmittedIndicators, user, navigate, toast]); // Trigger when hookSubmittedIndicators changes

  // Callback when all indicators are submitted - navigate to review page
  const handleAllSubmitted = useCallback(() => {
    // This callback is no longer used - kept for compatibility
    goToNext();
  }, [goToNext]);

  // Server-first hydration of partial submission (independent of localStorage)
  // Only populate fields that are empty/default - preserve ALL user's local edits
  useEffect(() => {
    if (!user?.id) return;
    let hasHydrated = false;
    
    (async () => {
      try {
        const submission = await apiService.getSubmissionByUser(user.id);
        if (!submission || hasHydrated) return;
        hasHydrated = true;
        
        const remoteData = submission?.formData?.pppDevelopment;
        if (!remoteData) return;
        
        setFormData((prev) => {
          // Check each section independently - only hydrate sections that are empty
          console.log("🌐 Hydrating pppDevelopment from server (per-section basis)");
          
          const hydrated: PPPDevelopmentData = {
            // Section 3.1 - Only load from server if local is empty
            section3_1: (() => {
              const isLocal3_1Empty = !prev.section3_1.available;
              if (!isLocal3_1Empty) {
                console.log("🔒 Section 3.1 has local data, keeping it");
                return prev.section3_1;
              }
              console.log("⬇️ Section 3.1 empty, loading from server");
              return {
                available: remoteData.section3_1?.available || prev.section3_1.available,
                file: remoteData.section3_1?.file || prev.section3_1.file,
              };
            })(),
            
            // Section 3.2 - Only load from server if local is empty
            section3_2: (() => {
              const isLocal3_2Empty = !prev.section3_2.available;
              if (!isLocal3_2Empty) {
                console.log("🔒 Section 3.2 has local data, keeping it");
                return prev.section3_2;
              }
              console.log("⬇️ Section 3.2 empty, loading from server");
              return {
                available: remoteData.section3_2?.available || prev.section3_2.available,
                file: remoteData.section3_2?.file || prev.section3_2.file,
              };
            })(),
            
            // Section 3.3 - Only load from server if local is empty
            section3_3: (() => {
              const isLocal3_3Empty = !prev.section3_3.VGFArray || prev.section3_3.VGFArray.length === 0;
              if (!isLocal3_3Empty) {
                console.log("🔒 Section 3.3 has local data, keeping it");
                return prev.section3_3;
              }
              console.log("⬇️ Section 3.3 empty, loading from server");
              return {
                VGFArray: Array.isArray(remoteData.section3_3?.VGFArray)
                  ? remoteData.section3_3.VGFArray
                  : prev.section3_3.VGFArray,
              };
            })(),
            
            // Section 3.4 - Only load from server if local is empty
            section3_4: (() => {
              const isLocal3_4Empty = !prev.section3_4.projects || prev.section3_4.projects.length === 0;
              if (!isLocal3_4Empty) {
                console.log("🔒 Section 3.4 has local data, keeping it");
                return prev.section3_4;
              }
              console.log("⬇️ Section 3.4 empty, loading from server");
              return {
                projects: Array.isArray(remoteData.section3_4?.projects)
                  ? remoteData.section3_4.projects
                  : prev.section3_4.projects,
                tpcOfPPPProjects: remoteData.section3_4?.tpcOfPPPProjects,
                proportion: remoteData.section3_4?.proportion,
                marksObtained: remoteData.section3_4?.marksObtained,
              };
            })(),
          };
          return hydrated;
        });
      } catch (e) {
        console.warn("⚠️ Failed server hydration (pppDevelopment)", e);
      }
    })();
  }, [user?.id]);

  // Patch: after successful submit, update global state
  const handleIndicatorSubmitPatched = async (
    indicatorCode: string,
    prepareFieldsFn: (code: string, data: any) => Record<string, any>[]
  ) => {
    await handleIndicatorSubmit(indicatorCode, prepareFieldsFn);
    setIndicatorSubmitted("pppDevelopment", indicatorCode);
  };

  const handleSaveDraft = async () => {
    const success = saveDraftToLocalStorage("pppDevelopment", formData);

    if (success) {
      updateFormData("pppDevelopment", formData);
    }
  };

  // Access control for NODAL_OFFICER
  const sectionIndicators = ["3.1", "3.2", "3.3", "3.4"];
  const allowedIndicators =
    (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter((ind) =>
      sectionIndicators.includes(ind)
    ) || [];

  console.log("🔍 PPPDevelopmentStep: Allowed indicators", {
    isNodalOfficer,
    isStateApprover,
    assignedIndicators,
    availableIndicators,
    allowedIndicators,
  });

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
            title="PPP Development"
            description="Public-Private Partnership projects and initiatives"
            points={250}
            completed={0}
            total={4}
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
    <div className="w-full -mx-6 lg:-mx-8">
      <div className="px-6 lg:px-8">
        <Stepper
          steps={SUBMISSION_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
        />
        {(() => {
          const { completed, total, progress } = computeStepProgress(
            { pppDevelopment: formData } as Record<string, unknown>,
            "pppDevelopment",
            {
              assignedIndicators,
              availableIndicators,
              isNodalOfficer,
              isStateApprover,
            }
          );
          console.log("📊 PPP Development Progress Debug:", {
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
              title="PPP Development"
              description="Public-Private Partnership projects and initiatives"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}

        {/* Section 3.1 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.1") ||
          availableIndicators.includes("3.1")) &&
          (!isEditMode ||
            !!formData.section3_1?.available ||
            !!formData.section3_1?.file) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.1 - </span> Availability of
                    Infrastructure Act/Policy{" "}
                  </span>
                </div>
              }
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
                      <TooltipContent>
                        Is there a PPP Act/Policy?
                      </TooltipContent>
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
                            section3_1: {
                              ...prev.section3_1,
                              available: "yes",
                            },
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
                {formData.section3_1.available === "yes" && (
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
                )}
                
                {/* Submit Button for 3.1 */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => handleIndicatorSubmitPatched("3.1", prepareFieldsForPPP)}
                    disabled={submittingIndicators["3.1"] || hookSubmittedIndicators["3.1"]}
                    className="bg-primary text-white"
                  >
                    {submittingIndicators["3.1"] ? (
                      "Submitting..."
                    ) : hookSubmittedIndicators["3.1"] ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submitted
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

        {/* Section 3.2 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.2") ||
          availableIndicators.includes("3.2")) &&
          (!isEditMode ||
            !!formData.section3_2?.available ||
            !!formData.section3_2?.file) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.2 - </span> Functional PPP
                    Cell/Unit{" "}
                  </span>
                </div>
              }
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
                            section3_2: {
                              ...prev.section3_2,
                              available: "yes",
                            },
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
                {formData.section3_2.available === "yes" && (
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
                )}
                
                {/* Submit Button for 3.2 */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => handleIndicatorSubmitPatched("3.2", prepareFieldsForPPP)}
                    disabled={submittingIndicators["3.2"] || hookSubmittedIndicators["3.2"]}
                    className="bg-primary text-white"
                  >
                    {submittingIndicators["3.2"] ? (
                      "Submitting..."
                    ) : hookSubmittedIndicators["3.2"] ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submitted
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

        {/* Section 3.3 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.3") ||
          availableIndicators.includes("3.3")) &&
          (!isEditMode ||
            (Array.isArray(formData.section3_3.VGFArray) &&
              formData.section3_3.VGFArray.length > 0)) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.3 - </span> Proposals
                    Submitted under VGF/IIPDF{" "}
                  </span>
                </div>
              }
              subtitle=""
              className="mb-6"
            >
              <div className="flex flex-col gap-4">
                {formData.section3_3.VGFArray.map((entry, idx) => (
                  <div key={entry.id} className="mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <Label>Project Name</Label>
                        <Input
                          type="text"
                          placeholder="Enter project name"
                          value={entry.projectName}
                          onChange={(e) =>
                            updateProject(
                              entry.id,
                              "projectName",
                              e.target.value
                            )
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
                      <div>
                        <Label>Submission Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full min-w-[180px] justify-start text-left font-normal bg-[#fff] border-[1px] border-[#C6C6C6]",
                                !entry.submissionDate &&
                                  "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {entry.submissionDate
                                ? format(
                                    new Date(entry.submissionDate),
                                    "dd-MM-yyyy"
                                  )
                                : "DD-MM-YYYY"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={
                                entry.submissionDate
                                  ? new Date(entry.submissionDate)
                                  : undefined
                              }
                              onSelect={(date) =>
                                updateProject(
                                  entry.id,
                                  "submissionDate",
                                  date ? date.toISOString() : ""
                                )
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProject(entry.id)}
                          aria-label="Remove"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <FileUploadSection
                        label="Upload File"
                        value={entry.file || null}
                        onChange={(file) =>
                          updateProject(entry.id, "file", file)
                        }
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
                  <p className="text-xs text-muted-foreground mt-1"></p>
                </div>
                
                {/* Submit Button for 3.3 */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => handleIndicatorSubmitPatched("3.3", prepareFieldsForPPP)}
                    disabled={submittingIndicators["3.3"] || hookSubmittedIndicators["3.3"]}
                    className="bg-primary text-white"
                  >
                    {submittingIndicators["3.3"] ? (
                      "Submitting..."
                    ) : hookSubmittedIndicators["3.3"] ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submitted
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </div>
            </SectionCard>
          )}

        {/* Section 3.4 */}
        {((!isNodalOfficer && !isStateApprover) ||
          assignedIndicators.includes("3.4") ||
          availableIndicators.includes("3.4")) &&
          (!isEditMode ||
            (Array.isArray(formData.section3_4?.projects) &&
              formData.section3_4.projects.length > 0)) && (
            <SectionCard
              title={
                <div className="flex flex-col">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">3.4 - </span> Proportion of
                    TPC of PPP Projects{" "}
                  </span>
                </div>
              }
              subtitle=""
              className="mb-6"
            >
              <div className="flex flex-col gap-4">
                {(formData.section3_4.projects || []).map((project, idx) => (
                  <div key={project.id} className="mb-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div>
                          <Label>
                            Name of PPP/Bankable Projects{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the name of the PPP or Bankable project
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter project name"
                            value={project.nameOfProject}
                            onChange={(e) =>
                              updatePPPProject(
                                project.id,
                                "nameOfProject",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>
                            NIP ID{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the NIP ID of the project
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter NIP ID"
                            value={project.nipId}
                            onChange={(e) =>
                              updatePPPProject(
                                project.id,
                                "nipId",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <Label>
                            Funding Source (In case of bankable project){" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the funding source name
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter funding source name"
                            value={project.fundingSource}
                            onChange={(e) =>
                              updatePPPProject(
                                project.id,
                                "fundingSource",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label>
                            Infrastructure Sector{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Select the infrastructure sector
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select
                            value={project.infrastructureSector}
                            onValueChange={(value) =>
                              updatePPPProject(
                                project.id,
                                "infrastructureSector",
                                value
                              )
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
                        <div>
                          <Label>
                            Date of Award{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Select the date of award
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-[#fff] border border-[#C6C6C6]",
                                  !project.dateOfAward &&
                                    "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {project.dateOfAward
                                  ? format(
                                      new Date(project.dateOfAward),
                                      "dd-MM-yyyy"
                                    )
                                  : "DD-MM-YYYY"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={
                                  project.dateOfAward
                                    ? new Date(project.dateOfAward)
                                    : undefined
                                }
                                onSelect={(date) =>
                                  updatePPPProject(
                                    project.id,
                                    "dateOfAward",
                                    date ? date.toISOString() : ""
                                  )
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>
                            % of Capex funded by non-Govt sources{" "}
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="inline w-3 h-3 ml-1" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Enter the percentage of Capex funded by
                                non-government sources
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Enter percentage"
                            value={project.capexPercentage}
                            onChange={(e) =>
                              updatePPPProject(
                                project.id,
                                "capexPercentage",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
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
                ))}

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
                
                {/* Submit Button for 3.4 */}
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={() => handleIndicatorSubmitPatched("3.4", prepareFieldsForPPP)}
                    disabled={submittingIndicators["3.4"] || hookSubmittedIndicators["3.4"]}
                    className="bg-primary text-white"
                  >
                    {submittingIndicators["3.4"] ? (
                      "Submitting..."
                    ) : hookSubmittedIndicators["3.4"] ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submitted
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
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
    </div>
  );
};
