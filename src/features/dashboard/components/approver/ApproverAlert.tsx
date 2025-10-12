import React from "react";

interface ApproverAlertProps {
  message?: string;
  onViewAlerts?: () => void;
}

const defaultMessage =
  "Attention Required: 1 overdue submissions and 2 pending final approvals require immediate action!";

export default function ApproverAlert({
  message = defaultMessage,
  onViewAlerts,
}: ApproverAlertProps) {
  return (
    <div className="flex items-center justify-between bg-red-100 border border-red-300 rounded-lg px-6 py-4 mb-6">
      <div className="flex items-center gap-3">
        <svg
          className="w-6 h-6 text-red-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11z"
          />
        </svg>
        <span className="text-red-800 font-medium text-sm">{message}</span>
      </div>
      <button
        className="ml-6 px-4 py-2 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition"
        onClick={onViewAlerts}
      >
        View All Alerts
      </button>
    </div>
  );
}
