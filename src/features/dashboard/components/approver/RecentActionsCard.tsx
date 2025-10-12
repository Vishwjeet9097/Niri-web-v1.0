import { ChevronRight } from "lucide-react";

interface RecentAction {
  id: string;
  status: "Approved" | "Returned";
  date: string;
  title: string;
  submittedBy: string;
}

interface RecentActionsCardProps {
  actions?: RecentAction[];
}

export function RecentActionsCard({ actions = [] }: RecentActionsCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg shadow-lg p-6 text-white">
      <h2 className="text-lg font-semibold mb-1">Recent Actions</h2>
      <p className="text-sm text-blue-200 mb-4">Your latest review activities</p>

      <div className="space-y-3">
        {actions.length > 0 ? (
          actions.map((action) => (
            <div
              key={action.id}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-4 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        action.status === "Approved"
                          ? "bg-green-500 text-white"
                          : "bg-yellow-500 text-white"
                      }`}
                    >
                      {action.status}
                    </span>
                    <span className="text-xs text-blue-200">{action.date}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">{action.title}</h3>
                  <p className="text-xs text-blue-200">by {action.submittedBy}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-200 flex-shrink-0 ml-2" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-blue-200 text-sm">No recent actions</p>
            <p className="text-blue-300 text-xs mt-1">Your review activities will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
