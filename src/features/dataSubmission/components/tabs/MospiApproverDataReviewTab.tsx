import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface Section {
  id: string;
  name: string;
  points: number;
  maxPoints: number;
  description: string;
  sectionsCompleted: string;
  progress: number;
}

interface MospiApproverDataReviewTabProps {
  submissionId: string;
  sections: Section[];
}

const sectionData = [
  {
    id: "infra-financing",
    name: "Infra Financing",
    label: "Infrastructure Financing",
    points: 235,
    maxPoints: 250,
    description: "Data related to infrastructure financing and budget allocation",
    sectionsCompleted: "5/5",
    progress: 100,
    subsections: [
      {
        id: "1.1",
        title: "% Capex to GSDP",
        marks: "10 marks per 1%",
        annex: "Annex 1: Verified with RBI/CAG data (* Budgeted Estimates for Capital Expenditure)"
      },
      {
        id: "1.2",
        title: "% Capex Utilization",
        marks: "10 marks per 1%",
        annex: "Annex 2: Verified with MoHUA data"
      },
      {
        id: "1.3",
        title: "% of Credit Rated ULBs",
        marks: "",
        annex: "Annex 2: Verified with MoHUA data"
      },
      {
        id: "1.4",
        title: "% of ULBs Issuing Bonds",
        marks: "",
        annex: "Annex 3: ULBs with population > 50,000"
      },
      {
        id: "1.5",
        title: "Functional Financial Intermediary",
        marks: "",
        annex: "Annex 4: Provide website link and funding details"
      }
    ]
  },
  {
    id: "infra-development",
    name: "Infra Development",
    label: "Infrastructure Development",
    points: 215,
    maxPoints: 250,
    description: "Physical infrastructure development and completion metrics. (10 marks per sector, min. 3 sectors)",
    sectionsCompleted: "4/5",
    progress: 20,
    subsections: [
      {
        id: "2.1",
        title: "Availability of Infrastructure Act/Policy",
        marks: "",
        annex: ""
      },
      {
        id: "2.2",
        title: "Availability of Specialized Entity",
        marks: "",
        annex: ""
      },
      {
        id: "2.3",
        title: "Availability of Sector Infra Development Plan",
        marks: "",
        annex: ""
      },
      {
        id: "2.4",
        title: "Availability of Investment Ready Project Pipeline",
        marks: "",
        annex: ""
      },
      {
        id: "2.5",
        title: "Availability of Asset Monetization Pipeline",
        marks: "",
        annex: ""
      }
    ]
  },
  {
    id: "ppp-development",
    name: "PPP Development",
    label: "PPP Development",
    points: 208,
    maxPoints: 250,
    description: "Public-Private Partnership projects and initiatives",
    sectionsCompleted: "2/2",
    progress: 0,
    subsections: [
      {
        id: "3.1",
        title: "Availability of Infrastructure Act/Policy",
        marks: "",
        annex: ""
      },
      {
        id: "3.2",
        title: "Functional PPP Cell/Unit",
        marks: "",
        annex: ""
      },
      {
        id: "3.3",
        title: "Proposals Submitted under VGF/IIPDF",
        marks: "",
        annex: ""
      },
      {
        id: "3.4",
        title: "Proportion of TPC of PPP Projects",
        marks: "",
        annex: ""
      }
    ]
  },
  {
    id: "infra-enablers",
    name: "Infra Enablers",
    label: "Infrastructure Enablers",
    points: 189,
    maxPoints: 250,
    description: "Regulatory and institutional frameworks supporting infrastructure",
    sectionsCompleted: "3/6",
    progress: 0,
    subsections: [
      {
        id: "4.1",
        title: "Eligible Infrastructure Projects",
        marks: "",
        annex: ""
      },
      {
        id: "4.2",
        title: "Adoption of PM GatiShakti",
        marks: "5 marks per 1%",
        annex: ""
      },
      {
        id: "4.3",
        title: "Adoption of PM GatiShakti",
        marks: "5 marks per 1%",
        annex: ""
      },
      {
        id: "4.4",
        title: "Adoption of ADR",
        marks: "10 marks per practice",
        annex: ""
      },
      {
        id: "4.5",
        title: "Innovative Practices",
        marks: "10 marks per practice",
        annex: ""
      },
      {
        id: "4.6",
        title: "Capacity Building - Officer Participation",
        marks: "1 marks per officer",
        annex: ""
      }
    ]
  }
];

export const MospiApproverDataReviewTab = ({ submissionId, sections }: MospiApproverDataReviewTabProps) => {
  const [currentSection, setCurrentSection] = useState(sectionData[0].id);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(null);
  const { getMessage, saveMessage } = useSectionMessages(submissionId);

  const currentSectionData = sectionData.find(s => s.id === currentSection);
  const currentSectionInfo = sections?.find(s => s.id === currentSection);

  const handleSaveMessage = (message: string) => {
    if (activeSubsection) {
      saveMessage(`${currentSection}-${activeSubsection}`, message);
      setActiveSubsection(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 flex-wrap">
        {sectionData.map((section) => (
          <Button
            key={section.id}
            variant={currentSection === section.id ? "default" : "outline"}
            onClick={() => setCurrentSection(section.id)}
            className={currentSection === section.id ? "bg-primary text-primary-foreground" : ""}
          >
            {section.name}
          </Button>
        ))}
      </div>

      {/* Section Header */}
      {currentSectionData && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-foreground">
                    {currentSectionData.label} | {currentSectionInfo?.points || currentSectionData.points}/{currentSectionData.maxPoints} Points
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    Pre-fill from Last FY
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{currentSectionData.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{currentSectionInfo?.sectionsCompleted || currentSectionData.sectionsCompleted} completed</p>
                <p className="text-sm font-semibold text-foreground">{currentSectionInfo?.progress || currentSectionData.progress}% Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subsections */}
      <div className="space-y-4">
        {currentSectionData?.subsections.map((subsection) => (
          <Card key={subsection.id} className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {subsection.id} - {subsection.title}
                    {subsection.marks && <span className="text-sm text-muted-foreground ml-2">({subsection.marks})</span>}
                  </h3>
                  {subsection.annex && (
                    <p className="text-sm text-muted-foreground">{subsection.annex}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveSubsection(subsection.id)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment
                </Button>
              </div>

              {/* Show existing message if any */}
              {getMessage(`${currentSection}-${subsection.id}`) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-semibold text-blue-900 mb-1">MoSPI Approver Comment:</p>
                  <p className="text-sm text-blue-800">{getMessage(`${currentSection}-${subsection.id}`)}</p>
                </div>
              )}

              {/* Placeholder for data fields - would be replaced with actual form fields */}
              <div className="mt-4 p-4 bg-muted/30 rounded-md">
                <p className="text-sm text-muted-foreground italic">Data fields for {subsection.title} would appear here (Read-only for MoSPI Approver)</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Modal */}
      <MessageModal
        isOpen={activeSubsection !== null}
        onClose={() => setActiveSubsection(null)}
        onSave={handleSaveMessage}
        sectionTitle={`${currentSectionData?.label} - ${currentSectionData?.subsections.find(s => s.id === activeSubsection)?.title || ""}`}
        existingMessage={activeSubsection ? getMessage(`${currentSection}-${activeSubsection}`) : ""}
      />
    </div>
  );
};
