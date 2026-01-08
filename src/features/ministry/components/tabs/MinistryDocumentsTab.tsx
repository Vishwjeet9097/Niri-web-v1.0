import { Card, CardContent } from '@/components/ui/card';

interface MinistryDocumentsTabProps {
  submission: any;
}

export function MinistryDocumentsTab({ submission }: MinistryDocumentsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
          <p className="text-gray-600">Documents content will be displayed here...</p>
        </CardContent>
      </Card>
    </div>
  );
}

