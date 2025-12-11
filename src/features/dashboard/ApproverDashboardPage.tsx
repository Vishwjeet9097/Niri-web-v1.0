import React from "react";
import ApproverKPICards from "./components/approver/ApproverKPICards";
import ApproverSubmissionsTable from "./components/approver/ApproverSubmissionsTable";
import ApproverStageSubmissions from "./components/approver/ApproverStageSubmissions";
import ApproverRankings from "./components/approver/ApproverRankings";

export default function ApproverDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-8">
        {/* Welcome and Alert */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1 text-foreground">Welcome back</h1>
          <p className="text-muted-foreground">
            Provide final approval and scoring for NIRI submissions
          </p>
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between bg-red-100 border border-red-300 rounded-lg px-4 py-3 mb-2">
            <div className="flex items-center gap-3">
              <span className="text-red-600 text-xl font-bold">!</span>
              <span className="text-red-700 font-medium">
                Attention Required: <span className="font-semibold">1 overdue submission</span> and <span className="font-semibold">2 pending final approvals</span> require immediate action!
              </span>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition">
              View All Alerts
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8">
          <ApproverKPICards />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest Submissions Table */}
          <div className="lg:col-span-2">
            <ApproverSubmissionsTable />
          </div>
          {/* Stage Submissions & Rankings */}
          <div className="flex flex-col gap-6">
            <ApproverStageSubmissions />
            <ApproverRankings />
          </div>
        </div>
      </main>
    </div>
  );
}
