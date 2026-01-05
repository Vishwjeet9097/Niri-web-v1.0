import { useState, useEffect } from "react";
import { StateApproverKPICard } from "./components/approver/StateApproverKPICard";
import { MinistryLatestSubmission } from "./MinistryLatestSubmission";
import { getMinistryDashboardData, getMinistrySubmissions } from "@/services/ministry.service";
import {
  FileText,
  CheckCircle,
  ArrowLeft,
  RotateCcw,
  User,
  ClipboardList,
} from "lucide-react";

// Set to false to use real API when available
const USE_DUMMY_DATA = true;

export function MinistryDashboardPage() {
  // Ministry Dashboard Data - loaded from service
  const [ministryData, setMinistryData] = useState({
    totalIndicators: 0,
    totalUnassigned: 0,
    totalAssigned: 0,
    totalIndicatorsSubmitted: 0,
    pendingSubmission: 0,
    acceptedByStateApprover: 0,
    returnedToNodal: 0,
    submittedToMoSPI: 0,
    approvedByMoSPI: 0,
    returnedFromMoSPI: 0,
    averageReviewTime: 0,
  });

  // Submissions data for MinistryLatestSubmission - loaded from service
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search query state for MinistryLatestSubmission functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Load dashboard data from service
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load dashboard data and submissions in parallel
        const [dashboardData, submissionsData] = await Promise.all([
          getMinistryDashboardData(USE_DUMMY_DATA),
          getMinistrySubmissions(USE_DUMMY_DATA),
        ]);
        
        setMinistryData({
          totalIndicators: dashboardData.totalIndicators,
          totalUnassigned: dashboardData.totalUnassigned,
          totalAssigned: dashboardData.totalAssigned,
          totalIndicatorsSubmitted: dashboardData.totalIndicatorsSubmitted,
          pendingSubmission: dashboardData.pendingSubmission,
          acceptedByStateApprover: dashboardData.acceptedByStateApprover,
          returnedToNodal: dashboardData.returnedToNodal,
          submittedToMoSPI: dashboardData.submittedToMoSPI,
          approvedByMoSPI: dashboardData.approvedByMoSPI,
          returnedFromMoSPI: dashboardData.returnedFromMoSPI,
          averageReviewTime: dashboardData.averageReviewTime,
        });
        
        setSubmissions(submissionsData || []);
      } catch (error) {
        console.error("Failed to load ministry dashboard data:", error);
        // Keep default dummy data on error
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Filter submissions based on search query
  const filteredSubmissions = submissions.filter((submission) => {
    const searchMatch =
      !searchQuery ||
      submission.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submittedBy
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase());

    return searchMatch;
  });

  // Show loading state
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

  // KPI Cards Data
  const overviewCards = [
    {
      title: "Total Indicators Assigned to Nodal Officers",
      value: String(ministryData.totalAssigned),
      subtitle: "Critical Attention Needed",
      icon: User,
      variant: "blue" as const,
    },
    {
      title: "Pending Submission",
      value: String(ministryData.pendingSubmission),
      subtitle: "Awaiting your review",
      icon: ClipboardList,
      variant: "orange" as const,
    },
  ];

  const indicatorsReceivedCards = [
    {
      title: "Accepted By Ministry Approver",
      value: `${ministryData.acceptedByStateApprover}/${ministryData.totalAssigned}`,
      subtitle: "This fiscal year",
      icon: CheckCircle,
      variant: "green" as const,
    },
    {
      title: "Returned to Nodal Officer",
      value: `${ministryData.returnedToNodal}/${ministryData.totalAssigned}`,
      subtitle: "Need Revision",
      icon: ArrowLeft,
      variant: "yellow" as const,
    },
  ];

  const mospiCards = [
    {
      title: "Submitted to MoSPI",
      value: String(ministryData.submittedToMoSPI),
      subtitle: `Average review time: ${ministryData.averageReviewTime} days`,
      icon: FileText,
      variant: "orange" as const,
    },
    {
      title: "Approved by MoSPI",
      value: String(ministryData.approvedByMoSPI),
      subtitle: "This fiscal year",
      icon: CheckCircle,
      variant: "green" as const,
    },
    {
      title: "Returned from MoSPI",
      value: String(ministryData.returnedFromMoSPI),
      subtitle: "Need Revision",
      icon: RotateCcw,
      variant: "red" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#fff] p-6 rounded-lg relative">
        <h1 className="text-xl font-semibold text-[#1E40AF]">
          Ministry Approver Dashboard
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
      <div className="space-y-6 bg-[#F9FAFB] p-0 rounded-lg">
        {/* --- Overview Section Header --- */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#111827]">Overview</h2>
        </div>

        {/* --- Total Indicators + Total Indicators Received Section (Side-by-Side) --- */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* --- Total Indicators Section --- */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[#111827]">
                Total Indicators:&nbsp;
                <span className="text-black">{ministryData.totalIndicators}</span>
              </h2>
              <h2 className="text-lg font-semibold text-[#111827]">
                Total Unassigned / Assigned to State Approver:&nbsp;
                <span className="text-black">{ministryData.totalUnassigned}</span>
              </h2>
            </div>
            <div className="grid gap-4 grid-cols-1">
              {overviewCards.map((card, i) => (
                <StateApproverKPICard
                  key={`overview-${i}`}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  variant={card.variant}
                />
              ))}
            </div>
          </div>

          {/* --- Total Indicators Received Section --- */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">
              Total Indicators Submitted:&nbsp;
              <span className="text-black">
                {ministryData.totalIndicatorsSubmitted}/{ministryData.totalIndicators}
              </span>
            </h2>

            <div className="grid gap-4 grid-cols-1">
              {indicatorsReceivedCards.map((card, i) => (
                <StateApproverKPICard
                  key={`ind-${i}`}
                  title={card.title}
                  value={card.value}
                  subtitle={card.subtitle}
                  icon={card.icon}
                  variant={card.variant}
                />
              ))}
            </div>
          </div>
        </div>

        {/* --- MoSPI Section (Full width below) --- */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#111827]">MoSPI</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {mospiCards.map((card, i) => (
              <StateApproverKPICard
                key={`mospi-${i}`}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                variant={card.variant}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid - MinistryLatestSubmission */}
      <MinistryLatestSubmission
        filteredSubmissions={filteredSubmissions}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
    </div>
  );
}
