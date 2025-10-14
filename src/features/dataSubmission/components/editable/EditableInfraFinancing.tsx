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
import type { InfraFinancingData } from "@/features/submission/types";

interface EditableInfraFinancingProps {
  submissionId: string;
  submission?: any;
}

export const EditableInfraFinancing = ({ submissionId, submission }: EditableInfraFinancingProps) => {
  const { getStepData, updateFormData } = useReviewFormPersistence(submissionId);

  // Initialize form data with submission data if available
  useEffect(() => {
    if (submission?.formData?.infraFinancing) {
      console.log("🔍 Loading submission data into form:", submission.formData.infraFinancing);
      const submissionData = submission.formData.infraFinancing;
      setFormData({
        ...defaultData,
        ...submissionData,
        section1_1: { ...defaultData.section1_1, ...(submissionData.section1_1 || {}) },
        section1_2: { ...defaultData.section1_2, ...(submissionData.section1_2 || {}) },
        section1_3: submissionData.section1_3 || [],
        section1_4: submissionData.section1_4 || [],
        section1_5: submissionData.section1_5 || [],
      });
      updateFormData("infraFinancing", submissionData);
    }
  }, [submission, updateFormData]);

  const defaultData: InfraFinancingData = {
    section1_1: {
      year: "",
      capitalAllocation: "",
      gsdpForFY: "",
      stateCapex: "",
      allocationToGSDP: "",
      capexToCapexActuals: "",
    },
    section1_2: {
      year: "",
      gsdpForFY: "",
      actualCapex: "",
      stateCapexUtilisation: "",
      capexActualsToGSDP: "",
    },
    section1_3: [],
    section1_4: [],
    section1_5: [],
  };

  const loadedData = (getStepData("infraFinancing") as Partial<InfraFinancingData>) || {};
  const initialData: InfraFinancingData = {
    ...defaultData,
    ...loadedData,
    section1_1: { ...defaultData.section1_1, ...(loadedData.section1_1 || {}) },
    section1_2: { ...defaultData.section1_2, ...(loadedData.section1_2 || {}) },
    section1_3: loadedData.section1_3 || [],
    section1_4: loadedData.section1_4 || [],
    section1_5: loadedData.section1_5 || [],
  };

  const [formData, setFormData] = useState<InfraFinancingData>(initialData);

  // Auto-save on change
  useEffect(() => {
    updateFormData("infraFinancing", formData);
  }, [formData, updateFormData]);

  const addULB = () => {
    setFormData({
      ...formData,
      section1_3: [
        ...formData.section1_3,
        {
          id: crypto.randomUUID(),
          cityName: "",
          ulb: "",
          ratingDate: "",
          rating: "",
        },
      ],
    });
  };

  const removeULB = (id: string) => {
    setFormData({
      ...formData,
      section1_3: formData.section1_3.filter((item) => item.id !== id),
    });
  };

  const addBond = () => {
    setFormData({
      ...formData,
      section1_4: [
        ...formData.section1_4,
        {
          id: crypto.randomUUID(),
          bondType: "",
          cityName: "",
          issuingAuthority: "",
          value: "",
        },
      ],
    });
  };

  const removeBond = (id: string) => {
    setFormData({
      ...formData,
      section1_4: formData.section1_4.filter((item) => item.id !== id),
    });
  };

  const addIntermediary = () => {
    setFormData({
      ...formData,
      section1_5: [
        ...formData.section1_5,
        {
          id: crypto.randomUUID(),
          organisationName: "",
          organisationType: "",
          yearEstablished: "",
          totalFunding: "",
          website: "",
        },
      ],
    });
  };

  const removeIntermediary = (id: string) => {
    setFormData({
      ...formData,
      section1_5: formData.section1_5.filter((item) => item.id !== id),
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
                  (10 marks per 1%)
                </span>
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                Annex 1: Verified with RBI/CAG data (* Budgeted Estimates for Capital Expenditure)
              </span>
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
              />
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
              />
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
              />
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
          title="1.2 - % Capex Utilization (10 marks per 1%)"
          subtitle="Annex 2: Verified with MoHUA data"
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
              />
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
              />
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
              />
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
          subtitle="Annex 3: List of ULBs with credit ratings"
        >
          <div className="space-y-4">
            {formData.section1_3.map((ulb, index) => (
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
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_3: formData.section1_3.map((item) =>
                            item.id === ulb.id
                              ? { ...item, cityName: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>ULB Name*</Label>
                    <Input
                      placeholder="Municipal Corporation"
                      value={ulb.ulb}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_3: formData.section1_3.map((item) =>
                            item.id === ulb.id
                              ? { ...item, ulb: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Rating Date*</Label>
                    <Input
                      type="date"
                      value={ulb.ratingDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_3: formData.section1_3.map((item) =>
                            item.id === ulb.id
                              ? { ...item, ratingDate: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Credit Rating*</Label>
                    <Select
                      value={ulb.rating}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          section1_3: formData.section1_3.map((item) =>
                            item.id === ulb.id ? { ...item, rating: value } : item
                          ),
                        })
                      }
                    >
                      <SelectTrigger>
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
          subtitle="Annex 4: Details of municipal bonds issued"
        >
          <div className="space-y-4">
            {formData.section1_4.map((bond, index) => (
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
                          section1_4: formData.section1_4.map((item) =>
                            item.id === bond.id ? { ...item, bondType: value } : item
                          ),
                        })
                      }
                    >
                      <SelectTrigger>
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
                  </div>
                  <div>
                    <Label>City Name*</Label>
                    <Input
                      placeholder="Pune"
                      value={bond.cityName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_4: formData.section1_4.map((item) =>
                            item.id === bond.id
                              ? { ...item, cityName: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Issuing Authority*</Label>
                    <Input
                      placeholder="Municipal Corporation"
                      value={bond.issuingAuthority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_4: formData.section1_4.map((item) =>
                            item.id === bond.id
                              ? { ...item, issuingAuthority: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Bond Value (INR)*</Label>
                    <Input
                      placeholder="₹200 crores"
                      value={bond.value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_4: formData.section1_4.map((item) =>
                            item.id === bond.id
                              ? { ...item, value: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
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
          subtitle="Annex 5: Details of financial intermediaries"
        >
          <div className="space-y-4">
            {formData.section1_5.map((org, index) => (
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
                          section1_5: formData.section1_5.map((item) =>
                            item.id === org.id
                              ? { ...item, organisationName: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Organisation Type*</Label>
                    <Select
                      value={org.organisationType}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          section1_5: formData.section1_5.map((item) =>
                            item.id === org.id
                              ? { ...item, organisationType: value }
                              : item
                          ),
                        })
                      }
                    >
                      <SelectTrigger>
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
                  </div>
                  <div>
                    <Label>Year Established*</Label>
                    <Input
                      placeholder="2010"
                      value={org.yearEstablished}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: formData.section1_5.map((item) =>
                            item.id === org.id
                              ? { ...item, yearEstablished: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Total Funding (INR)*</Label>
                    <Input
                      placeholder="₹5000 crores"
                      value={org.totalFunding}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: formData.section1_5.map((item) =>
                            item.id === org.id
                              ? { ...item, totalFunding: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Website</Label>
                    <Input
                      placeholder="https://example.com"
                      value={org.website}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          section1_5: formData.section1_5.map((item) =>
                            item.id === org.id
                              ? { ...item, website: e.target.value }
                              : item
                          ),
                        })
                      }
                    />
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
