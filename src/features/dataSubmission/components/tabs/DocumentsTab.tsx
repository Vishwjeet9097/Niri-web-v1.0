import React from "react";
import { Eye, Download, MoreVertical, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SectionCard } from "@/features/submission/components/SectionCard";

interface Document {
  id: string;
  fileName?: string;
  filePath?: string; // S3 key
  originalName?: string;
  fileSize?: number | string;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt?: string | Date;
}

interface DocumentsTabProps {
  documents?: Document[]; // if provided directly
  formData?: any; // fallback to extracting files from formData
  authToken?: string; // optional token override
  submissionId?: string; // optional submission ID
}

const getFileIcon = (fileType: string) => (
  <FileText className="w-10 h-10 text-red-500" />
);

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
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"; // set in .env if backend not same origin
  const url = `${base.replace(/\/$/, "")}/file/url/${encoded}`;

  const accessToken = token ?? readAccessTokenFromLocalStorage();
  if (!accessToken) throw new Error("No auth token available. Please login.");

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const text = await res.text();
  // Try to parse JSON — your backend returns { status, data: { signedUrl, filePath, expiresIn } }
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
    // Not JSON (or parse failed) — return the raw text only if it looks like a URL
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
// Simple anchor download (works for most signed URLs)
function downloadByLink(signedUrl: string, filename?: string) {
  const a = document.createElement("a");
  a.href = signedUrl;
  if (filename) a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Recursively extract file metadata from nested formData structure
 * Files are stored as objects with filePath, fileName, originalName, etc.
 */
function extractFilesFromFormData(obj: any, collectedFiles: Document[] = [], seenPaths: Set<string> = new Set()): Document[] {
  if (!obj || typeof obj !== "object") return collectedFiles;

  // Check if this object itself is a file metadata object
  // File metadata objects have filePath and (fileName or originalName)
  if (obj.filePath && typeof obj.filePath === "string" && obj.filePath.trim() !== "") {
    // Avoid duplicates by checking filePath
    if (!seenPaths.has(obj.filePath)) {
      seenPaths.add(obj.filePath);
      collectedFiles.push({
        id: obj.id ?? obj.filePath,
        fileName: obj.fileName,
        originalName: obj.originalName,
        filePath: obj.filePath,
        fileSize: typeof obj.fileSize === "number" ? obj.fileSize : Number(obj.fileSize) || undefined,
        mimeType: obj.mimeType,
        uploadedBy: obj.uploadedBy ?? "Unknown",
        uploadedAt: obj.uploadedAt ?? obj.uploadedAtString ?? undefined,
      });
    }
    // Don't recurse into file metadata objects
    return collectedFiles;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      extractFilesFromFormData(item, collectedFiles, seenPaths);
    });
    return collectedFiles;
  }

  // Handle objects - recurse into all properties
  Object.values(obj).forEach((value) => {
    extractFilesFromFormData(value, collectedFiles, seenPaths);
  });

  return collectedFiles;
}

export const DocumentsTab = ({
  documents = [],
  formData,
  authToken,
}: DocumentsTabProps) => {
  // Extract files from formData (both attachedFiles and nested fields)
  const docsFromForm = React.useMemo(() => {
    if (!formData) return [];

    const collectedFiles: Document[] = [];
    const seenPaths = new Set<string>();

    // First, check for attachedFiles array (if present)
    if (Array.isArray(formData.attachedFiles) && formData.attachedFiles.length) {
      formData.attachedFiles.forEach((f: any, idx: number) => {
        if (f.filePath && !seenPaths.has(f.filePath)) {
          seenPaths.add(f.filePath);
          collectedFiles.push({
            id: f.id ?? `attached-${idx}`,
            fileName: f.fileName,
            originalName: f.originalName,
            filePath: f.filePath,
            fileSize: typeof f.fileSize === "number" ? f.fileSize : Number(f.fileSize) || undefined,
            mimeType: f.mimeType,
            uploadedBy: f.uploadedBy ?? "Unknown",
            uploadedAt: f.uploadedAt ?? f.uploadedAtString ?? undefined,
          });
        }
      });
    }

    // Then, recursively extract files from nested formData fields
    // Skip the attachedFiles property to avoid double-processing
    const { attachedFiles, ...restOfFormData } = formData;
    extractFilesFromFormData(restOfFormData, collectedFiles, seenPaths);

    return collectedFiles;
  }, [formData]);

  // Merge documents prop and extracted files, deduplicating by filePath
  const allDocuments = React.useMemo(() => {
    const merged: Document[] = [];
    const seenPaths = new Set<string>();

    // First add documents from prop
    documents.forEach((doc) => {
      if (doc.filePath && !seenPaths.has(doc.filePath)) {
        seenPaths.add(doc.filePath);
        merged.push(doc);
      }
    });

    // Then add documents extracted from formData (avoiding duplicates)
    docsFromForm.forEach((doc) => {
      if (doc.filePath && !seenPaths.has(doc.filePath)) {
        seenPaths.add(doc.filePath);
        merged.push(doc);
      }
    });

    return merged;
  }, [documents, docsFromForm]);

  const [loading, setLoading] = React.useState<Record<string, boolean>>({});
  const token =
    authToken ??
    (typeof window !== "undefined"
      ? readAccessTokenFromLocalStorage()
      : undefined);

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

  const pickLabel = (d: Document) => {
    // prefer originalName, then extracted from fileName, then fileName, then last segment of filePath
    if (d.originalName) return d.originalName;
    if (d.fileName) {
      const extracted = extractOriginalName(d.fileName, d.originalName);
      if (extracted !== d.fileName) return extracted; // If extraction succeeded, use it
      return d.fileName;
    }
    if (d.filePath) return d.filePath.split("/").pop() ?? d.filePath;
    return "unknown-file";
  };

  const formatSize = (s?: number | string) => {
    if (!s) return "Unknown size";
    const n = typeof s === "string" ? Number(s) : s;
    if (!n || Number.isNaN(n)) return "Unknown size";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (d?: string | Date) => {
    if (!d) return "Unknown date";
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return "Unknown date";
    return dt.toLocaleString();
  };

  const onView = async (doc: Document, docKey: string) => {
    if (!doc.filePath) {
      alert("File path missing.");
      return;
    }
    setLoading((s) => ({ ...s, [docKey]: true }));
    try {
      const signed = await fetchSignedUrl(doc.filePath, token ?? undefined);
      if (!isProbablyUrl(signed)) {
        console.error("Signed URL is not a valid URL:", signed);
        alert("Received invalid file URL. Check console/network tab.");
        return;
      }
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error(err);
      alert("Failed to open file: " + (err.message || err));
    } finally {
      setLoading((s) => ({ ...s, [docKey]: false }));
    }
  };

  const onDownload = async (doc: Document, docKey: string) => {
    if (!doc.filePath) {
      alert("File path missing.");
      return;
    }
    setLoading((s) => ({ ...s, [docKey]: true }));
    let blobUrl: string | null = null;
    try {
      // Use backend download endpoint to bypass CORS issues
      const encoded = encodeURIComponent(doc.filePath);
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      const downloadUrl = `${base.replace(/\/$/, "")}/file/download/${encoded}`;

      const accessToken = token ?? readAccessTokenFromLocalStorage();
      if (!accessToken) {
        throw new Error("No auth token available. Please login.");
      }

      // Fetch file through backend proxy with proper headers for download
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get file as blob
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = pickLabel(doc);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      console.error(err);
      alert("Download failed: " + (err.message || err));
    } finally {
      // Clean up blob URL after a short delay
      if (blobUrl) {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl!);
        }, 100);
      }
      setLoading((s) => ({ ...s, [docKey]: false }));
    }
  };

  return (
    <SectionCard
      title="Document Review"
      subtitle="Data related to infrastructure financing and budget allocation"
      className="mb-6"
    >
      <CardContent className="space-y-4">
        {allDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No documents found in this submission</p>
          </div>
        ) : (
          allDocuments.map((doc, idx) => {
            const docKey = doc.id ?? doc.filePath ?? `doc-${idx}`;
            const label = pickLabel(doc);
            const isLoading = !!loading[docKey];

            return (
              <div
                key={docKey}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getFileIcon(
                    (doc.fileName || doc.originalName || "").split(".").pop() ||
                      ""
                  )}
                  <div>
                    <h4 className="font-semibold text-foreground">{label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatSize(doc.fileSize)} | Uploaded by{" "}
                      {doc.uploadedBy ?? "User"} on {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onView(doc, docKey)}
                    disabled={isLoading}
                  >
                    <Eye className="w-4 h-4" />
                    {isLoading ? "Opening..." : "View"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onDownload(doc, docKey)}
                    disabled={isLoading}
                  >
                    <Download className="w-4 h-4" />
                    {isLoading ? "Downloading..." : "Download"}
                  </Button>
                  {/* <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu> */}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </SectionCard>
  );
};
