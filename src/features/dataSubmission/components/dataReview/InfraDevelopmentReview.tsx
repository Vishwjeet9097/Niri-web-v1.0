import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Upload, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { MessageModal } from "../modals/MessageModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";

interface InfraDevelopmentReviewProps {
  submissionId: string;
}

export const InfraDevelopmentReview = ({ submissionId }: InfraDevelopmentReviewProps) => {
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
      "2.1": "2.1 - Availability of Infrastructure Act/Policy",
      "2.2": "2.2 - Availability of Specialised Entity",
      "2.3": "2.3 - Availability of Sector Infra Development Plan",
      "2.4": "2.4 - Availability of Investment Ready Project Pipeline",
      "2.5": "2.5 - Availability of Asset Monetization Pipeline",
    };
    return titles[sectionId] || sectionId;
  };
  return (
    <>
      <div className="space-y-6">
        {/* Section 2.1 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.1 - Availability of Infrastructure Act/Policy
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Select Sector</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm text-muted-foreground">No file chosen</span>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More Entry
            </Button>

            <p className="text-xs text-muted-foreground">
              Upload copy of Act/Policy
            </p>

            <div className="border rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Sector</th>
                    <th className="text-left py-2">Uploaded File</th>
                    <th className="text-left py-2">File Type</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((item) => (
                    <tr key={item} className="border-b">
                      <td className="py-3">Project ABC</td>
                      <td className="py-3">PDF File.pdf</td>
                      <td className="py-3">XXX Type</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Annex 7: Provide VGF/IIPDF details
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 2.2 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.2 - Availability of Specialised Entity
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
            <p className="text-sm text-muted-foreground">Upload OPM/SPC</p>
          </div>
        </CardContent>
      </Card>

        {/* Section 2.3 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.3 - Availability of Sector Infra Development Plan
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
            <p className="text-sm text-muted-foreground">Upload plan</p>
          </div>
        </CardContent>
      </Card>

        {/* Section 2.4 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.4 - Availability of Investment Ready Project Pipeline
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Project
            </Button>
            <p className="text-sm text-muted-foreground">
              Annex 8: Upload DPR/Feasibility Report
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 2.5 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                2.5 - Availability of Asset Monetization Pipeline
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("2.5")}
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
                    <th className="text-left py-2">Project/Asset Name</th>
                    <th className="text-left py-2">Sector</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Ownership</th>
                    <th className="text-left py-2">Estimated Monetization</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((item) => (
                    <tr key={item} className="border-b">
                      <td className="py-3">Project ABC</td>
                      <td className="py-3">XYZ Sector</td>
                      <td className="py-3">XYZ Type</td>
                      <td className="py-3">Ownership 1</td>
                      <td className="py-3">₹ 88,000 Crores</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
