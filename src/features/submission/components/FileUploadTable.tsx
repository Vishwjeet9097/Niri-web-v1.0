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

  // Helper to extract original name from UUID-prefixed fileName for existing files
  const extractOriginalName = (fileName: string, originalName?: string): string => {
    if (originalName && originalName.trim()) return originalName;
    
    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
    
    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, '');
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }
    
    return fileName;
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
                <TableCell className="text-primary">
                  {extractOriginalName(file.fileName, (file as any).originalName)}
                </TableCell>
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
