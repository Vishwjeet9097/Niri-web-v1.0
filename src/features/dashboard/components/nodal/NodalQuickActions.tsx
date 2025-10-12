import React from "react";

interface QuickAction {
  label: string;
  action: string;
}

interface NodalQuickActionsProps {
  actions: QuickAction[];
}

const NodalQuickActions: React.FC<NodalQuickActionsProps> = ({ actions }) => {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Common tasks and shortcuts
      </p>
      <div className="space-y-4">
        {actions.map((action, idx) => (
          <button
            key={idx}
            className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded text-sm font-medium text-blue-800 transition"
            type="button"
          >
            {action.label}
            <span className="text-xs text-blue-400">{action.action}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NodalQuickActions;
