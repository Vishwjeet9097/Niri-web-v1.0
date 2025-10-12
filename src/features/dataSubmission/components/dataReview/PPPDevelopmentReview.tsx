import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Upload, Plus } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface PPPDevelopmentReviewProps {
  submissionId: string;
}

export const PPPDevelopmentReview = ({ submissionId }: PPPDevelopmentReviewProps) => {
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
      "3.1": "3.1 - Availability of Infrastructure Act/Policy",
      "3.2": "3.2 - Functional PPP Cell/Unit",
      "3.3": "3.3 - Proposals Submitted under VGF/IIPDF",
      "3.4": "3.4 - Proportion of TPC of PPP Projects",
    };
    return titles[sectionId] || sectionId;
  };
  return (
    <>
      <div className="space-y-6">
        {/* Section 3.1 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.1 - Availability of Infrastructure Act/Policy
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">PPP Act/Policy Available?*</Label>
              <RadioGroup defaultValue="yes">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ppp-yes" />
                  <Label htmlFor="ppp-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ppp-no" />
                  <Label htmlFor="ppp-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 bg-blue-50">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm">ActPolicy document.pdf</span>
              <span className="text-sm text-green-600">✓</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload copy of Act/Policy
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 3.2 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.2 - Functional PPP Cell/Unit
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Functional State/UT PPP Cell/Unit*</Label>
              <RadioGroup defaultValue="yes">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="cell-yes" />
                  <Label htmlFor="cell-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="cell-no" />
                  <Label htmlFor="cell-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 bg-blue-50">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm">document.doc</span>
              <span className="text-sm text-green-600">✓</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload notification or mandate
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 3.3 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.3 - Proposals Submitted under VGF/IIPDF
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Project Name</th>
                    <th className="text-left py-2">Sector</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Submission Date</th>
                    <th className="text-left py-2">Uploaded File</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((item) => (
                    <tr key={item} className="border-b">
                      <td className="py-3">Project ABC</td>
                      <td className="py-3">XYZ Sector</td>
                      <td className="py-3">XYZ Type</td>
                      <td className="py-3">22-04-2025</td>
                      <td className="py-3">PDF File.pdf</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More Project
            </Button>

            <p className="text-xs text-muted-foreground">
              Annex 7: Provide VGF/IIPDF details
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 3.4 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                3.4 - Proportion of TPC of PPP Projects
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("3.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name of PPP/Bankable Projects</Label>
              <Input placeholder="Enter project name" />
            </div>
            <div>
              <Label>Infrastructure Sector</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>NIP ID</Label>
              <Input placeholder="Enter NIP ID" />
            </div>
            <div>
              <Label>Date of Award</Label>
              <Input type="date" placeholder="DD-MM-YYYY" />
            </div>
            <div>
              <Label>Funding Source (in case of bankable project)</Label>
              <Input placeholder="Enter funding source name" />
            </div>
            <div>
              <Label>% of Capex funded by non-Govt sources</Label>
              <Input placeholder="Enter percentage" />
            </div>
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
