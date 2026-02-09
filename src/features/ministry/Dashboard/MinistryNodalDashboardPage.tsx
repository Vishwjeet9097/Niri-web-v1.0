/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NodalKpiCard } from "../../dashboard/components/nodal/NodalKpiCards";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MinistryNodalLatestSubmission } from "./MinistryNodalLatestSubmission";
// import { apiService } from "@/services/api.service"; // Commented out - using new API
import { notificationService } from "@/services/notification.service";
import {
  getNodalKpiData,
  getNodalDashboardSubmissions,
} from "@/services/ministry.service"; // New API
import { calculateProgressByAcceptedStatus } from "@/features/submission/utils/progress";
import { useAuth } from "@/features/auth/AuthProvider";
import { FileText, Clock, CheckCircle, Search, TrendingUp } from "lucide-react";

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

const getDummySubmissions = () => [
  {
    id: "1",
    title: "Infrastructure Survey Q4 2024",
    status: "DRAFT",
    referenceId: "INF-Q4-2024",
    updatedDate: new Date().toLocaleDateString(),
    dueDate: "2024-12-31",
    progress: 45,
    nextStep: "Complete all required sections",
    reviewerNote: undefined,
    submission: {},
    submittedBy: "John Doe",
    stateUt: "Maharashtra",
  },
];

export function MinistryNodalDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kpis, setKpis] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Separate handler function to load submissions from API
  const loadSubmissions = async (userId: string) => {
    try {
      console.log(
        "🔍 Loading ministry submissions using new API for nodal dashboard, userId:",
        userId,
      );

      // Use dedicated service function for nodal dashboard submissions
      const response = await getNodalDashboardSubmissions(userId);

      console.log("📋 Component - Full Response:", response);
      console.log("📋 Component - Response status:", response?.status);
      console.log("📋 Component - Response data:", response?.data);
      console.log(
        "📋 Component - Submissions array:",
        response?.data?.submissions,
      );
      console.log(
        "📋 Component - Submissions array length:",
        response?.data?.submissions?.length,
      );
      console.log(
        "📋 Component - Is array check:",
        Array.isArray(response?.data?.submissions),
      );

      // Handle new API response structure: { status, data: { submissions: [...] }, message }
      if (
        response?.status &&
        response?.data?.submissions &&
        Array.isArray(response.data.submissions)
      ) {
        const submissionsArray = response.data.submissions;
        console.log(
          "📋 Component - Processing submissions array, length:",
          submissionsArray.length,
        );

        if (submissionsArray.length > 0) {
          const processedSubmissions = await Promise.all(
            submissionsArray.map(async (sub: any) => {
              const fd = sub.form_data || sub.formData || {};
              const fdWithSubmittedBy = {
                ...fd,
                submittedBy: sub.user?.id || sub.submittedBy || sub.user,
              };

              const progressData =
                await calculateProgressByAcceptedStatus(fdWithSubmittedBy);
              const progress = progressData.progress;

              let nextStep = "Complete submission";
              if (sub.status === "DRAFT")
                nextStep = "Complete all required sections";
              else if (sub.status === "SUBMITTED_TO_STATE") {
                if (progress === 100) {
                  nextStep =
                    "Approved by State Approver waiting for Mospi review";
                } else {
                  nextStep = "Waiting for state approval";
                }
              } else if (sub.status === "APPROVED")
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
                  sub.submission_id ||
                  sub.submissionId ||
                  `Submission ${sub.id}`,
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
                  ? `${sub.user.firstName || ""} ${sub.user.lastName || ""}`.trim()
                  : "Unknown",
                stateUt: sub.stateUt || sub.state_ut,
                rejectionCount: sub.rejection_count ?? sub.rejectionCount ?? 0,
                finalScore: sub.finalScore,
                createdAt: sub.createdAt,
                currentOwnerRole:
                  sub.current_owner_role ?? sub.currentOwnerRole,
              };
            }),
          );
          return processedSubmissions;
        } else {
          console.warn("No submissions found in API response - array is empty");
          return [];
        }
      } else {
        console.warn("Unexpected response structure from new API:", response);
        console.warn("Response status check:", response?.status);
        console.warn("Response data check:", response?.data);
        console.warn(
          "Response data.submissions check:",
          response?.data?.submissions,
        );
        console.warn(
          "Is array check:",
          Array.isArray(response?.data?.submissions),
        );
        return [];
      }
    } catch (error) {
      console.error("Failed to load submissions from API:", error);
      return [];
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        let submissionsData: any[] = [];

        // Get KPI data from ministry service (handles dummy/real API automatically)
        const metrics = await getNodalKpiData(user?.id);

        // Process submissions using new API handler
        if (!user?.id) {
          console.warn("No user ID available for loading submissions");
          submissionsData = [];
        } else {
          // Use separate handler function to load submissions
          submissionsData = await loadSubmissions(user.id);

          // If no submissions from API, use empty array (not dummy data)
          if (submissionsData.length === 0) {
            console.log("No submissions found from API");
          }
        }

        // Build KPI cards data
        const kpisData = [
          {
            title: "Total Allocated Indicators",
            value: String(metrics.totalAllocated),
            subtitle: "Critical Attention Needed",
            icon: FileText,
            variant: "red" as const,
            description:
              "Total number of indicators assigned to the Nodal Officer.",
          },
          {
            title: "Total Submitted",
            value: String(metrics.totalSubmitted),
            subtitle: "Submitted Indicators",
            icon: TrendingUp,
            variant: "blue" as const,
            description:
              "Number of assigned indicators for which the Nodal Officer has submitted forms.",
          },
          {
            title: "Under Review",
            value: `${metrics.underReview}/${metrics.totalAllocated || 0}`,
            subtitle: "Average review time: 3 days",
            icon: Search,
            variant: "blue" as const,
            description:
              "Submissions that have been sent by the Nodal Officer and are currently under review.",
          },
          {
            title: "Approved",
            value: `${metrics.approved}/${metrics.totalAllocated || 0}`,
            subtitle: "This financial year",
            icon: CheckCircle,
            variant: "green" as const,
            description:
              "Submissions that have been reviewed and approved at all required levels.",
          },
          {
            title: "Pending Submissions",
            value: `${metrics.pending}/${metrics.totalAllocated || 0}`,
            subtitle: `${metrics.pending} pending`,
            icon: Clock,
            variant: "orange" as const,
            description:
              "Indicators assigned to the Nodal Officer but for which forms have not yet been submitted.",
          },
        ];

        setKpis(kpisData);
        // Use API data only, no dummy data fallback
        setSubmissions(submissionsData);
      } catch (error: any) {
        console.error("Failed to load ministry nodal dashboard data:", error);
        notificationService.error(
          error.message || "Failed to load dashboard data",
          "Dashboard Error",
        );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#fff] p-6 rounded-lg relative">
        <div>
          <h1 className="text-xl font-semibold text-[#1E40AF]">Welcome</h1>
          <p className="text-[#212121]">
            Manage your NIE-I data submissions and track approval status
          </p>
        </div>
        <img
          src="/images/dashboard.png"
          alt="Dashboard"
          className="absolute right-6 top-0"
        />
      </div>

      {/* KPI Cards - Matching the design: 2 cards top row, 3 cards bottom row */}
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          {/* Top Row - 2 Cards */}
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
          {/* Bottom Row - 3 Cards */}
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
      <MinistryNodalLatestSubmission
        filteredSubmissions={filteredSubmissions}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
