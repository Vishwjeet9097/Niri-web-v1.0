import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Upload, Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

interface InfraEnablersReviewProps {
  submissionId: string;
}

export const InfraEnablersReview = ({ submissionId }: InfraEnablersReviewProps) => {
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
      "4.1": "4.1 - Eligible Infrastructure Projects",
      "4.2": "4.2 - Adoption of PM GatiShakti",
      "4.3": "4.3 - Innovative Practices",
      "4.4": "4.4 - Capacity Building - Officer Participation",
    };
    return titles[sectionId] || sectionId;
  };
  return (
    <>
      <div className="space-y-6">
        {/* Section 4.1 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                4.1 - Eligible Infrastructure Projects
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.1")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">All Eligible Infra Projects on NIP Portal?*</Label>
              <RadioGroup defaultValue="yes">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="nip-yes" />
                  <Label htmlFor="nip-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="nip-no" />
                  <Label htmlFor="nip-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 bg-blue-50">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm">SelfCertification document.doc</span>
              <span className="text-sm text-green-600">✓</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Annex 9: Self-certification required
            </p>

            <div>
              <Label className="mb-3 block">Availability and Use of EaseMPR?*</Label>
              <RadioGroup defaultValue="yes">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ease-yes" />
                  <Label htmlFor="ease-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ease-no" />
                  <Label htmlFor="ease-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 bg-blue-50">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm">Document.doc</span>
              <span className="text-sm text-green-600">✓</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload Evidence/Certificate/File
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 4.2 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                4.2 - Adoption of PM GatiShakti (5 marks per 1%)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.2")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Project Name</Label>
              <Input placeholder="Enter project name" />
            </div>
            <div>
              <Label>Sector</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More
            </Button>

            <p className="text-xs text-muted-foreground">
              Upload GatiShakti evidence
            </p>

            <div>
              <Label className="mb-3 block">Adoption of Alternate Dispute Resolution (ADR)?*</Label>
              <RadioGroup defaultValue="yes">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="adr-yes" />
                  <Label htmlFor="adr-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="adr-no" />
                  <Label htmlFor="adr-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm text-muted-foreground">No file chosen</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload ADR orders/notification
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 4.3 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                4.3 - Innovative Practices (10 marks per practice)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.3")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Practice Name</Label>
              <Input placeholder="Practice Name" />
            </div>
            <div>
              <Label>Impact</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Impact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Impact</SelectItem>
                  <SelectItem value="medium">Medium Impact</SelectItem>
                  <SelectItem value="low">Low Impact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2 bg-blue-50">
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <span className="text-sm">No file chosen</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Upload RMB orders/Awards
            </p>

            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More Practice
            </Button>

            <p className="text-xs text-muted-foreground">
              Annex 10
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Section 4.4 */}
        <Card>
          <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                4.4 - Capacity Building - Officer Participation (1 marks per officer)
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleOpenModal("4.4")}
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Officer Name</Label>
                <Input placeholder="Enter officer name" />
              </div>
              <div>
                <Label>Designation</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an Option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secretary">Secretary</SelectItem>
                    <SelectItem value="officer">Officer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Program Name</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an Option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="program1">Program 1</SelectItem>
                    <SelectItem value="program2">Program 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Organiser</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Asset ownership" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org1">Organisation 1</SelectItem>
                    <SelectItem value="org2">Organisation 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Training Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add More Training
            </Button>

            <p className="text-xs text-muted-foreground">
              Annex 11
            </p>
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
