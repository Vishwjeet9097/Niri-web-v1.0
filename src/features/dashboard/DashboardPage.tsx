import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "./components/KPICard";
import { RecentActivity } from "./components/RecentActivity";
import { SubmissionsTable } from "./components/SubmissionsTable";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { KPICard as KPICardType, Submission } from "@/types";

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

export function DashboardPage() {
  const [kpis, setKpis] = useState<KPICardType[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard summary and submissions from backend
        // TODO: Replace 'nodal_officer' with actual user role from auth context/store
        const userRole = "nodal_officer";
        const [dashboardSummary, submissionsData] = await Promise.all([
          apiService.getDashboardSummary(),
          apiService.getSubmissions(1, 10, userRole) // Always filtered by role
        ]);

        // Transform backend data to frontend format with fallback
        setKpis([
          {
            id: "total-submissions",
            title: "Total Submissions",
            value: dashboardSummary?.mySubmissions?.toString() || "0",
            subtitle: "This Month",
            trend: "+12%",
            trendDirection: "up" as const,
          },
          {
            id: "pending-review",
            title: "Pending Review",
            value: dashboardSummary?.pendingReview?.toString() || "0",
            subtitle: "Awaiting Review",
            trend: "+5%",
            trendDirection: "up" as const,
          },
          {
            id: "approved",
            title: "Approved",
            value: dashboardSummary?.approved?.toString() || "0",
            subtitle: "This Month",
            trend: "+8%",
            trendDirection: "up" as const,
          },
          {
            id: "rejected",
            title: "Rejected",
            value: dashboardSummary?.rejected?.toString() || "0",
            subtitle: "Need Revision",
            trend: "-2%",
            trendDirection: "down" as const,
          },
        ]);

        // Transform recent activities with fallback
        setActivities(dashboardSummary?.recentActivity || []);

        // Transform submissions data with fallback
        console.log("🔍 Dashboard - Submissions Data Structure:", submissionsData);
        
        // Handle different response structures
        let submissionsArray = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if (submissionsData?.data && Array.isArray(submissionsData.data)) {
          submissionsArray = submissionsData.data;
        }
        
        console.log("🔍 Dashboard - Processed Submissions Array:", submissionsArray);
        
        setSubmissions(submissionsArray.map((sub: any) => ({
          id: sub.id,
          title: sub.submissionId || `Submission ${sub.id}`,
          status: mapBackendStatusToFrontend(sub.status),
          submittedAt: sub.createdAt,
          lastModified: sub.updatedAt,
          score: sub.score || 0,
        })));

      } catch (error: any) {
        console.error("Failed to load dashboard data:", error);
        notificationService.error(
          error.message || "Failed to load dashboard data",
          "Dashboard Error"
        );
        
        // Fallback to empty state
        setKpis([]);
        setActivities([]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground">
          Manage your NIRI data submissions and track approval status
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis?.map((kpi) => (
          <KPICard key={kpi.id} data={kpi} />
        ))}
      </div>

      {/* Recent Activity & Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity activities={activities} />

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">
                    Infrastructure Financing Q4 2024
                  </p>
                  <p className="text-xs text-muted-foreground">21 days left</p>
                </div>
                <div className="text-warning font-semibold">21d</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">
                    Transport Infrastructure Data
                  </p>
                  <p className="text-xs text-muted-foreground">21 days left</p>
                </div>
                <div className="text-warning font-semibold">21d</div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">
                    Energy Sector Assessment
                  </p>
                  <p className="text-xs text-muted-foreground">21 days left</p>
                </div>
                <div className="text-warning font-semibold">21d</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Latest Submissions</h2>
        <SubmissionsTable submissions={submissions} />
      </div>
    </div>
  );
}
