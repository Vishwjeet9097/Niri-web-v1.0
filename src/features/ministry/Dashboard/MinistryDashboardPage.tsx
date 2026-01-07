import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
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
import { MinistryApproverKPICard } from "../../dashboard/components/approver/MinistryApproverKPICard";

// Set to false to use real API when available
 
export function MinistryDashboardPage() {
  const { user } = useAuth();
  
  // Ministry Dashboard Data - loaded from service
  const [ministryData, setMinistryData] = useState({
    totalIndicators: 0,
    totalIndicatorSubmitted: 0,
    totalAssignedMinistryApprover: 0,
    totalIndicatorNodalMinistry: 0,
    totalAccepted: 0,
    totalPendingSubmission: 0,
    totalReturnNodal: 0,
    submittedToMospi: 0,
    approvedByMospi: 0,
    returnedFromMospi: 0,
  });

  // Submissions data for MinistryLatestSubmission - loaded from service
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search query state for MinistryLatestSubmission functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Load dashboard data from service
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;
       
      try {
        setLoading(true);
        
        // Load dashboard data
        const dashboardData = await getMinistryDashboardData(user?.id);
        console.log("dashboardData", dashboardData);
        setMinistryData({
          totalIndicators: dashboardData.totalIndicators,
          totalIndicatorSubmitted: dashboardData.totalIndicatorSubmitted,
          totalAssignedMinistryApprover: dashboardData.totalAssignedMinistryApprover,
          totalIndicatorNodalMinistry: dashboardData.totalIndicatorNodalMinistry,
          totalAccepted: dashboardData.totalAccepted,
          totalPendingSubmission: dashboardData.totalPendingSubmission,
          totalReturnNodal: dashboardData.totalReturnNodal,
          submittedToMospi: dashboardData.submittedToMospi,
          approvedByMospi: dashboardData.approvedByMospi,
          returnedFromMospi: dashboardData.returnedFromMospi,
        });
      } catch (error) {
        console.error("Failed to load ministry dashboard data:", error);
        // Keep default dummy data on error
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  // Load submissions data separately
  useEffect(() => {
    const loadSubmissions = async () => {
      if (!user?.id) return;
      
      try {
        // Load submissions data
        const submissionsData = await getMinistrySubmissions(user?.id);
        setSubmissions(submissionsData || []);
      } catch (error) {
        console.error("Failed to load ministry submissions:", error);
        setSubmissions([]);
      }
    };

    loadSubmissions();
  }, [user?.id]);

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
      value: String(ministryData.totalIndicatorNodalMinistry),
      subtitle: "Critical Attention Needed",
      icon: User,
      variant: "blue" as const,
    },
    {
      title: "Pending Submission",
      value: String(ministryData.totalPendingSubmission),
      subtitle: "Awaiting your review",
      icon: ClipboardList,
      variant: "orange" as const,
    },
  ];

  const indicatorsReceivedCards = [
    {
      title: "Accepted By Ministry Approver",
      value: `${ministryData.totalAccepted}/${ministryData.totalAccepted}`,
      subtitle: "This fiscal year",
      icon: CheckCircle,
      variant: "green" as const,
    },
    {
      title: "Returned to Nodal Officer",
      value: `${ministryData.totalReturnNodal}/${ministryData.totalReturnNodal}`,
      subtitle: "Need Revision",
      icon: ArrowLeft,
      variant: "yellow" as const,
    },
  ];

  const mospiCards = [
    {
      title: "Submitted to MoSPI",
      value: String(ministryData.submittedToMospi),
      subtitle: "Submitted to MoSPI",
      icon: FileText,
      variant: "orange" as const,
    },
    {
      title: "Approved by MoSPI",
      value: String(ministryData.approvedByMospi),
      subtitle: "This fiscal year",
      icon: CheckCircle,
      variant: "green" as const,
    },
    {
      title: "Returned from MoSPI",
      value: String(ministryData.returnedFromMospi),
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
                Total Assigned to Ministry Approver:&nbsp;
                <span className="text-black">{ministryData.totalAssignedMinistryApprover}</span>
              </h2>
            </div>
            <div className="grid gap-4 grid-cols-1">
              {overviewCards.map((card, i) => (
                <MinistryApproverKPICard
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
                {ministryData.totalIndicatorSubmitted}/{ministryData.totalIndicators}
              </span>
            </h2>

            <div className="grid gap-4 grid-cols-1">
              {indicatorsReceivedCards.map((card, i) => (
                <MinistryApproverKPICard
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
              <MinistryApproverKPICard
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
