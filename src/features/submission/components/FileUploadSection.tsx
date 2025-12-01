import { useState } from "react";
import { Upload, X, File, Loader2, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiService, type FileUploadResponse } from "@/services/api.service";
import { notificationService } from "@/services/notification.service";
import type { FileUpload } from "../types";

// Helper function to read access token from localStorage
function readAccessTokenFromLocalStorage(): string | undefined {
  try {
    const authUser = localStorage.getItem('niri_app:auth_user');
    if (authUser) {
      const parsed = JSON.parse(authUser);
      return parsed?.token || parsed?.accessToken || parsed?.value?.token;
    }
  } catch (error) {
    console.error('Error reading access token:', error);
  }
  return undefined;
}

// Helper function to fetch signed URL for S3 files
async function fetchSignedUrl(filePath: string, token?: string): Promise<string> {
  if (!filePath) throw new Error("Missing filePath");

  const encoded = encodeURIComponent(filePath);
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/file/url/${encoded}`;

  const accessToken = token ?? readAccessTokenFromLocalStorage();
  if (!accessToken) throw new Error("No auth token available. Please login.");

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await res.text();
  try {
    const json = JSON.parse(text);
    const signed = json?.data?.signedUrl ?? json?.signedUrl ?? json?.url ?? null;
    if (!signed) throw new Error(`Signed URL not found in response: ${text.slice(0, 300)}`);
    return signed;
  } catch (err) {
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    throw new Error(`Unexpected response when fetching signed URL: ${text.slice(0, 300)}`);
  }
}

function isProbablyUrl(s: string) {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

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
  const [loading, setLoading] = useState(false);

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

  const handleView = async () => {
    if (!value) return;

    // Handle local File objects (preview mode)
    if (value.file && value.file instanceof globalThis.File) {
      const blobUrl = URL.createObjectURL(value.file);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    // Handle S3 files (review mode)
    const filePath = value.filePath || (typeof value.file === "string" ? value.file : undefined);
    if (!filePath) {
      notificationService.warning("File path missing.", "Cannot View File");
      return;
    }

    setLoading(true);
    try {
      const signed = await fetchSignedUrl(filePath);
      if (!isProbablyUrl(signed)) {
        console.error("Signed URL is not a valid URL:", signed);
        notificationService.error("Received invalid file URL. Check console/network tab.", "View Failed");
        return;
      }
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error(err);
      notificationService.error("Failed to open file: " + (err.message || err), "View Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!value) return;

    // Handle local File objects (preview mode)
    if (value.file && value.file instanceof globalThis.File) {
      const blobUrl = URL.createObjectURL(value.file);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = value.fileName || "file";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      return;
    }

    // Handle S3 files (review mode)
    const filePath = value.filePath || (typeof value.file === "string" ? value.file : undefined);
    if (!filePath) {
      notificationService.warning("File path missing.", "Cannot Download File");
      return;
    }

    setLoading(true);
    let blobUrl: string | null = null;
    try {
      const encoded = encodeURIComponent(filePath);
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const downloadUrl = `${base.replace(/\/$/, "")}/file/download/${encoded}`;

      const accessToken = readAccessTokenFromLocalStorage();
      if (!accessToken) {
        throw new Error("No auth token available. Please login.");
      }

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = value.fileName || "file";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error(err);
      notificationService.error("Download failed: " + (err.message || err), "Download Failed");
    } finally {
      if (blobUrl) {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl!);
        }, 100);
      }
      setLoading(false);
    }
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
          </div>
          <div className="flex items-center gap-1">
            {((value.file && value.file instanceof globalThis.File) || value.filePath || (typeof value.file === "string" && value.file)) && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleView}
                  disabled={loading || uploading}
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
                  disabled={loading || uploading}
                  className="h-8 w-8 p-0"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={uploading || loading}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
