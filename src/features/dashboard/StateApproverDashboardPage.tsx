import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StateApproverKPICard } from "./components/approver/StateApproverKPICard";
import { ApproverSubmissionCard } from "./components/approver/ApproverSubmissionCard";
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
} from "lucide-react";
import { hasMospiApproverComment, isReturnedFromMospi } from "@/utils/auditUtils";

// Helper function to map backend status to frontend status
const mapBackendStatusToFrontend = (backendStatus: string): string => {
  const statusMap: Record<string, string> = {
    "DRAFT": "DRAFT",
    "SUBMITTED_TO_STATE": "SUBMITTED_TO_STATE", 
    "APPROVED": "APPROVED",
    "REJECTED": "REJECTED",
    "SUBMITTED_TO_MOSPI": "SUBMITTED_TO_MOSPI",
    "MOSPI_APPROVED": "MOSPI_APPROVED",
    "MOSPI_REJECTED": "MOSPI_REJECTED",
    "RETURNED_FROM_MOSPI": "RETURNED_FROM_MOSPI",
    // Legacy mappings
    "draft": "DRAFT",
    "under_review": "SUBMITTED_TO_STATE",
    "approved": "APPROVED",
    "need_revision": "REJECTED",
  };
  
  return statusMap[backendStatus] || backendStatus;
};

export function StateApproverDashboardPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [kpis, setKpis] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch role-specific KPIs and submissions for State Approver
        const [kpiData, submittedToStateData] = await Promise.all([
          apiService.getRoleKPIs("STATE_APPROVER"),
          apiService.getSubmissionsByRole("state_approver", 1, 100)
        ]);
        
        // Use submissions data directly
        const submissionsData = submittedToStateData;

        // Transform KPIs data with fallback
        console.log("🔍 State Approver - Received KPI Data:", kpiData);
        console.log("🔍 State Approver - Received Submissions Data:", submissionsData);
        console.log("🔍 State Approver - First Submission ReviewComments:", submissionsData?.submissions?.[0]?.reviewComments);
        console.log("🔍 State Approver - All Submissions:", submissionsData?.submissions?.map(s => ({
          id: s.id,
          submissionId: s.submissionId,
          hasReviewComments: !!s.reviewComments,
          reviewCommentsLength: s.reviewComments?.length || 0,
          reviewComments: s.reviewComments
        })));

        // Calculate KPIs from submissions data if available
        let calculatedKPIs = {
          totalSubmissions: 0,
          pendingReview: 0,
          approved: 0,
          rejected: 0,
          overdue: 0,
          sentBack: 0,
          returnedFromMospi: 0,
          averageReviewTime: 0,
        };

        if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          const submissions = submissionsData.submissions;
          calculatedKPIs = {
            totalSubmissions: submissions.length,
            pendingReview: submissions.filter(s => s.status === "SUBMITTED_TO_STATE").length,
            approved: submissions.filter(s => s.status === "APPROVED").length,
            rejected: submissions.filter(s => s.status === "REJECTED").length,
            overdue: submissions.filter(s => {
              const submittedDate = new Date(s.createdAt);
              const currentDate = new Date();
              const timeDifference = currentDate.getTime() - submittedDate.getTime();
              const pendingDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
              return pendingDays > 7;
            }).length,
            sentBack: submissions.filter(s => s.status === "RETURNED_FROM_MOSPI").length,
            returnedFromMospi: submissions.filter(s => isReturnedFromMospi(s)).length,
            averageReviewTime: kpiData?.averageReviewTime || 0,
          };
        }

        setKpis([
          {
            title: "Total Submissions",
            value: calculatedKPIs.totalSubmissions.toString() || "8",
            subtitle: "This Month",
            icon: FileText,
            variant: "blue" as const,
          },
          {
            title: "Overdue",
            value: calculatedKPIs.overdue.toString() || "1",
            subtitle: "Critical Attention Needed",
            icon: AlertTriangle,
            variant: "red" as const,
          },
          {
            title: "Pending Submission",
            value: calculatedKPIs.pendingReview.toString() || kpiData?.pendingReview?.toString() || "6",
            subtitle: "Awaiting your review",
            icon: Clock,
            variant: "orange" as const,
          },
          {
            title: "Approved",
            value: calculatedKPIs.approved.toString() || kpiData?.approved?.toString() || "0",
            subtitle: "This fiscal year",
            icon: CheckCircle,
            variant: "green" as const,
          },
          {
            title: "Sent Back to Nodal Officer",
            value: calculatedKPIs.sentBack.toString() || "2",
            subtitle: "Need Revision",
            icon: ArrowLeft,
            variant: "yellow" as const,
          },
          {
            title: "Returned back from MoSPI",
            value: calculatedKPIs.returnedFromMospi.toString() || "4",
            subtitle: "Need Revision",
            icon: RotateCcw,
            variant: "purple" as const,
          },
          {
            title: "Average Review Time",
            value: calculatedKPIs.averageReviewTime.toString() || kpiData?.averageReviewTime?.toString() || "0",
            subtitle: "Days",
            icon: Search,
            variant: "blue" as const,
          },
          {
            title: "Success Rate",
            value: (calculatedKPIs.pendingReview + calculatedKPIs.approved + calculatedKPIs.rejected) > 0 
              ? Math.round((calculatedKPIs.approved / (calculatedKPIs.pendingReview + calculatedKPIs.approved + calculatedKPIs.rejected)) * 100).toString() + "%"
              : "0%",
            subtitle: "Approval Rate",
            icon: TrendingUp,
            variant: "green" as const,
          },
        ]);

        // Transform submissions data with fallback
        console.log("🔍 State Approver - Submissions Data Structure:", submissionsData);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if (submissionsData?.data && Array.isArray(submissionsData.data)) {
          submissionsArray = submissionsData.data;
        }

        // Using actual API data only
        
        setSubmissions(submissionsArray.map((sub: any) => {
          // Calculate progress based on formData completeness
          const formDataKeys = Object.keys(sub.formData || {});
          const progress = formDataKeys.length > 0 ? Math.min(100, (formDataKeys.length / 10) * 100) : 0;
          
          // Calculate pending days based on submitted date and current date
          const submittedDate = new Date(sub.createdAt);
          const currentDate = new Date();
          
          // Calculate difference in days
          const timeDifference = currentDate.getTime() - submittedDate.getTime();
          const pendingDays = Math.max(0, Math.floor(timeDifference / (1000 * 60 * 60 * 24)));
          
          // Determine if overdue (more than 7 days)
          const isOverdue = pendingDays > 7;
          
          return {
            id: sub.id,
            title: sub.submissionId || `Submission ${sub.id}`,
            status: sub.status || sub.submissionId || `SUB-${sub.id.slice(-6)}`, // Use actual status field
            submittedBy: sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : "Unknown",
            submissionDate: new Date(sub.createdAt).toLocaleDateString(),
            deadline: sub.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            category: "Infrastructure",
            progress: Math.round(progress),
            documents: sub.attachedFiles?.length || 0,
            pendingDays: pendingDays,
            completionPercent: Math.round(progress),
            // Add submission data for MOSPI_APPROVER comment check
            submission: sub,
          };
        }));

      } catch (error: any) {
        console.error("Failed to load state approver dashboard data:", error);
        notificationService.error(
          error.message || "Failed to load dashboard data",
          "Dashboard Error"
        );
        
        // Set empty state instead of dummy data
        setKpis([]);
        setSubmissions([]);
        setLoading(false);
        return;
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

  // Filter submissions based on status filter and search query
  const filteredSubmissions = submissions.filter((submission) => {
    // Status filter
    const statusMatch = statusFilter === "all" || submission.status === statusFilter;
    
    // Search filter
    const searchMatch = !searchQuery || 
      submission.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submittedBy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submissionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
        <div>
        <h1 className="text-3xl font-bold text-foreground">State Approver Dashboard</h1>
        <p className="text-muted-foreground">
          Review and approve infrastructure data submissions from nodal officers
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {kpis?.map((kpi, index) => (
          <StateApproverKPICard 
            key={index} 
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            variant={kpi.variant}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Submissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <QuickActionsCard 
            reviewedThisMonth={6}
            totalThisMonth={8}
            averageReviewTime={2}
            targetReviewTime={3}
          />

          {/* Submissions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Submissions for Review</h2>
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
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No submissions found for the selected filter.
                </div>
              ) : (
                filteredSubmissions?.map((submission) => (
                  <ApproverSubmissionCard 
                    key={submission.id} 
                    title={submission.title}
                    status={submission.status}
                    submittedBy={submission.submittedBy}
                    submissionDate={submission.submissionDate}
                    deadline={submission.deadline}
                    category={submission.category}
                    progress={submission.progress}
                    documents={submission.documents}
                    pendingDays={submission.pendingDays}
                    completionPercent={submission.completionPercent}
                    submission={submission}
                    currentUserRole="STATE_APPROVER"
                    onReview={() => navigate(`/data-submission/review/${submission.id}`)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Recent Actions */}
          <RecentActionsCard actions={[
            {
              id: "1",
              status: "Approved",
              date: "14-01-2025",
              title: "Digital Infrastructure Survey",
              submittedBy: "Mumbai Nodal Officer"
            },
            {
              id: "2", 
              status: "Returned",
              date: "13-01-2025",
              title: "PPP Project Assessment",
              submittedBy: "Pune Nodal Officer"
            }
          ]} />
        </div>
      </div>
    </div>
  );
}