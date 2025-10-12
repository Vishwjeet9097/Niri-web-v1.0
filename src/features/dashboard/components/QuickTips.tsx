import { Card } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

interface QuickTip {
  id: string;
  title: string;
  description: string;
}

interface QuickTipsProps {
  tips?: QuickTip[];
}

export function QuickTips({ tips = [] }: QuickTipsProps) {
  return (
    <Card className="p-6 bg-white">
      <h3 className="text-lg font-semibold mb-2">Quick Tips</h3>
      <p className="text-sm text-gray-500 mb-4">Helpful hints to improve your workflow</p>
      
      <div className="space-y-4">
        {tips.length > 0 ? (
          tips.map((tip) => (
            <div key={tip.id} className="flex gap-3">
              <div className="p-2 bg-orange-50 rounded h-fit">
                <Lightbulb className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">{tip.title}</p>
                <p className="text-xs text-gray-500">{tip.description}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No tips available</p>
          </div>
        )}
      </div>
    </Card>
  );
}
