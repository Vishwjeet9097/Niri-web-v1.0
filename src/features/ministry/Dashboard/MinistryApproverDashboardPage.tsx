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
          Manage and submit ministry infrastructure data indicators
        </p>
        <img
          src="/images/dashboard.png"
          alt="Dashboard"
          className="absolute right-6 top-0 h-20 w-auto"
        />
      </div>
    </div>
  );
}
