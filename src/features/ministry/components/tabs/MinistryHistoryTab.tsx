import { Card, CardContent } from '@/components/ui/card';

interface MinistryHistoryTabProps {
  submission: any;
}

export function MinistryHistoryTab({ submission }: MinistryHistoryTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">History</h3>
          <p className="text-gray-600">History content will be displayed here...</p>
        </CardContent>
      </Card>
    </div>
  );
}

