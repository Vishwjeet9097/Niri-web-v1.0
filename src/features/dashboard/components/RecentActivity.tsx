import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info';
}

interface RecentActivityProps {
  activities?: Activity[];
}

export function RecentActivity({ activities = [] }: RecentActivityProps) {
  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className="mt-0.5">{getIcon(activity.type)}</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.action}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
