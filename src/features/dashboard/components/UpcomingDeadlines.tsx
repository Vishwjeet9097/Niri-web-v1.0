import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface Deadline {
  id: string;
  title: string;
  daysLeft: number;
}

interface UpcomingDeadlinesProps {
  deadlines?: Deadline[];
}

export function UpcomingDeadlines({ deadlines = [] }: UpcomingDeadlinesProps) {
  return (
    <Card className="bg-[#1e3a8a] text-white p-6">
      <h3 className="text-lg font-semibold mb-2">Upcoming Deadlines</h3>
      <p className="text-sm text-blue-100 mb-4">Stay on track with your submission schedule</p>
      
      <div className="space-y-3">
        {deadlines?.map((deadline) => (
          <div
            key={deadline.id}
            className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{deadline.title}</p>
              <p className="text-xs text-blue-100">{deadline.daysLeft} days left</p>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-200" />
          </div>
        ))}
      </div>
    </Card>
  );
}
