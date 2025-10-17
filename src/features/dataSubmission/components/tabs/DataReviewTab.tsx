import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { InfraFinancingReview } from "../dataReview/InfraFinancingReview";
import { InfraDevelopmentReview } from "../dataReview/InfraDevelopmentReview";
import { PPPDevelopmentReview } from "../dataReview/PPPDevelopmentReview";
import { InfraEnablersReview } from "../dataReview/InfraEnablersReview";

interface DataReviewTabProps {
  submissionId: string;
  formData?: any;
}

const sections = [
  { id: "infra-financing", label: "Infra Financing", points: 250 },
  { id: "infra-development", label: "Infra Development", points: 250 },
  { id: "ppp-development", label: "PPP Development", points: 250 },
  { id: "infra-enablers", label: "Infra Enablers", points: 250 },
];

export const DataReviewTab = ({ submissionId, formData }: DataReviewTabProps) => {
  const [currentSection, setCurrentSection] = useState(0);

  const renderSectionContent = () => {
    const sectionFormData = formData ? {
      infraFinancing: formData.infraFinancing,
      infraDevelopment: formData.infraDevelopment,
      pppDevelopment: formData.pppDevelopment,
      infraEnablers: formData.infraEnablers
    } : {};

    console.log("🔍 DataReviewTab Debug:", {
      formData,
      sectionFormData,
      currentSection: sections[currentSection].id
    });

    switch (sections[currentSection].id) {
      case "infra-financing":
        return <InfraFinancingReview submissionId={submissionId} formData={sectionFormData.infraFinancing} />;
      case "infra-development":
        return <InfraDevelopmentReview submissionId={submissionId} formData={sectionFormData.infraDevelopment} />;
      case "ppp-development":
        return <PPPDevelopmentReview submissionId={submissionId} formData={sectionFormData.pppDevelopment} />;
      case "infra-enablers":
        return <InfraEnablersReview submissionId={submissionId} formData={sectionFormData.infraEnablers} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((section, index) => (
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

      {/* Section Header */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {sections[currentSection].label} | {sections[currentSection].points} Points
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Data related to {sections[currentSection].label.toLowerCase()} and budget allocation
          </p>
        </div>
        <div className="text-right">
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            5/5 completed
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">100% Progress</p>
        </div>
      </div>


      {/* Section Content */}
      {renderSectionContent()}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
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
          onClick={() => setCurrentSection((prev) => Math.min(sections.length - 1, prev + 1))}
          disabled={currentSection === sections.length - 1}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
