import { useState, useId } from "react";
import { Upload, X, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/api.service";
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
  onUploadComplete?: (uploadedFile: FileUpload) => void;
  disabled?: boolean;
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
  disabled = false,
}: FileUploadSectionProps) => {
  const uniqueId = useId();
  const fileInputId = `file-${uniqueId}`;
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (disabled) return;
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

    // ✅ Always store file locally - upload to S3 only on submit
    // Ensure we preserve the actual File instance
    const fileUpload: FileUpload = {
      id: crypto.randomUUID(),
      file: file, // file is already typed as File, so we can use it directly
      fileName: file.name,
      originalName: file.name, // Preserve original file name
      fileSize: file.size,
      uploadedAt: Date.now(),
    };
    
    // Verify File instance is preserved
    if (!fileUpload.file || !(fileUpload.file instanceof globalThis.File)) {
      console.error("❌ CRITICAL: File instance lost when creating FileUpload object!");
      console.error("File details:", { file, isFile: file instanceof globalThis.File, constructor: file?.constructor?.name });
    }
    
    onChange(fileUpload);
  };

  const handleRemoveFile = async () => {
    if (disabled) return;
    if (value?.filePath && submissionId) {
      try {
        await apiService.deleteFile(value.filePath);
        notificationService.success(
          "File deleted successfully",
          "File Removed"
        );
      } catch (error: any) {
        notificationService.error(
          error.message || "Failed to delete file.",
          "Delete Failed"
        );
      }
    }
    // Always call onChange with null (never an empty object)
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

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {!value ? (
        <div className="flex items-center gap-3">
          {disabled ? (
            <div className="px-4 py-2 rounded-md font-medium text-sm transition bg-gray-100 text-gray-400 cursor-not-allowed">
              Upload File
            </div>
          ) : (
            <label
              htmlFor={fileInputId}
              className="px-4 py-2 rounded-md font-medium text-sm transition bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200"
            >
              Upload File
            </label>
          )}

          <input
            id={fileInputId}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          <span className="text-gray-600 text-sm truncate max-w-[200px]">
            {value ? extractOriginalName(value.fileName || "", value.originalName) : "No file chosen"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
          <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {extractOriginalName(value.fileName || "", value.originalName)}
            </p>
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
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
