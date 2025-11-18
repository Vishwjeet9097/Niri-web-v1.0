import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { FileText, CheckCircle, Clock, AlertCircle, Eye } from "lucide-react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { isWaitingForCurrentUser, getWaitingMessage } from "@/utils/auditUtils";
import { useAuth } from "@/features/auth/AuthProvider";
import ReviewerKPICards from "./components/reviewer/ReviewerKPICards";

export const MospiApproverDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
  // TODO: Replace 'mospi_approver' with actual user role from auth context/store
  const userRole = "mospi_approver";
  const submissionsData = await apiService.getSubmissions(1, 100);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data?.submissions && Array.isArray((submissionsData as any).data.submissions)) {
          submissionsArray = (submissionsData as any).data.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }
        
        setSubmissions(submissionsArray);
      } catch (error) {
        console.error("❌ Failed to load submissions:", error);
        notificationService.error(
          "Failed to load submissions. Please try again.",
          "Load Error"
        );
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, []);

  // Filter submissions to only show SUBMITTED_TO_MOSPI_APPROVER status for MoSPI Approver
  const filteredSubmissions = useMemo(() => {
    if (user?.role !== "MOSPI_APPROVER") {
      return submissions;
    }
    
    return submissions.filter((submission) => {
      // MoSPI Approver should only see submissions submitted to them
      const allowedStatuses = [
        "SUBMITTED_TO_MOSPI_APPROVER",
      ];
      return submission.status && allowedStatuses.includes(submission.status);
    });
  }, [submissions, user?.role]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "overdue":
      case "REJECTED_FINAL":
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "approved":
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DRAFT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "SUBMITTED_TO_STATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "RETURNED_FROM_MOSPI":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "Waiting for Final Approval";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "Under MoSPI Review";
      case "APPROVED":
        return "Approved";
      case "DRAFT":
        return "Draft";
      case "SUBMITTED_TO_STATE":
        return "Under State Review";
      case "REJECTED_FINAL":
        return "Rejected";
      default:
        return status;
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_MOSPI_APPROVER":
        return "border-l-orange-500";
      case "SUBMITTED_TO_MOSPI_REVIEWER":
        return "border-l-purple-500";
      case "APPROVED":
        return "border-l-green-500";
      case "DRAFT":
        return "border-l-gray-500";
      case "SUBMITTED_TO_STATE":
        return "border-l-blue-500";
      case "REJECTED_FINAL":
        return "border-l-red-500";
      default:
        return "border-l-orange-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-foreground ">
            MoSPI Approver Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve state submissions
          </p>
        </div>

        {/* KPI Cards */}
        <ReviewerKPICards />

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="p-6">Recent Submissions for Final Approval</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/data-submission/review")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions available for review.
                </div>
              ) : (
                filteredSubmissions.slice(0, 5).map((submission) => {
                  // For submissions forwarded to MoSPI Approver, find who forwarded it
                  let submittedByText = submission.user ? `${submission.user.firstName || ''} ${submission.user.lastName || ''}`.trim() || "Unknown" : "Unknown";
                  
                  if (submission.status === "SUBMITTED_TO_MOSPI_APPROVER") {
                    // Look for the most recent comment from MOSPI_REVIEWER who forwarded it
                    if (submission.reviewComments && Array.isArray(submission.reviewComments)) {
                      const reviewerComments = submission.reviewComments
                        .filter((comment: any) => 
                          comment.role === "MOSPI_REVIEWER"
                        )
                        .sort((a: any, b: any) => {
                          const timeA = new Date(a.timestamp || 0).getTime();
                          const timeB = new Date(b.timestamp || 0).getTime();
                          return timeB - timeA; // Most recent first
                        });
                      
                      if (reviewerComments.length > 0) {
                        const lastReviewer = reviewerComments[0];
                        submittedByText = lastReviewer.userName || "MoSPI Reviewer";
                      } else {
                        submittedByText = "MoSPI Reviewer";
                      }
                    } else {
                      submittedByText = "MoSPI Reviewer";
                    }
                  }
                  
                  return (
                    <UnifiedSubmissionCard
                      key={submission.id}
                      id={submission.id}
                      title={submission.title || submission.submissionId || `Submission ${submission.id}`}
                      status={submission.status}
                      referenceId={submission.submissionId || submission.id}
                      updatedDate={new Date(submission.updatedAt || submission.createdAt).toLocaleDateString()}
                      dueDate={submission.deadline || "TBD"}
                      progress={submission.progress || 40}
                      nextStep={submission.status === "APPROVED" ? "Submission approved" : submission.status === "REJECTED" ? "Address reviewer feedback" : "Waiting for final approval"}
                      reviewerNote={submission.reviewerNote}
                      submission={submission}
                      currentUserRole="MOSPI_APPROVER"
                      submittedBy={submittedByText}
                      onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                      onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                    />
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="p-6">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/data-submission/review")}
              >
                <FileText className="w-6 h-6" />
                <span>Review Submissions</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/ranking")}
              >
                <CheckCircle className="w-6 h-6" />
                <span>View Rankings</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/support")}
              >
                <AlertCircle className="w-6 h-6" />
                <span>Support & Help</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
