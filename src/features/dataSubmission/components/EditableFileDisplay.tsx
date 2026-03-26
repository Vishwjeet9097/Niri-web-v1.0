import { useState, useRef } from "react";
import { Upload, X, File as FileIcon, Trash2, Plus, Eye, Download } from "lucide-react";
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
  const [loading, setLoading] = useState<Record<string, boolean>>({});

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

    // ✅ Store File object directly - upload will happen when user clicks Save button
    // This matches submission-time behavior (FileUploadSection.tsx line 68-77)
    const newFile: FileUpload = {
      id: crypto.randomUUID(),
      file: file, // Store File object, not uploaded path
      fileName: file.name,
      originalName: file.name, // Preserve original file name
      fileSize: file.size,
      uploadedAt: Date.now(),
      mimeType: file.type,
      // No filePath or fileUrl yet - will be set after upload on Save
    };

    // Verify File instance is preserved
    const globalFileCtor =
      typeof globalThis !== "undefined" && typeof (globalThis as any).File === "function"
        ? (globalThis as any).File
        : undefined;
    if (!newFile.file || (globalFileCtor && !(newFile.file instanceof globalFileCtor))) {
      console.error("❌ CRITICAL: File instance lost when creating FileUpload object!");
    }

    // Update files based on multiple prop
    if (multiple) {
      const currentFiles = getNormalizedFiles();
      const updatedFiles = [...currentFiles, newFile] as FileUpload[];
      onFilesChange(updatedFiles);
    } else {
      onFilesChange(newFile);
    }

    notificationService.success("File added successfully", "File Added");
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  // Helper functions for file access
  function readAccessTokenFromLocalStorage(): string | undefined {
    try {
      const raw = localStorage.getItem("niri_app:auth_tokens");
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed?.value?.accessToken;
    } catch (e) {
      console.warn("Failed to read auth token from localStorage", e);
      return undefined;
    }
  }

  async function fetchSignedUrl(
    filePath: string,
    token?: string
  ): Promise<string> {
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

  function isProbablyUrl(s: string) {
    return typeof s === "string" && /^https?:\/\//i.test(s);
  }

  const handleView = async (file: FileUpload, fileKey: string) => {
    // If file has a direct fileUrl, use it
    if (file.fileUrl) {
      try {
        const url = file.fileUrl as string;
        let isProtected = false;
        try {
          const u = new URL(url);
          isProtected = u.pathname.includes("/file/download/");
        } catch {
          isProtected = url.includes("/file/download/");
        }

        if (isProtected) {
          const accessToken = readAccessTokenFromLocalStorage();
          if (!accessToken) {
            throw new Error("No auth token available. Please login.");
          }

          const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            throw new Error(`Download failed: ${res.statusText}`);
          }

          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank", "noopener,noreferrer");
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (err: any) {
        alert("Failed to open file: " + (err?.message || err));
      }
      return;
    }

    // Get File constructor safely
    const globalFileCtor =
      typeof globalThis !== "undefined" && typeof (globalThis as any).File === "function"
        ? (globalThis as any).File
        : undefined;

    // For local File objects (before submission), create object URL
    if (globalFileCtor && file.file instanceof globalFileCtor) {
      const url = URL.createObjectURL(file.file);
      window.open(url, "_blank", "noopener,noreferrer");
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return;
    }

    // If file has filePath, fetch signed URL
    if (file.filePath || (typeof file.file === "string" && file.file)) {
      setLoading((s) => ({ ...s, [fileKey]: true }));
      try {
        const filePath = file.filePath || (file.file as string);
        const signed = await fetchSignedUrl(filePath);
        if (!isProbablyUrl(signed)) {
          console.error("Signed URL is not a valid URL:", signed);
          alert("Received invalid file URL. Check console/network tab.");
          return;
        }
        let isProtected = false;
        try {
          const u = new URL(signed);
          isProtected = u.pathname.includes("/file/download/");
        } catch {
          isProtected = signed.includes("/file/download/");
        }

        if (isProtected) {
          const accessToken = readAccessTokenFromLocalStorage();
          if (!accessToken) {
            throw new Error("No auth token available. Please login.");
          }

          const res = await fetch(signed, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            throw new Error(`Download failed: ${res.statusText}`);
          }

          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, "_blank", "noopener,noreferrer");
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        } else {
          window.open(signed, "_blank", "noopener,noreferrer");
        }
      } catch (err: any) {
        console.error(err);
        alert("Failed to open file: " + (err.message || err));
      } finally {
        setLoading((s) => ({ ...s, [fileKey]: false }));
      }
      return;
    }

    alert("File path or URL missing.");
  };

  const handleDownload = async (file: FileUpload, fileKey: string) => {
    // If file has a direct fileUrl, download it
    if (file.fileUrl) {
      try {
        const url = file.fileUrl as string;
        let isProtected = false;
        try {
          const u = new URL(url);
          isProtected = u.pathname.includes("/file/download/");
        } catch {
          isProtected = url.includes("/file/download/");
        }

        if (isProtected) {
          const accessToken = readAccessTokenFromLocalStorage();
          if (!accessToken) {
            throw new Error("No auth token available. Please login.");
          }

          const res = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            throw new Error(`Download failed: ${res.statusText}`);
          }

          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = file.originalName || file.fileName || "file";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = file.originalName || file.fileName || "file";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err: any) {
        alert("Download failed: " + (err?.message || err));
      }
      return;
    }

    // Get File constructor safely
    const globalFileCtor =
      typeof globalThis !== "undefined" && typeof (globalThis as any).File === "function"
        ? (globalThis as any).File
        : undefined;

    // For local File objects (before submission), create object URL and download
    if (globalFileCtor && file.file instanceof globalFileCtor) {
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

    // If file has filePath, use backend download endpoint
    if (file.filePath || (typeof file.file === "string" && file.file)) {
      setLoading((s) => ({ ...s, [fileKey]: true }));
      let blobUrl: string | null = null;
      try {
        const filePath = file.filePath || (file.file as string);
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
        a.download = file.originalName || file.fileName || "file";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err: any) {
        console.error(err);
        alert("Download failed: " + (err.message || err));
      } finally {
        if (blobUrl) {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl!);
          }, 100);
        }
        setLoading((s) => ({ ...s, [fileKey]: false }));
      }
      return;
    }

    alert("File path or URL missing.");
  };

  const normalizedFiles = getNormalizedFiles();

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      
      {/* Display existing files */}
      {normalizedFiles.length > 0 ? (
        <div className="space-y-2">
          {normalizedFiles.map((file, index) => {
            const fileKey = file.id || `file-${index}`;
            const isLoading = !!loading[fileKey];
            // Get File constructor safely for hasFileAccess check
            const globalFileCtor =
              typeof globalThis !== "undefined" && typeof (globalThis as any).File === "function"
                ? (globalThis as any).File
                : undefined;
            
            // More robust check for file access - ensures local File objects are always detected
            const hasFileAccess = (() => {
              // Check for filePath or fileUrl (uploaded files)
              if (file.filePath || file.fileUrl) return true;
              
              // Check for string file path
              if (typeof file.file === "string" && file.file) return true;
              
              // Check for local File object - multiple ways to detect it for reliability
              if (file.file) {
                // Method 1: instanceof check (most reliable when it works)
                if (globalFileCtor && file.file instanceof globalFileCtor) return true;
                
                // Method 2: Check constructor name (fallback for cross-frame issues)
                if (typeof file.file === "object" && file.file.constructor && file.file.constructor.name === "File") return true;
                
                // Method 3: Check for File-like properties (size, name, type) - most reliable fallback
                if (typeof (file.file as any).size === "number" && typeof (file.file as any).name === "string") return true;
              }
              
              return false;
            })();
            return (
              <div
                key={fileKey}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
              >
                <FileIcon className="w-4 h-4 text-primary flex-shrink-0" />
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
                <div className="flex items-center gap-1">
                  {hasFileAccess && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(file, fileKey)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                        title="View file"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(file, fileKey)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
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

