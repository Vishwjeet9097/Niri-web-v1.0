/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NodalKpiCard } from "./components/nodal/NodalKpiCards";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { UpcomingDeadlines } from "./components/UpcomingDeadlines";
import { QuickActions } from "./components/QuickActions";
import { QuickTips } from "./components/QuickTips";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import { calculateProgressByAcceptedStatus } from "@/features/submission/utils/progress";
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

// Helper function to map backend status to frontend status
const mapBackendStatusToFrontend = (backendStatus: string): string => {
  const statusMap: Record<string, string> = {
    DRAFT: "DRAFT",
    SUBMITTED_TO_STATE: "SUBMITTED_TO_STATE",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    SUBMITTED_TO_MOSPI: "SUBMITTED_TO_MOSPI",
    MOSPI_APPROVED: "MOSPI_APPROVED",
    MOSPI_REJECTED: "MOSPI_REJECTED",
    RETURNED_FROM_MOSPI: "RETURNED_FROM_MOSPI",
    // Legacy mappings
    draft: "DRAFT",
    under_review: "SUBMITTED_TO_STATE",
    approved: "APPROVED",
    need_revision: "REJECTED",
  };

  return statusMap[backendStatus] || backendStatus;
};

// Helper function to handle edit submission
const handleEditSubmission = async (submissionId: string, navigate: any) => {
  try {
    // Debug logging removed for performance

    // Load submission data from backend
    const submissionData = await apiService.getSubmission(submissionId);
    // Debug logging removed for performance

    // Store submission data in localStorage for form prefill
    localStorage.setItem("editing_submission", JSON.stringify(submissionData));

    // Navigate to edit page (same as handleEditSubmissionForEdit)
    navigate(`/data-submission/edit/${submissionId}`);

    notificationService.success("Submission loaded for editing", "Edit Mode", {
      details: {
        submissionId,
        status: submissionData.status,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to load submission for edit:", error);
    notificationService.error(
      error.message || "Failed to load submission for editing",
      "Load Error",
      {
        details: {
          submissionId,
          error: error.message,
        },
      }
    );
  }
};

// Helper function to handle edit submission for edit page
const handleEditSubmissionForEdit = async (
  submissionId: string,
  navigate: any
) => {
  try {
    // Debug logging removed for performance

    // Navigate to edit page
    navigate(`/data-submission/edit/${submissionId}`);

    notificationService.success("Opening edit page", "Edit Mode", {
      details: {
        submissionId,
      },
    });
  } catch (error: any) {
    console.error("❌ Failed to open edit page:", error);
    notificationService.error(
      error.message || "Failed to open edit page",
      "Error"
    );
  }
};

export function NodalDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kpis, setKpis] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState<any[]>([]);
  const [indicatorData, setIndicatorData] = useState<any>({
    totalAssigned: 0,
    totalSubmitted: 0,
    approved: 0,
    reverted: 0,
    underReview: 0,
    pendingSubmission: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch KPIs, submissions and nodal indicator metrics in parallel
        const [kpiData, submissionsData, nodalMetrics] = await Promise.all([
          apiService.getRoleKPIs("NODAL_OFFICER").catch(() => ({})),
          apiService.getSubmissions(1, 20).catch(() => ({ submissions: [] })),
          apiService.getNodalMetrics().catch(() => ({})),
        ]);

        // Merge nodal indicator metrics into state
        const metrics = nodalMetrics || {};
        setIndicatorData(metrics);

        // derive KPI numbers from nodalMetrics if available, otherwise fallback to role KPIs
        const totalIndicators =
          metrics.totalAssigned ?? kpiData?.mySubmissions ?? 0;
        const pendingIndicators = metrics.pendingSubmission ?? 0;
        const underReviewIndicators = metrics.underReview ?? 0;
        const approvedIndicators = metrics.approved ?? 0;
        const sentBackIndicators = metrics.reverted ?? 0;

        const kpisData = [
          {
            title: "Total Allocated Indicators",
            value: String(totalIndicators ?? 0),
            subtitle: "Critical Attention Needed",
            icon: FileText,
            variant: "red" as const,
            description:
              "Total number of indicators assigned to the Nodal Officer.",
          },
          {
            title: "Total Submitted",
            value: String(metrics.totalSubmitted ?? 0),
            subtitle: "Submitted forms",
            icon: TrendingUp,
            variant: "blue" as const,
            description:
              "Number of assigned indicators for which the Nodal Officer has submitted forms.",
          },
          {
            title: "Under Review",
            value: `${underReviewIndicators}/${totalIndicators || 0}`,
            subtitle: "Average review time: 3 days",
            icon: Search,
            variant: "blue" as const,
            description:
              "Submissions that have been sent by the Nodal Officer and are currently under review.",
          },
          {
            title: "Approved",
            value: `${approvedIndicators}/${totalIndicators || 0}`,
            subtitle: "This fiscal year",
            icon: CheckCircle,
            variant: "green" as const,
            description:
              "Submissions that have been reviewed and approved at all required levels.",
          },
          {
            title: "Pending Submissions",
            value: `${pendingIndicators}/${totalIndicators || 0}`,
            subtitle: `${pendingIndicators} pending`,
            icon: Clock,
            variant: "orange" as const,
            description:
              "Indicators assigned to the Nodal Officer but for which forms have not yet been submitted.",
          },
        ];

        setKpis(kpisData);

        // total submissions fallback
        const totalSubmissionsData =
          (submissionsData?.submissions &&
            submissionsData.submissions.length) ||
          (kpiData?.mySubmissions ?? 0);
        setTotalSubmissions(totalSubmissionsData);

        // Normalize submissions array
        let submissionsArray: any[] = [];
        if (Array.isArray(submissionsData)) submissionsArray = submissionsData;
        else if (Array.isArray(submissionsData?.submissions))
          submissionsArray = submissionsData.submissions;
        else if (Array.isArray((submissionsData as any)?.data?.submissions))
          submissionsArray = (submissionsData as any).data.submissions;

        const processedSubmissions = await Promise.all(
          submissionsArray.map(async (sub: any) => {
            const fd = sub.form_data || sub.formData || {};
            // Add submittedBy (user ID) to formData for progress calculation
            const fdWithSubmittedBy = {
              ...fd,
              submittedBy: sub.user?.id || sub.submittedBy || sub.user,
            };
            
            // Calculate progress based on sections with ACCEPTED status
            // Count all sections in formData and count how many have status "ACCEPTED"
            // Progress = (sections with ACCEPTED status / total sections) × 100%
            const progressData = await calculateProgressByAcceptedStatus(fdWithSubmittedBy);
            const progress = progressData.progress;

            let nextStep = "Complete submission";
            if (sub.status === "DRAFT")
              nextStep = "Complete all required sections";
            else if (sub.status === "SUBMITTED_TO_STATE")
              nextStep = "Waiting for state approval";
            else if (sub.status === "APPROVED")
              nextStep = "Submission approved";
            else if (sub.status === "REJECTED")
              nextStep = "Address reviewer feedback";

            const reviewerNote =
              sub.review_comments && sub.review_comments.length > 0
                ? sub.review_comments[sub.review_comments.length - 1]?.text
                : sub.reviewComments && sub.reviewComments.length > 0
                ? sub.reviewComments[sub.reviewComments.length - 1]?.text
                : undefined;

            return {
              id: sub.id,
              title:
                sub.submission_id || sub.submissionId || `Submission ${sub.id}`,
              status: mapBackendStatusToFrontend(sub.status),
              referenceId: sub.submission_id || sub.submissionId,
              updatedDate: sub.updatedAt
                ? new Date(sub.updatedAt).toLocaleDateString()
                : "",
              dueDate: sub.dueDate || "TBD",
              progress: Math.round(progress),
              nextStep,
              reviewerNote,
              submission: sub,
              submittedBy: sub.user
                ? `${sub.user.firstName || ""} ${
                    sub.user.lastName || ""
                  }`.trim()
                : "Unknown",
              stateUt: sub.stateUt || sub.state_ut,
              rejectionCount: sub.rejection_count ?? sub.rejectionCount ?? 0,
              finalScore: sub.finalScore,
              createdAt: sub.createdAt,
              currentOwnerRole: sub.current_owner_role ?? sub.currentOwnerRole,
            };
          })
        );
        setSubmissions(processedSubmissions);
      } catch (error: any) {
        console.error("Failed to load nodal dashboard data:", error);
        notificationService.error(
          error.message || "Failed to load dashboard data",
          "Dashboard Error"
        );
        setKpis([]);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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
  // Filter submissions based on active tab and search query
  const filteredSubmissions = submissions.filter((submission) => {
    const statusMatch = activeTab === "all" || submission.status === activeTab;
    const query = searchQuery?.toLowerCase() || "";
    const searchMatch =
      !query ||
      (submission.title && submission.title.toLowerCase().includes(query)) ||
      (submission.referenceId &&
        String(submission.referenceId).toLowerCase().includes(query)) ||
      (submission.stateUt &&
        String(submission.stateUt).toLowerCase().includes(query));

    return statusMatch && searchMatch;
  });

  // Deadlines will be loaded from API when available
  const deadlines: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#fff] p-6 rounded-lg relative">
        <div>
          <h1 className="text-xl font-semibold text-[#1E40AF]">Welcome</h1>
          <p className="text-[#212121]">
            Manage your NIRI data submissions and track approval status
          </p>
        </div>
        <img
          src="/images/dashboard.png"
          alt="Dashboard"
          className="absolute right-6 top-0"
        />
      </div>

      {/* KPI Cards */}
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kpis.slice(0, 2).map((kpi, index) => (
              <NodalKpiCard
                key={index}
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                icon={kpi.icon}
                variant={kpi.variant}
                description={kpi.description}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.slice(2, 5).map((kpi, index) => (
              <NodalKpiCard
                key={index + 2}
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                icon={kpi.icon}
                variant={kpi.variant}
                description={kpi.description}
              />
            ))}
          </div>
        </div>
      </TooltipProvider>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="bg-white shadow-xl rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Latest Submissions</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your latest NIRI data submissions and their status
                  </p>
                </div>
                {/* <Button onClick={() => navigate('/submissions')}>+ New Submission</Button> */}
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* <TabsList className="flex justify-start items-center gap-6 px-1">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                  <TabsTrigger value="SUBMITTED_TO_STATE">
                    Under Review
                  </TabsTrigger>
                  <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                  <TabsTrigger value="DRAFT">Draft</TabsTrigger>
                </TabsList> */}
                <TabsContent value={activeTab} className="mt-4">
                  <div className="space-y-6">
                    {filteredSubmissions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No submissions found for this status.
                      </div>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <UnifiedSubmissionCard
                          key={submission.id}
                          id={submission.id}
                          title={submission.title}
                          status={submission.status}
                          referenceId={submission.referenceId}
                          updatedDate={submission.updatedDate}
                          dueDate={submission.dueDate}
                          progress={submission.progress}
                          nextStep={submission.nextStep}
                          reviewerNote={submission.reviewerNote}
                          submission={submission.submission}
                          currentUserRole="NODAL_OFFICER"
                          submittedBy={submission.submittedBy}
                          stateUt={submission.stateUt}
                          onEdit={() =>
                            handleEditSubmissionForEdit(submission.id, navigate)
                          }
                          onViewDetails={() =>
                            navigate(`/data-submission/review/${submission.id}`)
                          }
                          onRevise={() =>
                            handleEditSubmission(submission.id, navigate)
                          }
                        />
                      ))
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    <Button variant="outline">View All</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* <div className="space-y-6 lg:w-[300px] "> */}
          {/* <UpcomingDeadlines deadlines={deadlines} /> */}

          {/* Quick Actions */}
          {/* <QuickActions
            actions={[
              {
                id: "1",
                title: "Data Submission",
                subtitle: "Start data entry",
                icon: "file" as const,
                onClick: () => navigate("/submissions"),
              },
              {
                id: "2",
                title: "Copy from Previous",
                subtitle: "Replicate last submission",
                icon: "copy" as const,
                onClick: () => console.log("Copy from previous"),
              },
              {
                id: "3",
                title: "View Reports",
                subtitle: "Performance analytics",
                icon: "chart" as const,
                onClick: () => console.log("View reports"),
              },
              {
                id: "4",
                title: "Help Center",
                subtitle: "Guides & documentation",
                icon: "help" as const,
                onClick: () => console.log("Help center"),
              },
            ]}
          /> */}

          {/* <QuickTips
            tips={[
              {
                id: "1",
                title: "Save drafts frequently",
                description: "Auto-save feature keeps your progress safe",
              },
              {
                id: "2",
                title: "Use the replication feature",
                description: "Copy data from previous submissions to save time",
              },
              {
                id: "3",
                title: "Upload supporting documents",
                description: "Add relevant files to strengthen your submission",
              },
            ]}
          /> */}
        {/* </div> */}
      </div>
    </div>
  );
}
