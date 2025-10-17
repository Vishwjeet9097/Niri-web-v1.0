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
  formData?: any;
}

export const InfraEnablersReview = ({ submissionId, formData }: InfraEnablersReviewProps) => {
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
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData?.section4_1?.allEligible === "yes" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {formData?.section4_1?.allEligible === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div>
              <Label>Website Link</Label>
              <Input value={formData?.section4_1?.websiteLink || ""} readOnly />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section4_1?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section4_1.file.fileName || "Self-certification document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Annex 9: Self-certification required
            </p>

            <div>
              <Label className="mb-3 block">Availability and Use of EaseMPR?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData?.section4_2?.available === "yes" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {formData?.section4_2?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section4_2?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section4_2.file.fileName || "Evidence document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
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
              <Label className="mb-3 block">Adoption of PM GatiShakti?*</Label>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData?.section4_2?.adopted === "yes" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {formData?.section4_2?.adopted === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section4_2?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section4_2.file.fileName || "PM GatiShakti document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
            </div>

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
            {formData?.section4_5 ? (
              <div className="border rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Practice Name</Label>
                    <Input value={formData.section4_5.practiceName || ""} readOnly />
                  </div>
                  <div>
                    <Label>Impact</Label>
                    <Input value={formData.section4_5.impact || ""} readOnly />
                  </div>
                  <div>
                    <Label>Implemented</Label>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        formData.section4_5.implemented === "yes" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {formData.section4_5.implemented === "yes" ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Uploaded File</Label>
                      {formData.section4_5.file ? (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">{formData.section4_5.file.fileName || "Practice document"}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No file uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No innovative practices data available
              </div>
            )}

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
            {formData?.section4_6?.map((item: any, index: number) => (
              <div key={item.id || index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Officer Name</Label>
                    <Input value={item.officerName || ""} readOnly />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input value={item.designation || ""} readOnly />
                  </div>
                  <div>
                    <Label>Program Name</Label>
                    <Input value={item.programName || ""} readOnly />
                  </div>
                  <div>
                    <Label>Organiser</Label>
                    <Input value={item.organiser || ""} readOnly />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Training Type</Label>
                  <Input value={item.trainingType || ""} readOnly />
                </div>
              </div>
            )) || (
              <div className="text-center text-muted-foreground py-4">
                No capacity building data available
              </div>
            )}

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
