import { useState, useRef } from "react";
import { Upload, X, File, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { FileUpload } from "@/types";

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
  maxSize = 10,
  label,
  multiple = false,
}: FileDisplayWithActionsProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize files to array
  const filesArray = files 
    ? (Array.isArray(files) ? files : [files])
    : [];

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
      
      const newFile: FileUpload = {
        id: crypto.randomUUID(),
        file: null, // File not stored locally when backend handles upload
        fileName: fileData.fileName || fileData.filename || file.name,
        fileSize: fileData.fileSize || fileData.size || file.size,
        uploadedAt: Date.now(),
        ...(fileData.filePath || fileData.url ? { filePath: fileData.filePath || fileData.url } : {}),
        ...(fileData.fileUrl || fileData.url ? { fileUrl: fileData.fileUrl || fileData.url } : {}),
        ...(fileData.mimeType ? { mimeType: fileData.mimeType } : {}),
      };

      // Update files based on multiple prop
      if (multiple) {
        const updatedFiles = [...filesArray, newFile] as FileUpload[];
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

  const handleDelete = async (fileToDelete: FileLike, fileIndex: number) => {
    if (!fileToDelete) return;

    const file = fileToDelete as FileUpload;
    
    // Delete from backend if filePath exists
    if (file.filePath && submissionId) {
      try {
        await apiService.deleteFile(file.filePath);
        notificationService.success("File deleted successfully", "File Removed");
      } catch (error: any) {
        notificationService.error(
          error.message || "Failed to delete file.",
          "Delete Failed"
        );
        return; // Don't update UI if deletion failed
      }
    }

    // Update local state - use index for more reliable deletion
    if (multiple) {
      const updatedFiles = filesArray.filter((_, index) => index !== fileIndex) as FileUpload[];
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

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      {/* Display existing files */}
      {filesArray.length > 0 ? (
        <div className="space-y-2">
          {filesArray.map((fileLike, index) => {
            const file = fileLike as FileUpload;
            return (
              <div
                key={file.id || index}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
              >
                <File className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {file.fileName || "File"}
                  </span>
                  {file.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.fileSize)}
                    </span>
                  )}
                </div>
                {file.fileUrl && (
                  <a
                    href={file.fileUrl}
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
                    onClick={() => handleDelete(fileLike, index)}
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
    </div>
  );
};

