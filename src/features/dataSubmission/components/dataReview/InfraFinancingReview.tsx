import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface InfraFinancingReviewProps {
  submissionId: string;
}

export const InfraFinancingReview = ({ submissionId }: InfraFinancingReviewProps) => {
  const { saveMessage, getMessage } = useSectionMessages(submissionId);
  const [activeSection, setActiveSection] = useState<string | null>(null);

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
  return (
    <>
      <div className="space-y-6">
        {/* Section 1.1 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                1.1 - % Capex to GSDP (10 marks per 1%)
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
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Label>Year</Label>
              <Input value="2024-25" readOnly />
            </div>
            <div>
              <Label>Capital Allocation for FY (INR)</Label>
              <Input value="₹1,50,000 crores" />
            </div>
            <div>
              <Label>GSDP for FY (INR)</Label>
              <Input value="" placeholder="Enter value" />
            </div>
            <div>
              <Label>State Capex Utilisation (%)</Label>
              <Input value="6.5%" />
            </div>
            <div>
              <Label>% Allocation to GSDP</Label>
              <Input value="" placeholder="Auto-calculated" readOnly />
            </div>
            <div>
              <Label>% Capex to Capex Actuals</Label>
              <Input value="90%" />
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Section 1.2 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                1.2 - % Capex Utilisation (10 marks per 1%)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("1.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
          <p className="text-sm text-muted-foreground mt-1">
            Annex 2: Verified with Actuals data
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label>Year</Label>
              <Input value="2024-25" readOnly />
            </div>
            <div>
              <Label>GSDP for FY (INR)</Label>
              <Input value="₹15,16,500 Crores" />
            </div>
            <div>
              <Label>Actual Capex (INR)</Label>
              <Input value="₹1,16,050 Crores" />
            </div>
            <div>
              <Label>State Capex Utilisation (%)</Label>
              <Input value="14.8%" />
            </div>
            <div>
              <Label>% Capex Actuals to GSDP</Label>
              <Input value="" placeholder="Auto-calculated" readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Section 1.3 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                1.3 - % of Credit Rated ULBs
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("1.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
          <p className="text-sm text-muted-foreground mt-1">
            Annex 3: Verified with Muni.GOI
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div key={item} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <Label>City Name</Label>
                    <Input value="Projet ABC" />
                  </div>
                  <div>
                    <Label>ULB</Label>
                    <Input value="XXX Sector" />
                  </div>
                  <div>
                    <Label>Rating Date</Label>
                    <Input type="date" value="2024-04-22" />
                  </div>
                  <div>
                    <Label>Rating</Label>
                    <Input value="AA+" />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More ULB
            </Button>
          </div>
        </CardContent>
      </Card>

        {/* Section 1.4 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                1.4 - % of ULBs Issuing Bonds
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
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Bond Name</Label>
                    <Input value="Municipal Bond" />
                  </div>
                  <div>
                    <Label>City Name</Label>
                    <Input value="Mumbai" />
                  </div>
                  <div>
                    <Label>Issuing Authority</Label>
                    <Input value="Authority Name" />
                  </div>
                  <div>
                    <Label>Value (INR)</Label>
                    <Input value="₹ 500 Crores" />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More Bond
            </Button>
          </div>
        </CardContent>
      </Card>

        {/* Section 1.5 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                1.5 - Functional Financial Intermediary
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("1.5")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
          <p className="text-sm text-muted-foreground mt-1">
            Annex 4: Provide link and funding details
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Organised Name</Label>
                  <Input value="Municipal Bold" />
                </div>
                <div>
                  <Label>Organization Type</Label>
                  <Input value="Corporation" />
                </div>
                <div>
                  <Label>Year of Establishment</Label>
                  <Input value="2010" />
                </div>
                <div>
                  <Label>Total Funding (INR)</Label>
                  <Input value="₹ 1,00 Crores" />
                </div>
              </div>
              <div className="mt-4">
                <Label>Website Link</Label>
                <Input value="https://www.authority-example.com" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More Financial Intermediary
            </Button>
          </div>
          </CardContent>
        </Card>
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
