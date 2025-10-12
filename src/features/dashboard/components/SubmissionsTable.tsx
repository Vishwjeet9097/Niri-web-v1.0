import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { Submission } from '@/types';

interface SubmissionsTableProps {
  submissions?: Submission[];
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const },
  pending: { label: 'Pending', variant: 'default' as const },
  under_review: { label: 'Under Review', variant: 'default' as const },
  approved: { label: 'Approved', variant: 'default' as const },
  rejected: { label: 'Rejected', variant: 'destructive' as const },
};

export function SubmissionsTable({ submissions = [] }: SubmissionsTableProps) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => (
            <TableRow key={submission.id}>
              <TableCell className="font-medium">
                {submission.referenceNumber}
              </TableCell>
              <TableCell>{submission.category}</TableCell>
              <TableCell>
                <Badge variant={statusConfig[submission.status].variant}>
                  {statusConfig[submission.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${submission.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {submission.progress}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(submission.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
