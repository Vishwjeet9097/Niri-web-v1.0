import { useState } from "react";
import { Upload, X, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiService, type FileUploadResponse } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { FileUpload } from "../types";

interface FileUploadSectionProps {
  label: string;
  description?: string;
  value: FileUpload | null;
  onChange: (file: FileUpload | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  required?: boolean;
  submissionId?: string; // For backend integration
  onUploadComplete?: (uploadedFile: FileUploadResponse) => void;
}

export const FileUploadSection = ({
  label,
  description,
  value,
  onChange,
  accept = ".pdf,.doc,.docx",
  maxSize = 50,
  required = false,
  submissionId,
  onUploadComplete,
}: FileUploadSectionProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      notificationService.warning(
        `File size must be less than ${maxSize}MB`,
        "File Too Large"
      );
      return;
    }

    // Log actual file details for verification
    console.log("📂 Captured real file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // If submissionId is provided, upload to backend
    if (submissionId) {
      await uploadToBackend(file);
    } else {
      // Local file handling (keep actual File instance)
      const fileUpload: FileUpload = {
        id: crypto.randomUUID(),
        file, // ✅ real File instance retained
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: Date.now(),
      };
      onChange(fileUpload);
    }
  };

  const uploadToBackend = async (file: File) => {
    if (!submissionId) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiService.uploadFile(submissionId, file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const fileUpload: FileUpload = {
        id: crypto.randomUUID(),
        file: null, // File not stored locally when backend handles upload
        fileName: response.data.fileName,
        fileSize: response.data.fileSize,
        uploadedAt: Date.now(),
        filePath: response.data.filePath,
        fileUrl: response.data.fileUrl,
        mimeType: response.data.mimeType,
      };

      onChange(fileUpload);
      onUploadComplete?.(response);

      notificationService.success("File uploaded successfully", "Upload Complete");
    } catch (error: any) {
      notificationService.error(
        error.message || "Failed to upload file. Please try again.",
        "Upload Failed"
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = async () => {
    if (value?.filePath && submissionId) {
      try {
        await apiService.deleteFile(value.filePath);
        notificationService.success("File deleted successfully", "File Removed");
      } catch (error: any) {
        notificationService.error(
          error.message || "Failed to delete file.",
          "Delete Failed"
        );
      }
    }
    onChange(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {uploading ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground mb-3">Uploading file...</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
        </div>
      ) : !value ? (
        <div className="flex items-center gap-3">
          <label
            htmlFor={`file-${label}`}
            className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-md cursor-pointer font-medium text-sm hover:bg-indigo-200 transition"
          >
            Upload File
          </label>

          <input
            id={`file-${label}`}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />

          <span className="text-gray-600 text-sm truncate max-w-[200px]">
            {value ? value.fileName : "No file chosen"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
          <File className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(value.fileSize)}
            </p>
            {value.fileUrl && (
              <a
                href={value.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View File
              </a>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveFile}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
