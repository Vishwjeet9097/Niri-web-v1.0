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
  formData?: any;
}

export const PPPDevelopmentReview = ({ submissionId, formData }: PPPDevelopmentReviewProps) => {
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
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData?.section3_1?.available === "yes" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {formData?.section3_1?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section3_1?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section3_1.file.fileName || "Act/Policy document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
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
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  formData?.section3_2?.available === "yes" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {formData?.section3_2?.available === "yes" ? "Yes" : "No"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Uploaded File</Label>
                {formData?.section3_2?.file ? (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">{formData.section3_2.file.fileName || "PPP Cell document"}</span>
                    <span className="text-sm text-green-600">✓</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No file uploaded</span>
                )}
              </div>
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
                  {formData?.section3_3?.map((item: any, index: number) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="py-3">{item.projectName || ""}</td>
                      <td className="py-3">{item.sector || ""}</td>
                      <td className="py-3">{item.type || ""}</td>
                      <td className="py-3">{item.submissionDate || ""}</td>
                      <td className="py-3">
                        {item.file ? (
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">{item.file.fileName || "File"}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No file</span>
                        )}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No VGF/IIPDF proposals data available
                      </td>
                    </tr>
                  )}
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
          <div className="space-y-4">
            {formData?.section3_4 ? (
              <div className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Total TPC of PPP Projects</Label>
                    <Input value={formData.section3_4.totalTPC || ""} readOnly />
                  </div>
                  <div>
                    <Label>Proportion</Label>
                    <Input value={formData.section3_4.proportion ? `${formData.section3_4.proportion}%` : ""} readOnly />
                  </div>
                  <div>
                    <Label>Marks Obtained</Label>
                    <Input value={formData.section3_4.marksObtained ? `${formData.section3_4.marksObtained} marks` : ""} readOnly />
                  </div>
                  <div>
                    <Label>TPC of PPP Projects</Label>
                    <Input value={formData.section3_4.tpcOfPPPProjects || ""} readOnly />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No TPC of PPP Projects data available
              </div>
            )}
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
