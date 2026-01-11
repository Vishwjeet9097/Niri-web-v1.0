import { useState, useId, useEffect, useRef } from "react";
import { Upload, X, File as FileIcon, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { FileUpload } from "@/features/submission/types";

interface MinistryFileUploadSectionProps {
  label: string;
  description?: string;
  value: FileUpload | null;
  onChange: (file: FileUpload | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  required?: boolean;
  submissionId?: string;
  onUploadComplete?: (uploadedFile: FileUpload) => void;
  disabled?: boolean;
  className?: string;
  deferFileDeletion?: boolean;
  // New props for "No document available" feature
  noDocumentAvailableValue?: string;
  onNoDocumentAvailableChange?: (value: string) => void;
  noDocumentAvailableFieldId?: string; // Field ID for the "No document available" input field
}

export const MinistryFileUploadSection = ({
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
  className,
  deferFileDeletion = false,
  noDocumentAvailableValue,
  onNoDocumentAvailableChange,
  noDocumentAvailableFieldId,
}: MinistryFileUploadSectionProps) => {
  const uniqueId = useId();
  const fileInputId = `file-${uniqueId}`;
  const [dragActive, setDragActive] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCheckboxState, setPendingCheckboxState] = useState(false);
  // Track if we just confirmed "No document available" to skip validation
  const justConfirmedNoDocumentRef = useRef(false);
  
  // Check if "No document available" is checked based on the input field value
  const isNoDocumentAvailableChecked = noDocumentAvailableValue === "No document available";

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const handleFile = async (file: File) => {
    if (disabled) return;
    if (file.size > maxSize * 1024 * 1024) {
      notificationService.warning(
        `File size must be less than ${maxSize}MB`,
        "File Too Large"
      );
      return;
    }

    console.log("📂 Captured real file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const fileUpload: FileUpload = {
      id: crypto.randomUUID(),
      file: file,
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      uploadedAt: Date.now(),
    };
    
    if (!fileUpload.file || !(fileUpload.file instanceof globalThis.File)) {
      console.error("❌ CRITICAL: File instance lost when creating FileUpload object!");
    }
    
    onChange(fileUpload);
    
    // Clear "No document available" when file is uploaded
    if (onNoDocumentAvailableChange && isNoDocumentAvailableChecked) {
      onNoDocumentAvailableChange("");
    }
  };

  const handleRemoveFile = async () => {
    if (disabled) return;
    
    if (deferFileDeletion) {
      onChange(null);
      return;
    }
    
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

  const extractOriginalName = (fileName: string, originalName?: string): string => {
    if (originalName && originalName.trim()) return originalName;
    
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
    
    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, '');
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }
    
    return fileName;
  };

  const handleView = async () => {
    if (!value) return;

    if (value.fileUrl) {
      window.open(value.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (value.file instanceof File) {
      const url = URL.createObjectURL(value.file);
      setObjectUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      }, 100);
      return;
    }

    if (value.filePath && !value.fileUrl) {
      try {
        const response = await apiService.getFileUrl(value.filePath);
        const url = response.signedUrl || response.url;
        
        if (!url) {
          throw new Error("No URL returned from server");
        }
        
        onChange({
          ...value,
          fileUrl: url,
        });
        
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      } catch (error: any) {
        notificationService.error(
          error.message || "Failed to load file URL.",
          "View Failed"
        );
        return;
      }
    }

    alert("File not available for viewing.");
  };

  const handleDownload = async () => {
    if (!value) return;

    if (value.fileUrl) {
      const a = document.createElement("a");
      a.href = value.fileUrl;
      a.download = value.originalName || value.fileName || "file";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    if (value.file instanceof File) {
      const url = URL.createObjectURL(value.file);
      setObjectUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = value.originalName || value.fileName || "file";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      }, 100);
      return;
    }

    if (value.filePath && !value.fileUrl) {
      try {
        const response = await apiService.getFileUrl(value.filePath);
        const url = response.signedUrl || response.url;
        
        if (!url) {
          throw new Error("No URL returned from server");
        }
        
        onChange({
          ...value,
          fileUrl: url,
        });
        
        const a = document.createElement("a");
        a.href = url;
        a.download = value.originalName || value.fileName || "file";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      } catch (error: any) {
        notificationService.error(
          error.message || "Failed to load file URL.",
          "Download Failed"
        );
        return;
      }
    }

    alert("File not available for download.");
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (disabled) return;
    
    if (checked) {
      // Show confirmation modal
      setPendingCheckboxState(true);
      setShowConfirmModal(true);
    } else {
      // Uncheck - clear "No document available" field
      if (onNoDocumentAvailableChange) {
        onNoDocumentAvailableChange("");
      }
    }
  };

  const handleConfirmNoDocument = () => {
    console.log(`🔄 [MinistryFileUploadSection] handleConfirmNoDocument called`);
    console.log(`🔄 [MinistryFileUploadSection] Current noDocumentAvailableValue: "${noDocumentAvailableValue}"`);
    // Set flag to skip validation when clearing file
    justConfirmedNoDocumentRef.current = true;
    // Fill "No document available" field
    if (onNoDocumentAvailableChange) {
      console.log(`🔄 [MinistryFileUploadSection] Calling onNoDocumentAvailableChange("No document available")`);
      onNoDocumentAvailableChange("No document available");
    } else {
      console.log(`⚠️ [MinistryFileUploadSection] onNoDocumentAvailableChange is not defined!`);
    }
    // Clear any uploaded file - use setTimeout to allow formData to update first
    setTimeout(() => {
      console.log(`🔄 [MinistryFileUploadSection] Calling onChange(null) to clear file (delayed)`);
      onChange(null);
      // Reset flag after a short delay
      setTimeout(() => {
        justConfirmedNoDocumentRef.current = false;
      }, 100);
    }, 0);
    setShowConfirmModal(false);
    setPendingCheckboxState(false);
  };

  const handleCancelNoDocument = () => {
    setShowConfirmModal(false);
    setPendingCheckboxState(false);
  };

  return (
    <>
      <div className="space-y-2">
        <Label>
          {label} {required && !isNoDocumentAvailableChecked && <span className="text-destructive">*</span>}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {/* "No document available" checkbox - shown when no file is uploaded and not in checked state */}
        {!value && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`no-doc-${uniqueId}`}
              checked={isNoDocumentAvailableChecked}
              onCheckedChange={handleCheckboxChange}
              disabled={disabled}
            />
            <Label
              htmlFor={`no-doc-${uniqueId}`}
              className="text-sm font-normal cursor-pointer"
            >
              No document available
            </Label>
          </div>
        )}

        {/* Show "No document available" input field when checkbox is checked */}
        {isNoDocumentAvailableChecked && !value && (
          <Input
            value="No document available"
            readOnly
            disabled
            className="bg-gray-100 text-gray-600 cursor-not-allowed"
          />
        )}

        {/* File upload section - hidden when "No document available" is checked */}
        {!isNoDocumentAvailableChecked && !value ? (
          <div className="flex items-center gap-3">
            {disabled ? (
              <div className={cn(
                "px-4 py-2 rounded-md font-medium text-sm transition bg-gray-100 text-gray-400 cursor-not-allowed",
                className
              )}>
                Upload File
              </div>
            ) : (
              <label
                htmlFor={fileInputId}
                className={cn(
                  "px-4 py-2 rounded-md font-medium text-sm transition bg-indigo-100 text-indigo-800 cursor-pointer hover:bg-indigo-200",
                  className
                )}
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
              No file chosen
            </span>
          </div>
        ) : value ? (
          <div className={cn(
            "flex items-center gap-3 p-4 border rounded-lg bg-muted/30",
            className
          )}>
            <FileIcon className="w-8 h-8 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {extractOriginalName(value.fileName || "", value.originalName)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(value.fileSize)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleView}
                disabled={disabled}
                className="h-8 w-8 p-0"
                title="View file"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={disabled}
                className="h-8 w-8 p-0"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </Button>
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
          </div>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>No Document Available</DialogTitle>
            <DialogDescription className="text-base">
              No marks will be awarded in case of non submission of document.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCancelNoDocument}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmNoDocument}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

