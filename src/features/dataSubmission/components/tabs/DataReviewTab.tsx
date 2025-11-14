import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { InfraFinancingReview } from "../dataReview/InfraFinancingReview";
import { InfraDevelopmentReview } from "../dataReview/InfraDevelopmentReview";
import { PPPDevelopmentReview } from "../dataReview/PPPDevelopmentReview";
import { InfraEnablersReview } from "../dataReview/InfraEnablersReview";
import { hasInfraFinancingData, hasInfraDevelopmentData, hasPPPDevelopmentData, hasInfraEnablersData } from "@/utils/sectionDataValidator";

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

}

const DEFAULT_SECTIONS = [
  { id: "infra-financing", label: "Infra Financing", points: 250 },
  { id: "infra-development", label: "Infra Development", points: 250 },
  { id: "ppp-development", label: "PPP Development", points: 250 },
  { id: "infra-enablers", label: "Infra Enablers", points: 250 },
];

export const DataReviewTab = ({ submissionId, formData, submission, isPreview = false, assignedIndicators, isNodalOfficer, sections }: DataReviewTabProps) => {
  const [currentSection, setCurrentSection] = useState(0);

  // Map category IDs to their indicator codes
  const categoryIndicatorMap: Record<string, string[]> = {
    "infra-financing": ["1.1", "1.2", "1.3", "1.4", "1.5"],
    "infra-development": ["2.1", "2.2", "2.3", "2.4", "2.5"],
    "ppp-development": ["3.1", "3.2", "3.3", "3.4"],
    "infra-enablers": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
  };

  // Check which sections have data
  const sectionsWithData = [
    { id: "infra-financing", label: "Infra Financing", points: 250, hasData: hasInfraFinancingData(formData) },
    { id: "infra-development", label: "Infra Development", points: 250, hasData: hasInfraDevelopmentData(formData) },
    { id: "ppp-development", label: "PPP Development", points: 250, hasData: hasPPPDevelopmentData(formData) },
    { id: "infra-enablers", label: "Infra Enablers", points: 250, hasData: hasInfraEnablersData(formData) },
  ];

  // Filter sections based on assigned indicators for nodal officers in preview mode
  const availableSections = useMemo(() => {
    // For nodal officers in preview mode: filter categories that have assigned indicators
    if (isPreview && isNodalOfficer && assignedIndicators && assignedIndicators.length > 0) {
      const filtered = sectionsWithData.filter((section) => {
        const categoryIndicators = categoryIndicatorMap[section.id] || [];
        // Check if any indicator in this category is assigned to the nodal officer
        const hasAssignedIndicator = categoryIndicators.some(ind => assignedIndicators.includes(ind));
        console.log(`🔍 [DataReviewTab] Category ${section.id} has assigned indicator:`, hasAssignedIndicator, "category indicators:", categoryIndicators, "assigned:", assignedIndicators);
        return hasAssignedIndicator;
      });
      console.log("🔍 [DataReviewTab] Filtered sections for nodal officer:", filtered);
      return filtered;
    }

    // For aggregate view or non-preview: show sections with data, or all as fallback
    const anyHasData = sectionsWithData.some((s) => s.hasData);
    return anyHasData ? sectionsWithData.filter((s) => s.hasData) : DEFAULT_SECTIONS.map(s => ({ ...s, hasData: false }));
  }, [sectionsWithData, isPreview, isNodalOfficer, assignedIndicators]);
  
  const renderSectionContent = () => {
    const sectionFormData = formData ? {
      infraFinancing: formData.infraFinancing,
      infraDevelopment: formData.infraDevelopment,
      pppDevelopment: formData.pppDevelopment,
      infraEnablers: formData.infraEnablers
    } : {};
    
    console.log("🔍 [DataReviewTab] formData:", formData);
    console.log("🔍 [DataReviewTab] sectionFormData.infraFinancing:", sectionFormData.infraFinancing);
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

    switch (availableSections[currentSection]?.id) {
      case "infra-financing":
        console.log("🔍 [DataReviewTab] Rendering InfraFinancingReview with formData:", sectionFormData.infraFinancing);
        return <InfraFinancingReview submissionId={submissionId} formData={sectionFormData.infraFinancing} submission={submission} isPreview={isPreview} assignedIndicators={assignedIndicators} isNodalOfficer={isNodalOfficer} />;
      case "infra-development":
        return <InfraDevelopmentReview submissionId={submissionId} formData={sectionFormData.infraDevelopment} submission={submission} isPreview={isPreview} assignedIndicators={assignedIndicators} isNodalOfficer={isNodalOfficer} />;
      case "ppp-development":
        return <PPPDevelopmentReview submissionId={submissionId} formData={sectionFormData.pppDevelopment} submission={submission} isPreview={isPreview} assignedIndicators={assignedIndicators} isNodalOfficer={isNodalOfficer} />;
      case "infra-enablers":
        return <InfraEnablersReview submissionId={submissionId} formData={sectionFormData.infraEnablers} submission={submission} isPreview={isPreview} assignedIndicators={assignedIndicators} isNodalOfficer={isNodalOfficer} />;
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
              onClick={() => setCurrentSection(index)}
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
            onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
            disabled={currentSection === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            onClick={() => setCurrentSection((prev) => Math.min(availableSections.length - 1, prev + 1))}
            disabled={currentSection === availableSections.length - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
