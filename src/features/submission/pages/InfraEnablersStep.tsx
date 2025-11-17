/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Info, CheckCircle } from "lucide-react";
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
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { saveDraftToLocalStorage } from "@/utils/draftUtils";
import { computeStepProgress } from "../utils/progress";
import { useIndicatorSubmission } from "../hooks/useIndicatorSubmission";
import { setIndicatorSubmitted, areAllIndicatorsSubmitted, getSubmittedIndicators, clearSubmittedIndicators } from "../utils/globalSubmissionUtils";
import { notificationService } from "@/services/NotificationBus";
import { apiService } from "@/services/api.service";

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
  section4_6: {
    capacityArray: [],
  },
};

export const InfraEnablersStep = () => {
  // Tab status state for visual feedback
  const [tabStatus, setTabStatus] = useState({
    infraFinancing: false,
    infraDevelopment: false,
    pppDevelopment: false,
    infraEnablers: false,
  });

  const navigate = useNavigate();
  const { currentStep, goToStep, goToNext, goToPrevious, isLastStep } =
    useStepNavigation(4);
  const { getStepData, updateFormData } = useFormPersistence();

  // Detect edit mode to hide empty indicators
  const isEditMode =
    typeof window !== "undefined" &&
    localStorage.getItem("is_edit_mode") === "true";
  const { user } = useAuth();

  // Indicator access
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
    console.log("🔍 InfraEnablersStep: Access control state", {
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
    (getStepData("infraEnablers") as Partial<InfraEnablersData>) || {};
  const initialData: InfraEnablersData = {
    ...defaultData,
    ...loadedData,
    section4_1: { ...defaultData.section4_1, ...(loadedData.section4_1 || {}) },
    section4_2: { ...defaultData.section4_2, ...(loadedData.section4_2 || {}) },
    section4_3: { ...defaultData.section4_3, ...(loadedData.section4_3 || {}) },
    section4_4: { ...defaultData.section4_4, ...(loadedData.section4_4 || {}) },
    section4_5: { ...defaultData.section4_5, ...(loadedData.section4_5 || {}) },
    section4_6: {
      capacityArray: Array.isArray(loadedData.section4_6?.capacityArray)
        ? loadedData.section4_6!.capacityArray
        : [],
    },
  };

  const [formData, setFormData] = useState<InfraEnablersData>(initialData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  // Sync with persisted localStorage step data when component mounts or getStepData changes
  useEffect(() => {
    const currentStepData = getStepData(
      "infraEnablers"
    ) as Partial<InfraEnablersData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: InfraEnablersData = {
        ...defaultData,
        ...currentStepData,
        section4_1: {
          ...defaultData.section4_1,
          ...(currentStepData.section4_1 || {}),
        },
        section4_2: {
          ...defaultData.section4_2,
          ...(currentStepData.section4_2 || {}),
        },
        section4_3: {
          ...defaultData.section4_3,
          ...(currentStepData.section4_3 || {}),
        },
        section4_4: {
          ...defaultData.section4_4,
          ...(currentStepData.section4_4 || {}),
        },
        section4_5: {
          ...defaultData.section4_5,
          ...(currentStepData.section4_5 || {}),
        },
        section4_6: {
          capacityArray: Array.isArray(
            currentStepData.section4_6?.capacityArray
          )
            ? currentStepData.section4_6!.capacityArray
            : [],
        },
      };
      setFormData(syncedData);
      console.log(
        "🔄 Synced infraEnablers data from localStorage in normal flow:",
        syncedData
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStepData]);

  // Initialize form data only once when component mounts (editing_submission)
  useEffect(() => {
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        console.log(
          "🔍 Direct editing submission check in InfraEnablersStep:",
          submissionData
        );

        if (submissionData.formData && submissionData.formData.infraEnablers) {
          const stepData = submissionData.formData
            .infraEnablers as Partial<InfraEnablersData>;
          const updatedData: InfraEnablersData = {
            ...defaultData,
            ...stepData,
            section4_1: {
              ...defaultData.section4_1,
              ...(stepData.section4_1 || {}),
            },
            section4_2: {
              ...defaultData.section4_2,
              ...(stepData.section4_2 || {}),
            },
            section4_3: {
              ...defaultData.section4_3,
              ...(stepData.section4_3 || {}),
            },
            section4_4: {
              ...defaultData.section4_4,
              ...(stepData.section4_4 || {}),
            },
            section4_5: {
              ...defaultData.section4_5,
              ...(stepData.section4_5 || {}),
            },
            section4_6: {
              capacityArray: Array.isArray(stepData.section4_6?.capacityArray)
                ? stepData.section4_6!.capacityArray
                : [],
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
          "❌ Failed to parse editing submission in InfraEnablersStep:",
          error
        );
        localStorage.removeItem("editing_submission");
        localStorage.removeItem("editing_submission_id");
      }
    }
  }, []); // run once

  // Calculation helpers
  const calculateSection4_3 = useCallback(() => {
    const numberOfProjects = parseInt(
      formData.section4_3.numberOfProjects || ""
    );
    if (isNaN(numberOfProjects)) return { marksObtained: 0 };
    const marksObtained = Math.min(numberOfProjects * 5, 20);
    return { marksObtained: Math.round(marksObtained * 100) / 100 };
  }, [formData.section4_3.numberOfProjects]);

  const calculateSection4_4 = useCallback(() => {
    const marksObtained = formData.section4_4.adopted === "yes" ? 50 : 0;
    return { marksObtained: Math.round(marksObtained * 100) / 100 };
  }, [formData.section4_4.adopted]);

  const calculateSection4_6 = useCallback(() => {
    const len = formData.section4_6.capacityArray.length;
    const totalMarks = Math.min(len * 1, 50);
    return {
      perEntry: len > 0 ? 1 : 0,
      totalMarks: Math.round(totalMarks * 100) / 100,
    };
  }, [formData.section4_6.capacityArray.length]);

  // update computed marks into formData (per-entry marks for section4_6 set to 1)
  useEffect(() => {
    const section4_3Calc = calculateSection4_3();
    const section4_4Calc = calculateSection4_4();
    const section4_6Calc = calculateSection4_6();

    setFormData((prev) => ({
      ...prev,
      section4_3: {
        ...prev.section4_3,
        marksObtained: section4_3Calc.marksObtained,
      },
      section4_4: {
        ...prev.section4_4,
        marksObtained: section4_4Calc.marksObtained,
      },
      section4_6: {
        capacityArray: prev.section4_6.capacityArray.map((p) => ({
          ...p,
          marksObtained: section4_6Calc.perEntry,
        })),
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.section4_3.numberOfProjects,
    formData.section4_4.adopted,
    formData.section4_6.capacityArray.length,
  ]);

  // Autosave to persistence with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const structuredData: InfraEnablersData = {
        section4_1: formData.section4_1 || defaultData.section4_1,
        section4_2: formData.section4_2 || defaultData.section4_2,
        section4_3: formData.section4_3 || defaultData.section4_3,
        section4_4: formData.section4_4 || defaultData.section4_4,
        section4_5: formData.section4_5 || defaultData.section4_5,
        section4_6: {
          capacityArray: formData.section4_6.capacityArray || [],
        },
      };
      updateFormData("infraEnablers", structuredData);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [formData]);

  // --- Section 4.6 helpers (operate on capacityArray) ---
  const addTraining = () => {
    const newEntry = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Date.now().toString(),
      officerName: "",
      designation: "",
      programName: "",
      organiser: "",
      trainingType: "",
      marksObtained: 1,
    };
    setFormData((prev) => ({
      ...prev,
      section4_6: {
        capacityArray: [...prev.section4_6.capacityArray, newEntry],
      },
    }));
  };

  const removeTraining = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: {
        capacityArray: prev.section4_6.capacityArray.filter(
          (entry) => entry.id !== id
        ),
      },
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
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      section4_6: {
        capacityArray: prev.section4_6.capacityArray.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        ),
      },
    }));
  };

  // Navigation / Save
  const handleNext = () => {
    updateFormData("infraEnablers", formData);
    goToNext();
  };

  // Field preparation function for indicator submission
  const prepareFieldsForEnablers = (indicatorCode: string, sectionData: any) => {
    const fields: any[] = [];
    
    switch (indicatorCode) {
      case "4.1": // Eligibility Service
        fields.push({
          allEligible: sectionData?.allEligible || "",
          websiteLink: sectionData?.websiteLink || "",
        });
        break;
      case "4.2": // SOP
        fields.push({
          available: sectionData?.available || "",
          file: sectionData?.file || null,
        });
        break;
      case "4.3": // Projects Greenlit
        fields.push({
          numberOfProjects: sectionData?.numberOfProjects || "",
        });
        break;
      case "4.4": // E-Office
        fields.push({
          adopted: sectionData?.adopted || "",
          file: sectionData?.file || null,
        });
        break;
      case "4.5": // Best Practices
        fields.push({
          implemented: sectionData?.implemented || "",
          practiceName: sectionData?.practiceName || "",
          impact: sectionData?.impact || "",
          file: sectionData?.file || null,
        });
        break;
      case "4.6": // Capacity Building
        if (sectionData?.capacityArray && sectionData.capacityArray.length > 0) {
          sectionData.capacityArray.forEach((item: any) => {
            fields.push({
              trainingType: item.trainingType || "",
              numberOfOfficers: item.numberOfOfficers || "",
              file: item.file || null,
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
    category: "infraEnablers",
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
        console.log("🔍 [InfraEnablersStep - INITIAL CHECK] Checking backend submission status on mount");
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
          console.log("✅ [InfraEnablersStep - INITIAL CHECK] All sections completed, redirecting");
          toast({
            title: "Success",
            description: "All indicators completed. Redirecting to review page...",
          });
          setTimeout(() => {
            navigate(`/data-submission/review/${submission.id}`);
          }, 1500);
        }
      } catch (error) {
        console.error("❌ [InfraEnablersStep - INITIAL CHECK] Error:", error);
      }
    };

    checkInitialStatus();
  }, [user, navigate, toast]);

  // Check backend after each indicator submission to see if all sections complete
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        console.log("🔍 [InfraEnablersStep] Checking backend submission status");
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
        
        const remoteData = submission?.formData?.infraEnablers;
        if (!remoteData) return;
        
        setFormData((prev) => {
          // Check each section independently - only hydrate sections that are empty
          console.log("🌐 Hydrating infraEnablers from server (per-section basis)");
          
          const hydrated: InfraEnablersData = {
            // Section 4.1 - Only load from server if local is empty
            section4_1: (() => {
              const isLocal4_1Empty = !prev.section4_1?.allEligible && !prev.section4_1?.websiteLink;
              if (!isLocal4_1Empty) {
                console.log("🔒 Section 4.1 has local data, keeping it");
                return prev.section4_1;
              }
              console.log("⬇️ Section 4.1 empty, loading from server");
              return {
                allEligible: remoteData.section4_1?.allEligible || prev.section4_1?.allEligible || "",
                websiteLink: remoteData.section4_1?.websiteLink || prev.section4_1?.websiteLink || "",
              };
            })(),
            
            // Section 4.2 - Only load from server if local is empty
            section4_2: (() => {
              const isLocal4_2Empty = !prev.section4_2?.available;
              if (!isLocal4_2Empty) {
                console.log("🔒 Section 4.2 has local data, keeping it");
                return prev.section4_2;
              }
              console.log("⬇️ Section 4.2 empty, loading from server");
              return {
                available: remoteData.section4_2?.available || prev.section4_2?.available || "",
                file: remoteData.section4_2?.file || prev.section4_2?.file || null,
              };
            })(),
            
            // Section 4.3 - Only load from server if local is empty
            section4_3: (() => {
              const isLocal4_3Empty = !prev.section4_3?.numberOfProjects;
              if (!isLocal4_3Empty) {
                console.log("🔒 Section 4.3 has local data, keeping it");
                return prev.section4_3;
              }
              console.log("⬇️ Section 4.3 empty, loading from server");
              return {
                numberOfProjects: remoteData.section4_3?.numberOfProjects || prev.section4_3?.numberOfProjects || "",
                marksObtained: remoteData.section4_3?.marksObtained ?? prev.section4_3?.marksObtained,
              };
            })(),
            
            // Section 4.4 - Only load from server if local is empty
            section4_4: (() => {
              const isLocal4_4Empty = !prev.section4_4?.adopted;
              if (!isLocal4_4Empty) {
                console.log("🔒 Section 4.4 has local data, keeping it");
                return prev.section4_4;
              }
              console.log("⬇️ Section 4.4 empty, loading from server");
              return {
                adopted: remoteData.section4_4?.adopted || prev.section4_4?.adopted || "",
                file: remoteData.section4_4?.file || prev.section4_4?.file || null,
                marksObtained: remoteData.section4_4?.marksObtained ?? prev.section4_4?.marksObtained,
              };
            })(),
            
            // Section 4.5 - Only load from server if local is empty
            section4_5: (() => {
              const isLocal4_5Empty = !prev.section4_5?.implemented;
              if (!isLocal4_5Empty) {
                console.log("🔒 Section 4.5 has local data, keeping it");
                return prev.section4_5;
              }
              console.log("⬇️ Section 4.5 empty, loading from server");
              return {
                implemented: remoteData.section4_5?.implemented || prev.section4_5?.implemented || "",
                practiceName: remoteData.section4_5?.practiceName || prev.section4_5?.practiceName || "",
                impact: remoteData.section4_5?.impact || prev.section4_5?.impact || "",
                file: remoteData.section4_5?.file || prev.section4_5?.file || null,
              };
            })(),
            
            // Section 4.6 - Only load from server if local is empty
            section4_6: (() => {
              const isLocal4_6Empty = !prev.section4_6?.capacityArray || prev.section4_6.capacityArray.length === 0;
              if (!isLocal4_6Empty) {
                console.log("🔒 Section 4.6 has local data, keeping it");
                return prev.section4_6;
              }
              console.log("⬇️ Section 4.6 empty, loading from server");
              return {
                capacityArray: Array.isArray(remoteData.section4_6?.capacityArray)
                  ? remoteData.section4_6.capacityArray
                  : (prev.section4_6?.capacityArray || []),
              };
            })(),
          };
          return hydrated;
        });
      } catch (e) {
        console.warn("⚠️ Failed server hydration (infraEnablers)", e);
      }
    })();
  }, [user?.id]);

  // Patch: after successful submit, update global state
  const handleIndicatorSubmitPatched = async (
    indicatorCode: string,
    prepareFieldsFn: (code: string, data: any) => Record<string, any>[]
  ) => {
    await handleIndicatorSubmit(indicatorCode, prepareFieldsFn);
    setIndicatorSubmitted("infraEnablers", indicatorCode);
  };

  const handleSaveDraft = async () => {
    const success = saveDraftToLocalStorage("infraEnablers", formData);
    if (success) {
      updateFormData("infraEnablers", formData);
    }
  };

  // Unified access control for both roles
  const sectionIndicators = ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"];
  const allowedIndicators =
    (isNodalOfficer ? assignedIndicators : availableIndicators)?.filter((i) =>
      sectionIndicators.includes(i)
    ) || [];

  console.log("🟢 InfraEnablersStep: Allowed indicators", allowedIndicators);

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
            title="Infrastructure Enablers"
            description="Supporting infrastructure and policy enablers"
            points={250}
            completed={0}
            total={6}
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
    <div className="">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />
      {(() => {
        const { completed, total, progress } = computeStepProgress(
          { infraEnablers: formData } as any,
          "infraEnablers",
          {
            assignedIndicators,
            availableIndicators,
            isNodalOfficer,
            isStateApprover,
          }
        );
        console.log("Infra Enablers Progress Debug:", {
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
            title="Infrastructure Enablers"
            description="Regulatory and institutional frameworks supporting infrastructure"
            points={250}
            completed={completed}
            total={total}
            progress={progress}
          />
        );
      })()}

      {/* Section 4.1 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.1") ||
        availableIndicators.includes("4.1")) &&
        (!isEditMode ||
          !!formData.section4_1?.allEligible ||
          !!formData.section4_1?.websiteLink) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.1 - </span> Eligible
                  Infrastructure Projects{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4 w-[40%]">
              <div>
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
                          section4_1: {
                            ...prev.section4_1,
                            allEligible: "yes",
                          },
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
              </div>
              <div>
                <Label>Website Link</Label>
                <Input
                  type="url"
                  placeholder="Enter Website Link"
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
              
              {/* Submit Button for 4.1 */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleIndicatorSubmitPatched("4.1", prepareFieldsForEnablers)}
                  disabled={submittingIndicators["4.1"] || hookSubmittedIndicators["4.1"]}
                  className="bg-primary text-white"
                >
                  {submittingIndicators["4.1"] ? (
                    "Submitting..."
                  ) : hookSubmittedIndicators["4.1"] ? (
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

      {/* Section 4.2 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.2") ||
        availableIndicators.includes("4.2")) &&
        (!isEditMode ||
          !!formData.section4_2?.available ||
          !!formData.section4_2?.file) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.2 - </span> Availability &
                  Use of State/UT PMG{" "}
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4 w-[70%]">
              <div>
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
              </div>
              {formData.section4_2.available === "yes" && (
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
              )}
              
              {/* Submit Button for 4.2 */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleIndicatorSubmitPatched("4.2", prepareFieldsForEnablers)}
                  disabled={submittingIndicators["4.2"] || hookSubmittedIndicators["4.2"]}
                  className="bg-primary text-white"
                >
                  {submittingIndicators["4.2"] ? (
                    "Submitting..."
                  ) : hookSubmittedIndicators["4.2"] ? (
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

      {/* Section 4.3 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.3") ||
        availableIndicators.includes("4.3")) &&
        (!isEditMode ||
          (formData.section4_3?.numberOfProjects !== undefined &&
            formData.section4_3.numberOfProjects !== "")) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.3 - </span> Adoption of PM
                  GatiShakti
                   <span className="font-normal text-xs text-muted-foreground ml-1">
                    (10 marks per 1%)
                  </span>
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="space-y-4 w-[40%]">
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
              
              {/* Submit Button for 4.3 */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleIndicatorSubmitPatched("4.3", prepareFieldsForEnablers)}
                  disabled={submittingIndicators["4.3"] || hookSubmittedIndicators["4.3"]}
                  className="bg-primary text-white"
                >
                  {submittingIndicators["4.3"] ? (
                    "Submitting..."
                  ) : hookSubmittedIndicators["4.3"] ? (
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

      {/* Section 4.4 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.4") ||
        availableIndicators.includes("4.4")) &&
        (!isEditMode ||
          !!formData.section4_4?.adopted ||
          !!formData.section4_4?.file) && (
          <SectionCard
            title={
               <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.4 - </span> Adoption of ADR
                  <span className="font-normal text-xs text-muted-foreground ml-1">
                    (10 marks per practice)
                  </span>
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              <div>
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
              </div>
              {formData.section4_4.adopted === "yes" && (
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
              )}
              
              {/* Submit Button for 4.4 */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleIndicatorSubmitPatched("4.4", prepareFieldsForEnablers)}
                  disabled={submittingIndicators["4.4"] || hookSubmittedIndicators["4.4"]}
                  className="bg-primary text-white"
                >
                  {submittingIndicators["4.4"] ? (
                    "Submitting..."
                  ) : hookSubmittedIndicators["4.4"] ? (
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

      {/* Section 4.5 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.5") ||
        availableIndicators.includes("4.5")) &&
        (!isEditMode ||
          !!formData.section4_5?.implemented ||
          !!formData.section4_5?.practiceName ||
          !!formData.section4_5?.impact ||
          !!formData.section4_5?.file) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.5 - </span> Innovative
                  Practices
                </span>
              </div>
            }
            subtitle=""
            className="mb-6"
          >
            <div className="flex flex-col gap-4 w-[70%]">
              <div>
                <Label>
                  Innovation Practices{" "}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="inline w-3 h-3 ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Are there innovative practices?
                    </TooltipContent>
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
                          section4_5: {
                            ...prev.section4_5,
                            implemented: "yes",
                          },
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Practice Name</Label>
                  <Input
                    type="text"
                    placeholder="Practice Name"
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
              {formData.section4_5.implemented === "yes" && (
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
                  <p className="text-xs text-muted-foreground">
                    Upload evidence
                  </p>
                </div>
              )}
              
              {/* Submit Button for 4.5 */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleIndicatorSubmitPatched("4.5", prepareFieldsForEnablers)}
                  disabled={submittingIndicators["4.5"] || hookSubmittedIndicators["4.5"]}
                  className="bg-primary text-white"
                >
                  {submittingIndicators["4.5"] ? (
                    "Submitting..."
                  ) : hookSubmittedIndicators["4.5"] ? (
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

      {/* Section 4.6 */}
      {((!isNodalOfficer && !isStateApprover) ||
        assignedIndicators.includes("4.6") ||
        availableIndicators.includes("4.6")) &&
        (!isEditMode ||
          (Array.isArray(formData.section4_6.capacityArray) &&
            formData.section4_6.capacityArray.length > 0)) && (
          <SectionCard
            title={
              <div className="flex flex-col">
                <span className="text-base font-semibold ">
                  <span className="text-primary">4.6 - </span> Capacity Building
                  - Officer Participation
                  <span className="font-normal text-xs text-muted-foreground ml-1">
                    (1 marks per officer)
                  </span>
                </span>
              </div>
            }
            className="mb-6"
          >
            <div className="flex flex-col gap-4">
              <div>
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
                  <label
                    htmlFor="capacity-yes-step"
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      if (formData.section4_6.capacityArray.length === 0) {
                        addTraining();
                      }
                    }}
                  >
                    <input
                      id="capacity-yes-step"
                      type="radio"
                      name="capacity-building-step"
                      value="yes"
                      checked={formData.section4_6.capacityArray.length > 0}
                      onChange={() => {
                        if (formData.section4_6.capacityArray.length === 0) {
                          addTraining();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer select-none">Yes</span>
                  </label>
                  <label
                    htmlFor="capacity-no-step"
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      if (formData.section4_6.capacityArray.length > 0) {
                        setFormData((prev) => ({
                          ...prev,
                          section4_6: { capacityArray: [] },
                        }));
                      }
                    }}
                  >
                    <input
                      id="capacity-no-step"
                      type="radio"
                      name="capacity-building-step"
                      value="no"
                      checked={formData.section4_6.capacityArray.length === 0}
                      onChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          section4_6: { capacityArray: [] },
                        }));
                      }}
                      className="w-4 h-4 text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer select-none">No</span>
                  </label>
                </div>
              </div>

              {formData.section4_6.capacityArray.map((entry, idx) => (
                <div key={entry.id} className="mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <Label>Officer Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter officer name"
                        value={entry.officerName}
                        onChange={(e) =>
                          updateTraining(
                            entry.id,
                            "officerName",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Designation</Label>
                      <Input
                        type="text"
                        placeholder="Enter designation"
                        value={entry.designation}
                        onChange={(e) =>
                          updateTraining(
                            entry.id,
                            "designation",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Program Name</Label>
                      <Input
                        type="text"
                        placeholder="Enter program name"
                        value={entry.programName}
                        onChange={(e) =>
                          updateTraining(
                            entry.id,
                            "programName",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Organiser</Label>
                      <Input
                        type="text"
                        placeholder="Enter organiser"
                        value={entry.organiser}
                        onChange={(e) =>
                          updateTraining(entry.id, "organiser", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                      <div className="w-full">
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
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTraining}
                className="w-fit border-primary text-primary hover:bg-blue-50 flex items-center gap-2 "
              >
                <Plus className="w-4 h-4" />
                Add More Training
              </Button>
              
              {/* Submit Button for 4.6 */}
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => handleIndicatorSubmitPatched("4.6", prepareFieldsForEnablers)}
                  disabled={submittingIndicators["4.6"] || hookSubmittedIndicators["4.6"]}
                  className="bg-primary text-white"
                >
                  {submittingIndicators["4.6"] ? (
                    "Submitting..."
                  ) : hookSubmittedIndicators["4.6"] ? (
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
        isFirstStep={false}
        isLastStep={isLastStep}
        nextLabel={isLastStep ? "Review & Submit" : "Next"}
        showSaveDraft={true}
      />
    </div>
  );
};
