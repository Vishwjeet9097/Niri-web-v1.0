import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight text-base font-semibold bg-[#E9EDFB] px-6 py-2">Submission Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Category</p>
            <p className="text-[#727272] text-sm">{category || 'Infrastructure'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Type</p>
            <p className="text-[#727272] text-sm">{type || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Building className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Ministry</p>
            <p className="text-[#727272] text-sm">{location || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-[#212121]">Submitted On</p>
            <p className="text-[#727272] text-sm">{formatDate(submittedOn)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

