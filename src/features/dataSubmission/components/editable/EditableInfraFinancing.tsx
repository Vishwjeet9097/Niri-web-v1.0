import { useState, useEffect } from "react";
import { Plus, Info, Trash2 } from "lucide-react";
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
import { useReviewFormPersistence } from "../../hooks/useReviewFormPersistence";
import {
  BOND_TYPE_OPTIONS,
  ORGANISATION_TYPE_OPTIONS,
  RATING_OPTIONS,
} from "@/features/submission/constants/steps";
import { validateInfraFinancing } from "@/features/submission/validation/infraFinancingValidation";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import type { InfraFinancingData } from "@/features/submission/types";

interface EditableInfraFinancingProps {
  submissionId: string;
  submission?: any;
}

export const EditableInfraFinancing = ({ submissionId, submission }: EditableInfraFinancingProps) => {
  const { getStepData, updateFormData } = useReviewFormPersistence(submissionId);
  const { assignedIndicators } = useIndicatorAccess();
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const defaultData: InfraFinancingData = {
    section1_1: {
      year: "",
      capitalAllocation: "",
      gsdpForFY: "",
      stateCapexUtilisation: "",
      allocationToGSDP: "",
      capexToCapexActuals: "",
    },
    section1_2: {
      year: "",
      gsdpForFY: "",
      actualCapex: "",
      budgetaryCapex: "",
      stateCapexUtilisation: "",
      capexActualsToGSDP: "",
    },
    section1_3: { totalULBs: 0, ulbList: [] },
    section1_4: { totalULBs: 0, bondList: [] },
    section1_5: { ffiArray: [], hasIntermediary: "", comment: "" },
  };

  // Get data from persistence hook (this will be the source of truth)
  const persistedData = (getStepData("infraFinancing") as Partial<InfraFinancingData>) || {};
    // Debug logging removed for performance

  // Create form data by merging persisted data with defaults
  const createFormData = (data: Partial<InfraFinancingData>): InfraFinancingData => {
    // Handle legacy array format or new object format
    const section1_3 = Array.isArray(data.section1_3)
      ? { totalULBs: data.section1_3.length, ulbList: data.section1_3 }
      : (data.section1_3 || defaultData.section1_3);
    
    const section1_4 = Array.isArray(data.section1_4)
      ? { totalULBs: data.section1_4.length, bondList: data.section1_4 }
      : (data.section1_4 || defaultData.section1_4);
    
    const section1_5 = Array.isArray(data.section1_5)
      ? { ffiArray: data.section1_5, hasIntermediary: "", comment: "" }
      : (data.section1_5 || defaultData.section1_5);

    return {
      ...defaultData,
      ...data,
      section1_1: { ...defaultData.section1_1, ...(data.section1_1 || {}) },
      section1_2: { ...defaultData.section1_2, ...(data.section1_2 || {}) },
      section1_3,
      section1_4,
      section1_5,
    };
  };

  const [formData, setFormData] = useState<InfraFinancingData>(() => 
    createFormData(persistedData)
  );

  // Sync with persisted data when it changes
  useEffect(() => {
    const currentPersistedData = (getStepData("infraFinancing") as Partial<InfraFinancingData>) || {};
    const newFormData = createFormData(currentPersistedData);
    
    // Only update if data has actually changed
    if (JSON.stringify(formData) !== JSON.stringify(newFormData)) {
      console.log("🔄 Syncing form data with persisted data:", newFormData);
      setFormData(newFormData);
    }
  }, [persistedData]); // Depend on persistedData from hook

  // Validate form data
  useEffect(() => {
    const validationResult = validateInfraFinancing(formData, {
      allowedIndicators: assignedIndicators,
    });

    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors);
    } else {
      setValidationErrors({});
    }
  }, [formData, assignedIndicators]);

  // Auto-save on change with immediate save
  useEffect(() => {
    updateFormData("infraFinancing", formData);
    // Also save immediately to localStorage to prevent data loss
    const timeoutId = setTimeout(() => {
      updateFormData("infraFinancing", formData);
    }, 100); // Small delay to ensure data is saved
    return () => clearTimeout(timeoutId);
  }, [formData, updateFormData]);

  const addULB = () => {
    setFormData({
      ...formData,
      section1_3: {
        ...formData.section1_3,
        totalULBs: formData.section1_3.ulbList.length + 1,
        ulbList: [
          ...formData.section1_3.ulbList,
          {
            id: crypto.randomUUID(),
            cityName: "",
            ulb: "",
            ratingDate: "",
            rating: "",
          },
        ],
      },
    });
  };

  const removeULB = (id: string) => {
    setFormData({
      ...formData,
      section1_3: formData.section1_3.filter((item) => item.id !== id),
    });
  };


  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section 1.1 */}
        <SectionCard
          title={
            <div className="flex flex-col">
              <span className="text-base font-semibold text-primary">
                1.1 - % Capex to GSDP{" "}
                <span className="font-normal text-xs text-muted-foreground">
                  
                </span>
              </span>
              {/* <span className="text-xs text-muted-foreground font-normal">
                Annex 1: Verified with RBI/CAG data (* Budgeted Estimates for Capital Expenditure)
              </span> */}
            </div>
          }
          subtitle=""
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Year*</Label>
              <Input
                placeholder="2024-25"
                value={formData.section1_1.year}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    section1_1: { ...formData.section1_1, year: e.target.value },
                  })
                }
                className={validationErrors["section1_1.year"] ? "border-red-500" : ""}
              />
              {validationErrors["section1_1.year"] && (
                <p className="text-sm text-red-500 mt-1">{validationErrors["section1_1.year"]}</p>
              )}
            </div>
            <div>
              <Label>Capital Allocation for FY (INR)*</Label>
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
                className={validationErrors["section1_1.capitalAllocation"] ? "border-red-500" : ""}
              />
              {validationErrors["section1_1.capitalAllocation"] && (
                <p className="text-sm text-red-500 mt-1">{validationErrors["section1_1.capitalAllocation"]}</p>
              )}
            </div>
            <div>
              <Label>GSDP for FY (INR)*</Label>
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
                className={validationErrors["section1_1.gsdpForFY"] ? "border-red-500" : ""}
              />
              {validationErrors["section1_1.gsdpForFY"] && (
                <p className="text-sm text-red-500 mt-1">{validationErrors["section1_1.gsdpForFY"]}</p>
              )}
            </div>
            <div>
              <Label>% Allocation to GSDP*</Label>
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
          title="1.2 - % Capex Utilization"
          // subtitle="Annex 2: Verified with MoHUA data"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Year*</Label>
              <Input
                placeholder="2024-25"
                value={formData.section1_2.year}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    section1_2: { ...formData.section1_2, year: e.target.value },
                  })
                }
                className={validationErrors["section1_2.year"] ? "border-red-500" : ""}
              />
              {validationErrors["section1_2.year"] && (
                <p className="text-sm text-red-500 mt-1">{validationErrors["section1_2.year"]}</p>
              )}
            </div>
            <div>
              <Label>Actual Capex (INR)*</Label>
              <Input
                placeholder="₹1,45,000 crores"
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
                className={validationErrors["section1_2.actualCapex"] ? "border-red-500" : ""}
              />
              {validationErrors["section1_2.actualCapex"] && (
                <p className="text-sm text-red-500 mt-1">{validationErrors["section1_2.actualCapex"]}</p>
              )}
            </div>
            <div>
              <Label>State Capex Utilisation (INR)*</Label>
              <Input
                placeholder="₹15,40,250 crores"
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
                className={validationErrors["section1_2.stateCapexUtilisation"] ? "border-red-500" : ""}
              />
              {validationErrors["section1_2.stateCapexUtilisation"] && (
                <p className="text-sm text-red-500 mt-1">{validationErrors["section1_2.stateCapexUtilisation"]}</p>
              )}
            </div>
            <div>
              <Label>% Capex Actuals to GSDP*</Label>
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

        {/* Section 1.3 - ULB Ratings */}
        <SectionCard
          title="1.3 - Credit Rating for ULBs (50 marks)"
          // subtitle="Annex 3: List of ULBs with credit ratings"
        >
          <div className="space-y-4">
            {formData.section1_3.ulbList.length === 0 && validationErrors["section1_3.ulbList"] && (
              <p className="text-sm text-red-500 mb-2">{validationErrors["section1_3.ulbList"]}</p>
            )}
            {formData.section1_3.ulbList.map((ulb, index) => (
              <div key={ulb.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">ULB Entry {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeULB(ulb.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City Name*</Label>
                    <Input
                      placeholder="Mumbai"
                      value={ulb.cityName}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Only allow letters and spaces
                        value = value.replace(/[^a-zA-Z\s]/g, "");
                        setFormData({
                          ...formData,
                          section1_3: {
                            ...formData.section1_3,
                            ulbList: formData.section1_3.ulbList.map((item) =>
                              item.id === ulb.id
                                ? { ...item, cityName: value }
                                : item
                            ),
                          },
                        });
                      }}
                      className={validationErrors[`section1_3.ulbList.${index}.cityName`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_3.ulbList.${index}.cityName`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_3.ulbList.${index}.cityName`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>ULB Name*</Label>
                    <Input
                      placeholder="Municipal Corporation"
                      value={ulb.ulb}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_3: {
                            ...formData.section1_3,
                            ulbList: formData.section1_3.ulbList.map((item) =>
                              item.id === ulb.id
                                ? { ...item, ulb: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_3.ulbList.${index}.ulb`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_3.ulbList.${index}.ulb`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_3.ulbList.${index}.ulb`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Rating Date*</Label>
                    <Input
                      type="date"
                      value={ulb.ratingDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_3: {
                            ...formData.section1_3,
                            ulbList: formData.section1_3.ulbList.map((item) =>
                              item.id === ulb.id
                                ? { ...item, ratingDate: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_3.ulbList.${index}.ratingDate`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_3.ulbList.${index}.ratingDate`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_3.ulbList.${index}.ratingDate`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Credit Rating*</Label>
                    <Select
                      value={ulb.rating}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          section1_3: {
                            ...formData.section1_3,
                            ulbList: formData.section1_3.ulbList.map((item) =>
                              item.id === ulb.id ? { ...item, rating: value } : item
                            ),
                          },
                        })
                      }
                    >
                      <SelectTrigger className={validationErrors[`section1_3.ulbList.${index}.rating`] ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {RATING_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors[`section1_3.ulbList.${index}.rating`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_3.ulbList.${index}.rating`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addULB} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add ULB Rating
            </Button>
          </div>
        </SectionCard>

        {/* Section 1.4 - Municipal Bonds */}
        <SectionCard
          title="1.4 - Municipal Bonds Issued (50 marks)"
          // subtitle="Annex 4: Details of municipal bonds issued"
        >
          <div className="space-y-4">
            {formData.section1_4.bondList.length === 0 && validationErrors["section1_4.bondList"] && (
              <p className="text-sm text-red-500 mb-2">{validationErrors["section1_4.bondList"]}</p>
            )}
            {formData.section1_4.bondList.map((bond, index) => (
              <div key={bond.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Bond Entry {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBond(bond.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bond Type*</Label>
                    <Select
                      value={bond.bondType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          section1_4: {
                            ...formData.section1_4,
                            bondList: formData.section1_4.bondList.map((item) =>
                              item.id === bond.id ? { ...item, bondType: value } : item
                            ),
                          },
                        })
                      }
                    >
                      <SelectTrigger className={validationErrors[`section1_4.bondList.${index}.bondType`] ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select bond type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOND_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors[`section1_4.bondList.${index}.bondType`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_4.bondList.${index}.bondType`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>City Name*</Label>
                    <Input
                      placeholder="Pune"
                      value={bond.cityName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_4: {
                            ...formData.section1_4,
                            bondList: formData.section1_4.bondList.map((item) =>
                              item.id === bond.id
                                ? { ...item, cityName: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_4.bondList.${index}.cityName`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_4.bondList.${index}.cityName`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_4.bondList.${index}.cityName`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Issuing Authority*</Label>
                    <Input
                      placeholder="Municipal Corporation"
                      value={bond.issuingAuthority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_4: {
                            ...formData.section1_4,
                            bondList: formData.section1_4.bondList.map((item) =>
                              item.id === bond.id
                                ? { ...item, issuingAuthority: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_4.bondList.${index}.issuingAuthority`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_4.bondList.${index}.issuingAuthority`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_4.bondList.${index}.issuingAuthority`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Bond Value (INR)*</Label>
                    <Input
                      placeholder="₹200 crores"
                      value={bond.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_4: {
                            ...formData.section1_4,
                            bondList: formData.section1_4.bondList.map((item) =>
                              item.id === bond.id
                                ? { ...item, value: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_4.bondList.${index}.value`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_4.bondList.${index}.value`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_4.bondList.${index}.value`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addBond} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Municipal Bond
            </Button>
          </div>
        </SectionCard>

        {/* Section 1.5 - Financial Intermediaries */}
        <SectionCard
          title="1.5 - State-Level Financial Intermediaries (40 marks)"
          // subtitle="Annex 5: Details of financial intermediaries"
        >
          <div className="space-y-4">
            {formData.section1_5.ffiArray.length === 0 && validationErrors["section1_5.ffiArray"] && (
              <p className="text-sm text-red-500 mb-2">{validationErrors["section1_5.ffiArray"]}</p>
            )}
            {formData.section1_5.ffiArray.map((org, index) => (
              <div key={org.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Intermediary {index + 1}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIntermediary(org.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Organisation Name*</Label>
                    <Input
                      placeholder="Maharashtra Infrastructure Development Corporation"
                      value={org.organisationName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: {
                            ...formData.section1_5,
                            ffiArray: formData.section1_5.ffiArray.map((item) =>
                              item.id === org.id
                                ? { ...item, organisationName: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_5.ffiArray.${index}.organisationName`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_5.ffiArray.${index}.organisationName`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_5.ffiArray.${index}.organisationName`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Organisation Type*</Label>
                    <Select
                      value={org.organisationType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          section1_5: {
                            ...formData.section1_5,
                            ffiArray: formData.section1_5.ffiArray.map((item) =>
                              item.id === org.id
                                ? { ...item, organisationType: value }
                                : item
                            ),
                          },
                        })
                      }
                    >
                      <SelectTrigger className={validationErrors[`section1_5.ffiArray.${index}.organisationType`] ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORGANISATION_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors[`section1_5.ffiArray.${index}.organisationType`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_5.ffiArray.${index}.organisationType`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Year Established*</Label>
                    <Input
                      placeholder="2010"
                      value={org.yearEstablished}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: {
                            ...formData.section1_5,
                            ffiArray: formData.section1_5.ffiArray.map((item) =>
                              item.id === org.id
                                ? { ...item, yearEstablished: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_5.ffiArray.${index}.yearEstablished`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_5.ffiArray.${index}.yearEstablished`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_5.ffiArray.${index}.yearEstablished`]}</p>
                    )}
                  </div>
                  <div>
                    <Label>Total Funding (INR)*</Label>
                    <Input
                      placeholder="₹5000 crores"
                      value={org.totalFunding}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: {
                            ...formData.section1_5,
                            ffiArray: formData.section1_5.ffiArray.map((item) =>
                              item.id === org.id
                                ? { ...item, totalFunding: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_5.ffiArray.${index}.totalFunding`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_5.ffiArray.${index}.totalFunding`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_5.ffiArray.${index}.totalFunding`]}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label>Website</Label>
                    <Input
                      placeholder="https://example.com"
                      value={org.website}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: {
                            ...formData.section1_5,
                            ffiArray: formData.section1_5.ffiArray.map((item) =>
                              item.id === org.id
                                ? { ...item, website: e.target.value }
                                : item
                            ),
                          },
                        })
                      }
                      className={validationErrors[`section1_5.ffiArray.${index}.website`] ? "border-red-500" : ""}
                    />
                    {validationErrors[`section1_5.ffiArray.${index}.website`] && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors[`section1_5.ffiArray.${index}.website`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={addIntermediary} variant="outline" className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Financial Intermediary
            </Button>
          </div>
        </SectionCard>
      </div>
    </TooltipProvider>
  );
};
