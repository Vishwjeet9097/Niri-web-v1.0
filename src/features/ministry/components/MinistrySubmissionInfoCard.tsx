import { Card, CardContent } from '@/components/ui/card';
import { Building2, FileText, Building, Calendar } from 'lucide-react';

export interface MinistrySubmissionInfoCardProps {
  category?: string;
  type?: string;
  location?: string;
  submittedOn?: string | Date;
}

export function MinistrySubmissionInfoCard({
  category,
  type,
  location,
  submittedOn,
}: MinistrySubmissionInfoCardProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | undefined }) => (
    <div className="flex items-start gap-3 mb-4 last:mb-0">
      <div className="mt-0.5">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value || 'N/A'}</p>
      </div>
    </div>
  );

  return (
    <Card className="bg-white rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-6 py-3 border-b border-blue-100">
        <h3 className="text-sm font-semibold text-gray-900">Submission Information</h3>
      </div>
      <CardContent className="p-6">
        <InfoItem icon={Building2} label="Category" value={category || 'Infrastructure'} />
        <InfoItem icon={FileText} label="Type" value={type} />
        <InfoItem icon={Building} label="Ministry" value={location} />
        <InfoItem icon={Calendar} label="Submitted On" value={formatDate(submittedOn)} />
      </CardContent>
    </Card>
  );
}

