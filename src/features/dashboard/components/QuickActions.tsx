import { Card } from "@/components/ui/card";
import { FileText, Copy, BarChart3, HelpCircle } from "lucide-react";

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: "file" | "copy" | "chart" | "help";
  onClick?: () => void;
}

const iconMap = {
  file: FileText,
  copy: Copy,
  chart: BarChart3,
  help: HelpCircle,
};

interface QuickActionsProps {
  actions?: QuickAction[];
}

export function QuickActions({ actions = [] }: QuickActionsProps) {
  return (
    <Card className="p-6 bg-white">
      <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
      <p className="text-sm text-gray-500 mb-4">Common tasks and shortcuts</p>
      
      <div className="space-y-3">
        {actions.length > 0 ? (
          actions.map((action) => {
            const Icon = iconMap[action.icon];
            return (
              <div
                key={action.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={action.onClick}
              >
                <div className="p-2 bg-orange-50 rounded">
                  <Icon className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{action.title}</p>
                  <p className="text-xs text-gray-500">{action.subtitle}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No actions available</p>
          </div>
        )}
      </div>
    </Card>
  );
}
