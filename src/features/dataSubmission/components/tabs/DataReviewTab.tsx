/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { InfraFinancingReview } from "../dataReview/InfraFinancingReview";
import { InfraDevelopmentReview } from "../dataReview/InfraDevelopmentReview";
import { PPPDevelopmentReview } from "../dataReview/PPPDevelopmentReview";
import { InfraEnablersReview } from "../dataReview/InfraEnablersReview";
import {
  hasInfraFinancingData,
  hasInfraDevelopmentData,
  hasPPPDevelopmentData,
  hasInfraEnablersData,
} from "@/utils/sectionDataValidator";
import { filterSectionFormDataByIndicators } from "@/utils/indicatorUtils";

interface DataReviewTabProps {
  submissionId: string;
  formData?: any;
  submission?: any; // Complete submission object
  isPreview?: boolean; // Whether this is a preview mode (fresh submission)
  assignedIndicators?: string[]; // Assigned indicators for nodal officers (for filtering in preview)
  isNodalOfficer?: boolean; // Whether the user is a nodal officer
  sections?: Array<{
    id: string;
    name: string;
    progress?: number;
    maxPoints?: number;
    points?: number;
    indicators: Array<{
      id: string;
      code: string;
      name: string;
      status: string | null;
      score: number | null;
      updatedAt: string | null;
      data?: any;
      sectionId?: string;
      maxScore?: string | number | null;
      category?: string;
      year?: string | null;
    }>;
  }>;
  onRefetch?: () => void; // Callback to refetch submission data from parent
  /** When provided (e.g. for State Approver in preview), show Submit at end of last section and call this when clicked (same as Submit Now) */
  onRequestFinalSubmit?: () => void;
  /** When true, the Submit button (when on last section) is disabled until all indicators are accepted */
  isFinalSubmitDisabled?: boolean;
  /** When provided (e.g. for MOSPI Reviewer), show Submit at end of last section and call this when clicked (same as Send to Approver) */
  onRequestSendToApprover?: () => void;
  /** When true, the Submit button (Send to Approver) is disabled (e.g. already sent to MOSPI Approver) */
  isSendToApproverDisabled?: boolean;
}

const DEFAULT_SECTIONS = [
  { id: "infra-financing", label: "Infra Financing", points: 250 },
  { id: "infra-development", label: "Infra Development", points: 250 },
  { id: "ppp-development", label: "PPP Development", points: 250 },
  { id: "infra-enablers", label: "Infra Enablers", points: 250 },
];

export const DataReviewTab = ({
  submissionId,
  formData: rawFormData,
  submission,
  isPreview = false,
  assignedIndicators,
  isNodalOfficer,
  sections,
  onRefetch,
  onRequestFinalSubmit,
  isFinalSubmitDisabled = false,
  onRequestSendToApprover,
  isSendToApproverDisabled = false,
}: DataReviewTabProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse formData if it's a string
  const formData = useMemo(() => {
    if (!rawFormData) return rawFormData;
    if (typeof rawFormData === "string") {
      try {
        return JSON.parse(rawFormData);
      } catch (e) {
        console.error("Failed to parse formData in DataReviewTab:", e);
        return rawFormData;
      }
    }
    return rawFormData;
  }, [rawFormData]);

  // Get category from URL params or default to 0
  const categoryParam = searchParams.get("category");
  const initialSection = categoryParam ? parseInt(categoryParam, 10) : 0;
  const [currentSection, setCurrentSection] = useState(initialSection);
  const isUpdatingFromUrlRef = React.useRef(false);
  const prevSectionRef = React.useRef(currentSection);

  // Sync from URL param when it changes externally (e.g., browser back/forward)
  // This only runs when categoryParam changes, not when currentSection changes
  useEffect(() => {
    // Skip if we're updating from our own URL change
    if (isUpdatingFromUrlRef.current) {
      isUpdatingFromUrlRef.current = false;
      return;
    }

    // Only sync if URL param exists and differs from current state
    if (categoryParam !== null) {
      const sectionIndex = parseInt(categoryParam, 10);
      if (!isNaN(sectionIndex)) {
        // Use a ref to get current value without adding to dependencies
        setCurrentSection((prev) => {
          if (prev !== sectionIndex) {
            return sectionIndex;
          }
          return prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]); // Only depend on categoryParam to avoid loops

  // Update URL when section changes (user interaction)
  const updateUrlForSection = React.useCallback(
    (sectionIndex: number) => {
      isUpdatingFromUrlRef.current = true;
      const newSearchParams = new URLSearchParams(searchParams);
      if (sectionIndex !== 0) {
        newSearchParams.set("category", sectionIndex.toString());
      } else {
        newSearchParams.delete("category");
      }
      setSearchParams(newSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Scroll to top of page (layout uses scrollable <main>, not window)
  const scrollToTop = React.useCallback(() => {
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Wrapper for setCurrentSection that also updates URL and scrolls to top
  const handleSectionChange = React.useCallback(
    (sectionIndex: number) => {
      setCurrentSection(sectionIndex);
      updateUrlForSection(sectionIndex);
      // Scroll to top after DOM updates so user sees the new section
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTop);
      });
    },
    [updateUrlForSection, scrollToTop]
  );

  // Refetch data when category changes (but not on initial mount)
  useEffect(() => {
    // Only refetch if section actually changed and we're not in preview mode
    if (
      prevSectionRef.current !== currentSection &&
      prevSectionRef.current !== initialSection &&
      !isPreview &&
      onRefetch
    ) {
      console.log(
        `🔄 [DataReviewTab] Category changed from ${prevSectionRef.current} to ${currentSection}, refetching data...`
      );
      // Small delay to ensure smooth navigation
      setTimeout(() => {
        onRefetch();
      }, 100);
    }
    prevSectionRef.current = currentSection;
  }, [currentSection, isPreview, onRefetch, initialSection]);

  // Map category IDs to their indicator codes
  const categoryIndicatorMap: Record<string, string[]> = {
    "infra-financing": ["1.1", "1.2", "1.3", "1.4", "1.5"],
    "infra-development": ["2.1", "2.2", "2.3", "2.4", "2.5"],
    "ppp-development": ["3.1", "3.2", "3.3", "3.4"],
    "infra-enablers": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
  };

  // Check which sections have data
  const sectionsWithData = [
    {
      id: "infra-financing",
      label: "Infra Financing",
      points: 250,
      hasData: hasInfraFinancingData(formData),
    },
    {
      id: "infra-development",
      label: "Infra Development",
      points: 250,
      hasData: hasInfraDevelopmentData(formData),
    },
    {
      id: "ppp-development",
      label: "PPP Development",
      points: 250,
      hasData: hasPPPDevelopmentData(formData),
    },
    {
      id: "infra-enablers",
      label: "Infra Enablers",
      points: 250,
      hasData: hasInfraEnablersData(formData),
    },
  ];

  // Filter sections based on assigned indicators for nodal officers in preview mode
  const availableSections = useMemo(() => {
    // For nodal officers in preview mode: filter categories that have assigned indicators
    if (
      isPreview &&
      isNodalOfficer &&
      assignedIndicators &&
      assignedIndicators.length > 0
    ) {
      const filtered = sectionsWithData.filter((section) => {
        const categoryIndicators = categoryIndicatorMap[section.id] || [];
        // Check if any indicator in this category is assigned to the nodal officer
        const hasAssignedIndicator = categoryIndicators.some((ind) =>
          assignedIndicators.includes(ind)
        );
        console.log(
          `🔍 [DataReviewTab] Category ${section.id} has assigned indicator:`,
          hasAssignedIndicator,
          "category indicators:",
          categoryIndicators,
          "assigned:",
          assignedIndicators
        );
        return hasAssignedIndicator;
      });
      console.log(
        "🔍 [DataReviewTab] Filtered sections for nodal officer:",
        filtered
      );
      return filtered;
    }

    // For preview mode but NOT nodal officer (e.g., state approver viewing aggregate):
    // Show all sections that exist in formData, even if they don't have meaningful data
    // This ensures all indicators are visible in aggregate/preview views
    if (
      isPreview &&
      !isNodalOfficer &&
      formData &&
      typeof formData === "object"
    ) {
      // Map section ID to formData category key
      const categoryMap: Record<string, string> = {
        "infra-financing": "infraFinancing",
        "infra-development": "infraDevelopment",
        "ppp-development": "pppDevelopment",
        "infra-enablers": "infraEnablers",
      };

      // Check which sections exist in formData (even if empty)
      const existingSections = DEFAULT_SECTIONS.filter((section) => {
        const formDataCategory = categoryMap[section.id];
        if (!formDataCategory) return false;

        // Check if category exists in formData (even if empty object)
        const categoryExists =
          formDataCategory in formData &&
          formData[formDataCategory] &&
          typeof formData[formDataCategory] === "object";

        // For each section, check if any sub-sections exist (e.g., section4_3 in infraEnablers)
        if (categoryExists) {
          const categoryData = formData[formDataCategory];
          // Check if this category has any section keys (e.g., section4_3, section4_4, etc.)
          const hasAnySections = Object.keys(categoryData).some((key) =>
            key.startsWith("section")
          );
          return hasAnySections;
        }

        return false;
      });

      // Include sections that have data OR exist in formData
      const sectionsToShow = DEFAULT_SECTIONS.map((section) => {
        const existsInFormData = existingSections.some(
          (s) => s.id === section.id
        );
        const hasData =
          sectionsWithData.find((s) => s.id === section.id)?.hasData || false;
        return { ...section, hasData: hasData || existsInFormData };
      }).filter((section) => section.hasData);

      console.log(
        "🔍 [DataReviewTab] Preview mode (non-nodal): showing sections that exist in formData:",
        sectionsToShow
      );
      return sectionsToShow.length > 0
        ? sectionsToShow
        : DEFAULT_SECTIONS.map((s) => ({ ...s, hasData: false }));
    }

    // For aggregate view or non-preview: show sections with data, or all as fallback
    const anyHasData = sectionsWithData.some((s) => s.hasData);
    return anyHasData
      ? sectionsWithData.filter((s) => s.hasData)
      : DEFAULT_SECTIONS.map((s) => ({ ...s, hasData: false }));
  }, [
    sectionsWithData,
    isPreview,
    isNodalOfficer,
    assignedIndicators,
    formData,
  ]);

  // Validate currentSection is within bounds when availableSections changes
  useEffect(() => {
    if (availableSections.length === 0) return;

    if (currentSection >= availableSections.length) {
      // If current section is out of bounds, reset to 0
      // Use setCurrentSection directly to avoid triggering URL update in this case
      setCurrentSection(0);
      updateUrlForSection(0);
    }
  }, [availableSections.length, currentSection, updateUrlForSection]);

  const renderSectionContent = () => {
    // Filter formData based on assigned indicators for nodal officers in preview mode
    let filteredFormData = formData;
    if (
      isPreview &&
      isNodalOfficer &&
      assignedIndicators &&
      assignedIndicators.length > 0 &&
      formData
    ) {
      filteredFormData = filterSectionFormDataByIndicators(
        formData,
        assignedIndicators
      );
      console.log(
        "🔍 [DataReviewTab] Filtered formData for nodal officer:",
        filteredFormData
      );
    }

    // Helper function to filter out SAVE_AS_DRAFT indicators from a category
    const filterDraftIndicators = (categoryData: any): any => {
      if (!categoryData || typeof categoryData !== "object") {
        return categoryData;
      }

      const filtered: any = {};
      Object.keys(categoryData).forEach((key) => {
        const section = categoryData[key];
        // Check if this is a section object with a status field
        if (section && typeof section === "object" && section.status) {
          const status = String(section.status).toUpperCase();
          // Only include if status is NOT SAVE_AS_DRAFT
          if (status !== "SAVE_AS_DRAFT") {
            filtered[key] = section;
          }
        } else {
          // If no status field, include it (might be metadata or other data)
          filtered[key] = section;
        }
      });

      return filtered;
    };

    const sectionFormData = filteredFormData
      ? {
          infraFinancing: filterDraftIndicators(
            filteredFormData.infraFinancing
          ),
          infraDevelopment: filterDraftIndicators(
            filteredFormData.infraDevelopment
          ),
          pppDevelopment: filterDraftIndicators(
            filteredFormData.pppDevelopment
          ),
          infraEnablers: filterDraftIndicators(filteredFormData.infraEnablers),
        }
      : {};

    console.log("🔍 [DataReviewTab] formData:", formData);
    console.log("🔍 [DataReviewTab] filteredFormData:", filteredFormData);
    console.log(
      "🔍 [DataReviewTab] sectionFormData.infraFinancing:",
      sectionFormData.infraFinancing
    );
    console.log("🔍 [DataReviewTab] isPreview:", isPreview);
    console.log("🔍 [DataReviewTab] currentSection:", currentSection);
    console.log("🔍 [DataReviewTab] availableSections:", availableSections);

    if (availableSections.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for review</p>
        </div>
      );
    }

    // Use a key based on category and submission updatedAt to force remount when data changes
    const categoryKey = availableSections[currentSection]?.id || "";
    const submissionTimestamp = submission?.updatedAt || submission?.id || "";
    const componentKey = `${categoryKey}-${submissionTimestamp}`;

    switch (availableSections[currentSection]?.id) {
      case "infra-financing":
        console.log(
          "🔍 [DataReviewTab] Rendering InfraFinancingReview with formData:",
          sectionFormData.infraFinancing
        );
        return (
          <InfraFinancingReview
            key={componentKey}
            submissionId={submissionId}
            formData={sectionFormData.infraFinancing}
            submission={submission}
            isPreview={isPreview}
            assignedIndicators={assignedIndicators}
            isNodalOfficer={isNodalOfficer}
          />
        );
      case "infra-development":
        return (
          <InfraDevelopmentReview
            key={componentKey}
            submissionId={submissionId}
            formData={sectionFormData.infraDevelopment}
            submission={submission}
            isPreview={isPreview}
            assignedIndicators={assignedIndicators}
            isNodalOfficer={isNodalOfficer}
          />
        );
      case "ppp-development":
        return (
          <PPPDevelopmentReview
            key={componentKey}
            submissionId={submissionId}
            formData={sectionFormData.pppDevelopment}
            submission={submission}
            isPreview={isPreview}
            assignedIndicators={assignedIndicators}
            isNodalOfficer={isNodalOfficer}
          />
        );
      case "infra-enablers":
        return (
          <InfraEnablersReview
            key={componentKey}
            submissionId={submissionId}
            formData={sectionFormData.infraEnablers}
            submission={submission}
            isPreview={isPreview}
            assignedIndicators={assignedIndicators}
            isNodalOfficer={isNodalOfficer}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      {availableSections.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableSections.map((section, index) => (
            <Button
              key={section.id}
              variant={currentSection === index ? "default" : "outline"}
              onClick={() => handleSectionChange(index)}
              className="whitespace-nowrap"
            >
              {section.label}
            </Button>
          ))}
        </div>
      )}

      {/* Section Header shown inside each review component now (dynamic) */}

      {/* Section Content */}
      {renderSectionContent()}

      {/* Navigation Buttons */}
      {availableSections.length > 1 && (
        <div className="flex items-center justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => handleSectionChange(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          {currentSection === availableSections.length - 1 &&
          (onRequestFinalSubmit || onRequestSendToApprover) ? (
            <Button
              onClick={
                onRequestFinalSubmit
                  ? onRequestFinalSubmit
                  : onRequestSendToApprover
              }
              disabled={
                onRequestFinalSubmit
                  ? isFinalSubmitDisabled
                  : isSendToApproverDisabled
              }
              className="gap-2"
            >
              Submit
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() =>
                handleSectionChange(
                  Math.min(availableSections.length - 1, currentSection + 1)
                )
              }
              disabled={currentSection === availableSections.length - 1}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
