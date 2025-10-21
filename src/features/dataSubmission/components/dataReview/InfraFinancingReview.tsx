import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";

interface InfraFinancingReviewProps {
  submissionId: string;
  formData?: any;
}

export const InfraFinancingReview = ({ submissionId, formData }: InfraFinancingReviewProps) => {
  const { saveMessage, getMessage } = useSectionMessages(submissionId);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // State for real-time calculation
  const [capitalAllocation, setCapitalAllocation] = useState('');
  const [gsdpForFY, setGsdpForFY] = useState('');

  // Initialize values from formData when available
  useEffect(() => {
    console.log("🔍 useEffect - formData structure:", formData);
    if (formData?.section1_1) {
      console.log("🔍 Found section1_1 data:", formData.section1_1);
      setCapitalAllocation(formData.section1_1.capitalAllocation || '');
      setGsdpForFY(formData.section1_1.gsdpForFY || '');
    } else {
      console.log("🔍 No section1_1 found in formData");
    }
  }, [formData]);

  // Debug formData structure
  console.log("🔍 InfraFinancingReview - Full formData:", formData);
  console.log("🔍 InfraFinancingReview - section1_1:", formData?.section1_1);

  const handleOpenModal = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseModal = () => {
    setActiveSection(null);
  };

  const handleSaveMessage = (message: string) => {
    if (activeSection) {
      saveMessage(activeSection, message);
    }
  };

  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      "1.1": "1.1 - % Capex to GSDP",
      "1.2": "1.2 - % Capex Utilisation",
      "1.3": "1.3 - % of Credit Rated ULBs",
      "1.4": "1.4 - % of ULBs Issuing Bonds",
      "1.5": "1.5 - Functional Financial Intermediary",
    };
    return titles[sectionId] || sectionId;
  };

  // Real-time calculation for % Allocation to GSDP
  const calculateAllocationPercentage = () => {
    const capValue = parseFloat(capitalAllocation);
    const gsdpValue = parseFloat(gsdpForFY);

    console.log("🔍 Real-time Calculation:", {
      capitalAllocation,
      gsdpForFY,
      capValue,
      gsdpValue,
      isValid: !isNaN(capValue) && !isNaN(gsdpValue) && capValue > 0 && gsdpValue > 0
    });

    if (!isNaN(capValue) && !isNaN(gsdpValue) && capValue > 0 && gsdpValue > 0) {
      const percentage = (capValue / gsdpValue) * 100;
      const result = percentage.toFixed(1) + '%';
      console.log("🔍 Calculated Percentage:", result);
      return result;
    }

    // Return empty string if no valid calculation
    console.log("🔍 No valid calculation - returning empty string");
    return '';
  };
  return (
    <>
      <div className="space-y-6">
        {/* Section 1.1 */}
        <SectionCard
          title={<div className="flex relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">1.1 -</span> % Capex to GSDP{" "}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center justify-between absolute right-0 -top-[6px]"
              onClick={() => handleOpenModal("1.1")}
            >
              <MessageSquare className="w-4 h-4" />
              Add Comment
            </Button>
          </div>}
          subtitle="Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure"
          className="mb-6 relative"
        >

          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("1.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure
            </p>
          </CardHeader> */}

          <div className="grid grid-cols-2 gap-4 max-w-[70%]">
            <div>
              <Label>Year</Label>
              <Input value={formData?.section1_1?.year || "2024-25"} readOnly />
            </div>
            <div>
              <Label>Capital Allocation for FY (INR)</Label>
              <Input
                value={capitalAllocation}
                onChange={(e) => {
                  console.log("🔍 Capital Allocation changed:", e.target.value);
                  setCapitalAllocation(e.target.value);
                }}
                placeholder="Enter Capital Allocation value"
                className="bg-white"
              />
              <div className="text-xs text-gray-500 mt-1">
                Current value: "{capitalAllocation}"
              </div>
            </div>
            <div>
              <Label>GSDP for FY (INR)</Label>
              <Input
                value={gsdpForFY}
                onChange={(e) => {
                  console.log("🔍 GSDP changed:", e.target.value);
                  setGsdpForFY(e.target.value);
                }}
                placeholder="Enter GSDP value"
                className="bg-white"
              />
              <div className="text-xs text-gray-500 mt-1">
                Current value: "{gsdpForFY}"
              </div>
            </div>
            <div>
              <Label>% Allocation to GSDP</Label>
              <div className="relative">
                <Input
                  value={calculateAllocationPercentage()}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed pr-8"
                  placeholder={capitalAllocation && gsdpForFY ? "Calculating..." : "Auto-calculated"}
                />
                {calculateAllocationPercentage() && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-sm font-medium">
                    ✓
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Calculation result: "{calculateAllocationPercentage()}"
              </div>
            </div>
          </div>

        </SectionCard>

        {/* Section 1.2 7 */}
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">1.2 -</span> % Capex Utilisation{" "}
            </span>
            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-between absolute right-0 -top-[6px]"
                onClick={() => handleOpenModal("1.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
          </div>}
          subtitle="Annex 2: Verified with Actuals data"
          className="mb-6"
        >
            <div className="grid grid-cols-2 gap-4 max-w-[70%]">
              <div>
                <Label>Year</Label>
                <Input value={formData?.section1_2?.year || "2024-25"} readOnly />
              </div>
              <div>
                <Label>A₁ - Actual Capex (INR)</Label>
                <Input value={formData?.section1_2?.actualCapex ? `₹${formData.section1_2.actualCapex} Crores` : ""} readOnly />
              </div>
              <div>
                <Label>State Capex Utilisation (INR)</Label>
                <Input value={formData?.section1_2?.stateCapexUtilisation ? `₹${formData.section1_2.stateCapexUtilisation} Crores` : ""} readOnly />
              </div>
              <div className="">
                <Label>% Capex Actuals to GSDP</Label>
                <Input
                  value={(() => {
                    const actualCapex = parseFloat(formData?.section1_2?.actualCapex?.replace(/[₹,]/g, '') || '0');
                    const stateCapexUtilisation = parseFloat(formData?.section1_2?.stateCapexUtilisation?.replace(/[₹,]/g, '') || '0');

                    if (isNaN(actualCapex) || isNaN(stateCapexUtilisation) || stateCapexUtilisation === 0) {
                      return '';
                    }

                    const percentage = (actualCapex / stateCapexUtilisation) * 100;
                    return percentage.toFixed(1) + '%';
                  })()}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-calculated"
                />
              </div>
            </div>
        </SectionCard>

        {/* Section 1.3 */}
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">1.3 -</span> % of Credit Rated ULBs{" "}
            </span>
            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-between absolute right-0 -top-[6px]"
                onClick={() => handleOpenModal("1.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
          </div>}
          subtitle="Annex 3: Verified with Muni.GOI"
          className="mb-6"
        >   
            <div className="space-y-4">
              {formData?.section1_3?.map((item: any, index: number) => (
                <div key={item.id || index} className="">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>City Name</Label>
                      <Input value={item.cityName || ""} readOnly />
                    </div>
                    <div>
                      <Label>ULB</Label>
                      <Input value={item.ulb || ""} readOnly />
                    </div>
                    <div>
                      <Label>Rating Date</Label>
                      <Input type="date" value={item.ratingDate || ""} readOnly />
                    </div>
                    <div>
                      <Label>Rating</Label>
                      <Input value={item.rating || ""} readOnly />
                    </div>
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No ULB data available
                  </div>
                )}
            </div>
        </SectionCard>

        {/* Section 1.4 */}
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">1.4 -</span> % of ULBs Issuing Bonds{" "}
            </span>
            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-between absolute right-0 -top-[6px]"
                onClick={() => handleOpenModal("1.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
          </div>}
          subtitle="Annex 4: Provide Bond Details"
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 % of ULBs Issuing Bonds
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("1.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Annex 4: Provide Bond Details
            </p>
          </CardHeader> */}
            <div className="space-y-4">
              {formData?.section1_4?.map((item: any, index: number) => (
                <div key={item.id || index} className="">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Bond Type</Label>
                      <Input value={item.bondType || ""} readOnly />
                    </div>
                    <div>
                      <Label>City Name</Label>
                      <Input value={item.cityName || ""} readOnly />
                    </div>
                    <div>
                      <Label>Issuing Authority</Label>
                      <Input value={item.issuingAuthority || ""} readOnly />
                    </div>
                    <div>
                      <Label>Value (INR)</Label>
                      <Input value={item.value ? `₹ ${item.value} Crores` : ""} readOnly />
                    </div>
                  </div>
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No bond data available
                  </div>
                )}
            </div>
        </SectionCard>

        {/* Section 1.5 */}
        <SectionCard
          title={<div className="flex flex-col relative">
            <span className="text-base font-semibold ">
              <span className="text-primary">1.5 -</span> Functional Financial Intermediary{" "}
            </span>
            <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-between absolute right-0 -top-[6px]"
                onClick={() => handleOpenModal("1.5")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
          </div>}
          subtitle="Annex 4: Provide link and funding details"
          className="mb-6"
        >
            <div className="space-y-4">
              {formData?.section1_5?.map((item: any, index: number) => (
                <div key={item.id || index} className="">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <Label>Organisation Name</Label>
                      <Input value={item.organisationName || ""} readOnly />
                    </div>
                    <div>
                      <Label>Organization Type</Label>
                      <Input value={item.organisationType || ""} readOnly />
                    </div>
                    <div>
                      <Label>Year of Establishment</Label>
                      <Input value={item.yearEstablished || ""} readOnly />
                    </div>
                    <div>
                      <Label>Total Funding (INR)</Label>
                      <Input value={item.totalFunding ? `₹ ${item.totalFunding} Crores` : ""} readOnly />
                    </div>
                    <div className="">
                    <Label>Website Link</Label>
                    <Input value={item.website || ""} readOnly />
                  </div>
                  </div>
                  
                </div>
              )) || (
                  <div className="text-center text-muted-foreground py-4">
                    No financial intermediary data available
                  </div>
                )}
            </div>
        </SectionCard>
      </div>

      <MessageModal
        isOpen={activeSection !== null}
        onClose={handleCloseModal}
        onSave={handleSaveMessage}
        sectionTitle={activeSection ? getSectionTitle(activeSection) : ""}
        existingMessage={activeSection ? getMessage(activeSection) : ""}
      />
    </>
  );
};


