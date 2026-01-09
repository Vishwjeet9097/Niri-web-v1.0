import React, { useState } from 'react';
import { Eye, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface FileLike {
  id?: string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  uploadedAt?: number;
  mimeType?: string;
  originalName?: string;
  file?: File | string | null; // Can be File object or string path
}

interface MinistryFileTableProps {
  files: FileLike | FileLike[] | null | undefined;
  fileKeyPrefix?: string; // Prefix for generating unique file keys
}

// Helper to extract original name from UUID-prefixed fileName
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

// Helper to read access token from localStorage
function readAccessTokenFromLocalStorage(): string | undefined {
  try {
    const raw = localStorage.getItem('niri_app:auth_tokens');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed?.value?.accessToken;
  } catch (e) {
    console.warn('Failed to read auth token from localStorage', e);
    return undefined;
  }
}

// Helper to check if string is probably a URL
function isProbablyUrl(s: string): boolean {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}

// Fetch signed URL from backend
async function fetchSignedUrl(
  filePath: string,
  token?: string
): Promise<string> {
  if (!filePath) throw new Error('Missing filePath');

  const encoded = encodeURIComponent(filePath);
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const url = `${base.replace(/\/$/, '')}/file/url/${encoded}`;

  const accessToken = token ?? readAccessTokenFromLocalStorage();
  if (!accessToken) throw new Error('No auth token available. Please login.');

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    const signed =
      json?.data?.signedUrl ?? json?.signedUrl ?? json?.url ?? null;
    if (!signed)
      throw new Error(
        `Signed URL not found in response: ${text.slice(0, 300)}`
      );
    return signed;
  } catch (err) {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    throw new Error(
      `Unexpected response when fetching signed URL: ${text.slice(0, 300)}`
    );
  }
}

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const MinistryFileTable: React.FC<MinistryFileTableProps> = ({
  files,
  fileKeyPrefix = 'file',
}) => {
  const [fileLoading, setFileLoading] = useState<Record<string, boolean>>({});

  // Normalize files to array
  const normalizedFiles = React.useMemo(() => {
    if (!files) return [];
    return Array.isArray(files) ? files : [files];
  }, [files]);

  // Handle viewing file - Get signed S3 URL if needed
  // filePath might be a relative path, so we need to check if it's already a full URL
  // If not, fetch the signed URL from backend
  const handleViewFile = async (file: FileLike, fileKey: string) => {
    // If file has a direct fileUrl (full signed S3 URL), use it
    if (file.fileUrl) {
      window.open(file.fileUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // If file has filePath, check if it's already a full URL
    if (file.filePath || file.file) {
      const filePath = String(file.filePath || file.file);
      
      // Check if filePath is already a full URL (starts with http:// or https://)
      if (isProbablyUrl(filePath)) {
        // It's already a full signed S3 URL, open it directly
        window.open(filePath, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // filePath is a relative path, need to fetch signed URL from backend
      setFileLoading((s) => ({ ...s, [fileKey]: true }));
      try {
        const signed = await fetchSignedUrl(filePath);
        if (!isProbablyUrl(signed)) {
          console.error('Signed URL is not a valid URL:', signed);
          alert('Received invalid file URL. Check console/network tab.');
          return;
        }
        window.open(signed, '_blank', 'noopener,noreferrer');
      } catch (err: any) {
        console.error(err);
        alert('Failed to open file: ' + (err.message || err));
      } finally {
        setFileLoading((s) => ({ ...s, [fileKey]: false }));
      }
      return;
    }

    alert('File path or URL missing.');
  };

  // Handle downloading file
  const handleDownloadFile = async (file: FileLike, fileKey: string) => {
    // If file has a direct fileUrl, download it
    if (file.fileUrl) {
      const a = document.createElement('a');
      a.href = file.fileUrl;
      a.download = extractOriginalName(
        file.fileName || '',
        file.originalName
      ) || 'file';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // If file has filePath, use backend download endpoint
    if (file.filePath || file.file) {
      setFileLoading((s) => ({ ...s, [fileKey]: true }));
      let blobUrl: string | null = null;
      try {
        // In review mode, file.file is a string path from backend
        const filePath = file.filePath || file.file;
        const encoded = encodeURIComponent(String(filePath));
        const base =
          import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const downloadUrl = `${base.replace(/\/$/, '')}/file/download/${encoded}`;

        const accessToken = readAccessTokenFromLocalStorage();
        if (!accessToken) {
          throw new Error('No auth token available. Please login.');
        }

        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = extractOriginalName(
          file.fileName || '',
          file.originalName
        ) || 'file';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err: any) {
        console.error(err);
        alert('Download failed: ' + (err.message || err));
      } finally {
        if (blobUrl) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl!);
          }, 100);
        }
        setFileLoading((s) => ({ ...s, [fileKey]: false }));
      }
      return;
    }

    alert('File path or URL missing.');
  };

  if (normalizedFiles.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No files uploaded
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">File Name</TableHead>
            <TableHead className="w-[100px]">File Size</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {normalizedFiles.map((file, index) => {
            const fileKey = `${fileKeyPrefix}-${index}`;
            const isLoading = !!fileLoading[fileKey];
            const hasFileAccess = !!(
              file.filePath ||
              file.file ||
              file.fileUrl
            );
            const displayName = extractOriginalName(
              file.fileName || '',
              file.originalName
            ) || 'Unknown file';

            return (
              <TableRow key={file.id || fileKey}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="font-medium text-sm truncate" title={displayName}>
                      {displayName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {file.fileSize ? formatFileSize(file.fileSize) : 'N/A'}
                </TableCell>
                <TableCell>
                  {hasFileAccess ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewFile(file, fileKey)}
                        disabled={isLoading}
                        className="h-7 w-7 p-0"
                        title="View file"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadFile(file, fileKey)}
                        disabled={isLoading}
                        className="h-7 w-7 p-0"
                        title="Download file"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No access</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

