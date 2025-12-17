import { Trash2, Eye, Download } from 'lucide-react';
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

  const handleView = (file: FileUpload) => {
    // If file has fileUrl, use it
    if (file.fileUrl) {
      window.open(file.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    // For local File objects (before submission), create object URL
    if (file.file instanceof File) {
      const url = URL.createObjectURL(file.file);
      window.open(url, "_blank", "noopener,noreferrer");
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return;
    }

    // If file has filePath, it's already uploaded
    if (file.filePath) {
      alert("File viewing for uploaded files is handled by the backend. Please use the review page.");
      return;
    }

    alert("File not available for viewing.");
  };

  const handleDownload = (file: FileUpload) => {
    // If file has fileUrl, download it
    if (file.fileUrl) {
      const a = document.createElement("a");
      a.href = file.fileUrl;
      a.download = file.originalName || file.fileName || "file";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // For local File objects (before submission), create object URL and download
    if (file.file instanceof File) {
      const url = URL.createObjectURL(file.file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || file.fileName || "file";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return;
    }

    // If file has filePath, it's already uploaded
    if (file.filePath) {
      alert("File download for uploaded files is handled by the backend. Please use the review page.");
      return;
    }

    alert("File not available for download.");
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
            <TableHead className="w-32">Actions</TableHead>
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(file)}
                      className="h-7 w-7 p-0"
                      title="View file"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file)}
                      className="h-7 w-7 p-0"
                      title="Download file"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(sectorIndex, file.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
