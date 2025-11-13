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

export const DataReviewTab = ({ submissionId, formData, submission, isPreview = false, sections }: DataReviewTabProps) => {
  const [currentSection, setCurrentSection] = useState(0);

  // Check which sections have data
  const sectionsWithData = [
    { id: "infra-financing", label: "Infra Financing", points: 250, hasData: hasInfraFinancingData(formData) },
    { id: "infra-development", label: "Infra Development", points: 250, hasData: hasInfraDevelopmentData(formData) },
    { id: "ppp-development", label: "PPP Development", points: 250, hasData: hasPPPDevelopmentData(formData) },
    { id: "infra-enablers", label: "Infra Enablers", points: 250, hasData: hasInfraEnablersData(formData) },
  ];

  // Filter sections that have data
  // const availableSections = sectionsWithData.filter(section => section.hasData);

   const availableSections = useMemo(() => {
    const anyHasData = sectionsWithData.some((s) => s.hasData);
    // If no sections have data, show all sections as fallback
    return anyHasData ? sectionsWithData.filter((s) => s.hasData) : DEFAULT_SECTIONS.map(s => ({ ...s, hasData: false }));
  }, [sectionsWithData]);
  
  const renderSectionContent = () => {
    const sectionFormData = formData ? {
      infraFinancing: formData.infraFinancing,
      infraDevelopment: formData.infraDevelopment,
      pppDevelopment: formData.pppDevelopment,
      infraEnablers: formData.infraEnablers
    } : {};
    // Debug logging removed for performance

    if (availableSections.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for review</p>
        </div>
      );
    }

    switch (availableSections[currentSection]?.id) {
      case "infra-financing":
        return <InfraFinancingReview submissionId={submissionId} formData={sectionFormData.infraFinancing} submission={submission} isPreview={isPreview} />;
      case "infra-development":
        return <InfraDevelopmentReview submissionId={submissionId} formData={sectionFormData.infraDevelopment} submission={submission} isPreview={isPreview} />;
      case "ppp-development":
        return <PPPDevelopmentReview submissionId={submissionId} formData={sectionFormData.pppDevelopment} submission={submission} isPreview={isPreview} />;
      case "infra-enablers":
        return <InfraEnablersReview submissionId={submissionId} formData={sectionFormData.infraEnablers} submission={submission} isPreview={isPreview} />;
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
