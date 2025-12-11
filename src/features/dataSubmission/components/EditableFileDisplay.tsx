import { useState, useRef } from "react";
import { Upload, X, File, Trash2, Plus, Eye, Download } from "lucide-react";
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

// Helper function to read access token from localStorage
function readAccessTokenFromLocalStorage(): string | undefined {
  try {
    // Try the new key first: niri_app:auth_tokens
    const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
    if (tokenDataRaw) {
      const tokenData = JSON.parse(tokenDataRaw);
      const tokenFromNewKey = tokenData?.value?.accessToken;
      if (tokenFromNewKey) return tokenFromNewKey;
    }
    
    // Try legacy key: access_token
    const tokenFromLegacyKey = localStorage.getItem("access_token");
    if (tokenFromLegacyKey) return tokenFromLegacyKey;
    
    // Try old auth_user key as fallback
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

// Helper function to normalize file paths (convert backslashes to forward slashes)
function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
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
  console.log("🔍 [EditableFileDisplay] Signed URL response:", text);
  try {
    const json = JSON.parse(text);
    console.log("🔍 [EditableFileDisplay] Signed URL:", json);
    const signed = json?.data?.signedUrl ?? json?.signedUrl ?? json?.url ?? json?.data?.filePath ?? json?.filePath ?? null;
    if (!signed) throw new Error(`Signed URL not found in response: ${text.slice(0, 300)}`);
    
    // If it's a valid URL, return it
    if (isProbablyUrl(signed)) {
      return signed;
    }
    
    // If it's a path (not a URL), normalize it and return it
    // The caller will construct the proper URL
    const normalizedSigned = normalizeFilePath(signed);
    return normalizedSigned;
  } catch (err) {
    // If JSON parsing failed, check if the raw text is a URL
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    
    // If it's a path, normalize it and return it
    const normalizedTrimmed = normalizeFilePath(trimmed);
    if (/^https?:\/\//i.test(normalizedTrimmed)) return normalizedTrimmed;
    
    // Return the normalized path - caller will construct URL
    return normalizedTrimmed;
  }
}

function isProbablyUrl(s: string) {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

// Helper function to safely check if a value is a File instance
function isFileInstance(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  
  try {
    // Check if File constructor exists and is callable
    if (typeof File === "undefined") return false;
    if (typeof File !== "function") return false;
    
    // Use instanceof only if File is actually a constructor
    return value instanceof File;
  } catch (e) {
    // If instanceof fails, check for File-like properties as fallback
    return (
      typeof value.name === "string" &&
      typeof value.size === "number" &&
      typeof value.type === "string" &&
      typeof value.lastModified === "number"
    );
  }
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

  const normalizeFile = (fileLike: FileLike, fallbackIndex: number): FileUpload => {
    const anyFile = fileLike as any;
    
    // Handle nested file structure (e.g., file.file from backend)
    // Check if there's a nested file object and use it if the outer one doesn't have filePath
    let actualFile = anyFile;
    if (anyFile.file && typeof anyFile.file === 'object' && !anyFile.filePath && anyFile.file.filePath) {
      // Use nested file object if outer doesn't have filePath
      actualFile = anyFile.file;
    }
    
    const rawFile = actualFile.file;
    let normalizedFile: File | string | null = null;
    
    // Safely get File constructor
    let globalFileCtor: typeof File | undefined = undefined;
    try {
      if (typeof globalThis !== "undefined" && typeof (globalThis as any).File === "function") {
        const FileCtor = (globalThis as any).File;
        // Verify it's actually a constructor by checking if it can be called with 'new'
        if (FileCtor && typeof FileCtor === "function") {
          globalFileCtor = FileCtor;
        }
      }
    } catch (e) {
      // If File constructor is not available, continue without it
      console.warn("File constructor not available:", e);
    }

    // Only use instanceof if we have a valid constructor
    if (globalFileCtor && rawFile && typeof rawFile === "object") {
      try {
        if (rawFile instanceof globalFileCtor) {
          normalizedFile = rawFile as File;
        }
      } catch (e) {
        // If instanceof fails, check for File-like properties as fallback
        if (isFileInstance(rawFile)) {
          normalizedFile = rawFile as File;
        }
      }
    } else if (rawFile === null || rawFile === undefined) {
      normalizedFile = null;
    } else if (typeof rawFile === "string") {
      normalizedFile = rawFile;
    } else if (typeof actualFile.filePath === "string") {
      normalizedFile = actualFile.filePath;
    } else if (typeof anyFile.filePath === "string") {
      normalizedFile = anyFile.filePath;
    }

    return {
      id: actualFile.id ?? anyFile.id ?? `file-${fallbackIndex}`,
      file: normalizedFile,
      fileName: actualFile.fileName ?? anyFile.fileName ?? actualFile.filename ?? anyFile.filename ?? "File",
      originalName: actualFile.originalName ?? anyFile.originalName ?? actualFile.original_name ?? anyFile.original_name,
      fileSize: Number(actualFile.fileSize ?? anyFile.fileSize ?? actualFile.size ?? anyFile.size ?? 0),
      uploadedAt: Number(actualFile.uploadedAt ?? anyFile.uploadedAt ?? Date.now()),
      filePath: actualFile.filePath ?? anyFile.filePath ?? (typeof normalizedFile === "string" ? normalizedFile : undefined),
      fileUrl: actualFile.fileUrl ?? anyFile.fileUrl ?? actualFile.url ?? anyFile.url,
      mimeType: actualFile.mimeType ?? anyFile.mimeType,
    };
  };

  const getNormalizedFiles = () => {
    if (!files) {
      console.log("🔍 [EditableFileDisplay] No files prop provided");
      return [];
    }
    
    console.log("🔍 [EditableFileDisplay] Raw files prop:", files, "Type:", typeof files, "IsArray:", Array.isArray(files));
    
    const fileArray = Array.isArray(files) ? files : [files];
    const normalized = fileArray.map((fileLike, index) => {
      console.log(`🔍 [EditableFileDisplay] Normalizing file ${index}:`, fileLike);
      const normalizedFile = normalizeFile(fileLike, index);
      console.log(`🔍 [EditableFileDisplay] Normalized file ${index} result:`, normalizedFile);
      return normalizedFile;
    });
    
    console.log("🔍 [EditableFileDisplay] Normalized files:", normalized);
    
    // Filter out files that don't have any identifying information
    const validFiles = normalized.filter(file => {
      const hasFilePath = !!file.filePath;
      const hasFileName = !!file.fileName && file.fileName !== "File";
      const hasFileSize = !!file.fileSize && file.fileSize > 0;
      const hasFile = !!file.file;
      
      const isValid = hasFilePath || (hasFileName && hasFileSize) || hasFile;
      if (!isValid) {
        console.log(`🔍 [EditableFileDisplay] Filtering out invalid file:`, file);
      }
      return isValid;
    });
    
    console.log("🔍 [EditableFileDisplay] Valid files after filtering:", validFiles);
    
    // Deduplicate files based on filePath (unique identifier for uploaded files)
    const seenPaths = new Set<string>();
    const uniqueFiles: FileUpload[] = [];
    
    for (const file of validFiles) {
      // Use filePath as unique identifier, or fileName + fileSize as fallback
      const uniqueKey = file.filePath || 
        (file.file && typeof file.file === 'string' ? file.file : null) ||
        `${file.fileName}_${file.fileSize}`;
      
      console.log(`🔍 [EditableFileDisplay] File unique key:`, uniqueKey, "for file:", file);
      
      if (uniqueKey && !seenPaths.has(uniqueKey)) {
        seenPaths.add(uniqueKey);
        uniqueFiles.push(file);
      } else if (!uniqueKey) {
        // Even if no unique key, include files that have fileName or fileSize
        if (file.fileName || file.fileSize) {
          console.log(`🔍 [EditableFileDisplay] Including file without unique key:`, file);
          uniqueFiles.push(file);
        }
      }
    }
    
    console.log("🔍 [EditableFileDisplay] Final unique files:", uniqueFiles);
    return uniqueFiles;
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

  const handleView = async (file: FileUpload, fileKey: string) => {
    // Handle local File objects (preview mode)
    if (file.file && file.file instanceof globalThis.File) {
      const blobUrl = URL.createObjectURL(file.file);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    // Handle S3 files (review mode)
    const filePath = file.filePath || (typeof file.file === "string" ? file.file : undefined);
    if (!filePath) {
      notificationService.warning("File path missing.", "Cannot View File");
      return;
    }

    // Normalize the file path before using it
    const normalizedPath = normalizeFilePath(filePath);

    setLoading((s) => ({ ...s, [fileKey]: true }));
    try {
      const signed = await fetchSignedUrl(normalizedPath);
      console.log("[EditableFileDisplay] Signed URL:", signed);
      
      // Check if it's a valid URL
      if (isProbablyUrl(signed)) {
        window.open(signed, "_blank", "noopener,noreferrer");
      } else {
        // If it's a path (not a URL), construct a download/view URL
        const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        // Normalize the path again in case it came back with backslashes
        const pathToUse = normalizeFilePath(signed);
        const encoded = encodeURIComponent(pathToUse);
        const viewUrl = `${base.replace(/\/$/, "")}/file/download/${encoded}`;
        console.log("[EditableFileDisplay] Constructed view URL:", viewUrl);
        window.open(viewUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      console.error(err);
      notificationService.error("Failed to open file: " + (err.message || err), "View Failed");
    } finally {
      setLoading((s) => ({ ...s, [fileKey]: false }));
    }
  };

  const handleDownload = async (file: FileUpload, fileKey: string) => {
    // Handle local File objects (preview mode)
    if (file.file && file.file instanceof globalThis.File) {
      const blobUrl = URL.createObjectURL(file.file);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.originalName || file.fileName || "file";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      return;
    }

    // Handle S3 files (review mode)
    const filePath = file.filePath || (typeof file.file === "string" ? file.file : undefined);
    if (!filePath) {
      notificationService.warning("File path missing.", "Cannot Download File");
      return;
    }

    // Normalize the file path before using it
    const normalizedPath = normalizeFilePath(filePath);

    setLoading((s) => ({ ...s, [fileKey]: true }));
    try {
      // First, try to get a signed URL
      const signed = await fetchSignedUrl(normalizedPath);
      console.log("[EditableFileDisplay] Download - Signed URL:", signed);
      
      // If we got a valid URL, use it directly for download
      if (isProbablyUrl(signed)) {
        const a = document.createElement("a");
        a.href = signed;
        a.download = file.originalName || file.fileName || "file";
        a.rel = "noopener noreferrer";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        notificationService.success("File download started", "Download");
        return;
      }
      
      // If it's a path (not a URL), try to construct download URL
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const pathToUse = normalizeFilePath(signed);
      const encoded = encodeURIComponent(pathToUse);
      const downloadUrl = `${base.replace(/\/$/, "")}/file/download/${encoded}`;
      
      console.log("[EditableFileDisplay] Download URL:", downloadUrl);

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
        const errorText = await response.text().catch(() => response.statusText);
        console.error("[EditableFileDisplay] Download failed:", response.status, errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.originalName || file.fileName || "file";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
      
      notificationService.success("File download started", "Download");
    } catch (err: any) {
      console.error("[EditableFileDisplay] Download error:", err);
      const errorMessage = err.message || err.toString();
      console.error("[EditableFileDisplay] Error details:", {
        filePath: normalizedPath,
        error: errorMessage,
      });
      notificationService.error(
        `Failed to download file: ${errorMessage}`,
        "Download Failed"
      );
    } finally {
      setLoading((s) => ({ ...s, [fileKey]: false }));
    }
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
            const isLoading = loading[fileKey] || false;
            const hasFile = file && (file.file instanceof globalThis.File || file.filePath || file.fileUrl || (typeof file.file === "string" && file.file) || file.fileName);
            
            return (
              <div
                key={fileKey}
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
                <div className="flex items-center gap-1">
                  {hasFile && (
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
                      title="Delete file"
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
            <AlertDialogTitle>Delete file permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This file will be deleted permanently. This action cannot be undone.
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

