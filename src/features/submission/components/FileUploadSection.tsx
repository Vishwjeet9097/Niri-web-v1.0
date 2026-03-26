import { useState, useId, useEffect, useRef } from "react";
import { Upload, X, File as FileIcon, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { FileUpload } from "../types";
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
import { Checkbox } from "@/components/ui/checkbox";

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
  className?: string; // Additional className for validation styling
  deferFileDeletion?: boolean; // If true, don't call DELETE API immediately (for editing sent-back indicators)
  showNoDocumentOption?: boolean; // Show "No document available" option
  noDocumentAvailable?: boolean; // Current state of "No document available"
  onNoDocumentChange?: (noDocument: boolean) => void; // Callback when "No document available" is toggled
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
  className,
  deferFileDeletion = false, // Add this prop
  showNoDocumentOption = false,
  noDocumentAvailable = false,
  onNoDocumentChange,
}: FileUploadSectionProps) => {
  const uniqueId = useId();
  const fileInputId = `file-${uniqueId}`;
  const [dragActive, setDragActive] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNoDocument, setPendingNoDocument] = useState(false);
  const isConfirmingRef = useRef(false);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  // Debug: Log props changes
  useEffect(() => {
    console.log("🔄 FileUploadSection: Props updated", {
      noDocumentAvailable,
      showNoDocumentOption,
      hasOnNoDocumentChange: !!onNoDocumentChange,
      label,
    });
  }, [noDocumentAvailable, showNoDocumentOption, onNoDocumentChange, label]);

  const handleFile = async (file: File) => {
    if (disabled) return;

    const isAcceptedFile = (candidate: File, acceptValue: string): boolean => {
      const tokens = (acceptValue || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      if (tokens.length === 0) return true;

      const fileName = (candidate.name || "").toLowerCase();
      const mimeType = (candidate.type || "").toLowerCase();

      return tokens.some((token) => {
        if (token.startsWith(".")) {
          return fileName.endsWith(token);
        }
        if (token.endsWith("/*")) {
          const prefix = token.slice(0, -1); // keep trailing slash
          return mimeType.startsWith(prefix);
        }
        return mimeType === token;
      });
    };

    if (!isAcceptedFile(file, accept)) {
      notificationService.warning(
        "Only the allowed file types can be uploaded.",
        "Invalid File Type"
      );
      return;
    }

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
      console.error(
        "❌ CRITICAL: File instance lost when creating FileUpload object!"
      );
      console.error("File details:", {
        file,
        isFile: file instanceof globalThis.File,
        constructor: file?.constructor?.name,
      });
    }

    onChange(fileUpload);
  };

  const handleRemoveFile = async () => {
    if (disabled) return;

    // If deferFileDeletion is true (editing sent-back indicator),
    // just update local state without calling DELETE API
    // The backend will handle file deletion when the form is saved
    if (deferFileDeletion) {
      onChange(null);
      return;
    }

    // Original behavior: call DELETE API for immediate deletion
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
  const extractOriginalName = (
    fileName: string,
    originalName?: string
  ): string => {
    if (originalName && originalName.trim()) return originalName;

    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
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

  function readAccessTokenFromLocalStorage(): string | undefined {
    try {
      const raw = localStorage.getItem("niri_app:auth_tokens");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed?.value?.accessToken;
    } catch {
      return undefined;
    }
  }

  const isBackendProtectedDownloadUrl = (url: string): boolean => {
    try {
      const u = new URL(url);
      return u.pathname.includes("/file/download/");
    } catch {
      return url.includes("/file/download/");
    }
  };

  async function fetchBlobWithAuth(url: string): Promise<Blob> {
    const accessToken = readAccessTokenFromLocalStorage();
    if (!accessToken) throw new Error("No auth token available. Please login.");

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }

    return await res.blob();
  }

  const handleView = async () => {
    if (!value) return;

    // If file has fileUrl, use it
    if (value.fileUrl) {
      if (isBackendProtectedDownloadUrl(value.fileUrl)) {
        const blob = await fetchBlobWithAuth(value.fileUrl);
        const blobUrl = URL.createObjectURL(blob);
        setObjectUrl(blobUrl);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          setObjectUrl(null);
        }, 60_000);
      } else {
        // For S3-style signed URLs (already authorized) open directly.
        window.open(value.fileUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }

    // For local File objects (before submission), create object URL
    if (value.file instanceof File) {
      const url = URL.createObjectURL(value.file);
      setObjectUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      }, 100);
      return;
    }

    // If file has filePath but no fileUrl, fetch the URL from backend
    if (value.filePath && !value.fileUrl) {
      try {
        const response = await apiService.getFileUrl(value.filePath);
        // Backend returns signedUrl in the response
        const url = response.signedUrl || response.url;

        if (!url) {
          throw new Error("No URL returned from server");
        }

        // Update the value with the fetched URL for future use
        onChange({
          ...value,
          fileUrl: url,
        });

        if (isBackendProtectedDownloadUrl(url)) {
          const blob = await fetchBlobWithAuth(url);
          const blobUrl = URL.createObjectURL(blob);
          setObjectUrl(blobUrl);
          window.open(blobUrl, "_blank", "noopener,noreferrer");
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            setObjectUrl(null);
          }, 60_000);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
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

    // If file has fileUrl, download it
    if (value.fileUrl) {
      if (isBackendProtectedDownloadUrl(value.fileUrl)) {
        const blob = await fetchBlobWithAuth(value.fileUrl);
        const blobUrl = URL.createObjectURL(blob);
        setObjectUrl(blobUrl);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = value.originalName || value.fileName || "file";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          setObjectUrl(null);
        }, 60_000);
      } else {
        const a = document.createElement("a");
        a.href = value.fileUrl;
        a.download = value.originalName || value.fileName || "file";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return;
    }

    // For local File objects (before submission), create object URL and download
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
      // Clean up after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      }, 100);
      return;
    }

    // If file has filePath but no fileUrl, fetch the URL from backend
    if (value.filePath && !value.fileUrl) {
      try {
        const response = await apiService.getFileUrl(value.filePath);
        // Backend returns signedUrl in the response
        const url = response.signedUrl || response.url;

        if (!url) {
          throw new Error("No URL returned from server");
        }

        // Update the value with the fetched URL for future use
        onChange({
          ...value,
          fileUrl: url,
        });

        if (isBackendProtectedDownloadUrl(url)) {
          const blob = await fetchBlobWithAuth(url);
          const blobUrl = URL.createObjectURL(blob);
          setObjectUrl(blobUrl);

          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = value.originalName || value.fileName || "file";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
            setObjectUrl(null);
          }, 60_000);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = value.originalName || value.fileName || "file";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
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

  const handleNoDocumentCheck = (checked: boolean) => {
    console.log("🔘 FileUploadSection: handleNoDocumentCheck called", {
      checked,
      currentNoDocumentAvailable: noDocumentAvailable,
      hasOnNoDocumentChange: !!onNoDocumentChange,
    });
    if (checked) {
      // If checking, show confirmation dialog
      console.log("🔘 FileUploadSection: Showing confirmation dialog");
      setPendingNoDocument(true);
      setShowConfirmDialog(true);
    } else {
      // If unchecking, just update state
      console.log(
        "🔘 FileUploadSection: Unchecking, calling onNoDocumentChange(false)"
      );
      onNoDocumentChange?.(false);
    }
  };

  const handleConfirmNoDocument = () => {
    console.log("✅ FileUploadSection: handleConfirmNoDocument called", {
      currentNoDocumentAvailable: noDocumentAvailable,
      hasOnNoDocumentChange: !!onNoDocumentChange,
    });
    isConfirmingRef.current = true; // Mark that we're confirming, not canceling
    console.log("✅ FileUploadSection: Calling onNoDocumentChange(true)");
    onNoDocumentChange?.(true);
    onChange(null); // Clear any uploaded file
    setPendingNoDocument(false);
    setShowConfirmDialog(false);
    // Reset the flag after a brief delay to allow onOpenChange to check it
    setTimeout(() => {
      isConfirmingRef.current = false;
      console.log("✅ FileUploadSection: Reset isConfirmingRef flag");
    }, 0);
  };

  const handleCancelNoDocument = () => {
    console.log("❌ FileUploadSection: handleCancelNoDocument called");
    setShowConfirmDialog(false);
    setPendingNoDocument(false);
  };

  return (
    <div className="space-y-2">
      <Label>
        {label}{" "}
        {required && !noDocumentAvailable && (
          <span className="text-destructive">*</span>
        )}
      </Label>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {showNoDocumentOption && (
        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id={`no-doc-${uniqueId}`}
            checked={noDocumentAvailable}
            onCheckedChange={(checked) => {
              console.log("📋 FileUploadSection: Checkbox onCheckedChange", {
                checked,
                currentNoDocumentAvailable: noDocumentAvailable,
                showConfirmDialog,
                pendingNoDocument,
              });
              handleNoDocumentCheck(checked as boolean);
            }}
            disabled={disabled}
          />
          <label
            htmlFor={`no-doc-${uniqueId}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            No document available
          </label>
        </div>
      )}

      {noDocumentAvailable ? (
        <div className="px-4 py-2 rounded-md bg-gray-100 text-gray-600 text-sm">
          No document available
        </div>
      ) : !value ? (
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
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          <span className="text-gray-600 text-sm truncate max-w-[200px]">
            {value
              ? extractOriginalName(value.fileName || "", value.originalName)
              : "No file chosen"}
          </span>
        </div>
      ) : (
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
            {!disabled && (
              <>
                <input
                  id={`replace-${fileInputId}`}
                  type="file"
                  accept={accept}
                  onChange={handleChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const replaceInput = document.getElementById(
                      `replace-${fileInputId}`
                    ) as HTMLInputElement;
                    if (replaceInput) {
                      replaceInput.click();
                    }
                  }}
                  className="h-8 w-8 p-0"
                  title="Replace file"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </>
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
      )}

      {/* Confirmation Dialog for No Document Available */}
      <AlertDialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          console.log("🔔 FileUploadSection: AlertDialog onOpenChange", {
            open,
            isConfirming: isConfirmingRef.current,
            pendingNoDocument,
          });
          // Only handle closing, not opening (opening is handled by handleNoDocumentCheck)
          // Don't cancel if we're in the process of confirming
          if (!open && !isConfirmingRef.current) {
            console.log(
              "🔔 FileUploadSection: Calling handleCancelNoDocument from onOpenChange"
            );
            handleCancelNoDocument();
          } else if (!open && isConfirmingRef.current) {
            console.log(
              "🔔 FileUploadSection: Dialog closing after confirmation, skipping cancel"
            );
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Document Available</AlertDialogTitle>
            <AlertDialogDescription>
              No marks will be awarded in case of non submission of document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelNoDocument}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNoDocument}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error messages are handled centrally by parent components via renderFieldError */}
    </div>
  );
};
