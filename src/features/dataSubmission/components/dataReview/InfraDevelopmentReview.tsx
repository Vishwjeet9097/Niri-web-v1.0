import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Upload, Plus, Clock } from "lucide-react";
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
import { TimelineModal } from "../modals/TimelineModal";
import { useSectionMessages } from "../../hooks/useSectionMessages";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { hasInfraDevelopmentData, getSectionsWithData } from "@/utils/sectionDataValidator";

interface InfraDevelopmentReviewProps {
  submissionId: string;
  formData?: unknown;
  submission?: unknown; // Complete submission object
}

export const InfraDevelopmentReview = ({ submissionId, formData, submission }: InfraDevelopmentReviewProps) => {
  const { saveMessage, getMessage, getComments, getAllComments } = useSectionMessages(submissionId, submission);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [timelineSection, setTimelineSection] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState(formData);

  // Check if this section has any data
  const hasData = hasInfraDevelopmentData({ infraDevelopment: formData });
  const sectionsWithData = getSectionsWithData({ infraDevelopment: formData }, 'infraDevelopment');

  const handleOpenModal = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const handleCloseModal = () => {
    setActiveSection(null);
  };

  const handleOpenTimeline = (sectionId: string) => {
    setTimelineSection(sectionId);
  };

  const handleCloseTimeline = () => {
    setTimelineSection(null);
  };

  const handleSaveMessage = async (message: string) => {
    if (activeSection) {
      try {
        const updatedSubmission = await saveMessage(activeSection, message);
        if (updatedSubmission) {
          // Update form data with fresh API response
          setSubmissionData(updatedSubmission);
          
          // Force timeline refresh if modal is open for same section
          if (timelineSection === activeSection) {
            setTimelineSection(null);
            setTimeout(() => {
              setTimelineSection(activeSection);
            }, 100);
          }
        }
      } catch (error) {
        console.error("Error saving message:", error);
      }
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


  const renderActionButtons = (sectionId: string) => {
    const comments = getComments(sectionId);
    const commentCount = comments ? comments.length : 0;

    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenModal(sectionId)}
        >
          <MessageSquare className="w-4 h-4" />
          Add Comment
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={() => handleOpenTimeline(sectionId)}
        >
          <Clock className="w-4 h-4" />
          Timeline ({commentCount})
        </Button>
      </div>
    );
  };
  // If no data, show message
  if (!hasData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No Infra Development data available for review</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Section 2.1 */}
        {sectionsWithData.includes('section2_1') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.1 -</span> Availability of Infrastructure Act/Policy{" "}
              </span>
              {renderActionButtons("2.1")}
            </div>
          </div>}
          subtitle="Annex 4: Provide link and funding details"
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">

              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"

              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
          </CardHeader> */}
            <div className="space-y-4">
              {formData?.section2_1?.map((item: any, index: number) => (
                <div key={item.id || index} className="">
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

              <div className="overflow-x-auto rounded-xl">
                <table className="min-w-full border-separate border-spacing-0 ">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Sector</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Uploaded File</th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">File Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData?.section2_1?.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm font-normal">
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
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || 'N/A'}</td>
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

              {/* <p className="text-xs text-muted-foreground">
                Annex 7: Provide VGF/IIPDF details
              </p> */}
            </div>

        </SectionCard>
        )}

        {/* Section 2.2 */}
        {sectionsWithData.includes('section2_2') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.2 -</span> Availability of Specialised Entity{" "}
              </span>
              {renderActionButtons("2.2")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                
              >
                <MessageSquare className="w-4 h-4" />
                Add Comment
              </Button>
            </div>
          </CardHeader> */}
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

        </SectionCard>
        )}

        {/* Section 2.3 */}
        {sectionsWithData.includes('section2_3') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.3 -</span> Availability of Sector Infra Development Plan{" "}
              </span>
              {renderActionButtons("2.3")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 
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
          </CardHeader> */}
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

        </SectionCard>
        )}

        {/* Section 2.4 */}
        {sectionsWithData.includes('section2_4') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.4 -</span> Availability of Investment Ready Project Pipeline{" "}
              </span>
              {renderActionButtons("2.4")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
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
          </CardHeader> */}
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

        </SectionCard>
        )}

        {/* Section 2.5 */}
        {sectionsWithData.includes('section2_5') && (
        <SectionCard
          title={<div className="flex flex-col relative">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold ">
                <span className="text-primary">2.5 -</span> Availability of Asset Monetization Pipeline{" "}
              </span>
              {renderActionButtons("2.5")}
            </div>
          </div>}
          subtitle=""
          className="mb-6"
        >
          {/* <CardHeader className="bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                 Availability of Asset Monetization Pipeline
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
          </CardHeader> */}
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#DDE3F9]">
                      <th className="py-3 px-4 text-left rounded-tl-xl text-sm font-normal">Project/Asset Name</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Sector</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Type</th>
                      <th className="py-3 px-4 text-left text-sm font-normal">Ownership</th>
                      <th className="py-3 px-4 text-left rounded-tr-xl text-sm font-normal">Estimated Monetization</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData?.section2_5?.map((item: any, index: number) => (
                      <tr key={item.id || index} className="border-b">
                        <td className="py-3 px-4 text-sm font-normal">{item.projectName || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.sector || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.type || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.ownership || ""}</td>
                        <td className="py-3 px-4 text-sm font-normal">{item.estimatedMonetization ? `₹ ${item.estimatedMonetization} Crores` : ""}</td>
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

        </SectionCard>
        )}
      </div>

      <MessageModal
        isOpen={activeSection !== null}
        onClose={handleCloseModal}
        onSave={handleSaveMessage}
        sectionTitle={activeSection ? getSectionTitle(activeSection) : ""}
        sectionId={activeSection || ""}
        submissionId={submissionId}
        existingMessage={activeSection ? getMessage(activeSection) : ""}
      />

      <TimelineModal
        isOpen={timelineSection !== null}
        onClose={handleCloseTimeline}
        sectionId={timelineSection || ""}
        sectionTitle={timelineSection ? getSectionTitle(timelineSection) : ""}
        comments={getAllComments()}
        key={`timeline-${timelineSection}-${getAllComments().length}-${Date.now()}`} // Force re-render when comments change
      />
    </>
  );
};
