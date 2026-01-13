import React from "react";
import { Eye, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { getIndicatorDisplayName } from "@/utils/indicatorUtils";
import { getMinistrySubmissionDetailsForReview } from "@/services/ministry.service";
import { transformApiResponseToFormData } from "../../utils/formDataTransformer";

interface Document {
  id: string;
  fileName?: string;
  filePath?: string; // S3 key
  originalName?: string;
  fileSize?: number | string;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt?: string | Date;
  category?: string;
  indicatorCode?: string;
  indicatorName?: string;
  sectionKey?: string;
  entryIndex?: number; // For tracking multiple entries within an indicator
}

interface MinistryDocumentsTabProps {
  submission?: any;
  documents?: Document[]; // if provided directly
  formData?: any; // fallback to extracting files from formData
  authToken?: string; // optional token override
  submissionId?: string; // optional submission ID
}

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

// Map section keys to indicator codes (same as state)
const SECTION_TO_INDICATOR_MAP: Record<string, string> = {
  section1_1: "1.1",
  section1_2: "1.2",
  section1_3: "1.3",
  section1_4: "1.4",
  section1_5: "1.5",
  section2_1: "2.1",
  section2_2: "2.2",
  section2_3: "2.3",
  section2_4: "2.4",
  section2_5: "2.5",
  section3_1: "3.1",
  section3_2: "3.2",
  section3_3: "3.3",
  section3_4: "3.4",
  section4_1: "4.1",
  section4_2: "4.2",
  section4_3: "4.3",
  section4_4: "4.4",
  section4_5: "4.5",
  section4_6: "4.6",
};

/**
 * Get category from section key (ministry uses flat structure: section1_1, section2_1, etc.)
 */
function getCategoryFromSectionKey(sectionKey: string): string | undefined {
  if (!sectionKey || !sectionKey.startsWith("section")) return undefined;
  
  // Extract section number (e.g., "1_1" from "section1_1")
  const match = sectionKey.match(/^section(\d+)_/);
  if (!match) return undefined;
  
  const categoryNum = parseInt(match[1], 10);
  if (categoryNum === 1) return "infraFinancing";
  if (categoryNum === 2) return "infraDevelopment";
  if (categoryNum === 3) return "pppDevelopment";
  if (categoryNum === 4) return "infraEnablers";
  
  return undefined;
}

/**
 * Recursively extract files from formData with category and indicator tracking
 * This allows same file to appear multiple times if used in different indicators/entries
 * Handles both nested (state) and flat (ministry) formData structures
 */
function extractFilesWithContext(
  obj: any,
  collectedFiles: Document[] = [],
  path: string[] = [],
  category?: string,
  sectionKey?: string,
  entryIndex?: number
): Document[] {
  if (!obj || typeof obj !== "object") return collectedFiles;

  // Detect category from path
  let currentCategory = category;
  let currentSectionKey = sectionKey;
  let currentEntryIndex = entryIndex;

  // Check if we're entering a category (nested structure like state)
  if (path.length === 1 && ["infraFinancing", "infraDevelopment", "pppDevelopment", "infraEnablers"].includes(path[0])) {
    currentCategory = path[0];
  }

  // Check if we're entering a section (nested structure like state)
  if (path.length === 2 && path[0] && ["infraFinancing", "infraDevelopment", "pppDevelopment", "infraEnablers"].includes(path[0])) {
    const section = path[1];
    if (section && typeof section === "string" && section.startsWith("section")) {
      currentSectionKey = section;
      // Derive category from section key if not already set
      if (!currentCategory) {
        currentCategory = getCategoryFromSectionKey(section);
      }
    }
  }

  // Check if we're at root level with a section key (flat structure like ministry)
  // This handles formData like { section1_1: {...}, section2_1: {...} }
  if (path.length === 1 && path[0] && typeof path[0] === "string" && path[0].startsWith("section")) {
    currentSectionKey = path[0];
    // Derive category from section key
    currentCategory = getCategoryFromSectionKey(path[0]) || currentCategory;
  }

  // Check if we're in an array (for tracking entry index)
  if (Array.isArray(obj) && currentSectionKey) {
    obj.forEach((item, idx) => {
      extractFilesWithContext(item, collectedFiles, [...path, `[${idx}]`], currentCategory, currentSectionKey, idx);
    });
    return collectedFiles;
  }

  // Check if this object is a file metadata object
  if (obj.filePath && typeof obj.filePath === "string" && obj.filePath.trim() !== "") {
    const indicatorCode = currentSectionKey ? SECTION_TO_INDICATOR_MAP[currentSectionKey] : undefined;
    const indicatorName = indicatorCode ? getIndicatorDisplayName(indicatorCode) : undefined;
    
    // Ensure category is set (derive from section key if needed)
    const finalCategory = currentCategory || (currentSectionKey ? getCategoryFromSectionKey(currentSectionKey) : undefined);
    
    collectedFiles.push({
      id: obj.id ?? obj.filePath,
      fileName: obj.fileName,
      originalName: obj.originalName,
      filePath: obj.filePath,
      fileSize: typeof obj.fileSize === "number" ? obj.fileSize : Number(obj.fileSize) || undefined,
      mimeType: obj.mimeType,
      uploadedBy: obj.uploadedBy ?? "Unknown",
      uploadedAt: obj.uploadedAt ?? obj.uploadedAtString ?? undefined,
      category: finalCategory,
      indicatorCode,
      indicatorName,
      sectionKey: currentSectionKey,
      entryIndex: currentEntryIndex,
    });
    return collectedFiles;
  }

  // Handle objects - recurse into all properties
  Object.entries(obj).forEach(([key, value]) => {
    extractFilesWithContext(value, collectedFiles, [...path, key], currentCategory, currentSectionKey, currentEntryIndex);
  });

  return collectedFiles;
}

export function MinistryDocumentsTab({
  submission,
  documents = [],
  formData,
  authToken,
  submissionId,
}: MinistryDocumentsTabProps) {
  const [loadedFormData, setLoadedFormData] = React.useState<Record<string, any> | null>(null);
  const [loadingFormData, setLoadingFormData] = React.useState(false);

  // Load formData if not provided
  React.useEffect(() => {
    const loadFormData = async () => {
      // If formData is already provided, don't load it
      if (formData || submission?.formData) {
        return;
      }

      // Prioritize submissionId prop, then from submission object, then userId as fallback
      const targetSubmissionId = submissionId || submission?.id || submission?.submissionId;
      const targetUserId = submission?.user?.id;
      
      if (!targetSubmissionId && !targetUserId) {
        return;
      }

      try {
        setLoadingFormData(true);
        console.log("📋 Loading formData for documents tab, submissionId:", targetSubmissionId, "userId:", targetUserId);
        const response = await getMinistrySubmissionDetailsForReview(targetSubmissionId, targetUserId);

        if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
          const transformedFormData = transformApiResponseToFormData(response.data, {});
          console.log("📋 Loaded formData for documents tab:", Object.keys(transformedFormData));
          setLoadedFormData(transformedFormData);
        }
      } catch (error: any) {
        console.error("Error loading formData for documents tab:", error);
      } finally {
        setLoadingFormData(false);
      }
    };

    loadFormData();
  }, [formData, submission?.formData, submissionId, submission?.id, submission?.submissionId, submission?.user?.id]);

  // Extract formData from submission if not provided directly, or use loaded formData
  const actualFormData = formData || submission?.formData || loadedFormData;

  // Extract files from formData with context tracking
  const docsFromForm = React.useMemo(() => {
    if (!actualFormData) return [];

    const collectedFiles: Document[] = [];

    // Extract files from nested formData fields with context tracking
    const { attachedFiles, ...restOfFormData } = actualFormData;
    extractFilesWithContext(restOfFormData, collectedFiles);

    // Also handle attachedFiles if present
    if (Array.isArray(attachedFiles) && attachedFiles.length) {
      attachedFiles.forEach((f: any, idx: number) => {
        if (f.filePath && typeof f.filePath === "string" && f.filePath.trim() !== "") {
          collectedFiles.push({
            id: f.id ?? `attached-${idx}`,
            fileName: f.fileName,
            originalName: f.originalName,
            filePath: f.filePath,
            fileSize: typeof f.fileSize === "number" ? f.fileSize : Number(f.fileSize) || undefined,
            mimeType: f.mimeType,
            uploadedBy: f.uploadedBy ?? "Unknown",
            uploadedAt: f.uploadedAt ?? f.uploadedAtString ?? undefined,
            category: "attachedFiles",
            indicatorCode: undefined,
            indicatorName: "Attached Files",
          });
        }
      });
    }

    return collectedFiles;
  }, [actualFormData]);

  // Merge documents prop and extracted files (allow duplicates for same file in different indicators)
  const allDocuments = React.useMemo(() => {
    const merged: Document[] = [...documents];
    
    // Add documents extracted from formData (allow duplicates for same file in different indicators)
    docsFromForm.forEach((doc) => {
      merged.push(doc);
    });

    return merged;
  }, [documents, docsFromForm]);

  // Flatten all files for single table display, filtering out files without proper category
  const allFilesFlat = React.useMemo(() => {
    return allDocuments.filter((doc) => {
      const category = doc.category;
      // Only include files with valid categories (exclude "other" and undefined)
      return category && 
             category !== "other" && 
             ["infraFinancing", "infraDevelopment", "pppDevelopment", "infraEnablers", "attachedFiles"].includes(category);
    });
  }, [allDocuments]);

  const [loading, setLoading] = React.useState<Record<string, boolean>>({});
  const token =
    authToken ??
    (typeof window !== "undefined"
      ? readAccessTokenFromLocalStorage()
      : undefined);

  // Helper to extract original name from UUID-prefixed string
  const extractOriginalNameFromString = (name: string): string => {
    if (!name || !name.trim()) return name || "";
    
    // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
    // Matches UUID followed by underscore or hyphen
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]/i;
    
    if (uuidPattern.test(name)) {
      const extracted = name.replace(uuidPattern, '');
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }
    
    return name;
  };

  // Helper to extract original name from UUID-prefixed fileName for existing files
  const extractOriginalName = (fileName: string | undefined, originalName?: string): string => {
    // First priority: use originalName if available
    if (originalName && originalName.trim()) return originalName;
    
    // Second priority: extract from fileName if it exists
    if (fileName && fileName.trim()) {
      return extractOriginalNameFromString(fileName);
    }
    
    return fileName || "";
  };

  const pickLabel = (d: Document) => {
    // Priority 1: Use originalName if available
    if (d.originalName && d.originalName.trim()) {
      return d.originalName;
    }
    
    // Priority 2: Extract from fileName
    if (d.fileName && d.fileName.trim()) {
      const extracted = extractOriginalName(d.fileName, d.originalName);
      if (extracted && extracted.trim().length > 0 && extracted !== d.fileName) {
        return extracted;
      }
      // If extraction didn't change the name, check if it's not a UUID pattern
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]/i;
      if (!uuidPattern.test(d.fileName)) {
        return d.fileName;
      }
    }
    
    // Priority 3: Extract from filePath (last segment)
    if (d.filePath && d.filePath.trim()) {
      const fileNameFromPath = d.filePath.split("/").pop() ?? d.filePath;
      const extracted = extractOriginalNameFromString(fileNameFromPath);
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
      return fileNameFromPath;
    }
    
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

  const getCategoryDisplayName = (category: string): string => {
    const names: Record<string, string> = {
      infraFinancing: "Infrastructure Financing",
      infraDevelopment: "Infrastructure Development",
      pppDevelopment: "PPP Development",
      infraEnablers: "Infrastructure Enablers",
      attachedFiles: "Attached Files",
      other: "Other",
    };
    return names[category] || category;
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
      subtitle="All documents organized by category and indicator"
      className="mb-6"
    >
      <CardContent>
        {loadingFormData ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-pulse" />
            <p>Loading documents...</p>
          </div>
        ) : allFilesFlat.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No documents found in this submission</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Category</TableHead>
                  <TableHead className="w-[250px]">Indicator</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead className="w-[100px]">File Size</TableHead>
                  <TableHead className="w-[180px]">Uploaded At</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allFilesFlat.map((doc, fileIndex) => {
                  const category = doc.category!; // Already filtered, so it's safe
                  const indicatorCode = doc.indicatorCode;
                  const docKey = `${doc.id ?? doc.filePath ?? `doc-${fileIndex}`}-${category}-${indicatorCode || 'unknown'}-${fileIndex}`;
                  const label = pickLabel(doc);
                  const isLoading = !!loading[docKey];
                  
                  // Get indicator name
                  const indicatorName = indicatorCode 
                    ? (doc.indicatorName || getIndicatorDisplayName(indicatorCode))
                    : (doc.indicatorName || "N/A");

  return (
                    <TableRow key={docKey}>
                      <TableCell className="font-medium text-sm">
                        {getCategoryDisplayName(category)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {indicatorCode && (
                            <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/20">
                              {indicatorCode}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {indicatorName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatSize(doc.fileSize)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(doc.uploadedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 h-8 px-2 text-xs"
                            onClick={() => onView(doc, docKey)}
                            disabled={isLoading}
                          >
                            <Eye className="w-3 h-3" />
                            {isLoading ? "..." : "View"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 h-8 px-2 text-xs"
                            onClick={() => onDownload(doc, docKey)}
                            disabled={isLoading}
                          >
                            <Download className="w-3 h-3" />
                            {isLoading ? "..." : "Download"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        </CardContent>
    </SectionCard>
  );
}

