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

async function fetchSignedUrl(filePath: string, token?: string): Promise<string> {
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
    const signed = json?.data?.signedUrl ?? json?.signedUrl ?? json?.url ?? null;
    if (!signed) throw new Error(`Signed URL not found in response: ${text.slice(0, 300)}`);
    return signed;
  } catch (err) {
    // Not JSON (or parse failed) — return the raw text only if it looks like a URL
    const trimmed = text.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    throw new Error(`Unexpected response when fetching signed URL: ${text.slice(0, 300)}`);
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

export const DocumentsTab = ({
  documents = [],
  formData,
  authToken,
}: DocumentsTabProps) => {
  // Prefer `attachedFiles` stored on the submission (reliable)
  const docsFromForm = React.useMemo(() => {
    if (!formData) return [];

    if (
      Array.isArray(formData.attachedFiles) &&
      formData.attachedFiles.length
    ) {
      return formData.attachedFiles.map((f: any, idx: number) => ({
        id: f.id ?? `attached-${idx}`,
        fileName: f.fileName,
        originalName: f.originalName,
        filePath: f.filePath,
        fileSize:
          typeof f.fileSize === "number"
            ? f.fileSize
            : Number(f.fileSize) || undefined,
        mimeType: f.mimeType,
        uploadedBy: f.uploadedBy ?? "Unknown",
        uploadedAt: f.uploadedAt ?? f.uploadedAtString ?? undefined,
      })) as Document[];
    }

    // fallback: try to extract files from nested formData fields (if your app uses nested JSON)
    // (You can keep your old extraction logic here; omitted for brevity)
    return [];
  }, [formData]);

  const allDocuments = documents.length ? documents : docsFromForm;

  const [loading, setLoading] = React.useState<Record<string, boolean>>({});
  const token =
  authToken ??
  (typeof window !== "undefined" ? readAccessTokenFromLocalStorage() : undefined);

  const pickLabel = (d: Document) => {
    // prefer originalName, then fileName, then last segment of filePath
    if (d.originalName) return d.originalName;
    if (d.fileName) return d.fileName;
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
  if (!doc.filePath) { alert("File path missing."); return; }
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
  if (!doc.filePath) { alert("File path missing."); return; }
  setLoading((s) => ({ ...s, [docKey]: true }));
  try {
    const signed = await fetchSignedUrl(doc.filePath, token ?? undefined);
    if (!isProbablyUrl(signed)) {
      console.error("Signed URL is not a valid URL:", signed);
      alert("Received invalid file URL. Check console/network tab.");
      return;
    }

    // Try native anchor download first
    try {
      const a = document.createElement("a");
      a.href = signed;
      a.download = pickLabel(doc);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (anchorErr) {
      // Fallback: fetch blob then download
      const r = await fetch(signed);
      if (!r.ok) throw new Error("Download failed");
      const blob = await r.blob();
      const link = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = link;
      a.download = pickLabel(doc);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(link);
    }
  } catch (err: any) {
    console.error(err);
    alert("Download failed: " + (err.message || err));
  } finally {
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
                      {doc.uploadedBy ?? "User"} on{" "}
                      {formatDate(doc.uploadedAt)}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                      <DropdownMenuItem>Share</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </SectionCard>
  );
};
