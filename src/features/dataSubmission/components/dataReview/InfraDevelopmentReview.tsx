import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  formData?: any;
}

export const InfraDevelopmentReview = ({ submissionId, formData }: InfraDevelopmentReviewProps) => {
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
            {formData?.section2_1?.map((item: any, index: number) => (
              <div key={item.id || index} className="border rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Sector</Label>
                    <Input value={item.sector || ""} readOnly />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Uploaded Files</Label>
                      {item.files && item.files.length > 0 ? (
                        <div className="space-y-2">
                          {item.files.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">{file.fileName || "File"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No files uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-muted-foreground py-4">
                No infrastructure act/policy data available
              </div>
            )}

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
                  {formData?.section2_1?.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="py-3">{item.sector || 'N/A'}</td>
                      <td className="py-3">
                        {item.files && item.files.length > 0 ? (
                          item.files.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="flex items-center gap-2">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">{file.fileName || 'Unknown file'}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground">No files uploaded</span>
                        )}
                      </td>
                      <td className="py-3">{item.sector || 'N/A'}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No data available
                      </td>
                    </tr>
                  )}
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
            {formData?.section2_2?.map((item: any, index: number) => (
              <div key={item.id || index} className="border rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Sector</Label>
                    <Input value={item.sector || ""} readOnly />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Uploaded Files</Label>
                      {item.files && item.files.length > 0 ? (
                        <div className="space-y-2">
                          {item.files.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">{file.fileName || "File"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No files uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-muted-foreground py-4">
                No specialised entity data available
              </div>
            )}
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
            {formData?.section2_3?.map((item: any, index: number) => (
              <div key={item.id || index} className="border rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Sector</Label>
                    <Input value={item.sector || ""} readOnly />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Uploaded Files</Label>
                      {item.files && item.files.length > 0 ? (
                        <div className="space-y-2">
                          {item.files.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <Upload className="w-4 h-4" />
                              <span className="text-sm">{file.fileName || "File"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No files uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-muted-foreground py-4">
                No sector infra development plan data available
              </div>
            )}
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
            {formData?.section2_4?.map((item: any, index: number) => (
              <div key={item.id || index} className="border rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <Label>Project Name</Label>
                    <Input value={item.projectName || ""} readOnly />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>DPR File</Label>
                      {item.dprFile ? (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">{item.dprFile.fileName || "DPR File"}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No DPR file uploaded</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )) || (
              <div className="text-center text-muted-foreground py-4">
                No investment ready project pipeline data available
              </div>
            )}
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
                  {formData?.section2_5?.map((item: any, index: number) => (
                    <tr key={item.id || index} className="border-b">
                      <td className="py-3">{item.projectName || ""}</td>
                      <td className="py-3">{item.sector || ""}</td>
                      <td className="py-3">{item.type || ""}</td>
                      <td className="py-3">{item.ownership || ""}</td>
                      <td className="py-3">{item.estimatedMonetization ? `₹ ${item.estimatedMonetization} Crores` : ""}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No asset monetization pipeline data available
                      </td>
                    </tr>
                  )}
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
