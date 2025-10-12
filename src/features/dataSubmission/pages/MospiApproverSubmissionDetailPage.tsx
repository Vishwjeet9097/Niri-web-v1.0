import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, X } from "lucide-react";
import { MospiOverviewTab } from "../components/tabs/MospiOverviewTab";
import { MospiApproverDataReviewTab } from "../components/tabs/MospiApproverDataReviewTab";
import { DocumentsTab } from "../components/tabs/DocumentsTab";
import { ChecklistTab } from "../components/tabs/ChecklistTab";
import { HistoryTab } from "../components/tabs/HistoryTab";
import { SendBackModal } from "../components/modals/SendBackModal";
import { ApproveModal } from "../components/modals/ApproveModal";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { AuditLog, AuditEntry } from "@/components/AuditLog";
import { generateAuditEntries } from "@/utils/auditUtils";

export const MospiApproverSubmissionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAlert, setShowAlert] = useState(true);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const loadSubmission = async () => {
      if (!id) {
        navigate("/data-submission/review");
        return;
      }

      try {
        setLoading(true);
        const submissionData = await apiService.getSubmission(id);
        setSubmission(submissionData);
      } catch (error: any) {
        console.error("Failed to load submission:", error);
        notificationService.error(
          error.message || "Failed to load submission",
          "Load Error"
        );
        navigate("/data-submission/review");
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Submission not found</h2>
          <Button onClick={() => navigate("/data-submission/review")}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/data-submission/mospi-approver")}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {submission.submissionId || submission.title || `Submission ${submission.id}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Reviewed by {submission.mospiReviewer?.name || "MoSPI Reviewer"} • MoSPI Reviewer
            </p>
          </div>
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            MoSPI Reviewed
          </Badge>
        </div>

        {/* Info Alert */}
        {showAlert && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-900">
                <strong>Note:</strong> Your decision will trigger immediate score updates and ranking changes in the NIRI system.
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAlert(false)}
                className="text-blue-600 hover:text-blue-800 ml-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => navigate("/data-submission/mospi-approver")}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSendBackModalOpen(true)}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Send Back
            </Button>
            <Button
              onClick={() => setApproveModalOpen(true)}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </Button>
          </div>

          <Button className="gap-2">
            Next
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviewer-comments">MoSPI Reviewer Comments</TabsTrigger>
            <TabsTrigger value="data-review">Data Review</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <MospiOverviewTab submission={submission} />
          </TabsContent>

          <TabsContent value="reviewer-comments">
            <div className="space-y-4">
              {submission.sections.map((section: any) => (
                <div key={section.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{section.name}</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">{section.progress}%</div>
                      <p className="text-xs text-muted-foreground">Indicator Score</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {section.points}/{section.maxPoints} points | {section.sectionsWithComments} sections with comments
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data-review">
            <MospiApproverDataReviewTab submissionId={submission.id} sections={submission.sections as any || []} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab documents={submission.documents} submissionId={submission.id} />
          </TabsContent>

          <TabsContent value="checklist">
            <ChecklistTab checklist={submission.checklist.map((item: any) => ({
              ...item,
              status: item.status as "compliant" | "na" | "non-compliant" | "pending"
            }))} submissionId={submission.id} />
          </TabsContent>

          <TabsContent value="history">
            <AuditLog entries={generateAuditEntries(submission)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <SendBackModal
        open={sendBackModalOpen}
        onClose={() => setSendBackModalOpen(false)}
        submissionId={submission.id}
      />
      <ApproveModal
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        submissionId={submission.id}
      />
    </div>
  );
};
