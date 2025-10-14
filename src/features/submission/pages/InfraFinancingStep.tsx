import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SectionCard } from "../components/SectionCard";
import { FormActions } from "../components/FormActions";
import { ProgressHeader } from "../components/ProgressHeader";
import { Stepper } from "../components/Stepper";
import { useStepNavigation } from "../hooks/useStepNavigation";
import { useFormPersistence } from "../hooks/useFormPersistence";
import {
  SUBMISSION_STEPS,
} from "../constants/steps";
import type { InfraFinancingData } from "../types";

import { draftService } from "@/services/draft.service";
import { useAuth } from "@/features/auth/AuthProvider";

export const InfraFinancingStep = () => {
  const { currentStep, goToNext, goToPrevious, isFirstStep, isLastStep } =
    useStepNavigation(1);
  const { formData: persistedFormData, getStepData, updateFormData } = useFormPersistence();
  const { user } = useAuth();

  // Note: Editing submission data is handled by useFormPersistence hook
  const { toast } = useToast();

  // Always provide a fully structured initialData, merging loaded data with defaults
  const defaultData: InfraFinancingData = {
    section1_1: {
      year: "",
      capitalAllocation: "", // A₁
      gsdpForFY: "", // A₂
      allocationToGSDP: "",
    },
    section1_2: {
      year: "",
      actualCapex: "", // A₁
      stateCapexUtilisation: "",
      capexActualsToGSDP: "",
    },
    section1_3: [],
    section1_4: [],
    section1_5: [],
  };

  const loadedData =
    (getStepData("infraFinancing") as Partial<InfraFinancingData>) || {};
  const initialData: InfraFinancingData = {
    ...defaultData,
    ...loadedData,
    section1_1: { ...defaultData.section1_1, ...(loadedData.section1_1 || {}) },
    section1_2: { ...defaultData.section1_2, ...(loadedData.section1_2 || {}) },
    section1_3: Array.isArray(loadedData.section1_3) ? loadedData.section1_3 : [],
    section1_4: Array.isArray(loadedData.section1_4) ? loadedData.section1_4 : [],
    section1_5: Array.isArray(loadedData.section1_5) ? loadedData.section1_5 : [],
  };

  const [formData, setFormData] = useState<InfraFinancingData>(initialData);

  // Sync with localStorage data when component mounts or data changes
  useEffect(() => {
    const currentStepData = getStepData("infraFinancing") as Partial<InfraFinancingData>;
    if (currentStepData && Object.keys(currentStepData).length > 0) {
      const syncedData: InfraFinancingData = {
        ...defaultData,
        ...currentStepData,
        section1_1: { ...defaultData.section1_1, ...(currentStepData.section1_1 || {}) },
        section1_2: { ...defaultData.section1_2, ...(currentStepData.section1_2 || {}) },
        section1_3: Array.isArray(currentStepData.section1_3) ? currentStepData.section1_3 : [],
        section1_4: Array.isArray(currentStepData.section1_4) ? currentStepData.section1_4 : [],
        section1_5: Array.isArray(currentStepData.section1_5) ? currentStepData.section1_5 : [],
      };
      setFormData(syncedData);
      console.log("🔄 Synced infraFinancing data from localStorage in normal flow:", syncedData);
    }
  }, [getStepData]);

  // Initialize form data from persisted data or editing submission (run only once)
  useEffect(() => {
    let shouldUpdate = false;
    let updatedData = { ...defaultData };

    // Check for editing submission data first
    const editingSubmission = localStorage.getItem("editing_submission");
    if (editingSubmission) {
      try {
        const submissionData = JSON.parse(editingSubmission);
        if (submissionData.formData && submissionData.formData.infraFinancing) {
          const stepData = submissionData.formData.infraFinancing as Partial<InfraFinancingData>;
          updatedData = {
            ...defaultData,
            ...stepData,
            section1_1: { ...defaultData.section1_1, ...(stepData.section1_1 || {}) },
            section1_2: { ...defaultData.section1_2, ...(stepData.section1_2 || {}) },
            section1_3: Array.isArray(stepData.section1_3) ? stepData.section1_3 : [],
            section1_4: Array.isArray(stepData.section1_4) ? stepData.section1_4 : [],
            section1_5: Array.isArray(stepData.section1_5) ? stepData.section1_5 : [],
          };
          shouldUpdate = true;
          console.log("✅ Direct prefill from editing submission:", updatedData);
          localStorage.removeItem("editing_submission");
        }
      } catch (error) {
        console.error("❌ Failed to parse editing submission in InfraFinancingStep:", error);
        localStorage.removeItem("editing_submission");
      }
    } else {
      // Check for persisted form data using getStepData instead of persistedFormData
      const currentStepData = getStepData("infraFinancing") as Partial<InfraFinancingData>;
      if (currentStepData && Object.keys(currentStepData).length > 0) {
        updatedData = {
          ...defaultData,
          ...currentStepData,
          section1_1: { ...defaultData.section1_1, ...(currentStepData.section1_1 || {}) },
          section1_2: { ...defaultData.section1_2, ...(currentStepData.section1_2 || {}) },
          section1_3: Array.isArray(currentStepData.section1_3) ? currentStepData.section1_3 : [],
          section1_4: Array.isArray(currentStepData.section1_4) ? currentStepData.section1_4 : [],
          section1_5: Array.isArray(currentStepData.section1_5) ? currentStepData.section1_5 : [],
        };
        shouldUpdate = true;
        console.log("🔄 Synced form data from persisted data:", updatedData);
      }
    }

    if (shouldUpdate) {
      setFormData(updatedData);
    }
  }, []); // Empty dependency array to run only once

  // Calculation functions
  const calculateSection1_1 = useCallback(() => {
    const capitalAllocation = parseFloat(formData.section1_1.capitalAllocation.replace(/[₹,]/g, ''));
    const gsdpForFY = parseFloat(formData.section1_1.gsdpForFY.replace(/[₹,]/g, ''));
    
    if (isNaN(capitalAllocation) || isNaN(gsdpForFY) || gsdpForFY === 0) {
      return { percentage: 0, marksObtained: 0 };
    }
    
    const percentage = (capitalAllocation / gsdpForFY) * 100;
    const marksObtained = Math.min(percentage * 10, 50); // Max 50 marks
    
    return {
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  }, [formData.section1_1.capitalAllocation, formData.section1_1.gsdpForFY]);

  const calculateSection1_2 = useCallback(() => {
    const actualCapex = parseFloat(formData.section1_2.actualCapex.replace(/[₹,]/g, ''));
    const stateCapexUtilisation = parseFloat(formData.section1_2.stateCapexUtilisation.replace(/[₹,]/g, ''));
    
    if (isNaN(actualCapex) || isNaN(stateCapexUtilisation) || stateCapexUtilisation === 0) {
      return { percentage: 0, marksObtained: 0 };
    }
    
    const percentage = (actualCapex / stateCapexUtilisation) * 100;
    const marksObtained = Math.min(percentage / 2, 50); // Max 50 marks
    
    return {
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      marksObtained: Math.round(marksObtained * 100) / 100
    };
  }, [formData.section1_2.actualCapex, formData.section1_2.stateCapexUtilisation]);

  // Helper functions for array management
  const addULB = () => {
    const newULB = {
      id: Date.now().toString(),
      cityName: "",
      ulb: "",
      ratingDate: "",
      rating: ""
    };
    setFormData(prev => ({
      ...prev,
      section1_3: [...prev.section1_3, newULB]
    }));
  };

  const removeULB = (id: string) => {
    setFormData(prev => ({
      ...prev,
      section1_3: prev.section1_3.filter(item => item.id !== id)
    }));
  };

  const addBond = () => {
    const newBond = {
      id: Date.now().toString(),
      bondType: "",
      cityName: "",
      issuingAuthority: "",
      value: ""
    };
    setFormData(prev => ({
      ...prev,
      section1_4: [...prev.section1_4, newBond]
    }));
  };

  const removeBond = (id: string) => {
    setFormData(prev => ({
      ...prev,
      section1_4: prev.section1_4.filter(item => item.id !== id)
    }));
  };

  const addIntermediary = () => {
    const newIntermediary = {
      id: Date.now().toString(),
      organisationName: "",
      organisationType: "",
      yearEstablished: "",
      totalFunding: "",
      website: ""
    };
    setFormData(prev => ({
      ...prev,
      section1_5: [...prev.section1_5, newIntermediary]
    }));
  };

  const removeIntermediary = (id: string) => {
    setFormData(prev => ({
      ...prev,
      section1_5: prev.section1_5.filter(item => item.id !== id)
    }));
  };


  // Update formData with calculated values when they change
  useEffect(() => {
    const section1_1Calc = calculateSection1_1();
    const section1_2Calc = calculateSection1_2();

    // Calculate % Allocation to GSDP
    const capitalAllocation = parseFloat(formData.section1_1.capitalAllocation.replace(/[₹,]/g, ''));
    const gsdpForFY = parseFloat(formData.section1_1.gsdpForFY.replace(/[₹,]/g, ''));
    let allocationToGSDP = '';
    
    if (!isNaN(capitalAllocation) && !isNaN(gsdpForFY) && gsdpForFY > 0) {
      const percentage = (capitalAllocation / gsdpForFY) * 100;
      allocationToGSDP = percentage.toFixed(1) + '%';
    }

    // Calculate % Capex Actuals to GSDP
    const actualCapex = parseFloat(formData.section1_2.actualCapex.replace(/[₹,]/g, ''));
    const stateCapexUtilisation = parseFloat(formData.section1_2.stateCapexUtilisation.replace(/[₹,]/g, ''));
    let capexActualsToGSDP = '';
    
    if (!isNaN(actualCapex) && !isNaN(stateCapexUtilisation) && stateCapexUtilisation > 0) {
      const percentage = (actualCapex / stateCapexUtilisation) * 100;
      capexActualsToGSDP = percentage.toFixed(1) + '%';
    }

    setFormData(prev => {
      // Check if values actually changed to prevent infinite loop
      const section1_1Changed = 
        prev.section1_1.percentage !== section1_1Calc.percentage ||
        prev.section1_1.marksObtained !== section1_1Calc.marksObtained ||
        prev.section1_1.allocationToGSDP !== allocationToGSDP;
      
      const section1_2Changed = 
        prev.section1_2.percentage !== section1_2Calc.percentage ||
        prev.section1_2.marksObtained !== section1_2Calc.marksObtained ||
        prev.section1_2.capexActualsToGSDP !== capexActualsToGSDP;

      if (!section1_1Changed && !section1_2Changed) {
        return prev; // No change, return same object
      }

      return {
        ...prev,
        section1_1: {
          ...prev.section1_1,
          percentage: section1_1Calc.percentage,
          marksObtained: section1_1Calc.marksObtained,
          allocationToGSDP: allocationToGSDP
        },
        section1_2: {
          ...prev.section1_2,
          percentage: section1_2Calc.percentage,
          marksObtained: section1_2Calc.marksObtained,
          capexActualsToGSDP: capexActualsToGSDP
        }
      };
    });
  }, [
    formData.section1_1.capitalAllocation,
    formData.section1_1.gsdpForFY,
    formData.section1_2.actualCapex,
    formData.section1_2.stateCapexUtilisation
  ]);

  // Autosave to localStorage with debouncing (avoid infinite loop)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateFormData("infraFinancing", formData);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [formData]);

  // Validation: Check all fields before proceeding
  const validateFields = () => {
    // Section 1.1 - Check if calculation fields are valid
    const s1 = formData.section1_1;
    if (
      !s1.year ||
      !s1.capitalAllocation ||
      !s1.gsdpForFY ||
      s1.marksObtained === undefined
    ) {
      return false;
    }
    
    // Check for division by zero
    const gsdpValue = parseFloat(s1.gsdpForFY.replace(/[₹,]/g, ''));
    if (gsdpValue === 0) {
      return false;
    }
    
    // Section 1.2 - Check if calculation fields are valid
    const s2 = formData.section1_2;
    if (
      !s2.year ||
      !s2.actualCapex ||
      !s2.budgetaryCapex ||
      s2.marksObtained === undefined
    ) {
      return false;
    }
    
    // Check for division by zero
    const budgetaryCapexValue = parseFloat(s2.budgetaryCapex.replace(/[₹,]/g, ''));
    if (budgetaryCapexValue === 0) {
      return false;
    }
    
    // Section 1.3 - Check if at least one ULB is added
    if (formData.section1_3.length === 0) {
      return false;
    }
    
    // Section 1.4 - Check if at least one bond is added
    if (formData.section1_4.length === 0) {
      return false;
    }
    
    // Section 1.5 - Check if at least one intermediary is added
    if (formData.section1_5.length === 0) {
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    // Always save to localStorage before navigating
    updateFormData("infraFinancing", formData);
    goToNext();
  };


  return (
    <div className="max-w-6xl mx-auto p-6">
      <Stepper steps={SUBMISSION_STEPS} currentStep={currentStep} />

      <ProgressHeader
        title="Infrastructure Financing"
        description="Data related to infrastructure financing and budget allocation"
        points={250}
        completed={0}
        total={5}
        progress={0}
      />


      {/* Section 1.1 */}
      <SectionCard
        title={
          <div className="flex flex-col">
            <span className="text-base font-semibold text-primary">
              1.1 - % Capex to GSDP{" "}
              <span className="font-normal text-xs text-muted-foreground">
                (10 marks per 1%)
              </span>
            </span>
            <span className="text-xs text-muted-foreground font-normal">
              Annex 1: Verified with RBI/CAG data (* Budgeted Estimates for
              Capital Expenditure)
            </span>
          </div>
        }
        subtitle=""
        className="mb-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Year*</Label>
            <Input
              type="text"
              placeholder="2024-25"
              value={formData.section1_1.year}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section1_1: { ...formData.section1_1, year: e.target.value },
                })
              }
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              Capital Allocation for FY (INR)*
              <Info className="h-4 w-4 text-gray-500" />
            </Label>
            <Input
              placeholder="₹1,50,000 crores"
              value={formData.section1_1.capitalAllocation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section1_1: {
                    ...formData.section1_1,
                    capitalAllocation: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              GSDP for FY (INR)*
              <Info className="h-4 w-4 text-gray-500" />
            </Label>
            <Input
              placeholder="₹25,00,000 crores"
              value={formData.section1_1.gsdpForFY}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section1_1: {
                    ...formData.section1_1,
                    gsdpForFY: e.target.value,
                  },
                })
              }
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              % Allocation to GSDP*
              <Info className="h-4 w-4 text-gray-500" />
            </Label>
            <Input
              placeholder="Auto-calculated"
              value={(() => {
                const capitalAllocation = parseFloat(formData.section1_1.capitalAllocation.replace(/[₹,]/g, ''));
                const gsdpForFY = parseFloat(formData.section1_1.gsdpForFY.replace(/[₹,]/g, ''));
                
                if (isNaN(capitalAllocation) || isNaN(gsdpForFY) || gsdpForFY === 0) {
                  return '';
                }
                
                const percentage = (capitalAllocation / gsdpForFY) * 100;
                return percentage.toFixed(1) + '%';
              })()}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 1.2 */}
      <SectionCard
        title="1.2 - % Capex Utilization (10 marks per 1%)"
        subtitle="Annex 2: Verified with MoHUA data"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Year*</Label>
            <Input
              placeholder="Year"
              value={formData.section1_2.year}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section1_2: { ...formData.section1_2, year: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>A₁ - Actual Capex (INR)*</Label>
            <Input
              placeholder="₹2,15,400 Crores"
              value={formData.section1_2.actualCapex}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section1_2: {
                    ...formData.section1_2,
                    actualCapex: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>State Capex Utilisation (INR)</Label>
            <Input
              placeholder="₹15,40,250 Crores"
              value={formData.section1_2.stateCapexUtilisation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  section1_2: {
                    ...formData.section1_2,
                    stateCapexUtilisation: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>% Capex Actuals to GSDP</Label>
            <Input
              placeholder="Auto-calculated"
              value={(() => {
                const actualCapex = parseFloat(formData.section1_2.actualCapex.replace(/[₹,]/g, ''));
                const stateCapexUtilisation = parseFloat(formData.section1_2.stateCapexUtilisation.replace(/[₹,]/g, ''));
                
                if (isNaN(actualCapex) || isNaN(stateCapexUtilisation) || stateCapexUtilisation === 0) {
                  return '';
                }
                
                const percentage = (actualCapex / stateCapexUtilisation) * 100;
                return percentage.toFixed(1) + '%';
              })()}
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 1.3 */}
      <SectionCard
        title="1.3 - % of Credit Rated ULBs"
        subtitle="Annex 2: Verified with MoHUA data"
        className="mb-6"
      >
        <div className="space-y-4">
          {formData.section1_3.map((ulb, index) => (
            <div key={ulb.id} className="grid grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label>City name*</Label>
                <Input
                  placeholder="Mumbai"
                  value={ulb.cityName}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_3: prev.section1_3.map(item =>
                        item.id === ulb.id ? { ...item, cityName: e.target.value } : item
                      )
                    }))
                  }
                />
              </div>
              <div>
                <Label>ULB*</Label>
                <Select
                  value={ulb.ulb}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_3: prev.section1_3.map(item =>
                        item.id === ulb.id ? { ...item, ulb: value } : item
                      )
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ULB" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pune Municipal Corporation">Pune Municipal Corporation</SelectItem>
                    <SelectItem value="Mumbai Municipal Corporation">Mumbai Municipal Corporation</SelectItem>
                    <SelectItem value="Nagpur Municipal Corporation">Nagpur Municipal Corporation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rating date*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !ulb.ratingDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {ulb.ratingDate ? format(new Date(ulb.ratingDate), "dd-MM-yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={ulb.ratingDate ? new Date(ulb.ratingDate) : undefined}
                      onSelect={(date) =>
                        setFormData(prev => ({
                          ...prev,
                          section1_3: prev.section1_3.map(item =>
                            item.id === ulb.id ? { ...item, ratingDate: date ? date.toISOString() : "" } : item
                          )
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Select Rating*</Label>
                  <Select
                    value={ulb.rating}
                    onValueChange={(value) =>
                      setFormData(prev => ({
                        ...prev,
                        section1_3: prev.section1_3.map(item =>
                          item.id === ulb.id ? { ...item, rating: value } : item
                        )
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AA+">AA+</SelectItem>
                      <SelectItem value="AA">AA</SelectItem>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="BBB+">BBB+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeULB(ulb.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addULB}
            className="w-fit mx-auto border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More ULB
          </Button>
        </div>
      </SectionCard>

      {/* Section 1.4 */}
      <SectionCard
        title="1.4 - % of ULBs issuing Bonds"
        subtitle="Annex 3: ULBs with population > 50,000"
        className="mb-6"
      >
        <div className="space-y-4">
          {formData.section1_4.map((bond, index) => (
            <div key={bond.id} className="grid grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label>Select Bond Type*</Label>
                <Select
                  value={bond.bondType}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_4: prev.section1_4.map(item =>
                        item.id === bond.id ? { ...item, bondType: value } : item
                      )
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bond type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Municipal bond">Municipal bond</SelectItem>
                    <SelectItem value="Infrastructure bond">Infrastructure bond</SelectItem>
                    <SelectItem value="Revenue bond">Revenue bond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City Name*</Label>
                <Select
                  value={bond.cityName}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_4: prev.section1_4.map(item =>
                        item.id === bond.id ? { ...item, cityName: value } : item
                      )
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mumbai">Mumbai</SelectItem>
                    <SelectItem value="Pune">Pune</SelectItem>
                    <SelectItem value="Nagpur">Nagpur</SelectItem>
                    <SelectItem value="Nashik">Nashik</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Issuing Authority*</Label>
                <Select
                  value={bond.issuingAuthority}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_4: prev.section1_4.map(item =>
                        item.id === bond.id ? { ...item, issuingAuthority: value } : item
                      )
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select authority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Authority Name">Authority Name</SelectItem>
                    <SelectItem value="Municipal Corporation">Municipal Corporation</SelectItem>
                    <SelectItem value="Development Authority">Development Authority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Value (INR crore)*</Label>
                  <Input
                    placeholder="₹500 crores"
                    value={bond.value}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        section1_4: prev.section1_4.map(item =>
                          item.id === bond.id ? { ...item, value: e.target.value } : item
                        )
                      }))
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeBond(bond.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addBond}
            className="w-fit mx-auto border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More Bond
          </Button>
        </div>
      </SectionCard>

      {/* Section 1.5 */}
      <SectionCard
        title="1.5 - Functional Financial Intermediary"
        subtitle="Annex 4: Provide website link and funding details"
        className="mb-6"
      >
        <div className="space-y-4">
          {formData.section1_5.map((intermediary, index) => (
            <div key={intermediary.id} className="grid grid-cols-5 gap-4 p-4 border rounded-lg bg-gray-50">
              <div>
                <Label>Organisation Name*</Label>
                <Input
                  placeholder="Enter organisation name"
                  value={intermediary.organisationName}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_5: prev.section1_5.map(item =>
                        item.id === intermediary.id ? { ...item, organisationName: e.target.value } : item
                      )
                    }))
                  }
                />
              </div>
              <div>
                <Label>Organisation Type*</Label>
                <Select
                  value={intermediary.organisationType}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_5: prev.section1_5.map(item =>
                        item.id === intermediary.id ? { ...item, organisationType: value } : item
                      )
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Government Corporation">Government Corporation</SelectItem>
                    <SelectItem value="Development Authority">Development Authority</SelectItem>
                    <SelectItem value="Financial Institution">Financial Institution</SelectItem>
                    <SelectItem value="Private Entity">Private Entity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year of Establishment*</Label>
                <Select
                  value={intermediary.yearEstablished}
                  onValueChange={(value) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_5: prev.section1_5.map(item =>
                        item.id === intermediary.id ? { ...item, yearEstablished: value } : item
                      )
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Enter year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 30 }, (_, i) => 2024 - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total Funding (INR)</Label>
                <Input
                  placeholder="Enter total finding in INR"
                  value={intermediary.totalFunding}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      section1_5: prev.section1_5.map(item =>
                        item.id === intermediary.id ? { ...item, totalFunding: e.target.value } : item
                      )
                    }))
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Website (Optional)</Label>
                  <Input
                    placeholder="Website link"
                    value={intermediary.website}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        section1_5: prev.section1_5.map(item =>
                          item.id === intermediary.id ? { ...item, website: e.target.value } : item
                        )
                      }))
                    }
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeIntermediary(intermediary.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={addIntermediary}
            className="w-fit mx-auto border-blue-500 text-blue-500 hover:bg-blue-50"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add More Financial Intermediary
          </Button>
        </div>
      </SectionCard>

      <FormActions
        onPrevious={isFirstStep ? undefined : goToPrevious}
        onNext={handleNext}
        onSaveDraft={async () => {
          try {
            // Save to localStorage first
          updateFormData("infraFinancing", formData);
            
            // Generate submission ID if not exists
            const submissionId = `DRAFT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
            
            // Save to backend
            const success = await draftService.saveDraft(
              submissionId, 
              formData, 
              "infraFinancing",
              user?.id,
              user?.state
            );
            
            if (success) {
          const { toast } = require("@/hooks/use-toast");
          toast({
            title: "Draft Saved",
            description: "Your data has been saved as a draft.",
            duration: 2000,
          });
            }
          } catch (error) {
            console.error("Failed to save draft:", error);
            const { toast } = require("@/hooks/use-toast");
            toast({
              title: "Save Failed",
              description: "Failed to save draft. Please try again.",
              variant: "destructive",
              duration: 3000,
            });
          }
        }}
        isFirstStep={isFirstStep}
        isLastStep={isLastStep}
        nextLabel={isLastStep ? "Review & Submit" : "Next"}
        showSaveDraft={true}
        isNextDisabled={false} // Commented out validation: !validateFields()
      />
    </div>
  );
};
