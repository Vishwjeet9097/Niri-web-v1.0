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
import { deleteMinistrySubmissionFile } from "@/services/ministry.service";
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
  // Props for ministry file deletion
  submissionIndicatorId?: string; // For files directly associated with an indicator
  primaryId?: string; // For files in subsections
  // Props for edit mode deferred deletion
  isEditMode?: boolean; // If true, defer deletion API call until Save
  onPendingDeletion?: (deletionInfo: {
    action: "by-submission-indicator" | "by-primary-id";
    submissionIndicatorId?: string;
    primaryId?: string;
  }) => void; // Callback to notify parent of pending deletion
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
  submissionIndicatorId,
  primaryId,
  isEditMode = false,
  onPendingDeletion,
}: MinistryFileUploadSectionProps) => {
  const uniqueId = useId();
  const fileInputId = `file-${uniqueId}`;
  const [dragActive, setDragActive] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingCheckboxState, setPendingCheckboxState] = useState(false);
  // Track if we just confirmed "No document available" to skip validation
  const justConfirmedNoDocumentRef = useRef(false);
  // Ref for file input to reset it after selection
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Check if "No document available" is checked based on the input field value
  const isNoDocumentAvailableChecked =
    noDocumentAvailableValue === "No document available";

  // Local state to track checkbox state during unchecking (to handle delayed parent updates)
  // Initialize with the current prop value
  const [localCheckboxState, setLocalCheckboxState] = useState<boolean>(
    isNoDocumentAvailableChecked
  );

  // Sync checkbox state when prop changes
  useEffect(() => {
    console.log(
      `🔄 [MinistryFileUploadSection] noDocumentAvailableValue changed: "${noDocumentAvailableValue}", isChecked: ${isNoDocumentAvailableChecked}`
    );
    // Reset pending state if value is cleared
    if (!noDocumentAvailableValue || noDocumentAvailableValue === "") {
      setPendingCheckboxState(false);
      setLocalCheckboxState(false); // Clear local state when value is cleared
    } else if (noDocumentAvailableValue === "No document available") {
      setLocalCheckboxState(true); // Set local state when value is set
    }
  }, [noDocumentAvailableValue, isNoDocumentAvailableChecked]);

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

    // When replacing an existing file during editing, create a new FileUpload object
    // with the File instance and clear any old filePath/fileUrl to ensure proper replacement
    const fileUpload: FileUpload = {
      id: value?.id || crypto.randomUUID(), // Preserve ID if replacing
      file: file, // Store File object - will be uploaded on save
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      uploadedAt: Date.now(),
      // Clear old filePath and fileUrl when replacing with new file
      filePath: undefined,
      fileUrl: undefined,
      mimeType: file.type,
    };

    if (!fileUpload.file || !(fileUpload.file instanceof globalThis.File)) {
      console.error(
        "❌ CRITICAL: File instance lost when creating FileUpload object!"
      );
    }

    console.log("📂 Replacing file with new upload:", {
      oldFile: value
        ? { fileName: value.fileName, filePath: value.filePath }
        : null,
      newFile: {
        fileName: fileUpload.fileName,
        hasFileInstance: !!fileUpload.file,
      },
    });

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
      // After removing file, if "No Document Available" was previously set, restore it
      // This ensures the checkbox state is maintained when removing files during edit
      if (isNoDocumentAvailableChecked && onNoDocumentAvailableChange) {
        // Keep "No Document Available" checked if it was previously set
        console.log(
          `🔄 [MinistryFileUploadSection] File removed, keeping "No Document Available" checked`
        );
      }
      return;
    }

    // Try to get primaryId from file value if not passed as prop
    // This is important for subsection files where primaryId might be stored in the file value
    let finalPrimaryId = primaryId;
    if (!finalPrimaryId && value && typeof value === "object") {
      finalPrimaryId = (value as any)._primaryId;
      // Also check if it's in valueJson.id (file metadata)
      if (!finalPrimaryId && (value as any).id) {
        // The file ID might be the primaryId in some cases, but we need the actual primaryId
        // Let's check valueJson structure
        const valueJson = (value as any).valueJson || (value as any);
        if (valueJson && typeof valueJson === "object") {
          finalPrimaryId = valueJson._primaryId || valueJson.primaryId;
        }
      }
    }

    // Debug logging
    console.log("[MinistryFileUploadSection] Delete file called:", {
      submissionIndicatorId,
      primaryId,
      finalPrimaryId,
      hasValue: !!value,
      filePath: value?.filePath,
      isEditMode,
      valueStructure: value,
    });

    // In edit mode, always defer deletion - remove from UI immediately, call API on Save
    if (isEditMode) {
      // Create payload for deferred deletion
      // For subsection files, use primaryId with action "by-primary-id"
      // For direct indicator files, use submissionIndicatorId with action "by-submission-indicator"
      const payload: {
        action: "by-submission-indicator" | "by-primary-id";
        submissionIndicatorId?: string;
        primaryId?: string;
      } | null = submissionIndicatorId
        ? {
            action: "by-submission-indicator",
            submissionIndicatorId,
          }
        : finalPrimaryId
        ? {
            action: "by-primary-id",
            primaryId: finalPrimaryId,
          }
        : null;

      if (payload) {
        console.log(
          "[MinistryFileUploadSection] Edit mode: Deferring deletion, notifying parent with payload:",
          payload
        );
        // Notify parent of pending deletion BEFORE removing from UI
        // This ensures we capture the primaryId before it's lost
        if (onPendingDeletion) {
          onPendingDeletion(payload);
        }
      } else {
        console.warn(
          "[MinistryFileUploadSection] Edit mode: No submissionIndicatorId or primaryId available. File will be removed from UI but deletion may fail on Save.",
          {
            submissionIndicatorId,
            primaryId,
            finalPrimaryId,
            value,
          }
        );
        // Still try to notify parent even without IDs - parent might be able to resolve it
        // But this is a fallback - ideally primaryId should always be available
      }

      // Update UI immediately (remove file from display)
      onChange(null);
      // After removing file, if "No Document Available" was previously set, restore it
      if (isNoDocumentAvailableChecked && onNoDocumentAvailableChange) {
        console.log(
          `🔄 [MinistryFileUploadSection] File removed, keeping "No Document Available" checked`
        );
      }
      return;
    }

    // Not in edit mode - delete immediately via API
    // If we have submissionIndicatorId or primaryId, use the ministry delete API
    if (submissionIndicatorId || primaryId) {
      // Try to get primaryId from file value if not passed as prop
      let finalPrimaryId = primaryId;
      if (!finalPrimaryId && value && typeof value === "object") {
        finalPrimaryId = (value as any)._primaryId;
      }

      const payload: {
        action: "by-submission-indicator" | "by-primary-id";
        submissionIndicatorId?: string;
        primaryId?: string;
      } = submissionIndicatorId
        ? {
            action: "by-submission-indicator",
            submissionIndicatorId,
          }
        : finalPrimaryId
        ? {
            action: "by-primary-id",
            primaryId: finalPrimaryId,
          }
        : null;

      if (!payload) {
        console.warn(
          "[MinistryFileUploadSection] No submissionIndicatorId or primaryId provided, cannot delete file via ministry API"
        );
        notificationService.error(
          "Cannot delete file: Missing required information.",
          "Delete Failed"
        );
        return;
      }

      try {
        console.log(
          "[MinistryFileUploadSection] Calling ministry delete API:",
          payload
        );
        await deleteMinistrySubmissionFile(payload);
        notificationService.success(
          "File deleted successfully",
          "File Removed"
        );
        onChange(null);
        // After removing file, if "No Document Available" was previously set, restore it
        if (isNoDocumentAvailableChecked && onNoDocumentAvailableChange) {
          console.log(
            `🔄 [MinistryFileUploadSection] File removed, keeping "No Document Available" checked`
          );
        }
        return;
      } catch (error) {
        console.error("[MinistryFileUploadSection] Delete error:", error);
        notificationService.error(
          (error as Error).message || "Failed to delete file.",
          "Delete Failed"
        );
        return;
      }
    }

    // If we don't have ministry-specific IDs and not in edit mode, show error
    console.warn(
      "[MinistryFileUploadSection] No submissionIndicatorId or primaryId provided, cannot delete file via ministry API"
    );
    notificationService.error(
      "Cannot delete file: Missing required information.",
      "Delete Failed"
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
      // Reset file input to allow selecting the same file again
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const extractOriginalName = (
    fileName: string,
    originalName?: string
  ): string => {
    if (originalName && originalName.trim()) return originalName;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;

    if (uuidPattern.test(fileName)) {
      const extracted = fileName.replace(uuidPattern, "");
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
      } catch (error) {
        notificationService.error(
          (error as Error).message || "Failed to load file URL.",
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
      } catch (error) {
        notificationService.error(
          (error as Error).message || "Failed to load file URL.",
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
      setLocalCheckboxState(true);
      setShowConfirmModal(true);
    } else {
      // Uncheck - clear "No document available" field and reset any pending state
      setPendingCheckboxState(false);
      setLocalCheckboxState(false); // Immediately update local state for responsive UI
      if (onNoDocumentAvailableChange) {
        console.log(
          `🔄 [MinistryFileUploadSection] Unchecking "No document available" checkbox`
        );
        // Immediately clear the value - use empty string to ensure checkbox unchecks
        onNoDocumentAvailableChange("");
        // Also ensure any pending state is cleared
        setShowConfirmModal(false);
      }
    }
  };

  const handleConfirmNoDocument = () => {
    // Set flag to skip validation when clearing file
    justConfirmedNoDocumentRef.current = true;

    // Set "No document available" field first
    if (onNoDocumentAvailableChange) {
      onNoDocumentAvailableChange("No document available");
    }

    // Clear any uploaded file - use delay to ensure formData update completes
    setTimeout(() => {
      onChange(null);

      // Re-set "No document available" after clearing file to ensure it's preserved
      if (onNoDocumentAvailableChange) {
        setTimeout(() => {
          onNoDocumentAvailableChange("No document available");
        }, 150);
      }

      // Reset flag after a short delay
      setTimeout(() => {
        justConfirmedNoDocumentRef.current = false;
      }, 200);
    }, 100);

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
          {label}{" "}
          {required && !isNoDocumentAvailableChecked && (
            <span className="text-destructive">*</span>
          )}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {/* "No document available" checkbox - shown when no file is uploaded */}
        {/* Always show checkbox when there's no file, regardless of checked state */}
        {/* This ensures it's visible during both create and edit modes */}
        {/* "No document available" checkbox - shown when no file is uploaded */}
        {!value && (
          <div className="flex items-center space-x-2">
            <Checkbox
              key={`no-doc-checkbox-${noDocumentAvailableValue || "unchecked"}`}
              id={`no-doc-${uniqueId}`}
              checked={localCheckboxState}
              onCheckedChange={(checked) => {
                console.log(
                  `🔄 [MinistryFileUploadSection] Checkbox onCheckedChange: ${checked}, current checked: ${isNoDocumentAvailableChecked}, localCheckboxState: ${localCheckboxState}, noDocumentAvailableValue: "${noDocumentAvailableValue}"`
                );
                // Handle both true and false cases explicitly
                if (checked === true) {
                  handleCheckboxChange(true);
                } else if (checked === false) {
                  // Explicitly handle unchecking - ensure it works even if state hasn't updated yet
                  handleCheckboxChange(false);
                }
              }}
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
        {localCheckboxState && !value && (
          <Input
            value="No document available"
            readOnly
            disabled
            className="bg-gray-100 text-gray-600 cursor-not-allowed mt-2"
          />
        )}

        {/* File upload section - shown when "No document available" is NOT checked and no file exists */}
        {!localCheckboxState && !value ? (
          <div className="flex items-center gap-3">
            {disabled ? (
              <div
                className={cn(
                  "px-4 py-2 rounded-md font-medium text-sm transition bg-gray-100 text-gray-400 cursor-not-allowed",
                  className
                )}
              >
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
              ref={fileInputRef}
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
          <div
            className={cn(
              "flex items-center gap-3 p-4 border rounded-lg bg-muted/30",
              className
            )}
          >
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
              {/* Allow file replacement during editing - show upload button when not disabled */}
              {!disabled && (
                <label
                  htmlFor={`replace-${fileInputId}`}
                  className="h-8 w-8 p-0 flex items-center justify-center cursor-pointer"
                  title="Replace file"
                >
                  <Upload className="w-4 h-4 text-muted-foreground hover:text-primary" />
                  <input
                    id={`replace-${fileInputId}`}
                    ref={replaceFileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleChange}
                    disabled={disabled}
                    className="hidden"
                  />
                </label>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                disabled={disabled}
                title="Remove file"
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
              className="w-full sm:w-auto  hover: text-white"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
