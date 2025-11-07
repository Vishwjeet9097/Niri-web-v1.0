import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2, Clock, Edit3, Check, X, CheckCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { MessageModal } from "../modals/MessageModal";
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import {
  hasInfraFinancingData,
  getSectionsWithData,
} from "@/utils/sectionDataValidator";
import { apiService } from "@/services/api.service";
import { ProgressHeader } from "@/features/submission/components/ProgressHeader";
import {
  computeStepProgress,
  STEP_SECTIONS,
} from "@/features/submission/utils/progress";
import { useEditableSectionStore } from '@/utils/EditableSection';
import { handleSaveSection } from "@/utils/ReviewActionHandelers";
// import { getDropdown } from '@/utils/getDropDowns';
import { useFormDataStore } from '@/utils/FormDataStore';
import { Section_1_3 } from "./Sections/Section_1_3";
import { Section_1_4 } from "./Sections/Section_1_4";
import {Section_1_5} from "./Sections/Section_1_5";


interface InfraFinancingReviewProps {
  submissionId: string;
  formData?: any;
  submission?: unknown; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
}
export const InfraFinancingReview = ({
  submissionId,
  formData,
  submission,
  isPreview = false,
}: InfraFinancingReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } =
    useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);
  const { setFormDataForSection, updateSectionField, getSectionData } = useFormDataStore();

  // Check if this section has any data
  console.log("💡 InfraFinancing formData (raw):", formData);
  console.log(
    "💡 getSectionsWithData(...) =>",
    getSectionsWithData({ infraFinancing: formData }, "infraFinancing")
  );
  console.log(
    "💡 hasInfraFinancingData(formData) =>",
    hasInfraFinancingData({ infraFinancing: formData })
  );

  const hasData = hasInfraFinancingData({ infraFinancing: formData });
const sectionsWithData = useMemo(() => {
  const detectedSections =
    getSectionsWithData({ infraFinancing: formData }, "infraFinancing") || [];

  const infraPayload =
    formData && (formData as any).section1_1
      ? formData
      : formData
      ? (formData as any).infraFinancing || formData
      : {};

  // Require non-empty lists for 1.3 / 1.4 (don't treat empty objects/count-only as presence)
  const hasSection13Manual = Boolean(
    Array.isArray(infraPayload?.section1_3?.ulbList) &&
      infraPayload.section1_3.ulbList.length > 0
  );

  const hasSection14Manual = Boolean(
    Array.isArray(infraPayload?.section1_4?.bondList) &&
      infraPayload.section1_4.bondList.length > 0
  );

  // Merge validator result + manual detections, preserving order and deduping
  const merged = Array.from(
    new Set([
      ...detectedSections,
      ...(hasSection13Manual ? ["section1_3"] : []),
      ...(hasSection14Manual ? ["section1_4"] : []),
    ])
  );

  // Final safety filter: if validator included 1.3/1.4 but lists are empty, drop them
  const final = merged.filter((sec) => {
    if (sec === "section1_3") {
      return (
        Array.isArray(infraPayload?.section1_3?.ulbList) &&
        infraPayload.section1_3.ulbList.length > 0
      );
    }
    if (sec === "section1_4") {
      return (
        Array.isArray(infraPayload?.section1_4?.bondList) &&
        infraPayload.section1_4.bondList.length > 0
      );
    }
    return true;
  });

  return final;
}, [formData]);


  // State for real-time calculation
  const [capitalAllocation, setCapitalAllocation] = useState('');
  const [gsdpForFY, setGsdpForFY] = useState('');

  // State for edit fucntionality indicator wise
  const { setEditable, isEditable, clearAllEditing } = useEditableSectionStore();

  // Real-time update listener
  useEffect(() => {
    const handleCommentUpdate = async (event: CustomEvent) => {
      console.log("🔍 InfraFinancingReview - Event received:", event);
      console.log("🔍 InfraFinancingReview - Event detail:", event.detail);

      const { submissionId: eventSubmissionId, comments } = event.detail;
      console.log("🔍 InfraFinancingReview - Event submissionId:", eventSubmissionId);
      console.log("🔍 InfraFinancingReview - Current submissionId:", submissionId);
      console.log("🔍 InfraFinancingReview - IDs match:", eventSubmissionId === submissionId);

      console.log(
        "🔍 InfraFinancingReview - Event submissionId:",
        eventSubmissionId
      );
      console.log(
        "🔍 InfraFinancingReview - Current submissionId:",
        submissionId
      );
      console.log(
        "🔍 InfraFinancingReview - IDs match:",
        eventSubmissionId === submissionId
      );

      if (eventSubmissionId === submissionId) {
        console.log(
          "🔄 Real-time comment update received in InfraFinancingReview"
        );

        // 1. Update submission with fresh comments data
        setSubmission((prev) => ({
          ...prev,
          indicatorComment: comments,
          updatedAt: new Date().toISOString(),
        }));
        console.log(
          "✅ InfraFinancingReview - Submission state updated with comments"
        );

        // 2. Refresh complete submission data (same as first load)
        try {
          console.log(
            "🔄 InfraFinancingReview - Refreshing complete submission data..."
          );
          console.log(
            "🔄 InfraFinancingReview - API call: apiService.getSubmission(",
            submissionId,
            ")"
          );

          const freshSubmission = await apiService.getSubmission(submissionId);
          console.log(
            "🔄 InfraFinancingReview - API response received:",
            freshSubmission
          );

          if (freshSubmission) {
            // Update submission state with fresh data
            setSubmission(freshSubmission);
            console.log(
              "✅ InfraFinancingReview - Submission state updated with fresh data"
            );

            // Update form data with fresh data
            if (freshSubmission.formData) {
              setFormData(freshSubmission.formData);
              console.log(
                "✅ InfraFinancingReview - Form data updated with fresh data"
              );
            }

            console.log(
              "✅ InfraFinancingReview - Fresh submission data loaded:",
              freshSubmission
            );
          } else {
            console.log("❌ InfraFinancingReview - Fresh submission is null");
          }
        } catch (error) {
          console.error(
            "❌ InfraFinancingReview - Failed to refresh submission data:",
            error
          );
        }
      } else {
        console.log(
          "⚠️ InfraFinancingReview - Event submissionId doesn't match current submissionId"
        );
      }
    };

    window.addEventListener(
      "niri-comment-updated",
      handleCommentUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "niri-comment-updated",
        handleCommentUpdate as EventListener
      );
    };
  }, [submissionId]);

  // Initialize values from formData when availableimage.png
  useEffect(() => {
    // Debug logging removed for performance

    if (formData && typeof formData === "object" && "section1_1" in formData) {
      const data = formData as {
        section1_1?: { capitalAllocation?: string; gsdpForFY?: string };
      };
      // Debug logging removed for performance

      setCapitalAllocation(data.section1_1?.capitalAllocation || "");
      setGsdpForFY(data.section1_1?.gsdpForFY || "");
    } else {
      // Debug logging removed for performance
    }
  }, [formData]);

  //🧑‍💻Initialize Section
  useEffect(() => {
    if (formData) {
      Object.keys(formData).forEach(sectionKey => {
        if (sectionKey.startsWith('section')) {
          setFormDataForSection(formData[sectionKey], sectionKey);
        }
      });
    }
  }, [formData]);

  // Debug formData structure
  // Debug logging removed for performance

  if (formData && typeof formData === "object" && "section1_1" in formData) {
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
    // Validate parameters
    if (!message || typeof message !== "string") {
      console.error(
        "❌ InfraFinancingReview - Invalid message parameter:",
        message
      );
      return;
    }

    if (activeSection) {
      try {
        console.log("🔄 InfraFinancingReview - Calling saveMessage with:", {
          activeSection,
          message,
        });
        const updatedSubmission = await saveMessage(activeSection, message);
        console.log(
          "🔄 InfraFinancingReview - saveMessage response:",
          updatedSubmission
        );

        if (updatedSubmission) {
          // Update form data with fresh API response
          setSubmissionData(updatedSubmission as unknown as FormData);
          console.log("✅ InfraFinancingReview - Form data updated");

          // Force timeline refresh if modal is open for same section
          if (timelineSection === activeSection) {
            setTimelineSection(null);
            setTimeout(() => {
              setTimelineSection(activeSection);
            }, 100);
          }
        }
      } catch (error) {
        console.error("❌ InfraFinancingReview - Error saving message:", error);
      }
    } else {
      console.log("⚠️ InfraFinancingReview - No active section");
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
    if (!formData || typeof formData !== "object") return undefined;
    const data = formData as Record<string, unknown>;
    return data[path];
  };

  // Handles for review edit, accept, send back
  // Add this handler after other handlers
  const onSaveSection = async (sectionId: string) => {
    try {
      // Map visual section id to payload section key
      const payloadSection = `section${sectionId.replace('.', '_')}`;

      // Prepare fields based on section
      let fields: Record<string, any>[] = [];

      switch (sectionId) {
        case '1.1':
          fields = [
            // {year: "2024-25"},
            { capitalAllocation: Number(capitalAllocation) || null },
            { gsdpForFY: Number(gsdpForFY) || null },
            // {allocationPercentage: calculateAllocationPercentage().replace('%', '') || null}

          ];
          break;

        case '1.2':
          fields = [
            
              {year: formData?.section1_2?.year || "2024-25"},
              {actualCapex: formData?.section1_2?.actualCapex},
              {stateCapexUtilisation: formData?.section1_2?.stateCapexUtilisation}
            
          ];
          break;

        case '1.3':
          // Handle ULB ratings data
          fields = (formData?.section1_3 || []).map((item: any) => ({
            cityName: item.cityName,
            ulb: item.ulb,
            ratingDate: item.ratingDate,
            rating: item.rating
          }));
          break;

        case '1.4':
          // Handle bond data
          fields = (formData?.section1_4 || []).map((item: any) => ({
            bondType: item.bondType,
            cityName: item.cityName,
            issuingAuthority: item.issuingAuthority,
            value: item.value
          }));
          break;

        case '1.5':
          // Handle financial intermediary data
          fields = (formData?.section1_5 || []).map((item: any) => ({
            organisationName: item.organisationName,
            organisationType: item.organisationType,
            yearEstablished: item.yearEstablished,
            totalFunding: item.totalFunding,
            website: item.website
          }));
          break;

        default:
          console.warn(`Unhandled section: ${sectionId}`);
          return;
      }

      console.log('🔄 payload section:',  payloadSection)

      await handleSaveSection({
        submissionId,
        category: 'infraFinancing',
        section: payloadSection,
        fields
      });

      // Disable editing after successful save
      setEditable(sectionId, false);

      // Optional: Show success message
      // toast.success(`Section ${sectionId} saved successfully`);

    } catch (error) {
      console.error('Error saving section:', error);
      // Keep section editable if save fails
      // Optional: Show error message
      // toast.error(`Failed to save section ${sectionId}`);
    }
  };

  const onIndicatorStatus = async (sectionId: string, status: boolean) => {
    const payload = {
      submissionId,
      category: 'infraFinancing',
      section: `section${sectionId.replace('.', '_')}`,
      status: status,
    };
    try {
      await apiService.indicatorStatus(payload);
      // Update local formData to trigger re-render of action buttons
      const sectionKey = `section${sectionId.replace('.', '_')}`;
      // Defensive: clone formData if possible
      if (formData && formData[sectionKey]) {
        formData[sectionKey] = {
          ...formData[sectionKey],
          status: status ? 'ACCEPTED' : formData[sectionKey].status,
        };
        // Force update by setting submissionData (or use a dedicated state if needed)
        setSubmissionData({ ...formData });
      }
      console.log("✅ Indicator status updated successfully");
    } catch (error) {
      console.error("❌ Failed to update indicator status:", error);
    }
  }


// 🧑‍💻🧑‍💻Edited by Harsh
const renderActionButtons = (sectionId: string) => {
  // Don't show action buttons in preview mode
  if (isPreview) {
    return null;
  }

  // Check if section status is ACCEPTED
  const sectionKey = `section${sectionId.replace('.', '_')}`;
  const sectionData = formData && formData[sectionKey];
  if (sectionData && sectionData.status === 'ACCEPTED') {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-green-100 text-green-700 cursor-default"
          disabled
        >
          <CheckCircle className="w-4 h-4" />
          Accepted
        </Button>
      </div>
    );
  }

  const comments = getComments(sectionId);
  const commentCount = comments ? comments.length : 0;

  return (
    <div className="flex gap-2">
      {!isEditable(sectionId) ? (
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => setEditable(sectionId, true)}
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => onSaveSection(sectionId)}
          >
            <Check className="w-4 h-4" />
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setEditable(sectionId, false)}
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1"
        onClick={() => handleOpenTimeline(sectionId)}
      >
        <RotateCcw className="w-4 h-4" />
        Send Back ({commentCount})
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => onIndicatorStatus(sectionId, true)}
      >
        <CheckCircle className="w-4 h-4" />
        Accept
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
      isValid:
        !isNaN(capValue) && !isNaN(gsdpValue) && capValue > 0 && gsdpValue > 0,
    });

    if (
      !isNaN(capValue) &&
      !isNaN(gsdpValue) &&
      capValue > 0 &&
      gsdpValue > 0
    ) {
      const percentage = (capValue / gsdpValue) * 100;
      const result = percentage.toFixed(1) + "%";
      // Debug logging removed for performance

    return result;
  }

  // Return empty string if no valid calculation
  // Debug logging removed for performance

    return "";
  };
  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No Infra Financing data available for review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {(() => {
          const sections = getSectionsWithData(
            { infraFinancing: formData },
            "infraFinancing"
          );
          const assignedIndicators = STEP_SECTIONS.infraFinancing
            .filter((s) => sections.includes(s.sectionKey))
            .map((s) => s.indicator);
          const { completed, total, progress } = computeStepProgress(
            { infraFinancing: formData } as any,
            "infraFinancing",
            { assignedIndicators }
          );
          return (
            <ProgressHeader
              title="Infra Financing"
              description="Data related to infrastructure financing and budget allocation"
              points={250}
              completed={completed}
              total={total}
              progress={progress}
            />
          );
        })()}
        {/* Section 1.1 */}
        {sectionsWithData.includes("section1_1") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.1 -</span> % Capex to GSDP{" "}
                  </span>
                  {renderActionButtons("1.1")}
                </div>
              </div>
            }
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
              } readOnly className='bg-gray-50' />
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
                readOnly={!isEditable('1.1')}
                className={isEditable('1.1') ? 'bg-white' : 'bg-gray-50'}
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
                readOnly={!isEditable('1.1')}
                className={isEditable('1.1') ? 'bg-white' : 'bg-gray-50'}
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

        {/* Section 1.2 */}
        {sectionsWithData.includes("section1_2") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.2 -</span> % Capex
                    Utilisation{" "}
                  </span>
                  {renderActionButtons("1.2")}
                </div>
              </div>
            }
            subtitle="Annex 2: Verified with Actuals data"
            className="mb-6"
          >
            <div className="grid grid-cols-2 gap-4 max-w-[70%]">
              <div>
                <Label>Year</Label>
                <Input
                  value={formData?.section1_2?.year || "2024-25"}
                  readOnly
                />
              </div>
              <div>
                <Label>A₁ - Actual Capex (INR)</Label>
                <Input
                  value={
                    formData?.section1_2?.actualCapex
                      ? `₹${formData.section1_2.actualCapex} Crores`
                      : ""
                  }
                  readOnly={!isEditable('1.2')}
                  className={isEditable('1.2') ? 'bg-white' : 'bg-gray-50'}
                />
              </div>
              <div>
                <Label>State Capex Utilisation (INR)</Label>
                <Input
                  value={
                    formData?.section1_2?.stateCapexUtilisation
                      ? `₹${formData.section1_2.stateCapexUtilisation} Crores`
                      : ""
                  }
                readOnly={!isEditable('1.2')}
                className={isEditable('1.2') ? 'bg-white' : 'bg-gray-50'}
                />
              </div>
              <div className="">
                <Label>% Capex Actuals to GSDP</Label>
                <Input
                  value={(() => {
                    const actualCapex = parseFloat(
                      formData?.section1_2?.actualCapex?.replace(/[₹,]/g, "") ||
                        "0"
                    );
                    const stateCapexUtilisation = parseFloat(
                      formData?.section1_2?.stateCapexUtilisation?.replace(
                        /[₹,]/g,
                        ""
                      ) || "0"
                    );

                    if (
                      isNaN(actualCapex) ||
                      isNaN(stateCapexUtilisation) ||
                      stateCapexUtilisation === 0
                    ) {
                      return "";
                    }

                    const percentage =
                      (actualCapex / stateCapexUtilisation) * 100;
                    return percentage.toFixed(1) + "%";
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
        {sectionsWithData.includes("section1_3") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.3 -</span> % of Credit
                    Rated ULBs{" "}
                  </span>
                  {renderActionButtons("1.3")}
                </div>
              </div>
            }
            subtitle="Annex 3: Verified with Muni.GOI"
            className="mb-6"
          >
            {/* <div className="space-y-4">
              {/* ✅ Show Total ULBs at the top */}
              {/* {formData?.section1_3?.totalULBs !== undefined && (
                <div className="max-w-xs">
                  <Label>Total Number of ULBs</Label>
                  <Input
                    type="number"
                    value={formData.section1_3.totalULBs || 0}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>
              )} */}

              {/* Existing ULB List */}
              {/* {formData?.section1_3?.ulbList?.length > 0 ? (
                formData.section1_3.ulbList.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>City Name</Label>
                        <Input 
                         value={item.cityName || ""}
                         readOnly={!isEditable('1.3')}
                         className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'} />
                      </div>
                      <div>
                        <Label>ULB</Label> */}
                        {/* <Input
                         value={item.ulb || ""}  
                         readOnly={!isEditable('1.3')}
                         className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'}
                         /> */}
                        {/* {getDropdown(
  dropdownValues.ulbList,
  item.ulb || "",
  (value) => {
    setFormData((prev) => ({
      ...prev,
      section1_3: {
        ...prev.section1_3,
        ulbList: prev.section1_3.ulbList.map((ulbItem) =>
          ulbItem.id === item.id ? { ...ulbItem, ulb: value } : ulbItem
        ),
      },
    }));
  },
  "Select ULB",
  isEditable('1.3') // Pass the editable state
)} */
/* }
                      </div>
                      <div>
                        <Label>Rating Date</Label>
                        <Input
                          type="text"
                          value={
                            item.ratingDate
                              ? (() => {
                                  try {
                                    const dateStr =
                                      typeof item.ratingDate === "string"
                                        ? item.ratingDate
                                        : "";
                                    if (dateStr.includes("T")) {
                                      const date = new Date(dateStr);
                                      const year = date.getFullYear();
                                      const month = String(
                                        date.getMonth() + 1
                                      ).padStart(2, "0");
                                      const day = String(
                                        date.getDate()
                                      ).padStart(2, "0");
                                      return `${year}-${month}-${day}`;
                                    }
                                    return dateStr.split("T")[0] || dateStr;
                                  } catch {
                                    return item.ratingDate || "";
                                  }
                                })()
                              : ""
                          }
                         readOnly={!isEditable('1.3')}
                         className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'}
                        />
                      </div>
                      <div>
                        <Label>Rating</Label>
                        <Input 
                        value={item.rating || ""} 
                        readOnly={!isEditable('1.3')}
                        className={isEditable('1.3') ? 'bg-white' : 'bg-gray-50'} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No ULB data available
                </div>
              )} */}
             {/* </div> */} 

            <Section_1_3 
            formData={formData}
            isEditable={isEditable}
            // setFormData={setFormData}
            />
          </SectionCard>
        )}

        {/* Section 1.4 */}
        {sectionsWithData.includes("section1_4") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.4 -</span> % of ULBs
                    Issuing Bonds{" "}
                  </span>
                  {renderActionButtons("1.4")}
                </div>
              </div>
            }
            subtitle="Annex 4: Provide Bond Details"
            className="mb-6"
          >
            <div className="space-y-4">
              {/* ✅ Show Total ULBs at top */}
              {/* {formData?.section1_4?.totalULBs !== undefined && (
                <div className="max-w-xs">
                  <Label>Total Number of ULBs</Label>
                  <Input
                    type="number"
                    value={formData.section1_4.totalULBs || 0}
                    readOnly={!isEditable('1.4')}
                    className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'}
                  />
                </div>
              )} */}

              {/* ✅ Bond List */}
              {/* {formData?.section1_4?.bondList?.length > 0 ? (
                formData.section1_4.bondList.map((item: any, index: number) => (
                  <div key={item.id || index}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Bond Type</Label>
                        <Input 
                        value={item.bondType || ""} 
                        readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'} 
                        />
                      </div>
                      <div>
                        <Label>City Name</Label>
                        <Input 
                        value={item.cityName || ""}
                        readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'}  
                         />
                      </div>
                      <div>
                        <Label>Issuing Authority</Label>
                        <Input 
                        value={item.issuingAuthority || ""} 
                        readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'} 
                         />
                      </div>
                      <div>
                        <Label>Value (INR)</Label>
                        <Input
                          value={item.value ? `₹ ${item.value} Crores` : ""}
                          readOnly={!isEditable('1.4')}
                        className={isEditable('1.4') ? 'bg-white' : 'bg-gray-50'} 
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No bond data available
                </div>
              )} */}


            </div>

             <Section_1_4 
            formData={formData}
            isEditable={isEditable}
            // setFormData={setFormData}
            />
          </SectionCard>
        )}

        {/* Section 1.5 */}
        {sectionsWithData.includes("section1_5") && (
          <SectionCard
            title={
              <div className="flex flex-col relative">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold ">
                    <span className="text-primary">1.5 -</span> Functional
                    Financial Intermediary{" "}
                  </span>
                  {renderActionButtons("1.5")}
                </div>
              </div>
            }
            subtitle="Annex 4: Provide link and funding details"
            className="mb-6"
          >
            {/* <div className="space-y-4">
              {formData?.section1_5?.map((item: any, index: number) => (
                <div key={item.id || index} className="">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <Label>Organisation Name</Label>
                      <Input 
                      value={item.organisationName || ""} 
                      readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'} 
                      />
                    </div>
                    <div>
                      <Label>Organization Type</Label>
                      <Input 
                      value={item.organisationType || ""} 
                      readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'} 
                      />
                    </div>
                    <div>
                      <Label>Year of Establishment</Label>
                      <Input
                       value={item.yearEstablished || ""} 
                       readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'} 
                       />
                    </div>
                    <div>
                      <Label>Total Funding (INR)</Label>
                      <Input
                        value={
                          item.totalFunding
                            ? `₹ ${item.totalFunding} Crores`
                            : ""
                        }
                        readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'}
                      />
                    </div>
                    <div className="">
                      <Label>Website Link</Label>
                      <Input 
                      value={item.website || ""} 
                      readOnly={!isEditable('1.5')}
                      className={isEditable('1.5') ? 'bg-white' : 'bg-gray-50'}
                       />
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-muted-foreground py-4">
                  No financial intermediary data available
                </div>
              )}
            </div> */}
            <Section_1_5 formData={formData} isEditable={isEditable} />
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
        key={`timeline-${timelineSection}-${
          getAllComments().length
        }-${Date.now()}`} // Force re-render when comments change
      />
    </>
  );
};
