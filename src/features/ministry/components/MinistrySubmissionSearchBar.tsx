import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export interface MinistrySubmissionSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MinistrySubmissionSearchBar({
  value,
  onChange,
  placeholder = 'Search submission, submitters, or categories',
}: MinistrySubmissionSearchBarProps) {
  return (
    <Card className="mb-6 bg-white rounded-lg">
      <CardContent className="p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-4 py-3 w-full rounded-lg"
          />
        </div>
      </CardContent>
    </Card>
  );
}

