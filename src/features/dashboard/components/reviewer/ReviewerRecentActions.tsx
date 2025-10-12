import React from "react";

interface RecentAction {
  id: string;
  status: "Pending" | "Completed";
  date: string;
  title: string;
  by: string;
}

// Using actual API data - no mock data
const recentActions: RecentAction[] = [];

const statusColor = {
  Pending: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
};

export default function ReviewerRecentActions() {
  return (
    <div className="bg-[#162B5B] rounded-xl p-6 shadow-md min-h-[320px] flex flex-col">
      <h2 className="text-white text-lg font-semibold mb-4">Recent Actions</h2>
      <p className="text-blue-100 text-xs mb-4">Your latest review activities</p>
      <div className="flex-1 flex flex-col gap-3">
        {recentActions.length > 0 ? recentActions.map((action) => (
          <div
            key={action.id}
            className="bg-white/10 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-white/20 transition"
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${statusColor[action.status]}`}
              >
                {action.status}
              </span>
              <span className="text-xs text-blue-100">{action.date}</span>
            </div>
            <div className="flex-1 ml-4">
              <div className="text-white font-medium text-sm">{action.title}</div>
              <div className="text-blue-100 text-xs">
                By {action.by}
              </div>
            </div>
            <button
              className="ml-4 text-blue-200 hover:text-white text-xs font-semibold transition"
              aria-label="View details"
            >
              &gt;
            </button>
          </div>
        )) : (
          <div className="text-center text-blue-100 text-sm">
            No recent actions available
          </div>
        )}
      </div>
    </div>
  );
}
