import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Edit3, AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, X } from "lucide-react";
import { OverviewTab } from "./tabs/OverviewTab";
import { DataReviewTab } from "./tabs/DataReviewTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { SendBackModal } from "./modals/SendBackModal";
import { ApproveModal } from "./modals/ApproveModal";
import { SendToApproverModal } from "./modals/SendToApproverModal";
import { RejectModal } from "./modals/RejectModal";
import { hasLocalEdits } from "../services/submissionData.service";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { AuditLog, AuditEntry } from "@/components/AuditLog";
import { generateAuditEntries } from "@/utils/auditUtils";
import { MospiOverviewTab } from "./tabs/MospiOverviewTab";
import { MospiApproverDataReviewTab } from "./tabs/MospiApproverDataReviewTab";

interface Submission {
  id: string;
  submissionId: string;
  stateUt: string;
  submittedBy: string;
  rejectionCount: number;
  formData: any;
  reviewComments: any[];
  attachedFiles: any[];
  status: string;
  currentOwnerRole: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    contactNumber: string | null;
    role: string;
    stateUt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  finalScore: number | null;
}

interface UnifiedReviewPageProps {
  isPreview?: boolean;
  isMospiApprover?: boolean;
  submission?: Submission | null;
  onFinalSubmit?: () => void;
  isSubmitting?: boolean;
  isResubmit?: boolean;
  isEditMode?: boolean;
}

export const UnifiedReviewPage = ({ isPreview = false, isMospiApprover = false, submission: propSubmission, onFinalSubmit, isSubmitting = false, isResubmit = false, isEditMode = false }: UnifiedReviewPageProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [sendToApproverModalOpen, setSendToApproverModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  
  // Check for edit mode from localStorage
  const [actualEditMode, setActualEditMode] = useState(isEditMode);

  // Check for edit mode on mount
  useEffect(() => {
    const isEditModeFlag = localStorage.getItem('is_edit_mode') === 'true';
    const editingSubmission = localStorage.getItem('editing_submission');
    
    if (isEditModeFlag || editingSubmission) {
      setActualEditMode(true);
    }
  }, []);

  // Load submission data from API or use prop
  const loadSubmission = async () => {
    // If submission is provided as prop (for preview), use it
    if (propSubmission) {
      setSubmission(propSubmission);
      setLoading(false);
      return;
    }

    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getSubmission(id);
      console.log("🔍 API Response:", response);
      
      if (response) {
        setSubmission(response);
      } else {
        setError("Submission not found");
      }
    } catch (err: any) {
      console.error("❌ Error loading submission:", err);
      setError(err.message || "Failed to load submission");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmission();
  }, [id, propSubmission]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading submission...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !submission) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Submission</h2>
          <p className="text-muted-foreground mb-4">{error || "Submission not found"}</p>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_STATE":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "APPROVED":
        return "bg-green-100 text-green-700 border-green-300";
      case "RETURNED_FROM_STATE":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // Get action buttons based on role and status
  const getActionButtons = () => {
    if (isPreview) {
      return (
        <div className="flex gap-2">
          {actualEditMode && (
            <Button
              variant="outline"
              onClick={() => {
                // Clear edit mode flags and go back
                localStorage.removeItem("editing_submission_id");
                localStorage.removeItem("is_edit_mode");
                navigate("/data-submission/review");
              }}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          )}
          {onFinalSubmit && (
            <Button
              onClick={onFinalSubmit}
              disabled={isSubmitting}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? "Submitting..." : (actualEditMode ? "Resubmit" : isResubmit ? "Resubmit" : "Submit")}
            </Button>
          )}
        </div>
      );
    }

    const currentUserRole = user?.role;
    const submissionStatus = submission?.status;
    const currentOwnerRole = submission?.currentOwnerRole;

    // Only show actions if current user is the owner
    if (currentUserRole !== currentOwnerRole) return null;

    const buttons = [];

    // Edit button for NODAL_OFFICER and STATE_APPROVER
    if ((currentUserRole === "NODAL_OFFICER" && (submissionStatus === "DRAFT" || submissionStatus === "RETURNED_FROM_STATE")) ||
        (currentUserRole === "STATE_APPROVER" && (submissionStatus === "SUBMITTED_TO_STATE" || submissionStatus === "RETURNED_FROM_MOSPI"))) {
      buttons.push(
        <Button
          key="edit"
          variant="outline"
          onClick={async () => {
            try {
              console.log("🔍 Loading submission data for edit:", submission.id);
              // Fetch fresh submission data from endpoint
              const freshSubmissionData = await apiService.getSubmission(submission.id);
              console.log("🔍 Fresh submission data:", freshSubmissionData);
              
              // Store in localStorage for edit page
              localStorage.setItem('editing_submission', JSON.stringify(freshSubmissionData));
              
              // Navigate to edit page
              navigate(`/data-submission/edit/${submission.id}`);
            } catch (error) {
              console.error("❌ Failed to load submission for edit:", error);
              notificationService.error("Failed to load submission data", "Edit Error");
            }
          }}
          className="gap-2"
        >
          <Edit3 className="w-4 h-4" />
          Edit
        </Button>
      );
    }

    // Resubmit button for RETURNED_FROM_STATE status
    if (currentUserRole === "NODAL_OFFICER" && submissionStatus === "RETURNED_FROM_STATE") {
      buttons.push(
        <Button
          key="resubmit"
          onClick={() => {
            // Navigate to resubmit page or handle resubmit
            navigate(`/data-submission/resubmit/${submission.id}`);
          }}
          className="gap-2 bg-orange-600 hover:bg-orange-700"
        >
          <CheckCircle className="w-4 h-4" />
          Resubmit
        </Button>
      );
    }

    // Send Back button
    if (currentUserRole === "STATE_APPROVER" && submissionStatus === "SUBMITTED_TO_STATE") {
      buttons.push(
        <Button
          key="send-back"
          variant="outline"
          onClick={() => setSendBackModalOpen(true)}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Send Back
        </Button>
      );
    }

    // Approve button
    if ((currentUserRole === "STATE_APPROVER" && submissionStatus === "SUBMITTED_TO_STATE") ||
        (currentUserRole === "MOSPI_APPROVER" && submissionStatus === "SUBMITTED_TO_MOSPI")) {
      buttons.push(
        <Button
          key="approve"
          onClick={() => setApproveModalOpen(true)}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </Button>
      );
    }

    // Send to Approver button
    if (currentUserRole === "MOSPI_REVIEWER" && submissionStatus === "SUBMITTED_TO_MOSPI") {
      buttons.push(
        <Button
          key="send-to-approver"
          variant="outline"
          onClick={() => setSendToApproverModalOpen(true)}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Send to Approver
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isPreview ? "Preview Submission" : "Review Submission"}
                </h1>
                <p className="text-gray-600">
                  {submission.submissionId} • {submission.stateUt}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={getStatusBadgeColor(submission.status)}
              >
                {submission.status.replace(/_/g, " ")}
              </Badge>
              {getActionButtons()}
            </div>
          </div>

          {/* Submission Info */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Submitted By</p>
                <p className="font-medium">
                  {submission.user.firstName} {submission.user.lastName}
                </p>
                <p className="text-sm text-gray-500">{submission.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submission Date</p>
                <p className="font-medium">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Owner</p>
                <p className="font-medium">{submission.currentOwnerRole.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* Local Edits Alert */}
          {hasLocalEdits(submission.id) && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This submission has local edits that haven't been saved yet.
                <Button
                  variant="link"
                  className="p-0 h-auto ml-2"
                  onClick={() => {
                    // Handle local edits
                  }}
                >
                  View Changes
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className={`grid w-full mb-6 ${isMospiApprover ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isMospiApprover && (
              <TabsTrigger value="reviewer-comments">MoSPI Reviewer Comments</TabsTrigger>
            )}
            <TabsTrigger value="data-review">Data Review</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isMospiApprover ? (
              <MospiOverviewTab submission={submission} />
            ) : (
              <OverviewTab submission={submission} />
            )}
          </TabsContent>

          {isMospiApprover && (
            <TabsContent value="reviewer-comments">
              <div className="space-y-4">
                {submission.sections?.map((section: any) => (
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
          )}

          <TabsContent value="data-review">
            {isMospiApprover ? (
              <MospiApproverDataReviewTab 
                submissionId={submission.id} 
                sections={submission.sections || []} 
                formData={submission.formData}
              />
            ) : (
              <DataReviewTab submissionId={submission.id} formData={submission.formData} />
            )}
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab 
              documents={submission.attachedFiles || []} 
              submissionId={submission.id}
              formData={submission.formData}
            />
          </TabsContent>

          <TabsContent value="history">
            <AuditLog entries={generateAuditEntries(submission)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {!isPreview && (
        <>
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
              loadSubmission();
            }}
          />
        </>
      )}
    </div>
  );
};
