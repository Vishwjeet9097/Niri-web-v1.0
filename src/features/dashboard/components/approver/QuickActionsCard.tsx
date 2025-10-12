import { Progress } from "@/components/ui/progress";

interface QuickActionsCardProps {
  reviewedThisMonth: number;
  totalThisMonth: number;
  averageReviewTime: number;
  targetReviewTime: number;
}

export function QuickActionsCard({
  reviewedThisMonth,
  totalThisMonth,
  averageReviewTime,
  targetReviewTime,
}: QuickActionsCardProps) {
  const reviewProgress = (reviewedThisMonth / totalThisMonth) * 100;
  const timeProgress = (averageReviewTime / targetReviewTime) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Quick Actions</h2>
      <p className="text-sm text-gray-600 mb-6">Common tasks and shortcuts</p>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Review This Month</p>
            <p className="text-sm font-bold text-gray-900">
              {reviewedThisMonth}/{totalThisMonth}
            </p>
          </div>
          <Progress value={reviewProgress} className="h-2" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Average Review Time</p>
            <p className="text-sm font-bold text-gray-900">
              {averageReviewTime} day
              <span className="text-gray-500 font-normal">/{targetReviewTime} days</span>
            </p>
          </div>
          <Progress value={timeProgress} className="h-2" />
        </div>
      </div>
    </div>
  );
}
