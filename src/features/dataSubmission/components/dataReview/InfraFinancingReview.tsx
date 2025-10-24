import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { hasInfraFinancingData, getSectionsWithData } from "@/utils/sectionDataValidator";

interface InfraFinancingReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}

export const InfraFinancingReview = ({ submissionId, formData, submission, isPreview = false }: InfraFinancingReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);

  // Check if this section has any data
  const hasData = hasInfraFinancingData({ infraFinancing: formData });
  const sectionsWithData = getSectionsWithData({ infraFinancing: formData }, 'infraFinancing');

  // State for real-time calculation
  const [capitalAllocation, setCapitalAllocation] = useState('');
  const [gsdpForFY, setGsdpForFY] = useState('');

  // Initialize values from formData when availableimage.png
  useEffect(() => {
    // Debug logging removed for performance

    if (formData && typeof formData === 'object' && 'section1_1' in formData) {
      const data = formData as { section1_1?: { capitalAllocation?: string; gsdpForFY?: string } };
    // Debug logging removed for performance

      setCapitalAllocation(data.section1_1?.capitalAllocation || '');
      setGsdpForFY(data.section1_1?.gsdpForFY || '');
    } else {
    // Debug logging removed for performance

    }
  }, [formData]);

  // Debug formData structure
    // Debug logging removed for performance

  if (formData && typeof formData === 'object' && 'section1_1' in formData) {
    const data = formData as { section1_1?: unknown };
    // Debug logging removed for performance

  }

  const handleOpenModal = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseModal = () => {
    setActiveSection(null);
  };

  const handleOpenTimeline = (sectionId: string) => {
    setTimelineSection(sectionId);
  };

  const handleCloseTimeline = () => {
    setTimelineSection(null);
  };

  const handleSaveMessage = async (message: string) => {
    if (activeSection) {
      try {
        const updatedSubmission = await saveMessage(activeSection, message);
        if (updatedSubmission) {
          // Update form data with fresh API response
          setSubmissionData(updatedSubmission as unknown as FormData);
          
          // Force timeline refresh if modal is open for same section
          if (timelineSection === activeSection) {
            setTimelineSection(null);
            setTimeout(() => {
              setTimelineSection(activeSection);
            }, 100);
          }
        }
      } catch (error) {
        console.error("Error saving message:", error);
      }
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

  const getFormDataValue = (path: string) => {
    if (!formData || typeof formData !== 'object') return undefined;
    const data = formData as Record<string, unknown>;
    return data[path];
  };


  const renderActionButtons = (sectionId: string) => {
    // Don't show action buttons in preview mode
    if (isPreview) {
      return null;
    }
    
    const comments = getComments(sectionId);
    const commentCount = comments ? comments.length : 0;
    // Debug logging removed for performance

    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenModal(sectionId)}
        >
          <MessageSquare className="w-4 h-4" />
          Add Comment
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-4 h-4" />
          Timeline ({commentCount})
        </Button>
      </div>
    );
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
    // Debug logging removed for performance

      return result;
    }

    // Return empty string if no valid calculation
    // Debug logging removed for performance

    return '';
  };
  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No Infra Financing data available for review</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Section 1.1 */}
        {sectionsWithData.includes('section1_1') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">1.1 -</span> % Capex to GSDP{" "}
              </span>
              {renderActionButtons("1.1")}
            </div>
          </div>}
          subtitle="Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure"
          className="mb-6 relative"
        >

          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              {!isPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleOpenModal("1.1")}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Annex 1: Verified with NBRP.csv / Budgeted Estimates for Capital Expenditure
            </p>
          </CardHeader> */}

          <div className="grid grid-cols-2 gap-4 max-w-[70%]">
            <div>
              <Label>Year</Label>
              <Input value={
                (getFormDataValue('section1_1') as { year?: string })?.year || "2024-25"
              } readOnly />
            </div>
            <div>
              <Label>Capital Allocation for FY (INR)</Label>
              <Input
                value={capitalAllocation}
                onChange={(e) => {
    // Debug logging removed for performance

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
    // Debug logging removed for performance

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
        )}

        {/* Section 1.2 7 */}
        {sectionsWithData.includes('section1_2') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">1.2 -</span> % Capex Utilisation{" "}
              </span>
              {renderActionButtons("1.2")}
            </div>
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
        )}

        {/* Section 1.3 */}
        {sectionsWithData.includes('section1_3') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">1.3 -</span> % of Credit Rated ULBs{" "}
              </span>
              {renderActionButtons("1.3")}
            </div>
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
        )}

        {/* Section 1.4 */}
        {sectionsWithData.includes('section1_4') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">1.4 -</span> % of ULBs Issuing Bonds{" "}
              </span>
              {renderActionButtons("1.4")}
            </div>
          </div>}
          subtitle="Annex 4: Provide Bond Details"
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 % of ULBs Issuing Bonds
              </CardTitle>
              {!isPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleOpenModal("1.4")}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment
                </Button>
              )}
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
        )}

        {/* Section 1.5 */}
        {sectionsWithData.includes('section1_5') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">1.5 -</span> Functional Financial Intermediary{" "}
              </span>
              {renderActionButtons("1.5")}
            </div>
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
        )}
      </div>

      <MessageModal
        isOpen={activeSection !== null}
        onClose={handleCloseModal}
        onSave={handleSaveMessage}
        sectionTitle={activeSection ? getSectionTitle(activeSection) : ""}
        sectionId={activeSection || ""}
        submissionId={submissionId}
        existingMessage=""
      />

      <TimelineModal
        isOpen={timelineSection !== null}
        onClose={handleCloseTimeline}
        sectionId={timelineSection || ""}
        sectionTitle={timelineSection ? getSectionTitle(timelineSection) : ""}
        comments={getAllComments()}
        key={`timeline-${timelineSection}-${getAllComments().length}-${Date.now()}`} // Force re-render when comments change
      />
    </>
  );
};


