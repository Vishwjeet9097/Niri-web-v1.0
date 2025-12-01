// niri - web / src / features / dashboard / ReviewerDashboardPage.tsx;
import React from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import { MospiApproverOverviewCards } from "./components/approver/MospiApproverOverviewCards";
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
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-gray-900">
                Welcome back
              </h1>
              <p className="text-gray-600 text-base">
                Review and provide feedback on NIRI submissions
              </p>
            </div>
            {/* Laptop illustration */}
            <div className="absolute right-6 top-0 hidden md:block">
              <img
                src="/images/dashboard.png"
                alt="Dashboard"
                className="h-32 w-auto"
              />
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="mb-8">
          <MospiApproverOverviewCards />
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
