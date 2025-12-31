import React from "react";

export function MinistryApproverDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#fff] p-6 rounded-lg relative">
        <h1 className="text-xl font-semibold text-[#1E40AF]">
          Ministry Approver Dashboard
        </h1>
        <p className="text-[#212121]">
          Review and manage ministry data submissions
        </p>
        <img
          src="/images/dashboard.png"
          alt="Dashboard"
          className="absolute right-6 top-0"
        />
      </div>

      {/* Page Content */}
      <div className="bg-[#F9FAFB] p-6 rounded-lg">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#111827] mb-4">
            Welcome to Ministry Approver Dashboard
          </h2>
          <p className="text-[#727272]">
            Dashboard content will be added here.
          </p>
        </div>
      </div>
    </div>
  );
}

