import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { FileUpload } from '../types';

interface FileUploadTableProps {
  files: Array<{ sector: string; files: FileUpload[] }>;
  onRemove: (sectorIndex: number, fileId: string) => void;
}

export const FileUploadTable = ({ files, onRemove }: FileUploadTableProps) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  };

  const hasFiles = files.some((item) => item.files.length > 0);

  if (!hasFiles) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>Sector</TableHead>
            <TableHead>Uploaded File</TableHead>
            <TableHead>File Size</TableHead>
            <TableHead className="w-20">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((item, sectorIndex) =>
            item.files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">{item.sector}</TableCell>
                <TableCell className="text-primary">{file.fileName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatFileSize(file.fileSize)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(sectorIndex, file.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
