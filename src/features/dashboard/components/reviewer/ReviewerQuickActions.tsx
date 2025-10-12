// niri-web/src/features/dashboard/components/reviewer/ReviewerQuickActions.tsx
import React from "react";

const quickActions = [
  {
    label: "Review This Month",
    value: "45/50",
    progress: 0.9,
    color: "bg-blue-500",
  },
  {
    label: "Average Review Time",
    value: "2.5 day/3 days",
    progress: 0.83,
    color: "bg-green-500",
  },
];

export default function ReviewerQuickActions() {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Common tasks and shortcuts
      </p>
      <div className="space-y-6">
        {quickActions.map((action, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{action.label}</span>
              <span className="text-xs font-semibold text-gray-700">
                {action.value}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`${action.color} h-2 rounded-full`}
                style={{ width: `${Math.round(action.progress * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
