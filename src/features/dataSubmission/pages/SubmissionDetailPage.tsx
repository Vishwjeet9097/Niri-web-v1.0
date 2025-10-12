import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Edit3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, X } from "lucide-react";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { DataReviewTab } from "../components/tabs/DataReviewTab";
import { DocumentsTab } from "../components/tabs/DocumentsTab";
import { ChecklistTab } from "../components/tabs/ChecklistTab";
import { HistoryTab } from "../components/tabs/HistoryTab";
import { SendBackModal } from "../components/modals/SendBackModal";
import { ApproveModal } from "../components/modals/ApproveModal";
import { SendToApproverModal } from "../components/modals/SendToApproverModal";
import { RejectModal } from "../components/modals/RejectModal";
import { hasLocalEdits } from "../services/submissionData.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { AuditLog, AuditEntry } from "@/components/AuditLog";
import { generateAuditEntries, canEditSubmission, canApproveSubmission, canReviewSubmission, canRejectSubmission, canSendBackSubmission } from "@/utils/auditUtils";

export const SubmissionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAlert, setShowAlert] = useState(true);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [sendToApproverModalOpen, setSendToApproverModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const hasEdits = id ? hasLocalEdits(id) : false;
  
  const isMospiReviewer = user?.role === "MOSPI_REVIEWER";
  const isMospiApprover = user?.role === "MOSPI_APPROVER";
  const isStateApprover = user?.role === "STATE_APPROVER";

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

  useEffect(() => {
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Submission not found</p>
          <Button onClick={() => navigate("/data-submission/review")} className="mt-4">
            Back to Review
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "overdue":
        return "bg-red-100 text-red-700 border-red-300";
      case "approved":
        return "bg-green-100 text-green-700 border-green-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/data-submission/review")}
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
              Submitted by {submission.nodalOfficer?.name || submission.user?.firstName + " " + submission.user?.lastName || "Unknown User"} • {submission.submissionInfo?.location || submission.stateUt || "Unknown Location"}
            </p>
          </div>
          <Badge variant="outline" className={getStatusColor(submission.status)}>
            {(submission.status || "Unknown").charAt(0).toUpperCase() + (submission.status || "Unknown").slice(1)}
          </Badge>
        </div>

        {/* Info Alert */}
        {showAlert && isStateApprover && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-900">
                As a State Approver reviewing data, you can directly edit any field in this form.
                Simply click on the data field you wish to update and make your changes before submitting.
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAlert(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {showAlert && isMospiApprover && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-blue-900">
                Note: Your decision will trigger immediate score updates and ranking changes in the NIRI system.
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAlert(false)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mb-6">
          {/* MoSPI Reviewer Actions */}
          {isMospiReviewer && canReviewSubmission(user?.role || "", submission?.status) && (
            <Button
              onClick={() => setSendToApproverModalOpen(true)}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Send to MoSPI Approver
            </Button>
          )}

          {/* MoSPI Approver Actions */}
          {isMospiApprover && (
            <>
              {canSendBackSubmission(user?.role || "", submission?.status) && (
                <Button
                  variant="outline"
                  onClick={() => setSendBackModalOpen(true)}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Back
                </Button>
              )}
              {canRejectSubmission(user?.role || "", submission?.status) && (
                <Button
                  variant="destructive"
                  onClick={() => setRejectModalOpen(true)}
                  className="gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Reject
                </Button>
              )}
              {canApproveSubmission(user?.role || "", submission?.status) && (
                <Button
                  onClick={() => setApproveModalOpen(true)}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </Button>
              )}
            </>
          )}

          {/* State Approver Actions */}
          {isStateApprover && (
            <>
              {canSendBackSubmission(user?.role || "", submission?.status) && (
                <Button
                  variant="outline"
                  onClick={() => setSendBackModalOpen(true)}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Back
                </Button>
              )}
              {canRejectSubmission(user?.role || "", submission?.status) && (
                <Button
                  variant="destructive"
                  onClick={() => setRejectModalOpen(true)}
                  className="gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Reject
                </Button>
              )}
              {canReviewSubmission(user?.role || "", submission?.status) && (
                <Button
                  onClick={() => setSendToApproverModalOpen(true)}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4" />
                  Send to MoSPI Reviewer
                </Button>
              )}
            </>
          )}

          {/* Nodal Officer Actions */}
          {user?.role === "NODAL_OFFICER" && (
            <>
              {hasEdits && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  Has Local Edits
                </Badge>
              )}
              {canEditSubmission(user?.role || "", submission?.status) && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/data-submission/edit/${id}`)}
                  className="gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Submission
                </Button>
              )}
              {canReviewSubmission(user?.role || "", submission?.status) && (
                <Button
                  variant="outline"
                  onClick={() => setSendBackModalOpen(true)}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit to State
                </Button>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data-review">Data Review</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab submission={submission} />
          </TabsContent>

          <TabsContent value="data-review">
            <DataReviewTab submissionId={submission.id} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab documents={submission.documents || []} submissionId={submission.id} />
          </TabsContent>

          <TabsContent value="checklist">
            <ChecklistTab checklist={[]} submissionId={submission.id} />
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
      <SendToApproverModal
        open={sendToApproverModalOpen}
        onClose={() => setSendToApproverModalOpen(false)}
        submissionId={submission.id}
      />
      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        submissionId={submission.id}
        onSuccess={() => {
          // Refresh submission data after rejection
          if (id) {
            loadSubmission();
          }
        }}
      />
    </div>
  );
};
