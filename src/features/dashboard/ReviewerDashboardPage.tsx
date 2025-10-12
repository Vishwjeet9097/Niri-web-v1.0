// niri - web / src / features / dashboard / ReviewerDashboardPage.tsx;
import React from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import ReviewerKPICards from "./components/reviewer/ReviewerKPICards";
import ReviewerSubmissionsTable from "./components/reviewer/ReviewerSubmissionsTable";
import ReviewerRecentActions from "./components/reviewer/ReviewerRecentActions";
import ReviewerQuickActions from "./components/reviewer/ReviewerQuickActions";

const ReviewerDashboardPage: React.FC = () => {
  const { hasRole } = useAuth();

  // Only allow MosPI reviewer role
  if (!hasRole("MOSPI_REVIEWER")) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-3xl font-bold mb-1 text-foreground">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Review and provide feedback on NIRI submissions
          </p>
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          <ReviewerKPICards />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Submissions Table */}
          <div className="lg:col-span-2">
            <ReviewerSubmissionsTable />
          </div>
          {/* Recent Actions & Quick Actions */}
          <div className="flex flex-col gap-6">
            <ReviewerRecentActions />
            <ReviewerQuickActions />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReviewerDashboardPage;
