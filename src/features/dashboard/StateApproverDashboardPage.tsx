/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StateApproverKPICard } from "./components/approver/StateApproverKPICard";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { RecentActionsCard } from "./components/approver/RecentActionsCard";
import { QuickActionsCard } from "./components/approver/QuickActionsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Filter,
  User,
  FileCheck2,
  ClipboardList,
} from "lucide-react";
import {
  hasMospiApproverComment,
  isReturnedFromMospi,
} from "@/utils/auditUtils";
import { getSubmissionStatus, getSubmissionDisplayStatus } from "@/utils/indicatorStatusUtils";
import { filterSubmissionsForStateApprover } from "@/utils/submissionGroupingUtils";
import { SubmissionStatusBadge } from "@/components/submission/SubmissionStatusBadge";
import { useAuth } from "@/features/auth/AuthProvider";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { computeAllStepsSummary } from "@/features/submission/utils/progress";

// Helper function to map backend status to frontend status (kept for compatibility)
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

export function StateApproverDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kpis, setKpis] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAssignedState, setTotalAssignedState] = useState<number>(0);
  const [totalIndicatorsReceivedState, setTotalIndicatorsReceivedState] =
    useState<number>(0);
  const { availableIndicators, isStateApprover, loading: indicatorsLoading } = useIndicatorAccess();
  
  // Group submissions for state approver
  const groupedSubmissions = user?.id
    ? filterSubmissionsForStateApprover(
        submissions,
        user.id,
        user?.stateUt || user?.stateName || user?.state
      )
    : null;

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard numbers and submissions concurrently
        const [dashboardData, submittedToStateData] = await Promise.all([
          apiService.getStateApproverDashboard(),
          apiService.getSubmissions(1, 100),
        ]);

        // Dashboard structure: prefer top-level keys, else fallback to .data
        const nodal = dashboardData?.nodal || dashboardData?.data?.nodal || {};
        const mospi = dashboardData?.mospi || dashboardData?.data?.mospi || {};

        // Normalize submissions response
        let submissionsArray: any[] = [];
        if (Array.isArray(submittedToStateData)) {
          submissionsArray = submittedToStateData;
        } else if (
          submittedToStateData?.submissions &&
          Array.isArray(submittedToStateData.submissions)
        ) {
          submissionsArray = submittedToStateData.submissions;
        } else if (
          submittedToStateData?.data &&
          Array.isArray(submittedToStateData.data)
        ) {
          submissionsArray = submittedToStateData.data;
        }

        // --------------------------
        // KPI variables (required)
        // --------------------------
        const totalAssigned = nodal.totalAssigned ?? 0;
        const totalIndicatorsReceived =
          nodal.totalIndicatorsReceived ?? totalAssigned;
        const pendingSubmission =
          nodal.pendingSubmission ??
          Math.max(totalIndicatorsReceived - (nodal.acceptedFromNodal ?? 0), 0);
        const acceptedFromNodal = nodal.acceptedFromNodal ?? 0;
        const returnedToNodal = nodal.returnedToNodal ?? 0;

        setTotalAssignedState(totalAssigned);
        setTotalIndicatorsReceivedState(totalIndicatorsReceived);
        const mospiSubmittedCount = mospi.submittedToMoSPI ?? 0;
        const mospiApprovedCount = mospi.approvedByMoSPI ?? 0;
        const mospiReturnedCount = mospi.returnedFromMoSPI ?? 0;

        // Optional: if you still want to derive some counts from submissions as fallback:
        // const mospiSubmittedFromSubmissions = submissionsArray.filter(s => mapBackendStatusToFrontend(s.status) === "SUBMITTED_TO_MOSPI").length;

        // Build a lightweight KPIs model for display components
        const assembledKpis = [
          {
            title: "Total Assigned",
            value: String(totalAssigned),
            subtitle: "Critical Attention Needed",
            icon: User,
            variant: "blue",
          },
          {
            title: "Pending Submission",
            value: String(pendingSubmission),
            subtitle: "Awaiting your review",
            icon: ClipboardList,
            variant: "orange",
          },

          // Indicators received group
          {
            title: "Accepted From Nodal Officer",
            value:
              totalAssigned && totalAssigned > 0
                ? `${acceptedFromNodal}/${totalAssigned}`
                : String(acceptedFromNodal ?? 0),
            subtitle: "This fiscal year",
            icon: CheckCircle,
            variant: "green",
          },
          {
            title: "Returned to Nodal Officer",
            value:
              totalAssigned && totalAssigned > 0
                ? `${returnedToNodal}/${totalAssigned}`
                : String(returnedToNodal ?? 0),
            subtitle: "Need Revision",
            icon: ArrowLeft,
            variant: "yellow",
          },

          // MoSPI group
          {
            title: "Submitted to MoSPI",
            value: String(mospiSubmittedCount),
            subtitle:
              "Average review time: " +
              (dashboardData?.averageReviewTime ??
                dashboardData?.data?.averageReviewTime ??
                "3") +
              " days",
            icon: FileText,
            variant: "orange",
          },
          {
            title: "Approved by MoSPI",
            value: String(mospiApprovedCount),
            subtitle: "This fiscal year",
            icon: CheckCircle,
            variant: "green",
          },
          {
            title: "Returned from MoSPI",
            value: String(mospiReturnedCount),
            subtitle: "Need Revision",
            icon: RotateCcw,
            variant: "red",
          },
        ];

        setKpis(assembledKpis);

        // Prepare submissions list for the unified cards
        setSubmissions(
          submissionsArray.map((sub: any) => {
            const fd = sub.formData || {};
            
            // Calculate proper progress using computeAllStepsSummary
            // Progress is now calculated based on indicators that exist in the submission
            // Total = all indicators present in formData
            // Progress = (filled indicators / total indicators in submission) × 100%
            // If an indicator is sent back (REVERTED), it won't count as filled but is still in total
            const summary = computeAllStepsSummary(fd, {});
            
            // Calculate overall progress from all steps
            const totalCompleted = 
              summary.infraFinancing.completed +
              summary.infraDevelopment.completed +
              summary.pppDevelopment.completed +
              summary.infraEnablers.completed;
            
            const totalSections = 
              summary.infraFinancing.total +
              summary.infraDevelopment.total +
              summary.pppDevelopment.total +
              summary.infraEnablers.total;
            
            // Progress based on indicators in submission (for NODAL_OFFICER submissions)
            // or available indicators (for consolidated submissions)
            // If an indicator is sent back (REVERTED), only that one doesn't count as filled
            const progress = totalSections > 0 
              ? Math.round((totalCompleted / totalSections) * 100)
              : 0;
            
            // Debug logging (can be removed in production)
            if (process.env.NODE_ENV === 'development') {
              console.log(`[Progress] State Approver - Submission ${sub.id}:`, {
                totalSections,
                totalCompleted,
                progress,
                breakdown: {
                  infraFinancing: `${summary.infraFinancing.completed}/${summary.infraFinancing.total}`,
                  infraDevelopment: `${summary.infraDevelopment.completed}/${summary.infraDevelopment.total}`,
                  pppDevelopment: `${summary.pppDevelopment.completed}/${summary.pppDevelopment.total}`,
                  infraEnablers: `${summary.infraEnablers.completed}/${summary.infraEnablers.total}`,
                }
              });
            }
            const submittedDate = new Date(sub.createdAt);
            const currentDate = new Date();
            const timeDifference =
              currentDate.getTime() - submittedDate.getTime();
            const pendingDays = Math.max(
              0,
              Math.floor(timeDifference / (1000 * 60 * 60 * 24))
            );

            const submittedByName = sub.user
              ? `${sub.user.firstName || ""} ${
                  sub.user.lastName || ""
                }`.trim() || "Unknown"
              : "Unknown";

            return {
              id: sub.id,
              title: sub.submissionId || `Submission ${sub.id}`,
              status: mapBackendStatusToFrontend(sub.status || ""),
              submittedBy: submittedByName,
              submissionDate: new Date(sub.createdAt).toLocaleDateString(),
              deadline:
                sub.dueDate ||
                new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toLocaleDateString(),
              category: "Infrastructure",
              progress: Math.round(progress),
              documents: sub.attachedFiles?.length || 0,
              pendingDays: pendingDays,
              completionPercent: Math.round(progress),
              submission: sub,
            };
          })
        );
      } catch (error: any) {
        console.error("Failed to load state approver dashboard data:", error);
        notificationService.error(
          error.message || "Failed to load dashboard data",
          "Dashboard Error"
        );

        setKpis([]);
        setSubmissions([]);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    };

    // Only load dashboard data if indicators are loaded (for STATE_APPROVER)
    // This ensures progress calculation has access to availableIndicators
    if (isStateApprover && indicatorsLoading) {
      // Wait for availableIndicators to load
      return;
    }
    
    loadDashboardData();
  }, [availableIndicators, isStateApprover, indicatorsLoading]);

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

  // Derive specific cards from kpis state (we assembled them in the effect)
  const overviewCards = kpis.slice(0, 2);
  const indicatorsReceivedCards = kpis.slice(2, 4);
  const mospiCards = kpis.slice(4, 7);

  // Filter submissions based on status filter and search query
  const filteredSubmissions = submissions.filter((submission) => {
    const statusMatch =
      statusFilter === "all" || submission.status === statusFilter;

    const searchMatch =
      !searchQuery ||
      submission.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submittedBy
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.submissionId
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#fff] p-6 rounded-lg relative">
        <h1 className="text-xl font-semibold text-[#1E40AF]">
          State Approver Dashboard
        </h1>
        <p className="text-[#212121]">
          Review and approve infrastructure data submissions from nodal officers
        </p>
        <img
          src="/images/dashboard.png"
          alt="Dashboard"
          className="absolute right-6 top-0"
        />
      </div>

      {/* Page Background */}
      <div className="space-y-6 bg-[#F9FAFB] p-6 rounded-lg">
        {/* --- Overview + Total Indicators Received Section (Side-by-Side) --- */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* --- Overview Section --- */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Overview</h2>
            <div className="grid gap-4 grid-cols-1">
              {overviewCards.map((c: any, i: number) => (
                <StateApproverKPICard
                  key={`overview-${i}`}
                  title={c.title}
                  value={c.value}
                  subtitle={c.subtitle}
                  icon={c.icon}
                  variant={c.variant}
                />
              ))}
            </div>
          </div>

          {/* --- Total Indicators Received Section --- */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111827]">
                Total Indicators Received:&nbsp;
                <span className="text-black">
                  {totalIndicatorsReceivedState}/{totalAssignedState || 0}
                </span>
              </h2>
            </div>

            <div className="grid gap-4 grid-cols-1">
              {indicatorsReceivedCards.map((c: any, i: number) => (
                <StateApproverKPICard
                  key={`ind-${i}`}
                  title={c.title}
                  value={c.value}
                  subtitle={c.subtitle}
                  icon={c.icon}
                  variant={c.variant}
                />
              ))}
            </div>
          </div>
        </div>

        {/* --- MoSPI Section (Full width below) --- */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#111827]">MoSPI</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {mospiCards.map((c: any, i: number) => (
              <StateApproverKPICard
                key={`mospi-${i}`}
                title={c.title}
                value={c.value}
                subtitle={c.subtitle}
                icon={c.icon}
                variant={c.variant}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-1">
        {/* Left Column - Submissions (spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4 bg-[#fff] border border-[#0000001A] rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg text-[#212121] font-semibold">
                  Latest Submission
                </h2>
                <p className="text-sm text-[#727272]">
                  Review submissions requiring your approval
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search submissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[250px]"
                  />
                </div>
                {/* <Filter className="h-4 w-4 text-muted-foreground" /> */}
                {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Submissions</SelectItem>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select> */}
              </div>
            </div>

            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions found for the selected filter.
                </div>
              ) : (
                filteredSubmissions?.map((submission) => (
                  <UnifiedSubmissionCard
                    key={submission.id}
                    id={submission.id}
                    title={submission.title}
                    status={submission.status}
                    referenceId={submission.title}
                    updatedDate={submission.submissionDate}
                    dueDate={submission.deadline}
                    progress={submission.progress}
                    nextStep={
                      submission.status === "APPROVED"
                        ? "Submission approved"
                        : submission.status === "REJECTED"
                        ? "Address reviewer feedback"
                        : "Waiting for state approval"
                    }
                    reviewerNote={submission.reviewerNote}
                    submission={submission}
                    currentUserRole="STATE_APPROVER"
                    submittedBy={submission.submittedBy}
                    onReview={() =>
                      navigate(`/data-submission/review/${submission.id}`)
                    }
                    onViewDetails={() =>
                      navigate(`/data-submission/review/${submission.id}`)
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6" >
          {/* <RecentActionsCard
            actions={[
              {
                id: "1",
                status: "Approved",
                date: "14-01-2025",
                title: "Digital Infrastructure Survey",
                submittedBy: "Mumbai Nodal Officer",
              },
              {
                id: "2",
                status: "Returned",
                date: "13-01-2025",
                title: "PPP Project Assessment",
                submittedBy: "Pune Nodal Officer",
              },
            ]}
          /> */}

          {/* <QuickActionsCard
            reviewedThisMonth={6}
            totalThisMonth={8}
            averageReviewTime={2}
            targetReviewTime={3}
          /> */}
        </div>
      </div>
    </div>
  );
}
