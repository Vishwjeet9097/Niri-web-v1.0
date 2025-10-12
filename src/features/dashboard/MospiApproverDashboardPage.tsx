import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, AlertCircle, Eye } from "lucide-react";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { isWaitingForCurrentUser, getWaitingMessage } from "@/utils/auditUtils";

export const MospiApproverDashboardPage = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = async () => {
      try {
        setLoading(true);
  // TODO: Replace 'mospi_approver' with actual user role from auth context/store
  const userRole = "mospi_approver";
  const submissionsData = await apiService.getSubmissionsByRole("mospi_approver", 1, 100);
        
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

  // Calculate stats
  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter(
    (s) => s.status === "SUBMITTED_TO_MOSPI" || s.status === "pending",
  ).length;
  const approvedSubmissions = submissions.filter(
    (s) => s.status === "APPROVED" || s.status === "approved",
  ).length;
  const overdueSubmissions = submissions.filter(
    (s) => s.status === "overdue" || s.status === "REJECTED_FINAL",
  ).length;

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Submissions
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting final approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {pendingSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">
                Need your decision
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {approvedSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">This quarter</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overdueSubmissions}
              </div>
              <p className="text-xs text-muted-foreground">
                Require urgent action
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Submissions for Final Approval</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/data-submission/mospi-approver")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions available for review.
                </div>
              ) : (
                submissions.slice(0, 5).map((submission) => (
                  <Card
                    key={submission.id}
                    className={`border-l-4 ${getBorderColor(submission.status)}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {submission.title || submission.submissionId || `Submission ${submission.id}`}
                            </h3>
                            <Badge
                              variant="outline"
                              className={getStatusColor(submission.status)}
                            >
                              {getStatusText(submission.status)}
                            </Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div>
                              <p>📍 {submission.stateUt || submission.submittedBy?.location || "Unknown"}</p>
                              <p>
                                👤 MoSPI Reviewer:{" "}
                                {submission.mospiReviewer?.name || "N/A"}
                            </p>
                          </div>
                          <div>
                            <p>📋 Category: {submission.category || "Infrastructure"}</p>
                            <p>
                              ⏰ At Final Level:{" "}
                              {submission.atFinalLevel || new Date(submission.createdAt || submission.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const isWaiting = isWaitingForCurrentUser(submission, "MOSPI_APPROVER");
                        const waitingMessage = getWaitingMessage(submission, "MOSPI_APPROVER");
                        
                        return (
                          <>
                            {isWaiting && waitingMessage && (
                              <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <p className="text-sm text-blue-800">{waitingMessage}</p>
                                </div>
                              </div>
                            )}
                            {submission.status === "APPROVED" ? (
                              <Button
                                className="gap-2 bg-green-600 hover:bg-green-700 cursor-default"
                                disabled
                              >
                                <CheckCircle className="w-4 h-4" />
                                Approved
                              </Button>
                            ) : (
                              <Button
                                onClick={() =>
                                  navigate(
                                    `/data-submission/review/${submission.id}`,
                                  )
                                }
                                className="gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Review
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
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
