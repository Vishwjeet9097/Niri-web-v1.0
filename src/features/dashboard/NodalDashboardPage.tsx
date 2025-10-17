import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NodalKpiCard } from "./components/NodalKpiCard";
import { UnifiedSubmissionCard } from "@/components/ui/UnifiedSubmissionCard";
import { UpcomingDeadlines } from "./components/UpcomingDeadlines";
import { QuickActions } from "./components/QuickActions";
import { QuickTips } from "./components/QuickTips";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  TrendingUp,
} from "lucide-react";

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

// Helper function to handle edit submission
const handleEditSubmission = async (submissionId: string, navigate: any) => {
  try {
    console.log("🔍 Loading submission for edit:", submissionId);
    
    // Load submission data from backend
    const submissionData = await apiService.getSubmission(submissionId);
    
    console.log("🔍 Loaded submission data:", submissionData);
    
    // Store submission data in localStorage for form prefill
    localStorage.setItem('editing_submission', JSON.stringify(submissionData));
    
    // Navigate to submission form
    navigate('/submissions');
    
    notificationService.success(
      "Submission loaded for editing",
      "Edit Mode",
      {
        details: {
          submissionId,
          status: submissionData.status,
        },
      }
    );
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
const handleEditSubmissionForEdit = async (submissionId: string, navigate: any) => {
  try {
    console.log("🔍 Loading submission for edit page:", submissionId);
    
    // Navigate to edit page
    navigate(`/data-submission/edit/${submissionId}`);
    
    notificationService.success(
      "Opening edit page",
      "Edit Mode",
      {
        details: {
          submissionId,
        },
      }
    );
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch role-specific KPIs and submissions
        const userRole = "nodal_officer";
        const [kpiData, submissionsData] = await Promise.all([
          apiService.getRoleKPIs("NODAL_OFFICER"),
          apiService.getSubmissions(1, 20)
        ]);

          // Transform KPIs data with fallback
          console.log("🔍 Nodal Dashboard - Received KPI Data:", kpiData);
          console.log("🔍 Nodal Dashboard - Received Submissions Data:", submissionsData);
          
          // Calculate KPIs from submissions data if available
          let calculatedKPIs = {
            totalSubmissions: 0,
            pendingSubmissions: 0,
            underReview: 0,
            approved: 0,
          };
          
          if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
            const submissions = submissionsData.submissions;
            calculatedKPIs = {
              totalSubmissions: submissions.length,
              pendingSubmissions: submissions.filter(s => s.status === "DRAFT").length,
              underReview: submissions.filter(s => s.status === "SUBMITTED_TO_STATE").length,
              approved: submissions.filter(s => s.status === "APPROVED").length,
            };
          }
          
          const kpisData = [
            {
              title: "Total Submissions",
              value: calculatedKPIs.totalSubmissions.toString() || kpiData?.mySubmissions?.toString() || "7",
              subtitle: "This Month",
              icon: FileText,
              variant: "blue" as const,
            },
            {
              title: "Pending Submission",
              value: calculatedKPIs.pendingSubmissions.toString() || "1",
              subtitle: `${calculatedKPIs.pendingSubmissions} drafts`,
              icon: Clock,
              variant: "orange" as const,
            },
            {
              title: "Under Review",
              value: calculatedKPIs.underReview.toString() || kpiData?.pendingReview?.toString() || "6",
              subtitle: "Average review time: 3 days",
              icon: Search,
              variant: "blue" as const,
            },
            {
              title: "Approved",
              value: calculatedKPIs.approved.toString() || kpiData?.approved?.toString() || "0",
              subtitle: "This fiscal year",
              icon: CheckCircle,
              variant: "green" as const,
            },
          ];

        setKpis(kpisData);

        // Transform submissions data with fallback
        console.log("🔍 Nodal Dashboard - Submissions Data Structure:", submissionsData);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          // Direct array response
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          // Wrapped response with submissions property
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data?.submissions && Array.isArray((submissionsData as any).data.submissions)) {
          // Wrapped response with data.submissions property
          submissionsArray = (submissionsData as any).data.submissions;
        }
        
        console.log("🔍 Nodal Dashboard - Processed Submissions Array:", submissionsArray);
        
        setSubmissions(submissionsArray.map((sub: any) => {
          // Calculate progress based on formData completeness
          const formDataKeys = Object.keys(sub.formData || {});
          const progress = formDataKeys.length > 0 ? Math.min(100, (formDataKeys.length / 10) * 100) : 0;
          
          // Determine next step based on status
          let nextStep = "Complete submission";
          if (sub.status === "DRAFT") {
            nextStep = "Complete all required sections";
          } else if (sub.status === "SUBMITTED_TO_STATE") {
            nextStep = "Waiting for state approval";
          } else if (sub.status === "APPROVED") {
            nextStep = "Submission approved";
          } else if (sub.status === "REJECTED") {
            nextStep = "Address reviewer feedback";
          }
          
          // Get reviewer note from reviewComments
          const reviewerNote = sub.reviewComments && sub.reviewComments.length > 0 
            ? sub.reviewComments[sub.reviewComments.length - 1]?.text 
            : undefined;
          
          return {
            id: sub.id,
            title: sub.submissionId || `Submission ${sub.id}`,
            status: mapBackendStatusToFrontend(sub.status),
            referenceId: sub.submissionId,
            updatedDate: new Date(sub.updatedAt).toLocaleDateString(),
            dueDate: sub.dueDate || "TBD",
            progress: Math.round(progress),
            nextStep: nextStep,
            reviewerNote: reviewerNote,
            submission: sub, // Pass full submission object for isReturnedFromMospi check
            submittedBy: sub.user ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() || "Unknown" : "Unknown",
            stateUt: sub.stateUt,
            rejectionCount: sub.rejectionCount || 0,
            finalScore: sub.finalScore,
            createdAt: sub.createdAt,
            currentOwnerRole: sub.currentOwnerRole,
          };
        }));

      } catch (error: any) {
        console.error("Failed to load nodal dashboard data:", error);
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

  // Filter submissions based on active tab and search query
  const filteredSubmissions = submissions.filter((submission) => {
    // Status filter
    const statusMatch = activeTab === "all" || submission.status === activeTab;
    
    // Search filter
    const searchMatch = !searchQuery || 
      submission.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.submissionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      submission.stateUt?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  // Deadlines will be loaded from API when available
  const deadlines: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
        <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground">
          Manage your NIRI data submissions and track approval status
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis?.map((kpi, index) => (
          <NodalKpiCard 
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
          <QuickActions actions={[
    {
      id: "1",
      title: "New Data Submission",
      subtitle: "Start fresh data entry",
      icon: "file" as const,
              onClick: () => navigate('/submissions')
    },
    {
      id: "2",
      title: "Copy from Previous",
      subtitle: "Replicate last submission",
      icon: "copy" as const,
              onClick: () => console.log("Copy from previous")
    },
    {
      id: "3",
      title: "View Reports",
      subtitle: "Performance analytics",
      icon: "chart" as const,
              onClick: () => console.log("View reports")
    },
    {
      id: "4",
      title: "Help Center",
      subtitle: "Guides & documentation",
      icon: "help" as const,
              onClick: () => console.log("Help center")
            }
          ]} />

          {/* Submissions Tabs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Latest Submissions</h2>
                <p className="text-sm text-muted-foreground">Your latest NIRI data submissions and their status</p>
              </div>
              <Button onClick={() => navigate('/submissions')}>+ New Submission</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                <TabsTrigger value="SUBMITTED_TO_STATE">Under Review</TabsTrigger>
                <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                <TabsTrigger value="DRAFT">Draft</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="space-y-4">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No submissions found for this status.
                    </div>
                  ) : (
                    filteredSubmissions?.map((submission) => (
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
                        onEdit={() => handleEditSubmissionForEdit(submission.id, navigate)}
                        onViewDetails={() => navigate(`/data-submission/review/${submission.id}`)}
                        onRevise={() => handleEditSubmission(submission.id, navigate)}
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

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <UpcomingDeadlines deadlines={deadlines} />

          {/* Quick Tips */}
          <QuickTips tips={[
            {
              id: "1",
              title: "Save drafts frequently",
              description: "Auto-save feature keeps your progress safe"
            },
            {
              id: "2", 
              title: "Use the replication feature",
              description: "Copy data from previous submissions to save time"
            },
            {
              id: "3",
              title: "Upload supporting documents",
              description: "Add relevant files to strengthen your submission"
            }
          ]} />
        </div>
      </div>
    </div>
  );
}