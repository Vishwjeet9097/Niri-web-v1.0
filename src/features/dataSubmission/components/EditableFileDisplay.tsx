import { useState, useRef } from "react";
import { Upload, X, File, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { FileUpload } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Allow files to be FileUpload objects or objects with file properties from backend
type FileLike = FileUpload | {
  id?: string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  uploadedAt?: number;
  mimeType?: string;
  file?: File | null;
};

interface FileDisplayWithActionsProps {
  files: FileLike | FileLike[] | null | undefined;
  isEditable: boolean;
  submissionId: string;
  onFilesChange: (updatedFiles: FileUpload | FileUpload[] | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  multiple?: boolean; // Whether to allow multiple files
}

export const EditableFileDisplay = ({
  files,
  isEditable,
  submissionId,
  onFilesChange,
  accept = ".pdf,.doc,.docx",
  maxSize = 50,
  label,
  multiple = false,
}: FileDisplayWithActionsProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ file: FileUpload; index: number } | null>(null);

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

  const normalizeFile = (fileLike: FileLike, fallbackIndex: number): FileUpload => {
    const anyFile = fileLike as any;
    const rawFile = anyFile.file;
    let normalizedFile: File | string | null = null;
    const globalFileCtor =
      typeof globalThis !== "undefined" && typeof (globalThis as any).File === "function"
        ? (globalThis as any).File
        : undefined;

    if (globalFileCtor && rawFile instanceof globalFileCtor) {
      normalizedFile = rawFile as File;
    } else if (rawFile === null || rawFile === undefined) {
      normalizedFile = null;
    } else if (typeof rawFile === "string") {
      normalizedFile = rawFile;
    } else if (typeof anyFile.filePath === "string") {
      normalizedFile = anyFile.filePath;
    }

    return {
      id: anyFile.id ?? `file-${fallbackIndex}`,
      file: normalizedFile,
      fileName: anyFile.fileName ?? anyFile.filename ?? "File",
      originalName: extractOriginalName(
        anyFile.fileName ?? anyFile.filename ?? "File",
        anyFile.originalName
      ), // Extract originalName from fileName if not present
      fileSize: Number(anyFile.fileSize ?? anyFile.size ?? 0),
      uploadedAt: Number(anyFile.uploadedAt ?? Date.now()),
      filePath: anyFile.filePath ?? (typeof normalizedFile === "string" ? normalizedFile : undefined),
      fileUrl: anyFile.fileUrl ?? anyFile.url,
      mimeType: anyFile.mimeType,
    };
  };

  const getNormalizedFiles = () => {
    return files
      ? (Array.isArray(files) ? files : [files]).map((fileLike, index) =>
          normalizeFile(fileLike, index)
        )
      : [];
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      notificationService.warning(
        `File size must be less than ${maxSize}MB`,
        "File Too Large"
      );
      return;
    }

    setUploading(true);
    try {
      const response = await apiService.uploadFile(submissionId, file);
      
      // Handle different response structures
      // API returns { url: string; filename: string; size: number }
      // But might also have nested data property
      const fileData = (response as any)?.data || response;

      const storedPath =
        fileData.file ?? fileData.filePath ?? fileData.url ?? fileData.path ?? null;
      const uploadedAt = Number(fileData.uploadedAt ?? Date.now());

      const newFile = {
        id: fileData.id ?? crypto.randomUUID(),
        file: storedPath,
        fileName: fileData.fileName || fileData.filename || file.name,
        originalName: file.name || fileData.originalName || fileData.data?.originalName, // Preserve original file name from File object
        fileSize: Number(fileData.fileSize ?? fileData.size ?? file.size ?? 0),
        uploadedAt,
        filePath: storedPath ?? undefined,
        fileUrl: fileData.fileUrl || fileData.url,
        mimeType: fileData.mimeType,
      } as FileUpload;

      // Update files based on multiple prop
      if (multiple) {
        const currentFiles = getNormalizedFiles();
        const updatedFiles = [...currentFiles, newFile] as FileUpload[];
        onFilesChange(updatedFiles);
      } else {
        onFilesChange(newFile);
      }

      notificationService.success("File uploaded successfully", "Upload Complete");
    } catch (error: any) {
      notificationService.error(
        error.message || "Failed to upload file. Please try again.",
        "Upload Failed"
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = (fileToDelete: FileUpload, fileIndex: number) => {
    if (!fileToDelete) return;

    // Update local state - use index for more reliable deletion
    if (multiple) {
      const currentFiles = getNormalizedFiles();
      const updatedFiles = currentFiles.filter((_, index) => index !== fileIndex) as FileUpload[];
      onFilesChange(updatedFiles.length > 0 ? updatedFiles : null);
    } else {
      onFilesChange(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const normalizedFiles = getNormalizedFiles();

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      {/* Display existing files */}
      {normalizedFiles.length > 0 ? (
        <div className="space-y-2">
          {normalizedFiles.map((file, index) => {
            const viewUrl =
              (typeof file.file === "string" ? file.file : undefined) ||
              file.fileUrl ||
              undefined;
            return (
              <div
                key={file.id || `file-${index}`}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
              >
                <File className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {file.originalName || file.fileName || "File"}
                  </span>
                  {file.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </span>
                  )}
                </div>
                {viewUrl && (
                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                )}
                {isEditable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget({ file, index })}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">
          No files uploaded
        </span>
      )}

      {/* Upload button (only visible in edit mode) */}
      {isEditable && (
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
            multiple={false} // Always single file selection per click
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {multiple ? "Add File" : "Upload File"}
              </>
            )}
          </Button>
        </div>
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove the uploaded file from this record. You can re-upload it if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  handleDelete(deleteTarget.file, deleteTarget.index);
                }
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

