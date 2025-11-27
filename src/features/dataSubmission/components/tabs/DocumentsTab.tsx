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
  filePath?: string; // S3 key (for review mode)
  originalName?: string;
  fileSize?: number | string;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt?: string | Date;
  _fileObject?: File; // Internal reference for local File objects (preview mode only)
}

interface DocumentsTabProps {
  documents?: Document[]; // if provided directly
  formData?: any; // fallback to extracting files from formData
  authToken?: string; // optional token override
  submissionId?: string; // optional submission ID
  isPreview?: boolean; // true for preview mode (local files), false for review mode (S3 files)
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

/**
 * Recursively extract file metadata from nested formData structure
 * In preview mode: extracts FileUpload objects with file: File
 * In review mode: extracts objects with filePath (S3 paths)
 */
function extractFilesFromFormData(
  obj: any,
  collectedFiles: Document[] = [],
  seenPaths: Set<string> = new Set(),
  seenIds: Set<string> = new Set(),
  isPreview: boolean = false
): Document[] {
  if (!obj || typeof obj !== "object") return collectedFiles;

  // In review mode: Check if this object itself is a file metadata object with filePath
  if (!isPreview && obj.filePath && typeof obj.filePath === "string" && obj.filePath.trim() !== "") {
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
    return collectedFiles;
  }

  // In preview mode: Check if this is a FileUpload object with file: File
  // This handles objects like {id, file: File, fileName, fileSize, ...}
  if (isPreview) {
    // Helper function to recursively find File in nested structure
    const findFileInNested = (obj: any, maxDepth = 5, currentDepth = 0): File | null => {
      if (currentDepth >= maxDepth) return null;
      if (obj instanceof File) return obj;
      if (!obj || typeof obj !== 'object') return null;
      
      // Check common property names
      if (obj.file instanceof File) return obj.file;
      if (obj.file?.file instanceof File) return obj.file.file;
      if (obj.file?.file?.file instanceof File) return obj.file.file.file;
      
      // Recursively search in nested objects
      for (const key of ['file', 'data', 'blob', 'content']) {
        if (obj[key] instanceof File) return obj[key];
        if (obj[key] && typeof obj[key] === 'object') {
          const found = findFileInNested(obj[key], maxDepth, currentDepth + 1);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Try to find File in nested structure
    const file = findFileInNested(obj);
    if (file) {
      const fileId = obj.id ?? `${file.name}-${file.size}-${file.lastModified}`;
      
      if (!seenIds.has(fileId)) {
        seenIds.add(fileId);
        collectedFiles.push({
          id: fileId,
          fileName: obj.fileName || file.name,
          originalName: obj.originalName || file.name,
          filePath: undefined, // No filePath for local files
          fileSize: obj.fileSize ?? file.size,
          mimeType: obj.mimeType || file.type,
          uploadedBy: obj.uploadedBy ?? "Unknown",
          uploadedAt: obj.uploadedAt ? (typeof obj.uploadedAt === 'number' ? new Date(obj.uploadedAt) : new Date(obj.uploadedAt)) : new Date(file.lastModified),
          _fileObject: file, // Store File object for preview
        });
      }
    }
  }

  // In preview mode: Check if this is a direct File instance
  if (isPreview && obj instanceof File) {
    const fileId = `${obj.name}-${obj.size}-${obj.lastModified}`;
    if (!seenIds.has(fileId)) {
      seenIds.add(fileId);
      collectedFiles.push({
        id: fileId,
        fileName: obj.name,
        originalName: obj.name,
        filePath: undefined,
        fileSize: obj.size,
        mimeType: obj.type,
        uploadedBy: "Unknown",
        uploadedAt: new Date(obj.lastModified),
        _fileObject: obj,
      });
    }
    return collectedFiles;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      extractFilesFromFormData(item, collectedFiles, seenPaths, seenIds, isPreview);
    });
    return collectedFiles;
  }

  // Handle objects - recurse into all properties
  Object.values(obj).forEach((value) => {
    extractFilesFromFormData(value, collectedFiles, seenPaths, seenIds, isPreview);
  });

  return collectedFiles;
}

export const DocumentsTab = ({
  documents = [],
  formData,
  authToken,
  isPreview = false,
}: DocumentsTabProps) => {
  // Extract files from formData
  const docsFromForm = React.useMemo(() => {
    if (!formData) return [];

    const collectedFiles: Document[] = [];
    const seenPaths = new Set<string>();
    const seenIds = new Set<string>();

    // First, check for attachedFiles array (if present)
    if (Array.isArray(formData.attachedFiles) && formData.attachedFiles.length) {
      formData.attachedFiles.forEach((f: any, idx: number) => {
        if (isPreview) {
          // In preview mode, check for File objects
          if (f.file instanceof File) {
            const fileId = f.id ?? `${f.file.name}-${f.file.size}-${f.file.lastModified}`;
            if (!seenIds.has(fileId)) {
              seenIds.add(fileId);
              collectedFiles.push({
                id: fileId,
                fileName: f.fileName || f.file.name,
                originalName: f.file.name,
                filePath: undefined,
                fileSize: f.fileSize ?? f.file.size,
                mimeType: f.mimeType || f.file.type,
                uploadedBy: f.uploadedBy ?? "Unknown",
                uploadedAt: f.uploadedAt ? new Date(f.uploadedAt) : new Date(f.file.lastModified),
                _fileObject: f.file,
              });
            }
          } else if (f.filePath) {
            // Fallback: if no File object but has filePath, include it (might be from previous upload)
            if (!seenPaths.has(f.filePath)) {
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
          }
        } else {
          // In review mode, check for filePath
          if (f.filePath && typeof f.filePath === "string" && f.filePath.trim() !== "") {
            if (!seenPaths.has(f.filePath)) {
              seenPaths.add(f.filePath);
              collectedFiles.push({
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
              });
            }
          }
        }
      });
    }

    // Then, recursively extract files from nested formData fields
    const { attachedFiles, ...restOfFormData } = formData;
    
    console.log("📄 DocumentsTab - Before extraction:", {
      isPreview,
      formDataKeys: Object.keys(restOfFormData),
      pppDevKeys: restOfFormData.pppDevelopment ? Object.keys(restOfFormData.pppDevelopment) : [],
      section3_1File: restOfFormData.pppDevelopment?.section3_1?.file,
      section3_1FileType: typeof restOfFormData.pppDevelopment?.section3_1?.file,
      section3_1FileKeys: restOfFormData.pppDevelopment?.section3_1?.file ? Object.keys(restOfFormData.pppDevelopment.section3_1.file) : [],
      section3_1FileFile: restOfFormData.pppDevelopment?.section3_1?.file?.file,
      section3_1FileFileType: typeof restOfFormData.pppDevelopment?.section3_1?.file?.file,
      section3_1FileFileIsFile: restOfFormData.pppDevelopment?.section3_1?.file?.file instanceof File,
      section3_1FileId: restOfFormData.pppDevelopment?.section3_1?.file?.id,
      section3_2File: restOfFormData.pppDevelopment?.section3_2?.file,
      section3_2FileId: restOfFormData.pppDevelopment?.section3_2?.file?.id,
      section3_2FileFileIsFile: restOfFormData.pppDevelopment?.section3_2?.file?.file instanceof File,
    });
    
    extractFilesFromFormData(restOfFormData, collectedFiles, seenPaths, seenIds, isPreview);

    console.log("📄 DocumentsTab - Extracted files:", {
      isPreview,
      totalFiles: collectedFiles.length,
      files: collectedFiles.map(f => ({
        id: f.id,
        fileName: f.fileName,
        hasFileObject: !!f._fileObject,
        hasFilePath: !!f.filePath,
      })),
    });

    return collectedFiles;
  }, [formData, isPreview]);

  // Create a direct lookup map from formData for faster access (moved outside to fix React Hook error)
  const fileLookupMap = React.useMemo(() => {
    if (!isPreview || !formData) return new Map<string, File>();
    
    const map = new Map<string, File>();
    
    const extractFiles = (obj: any, path = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      // Check if this is a file object with an ID
      if (obj.id && typeof obj.id === 'string') {
        // Try multiple nested paths to find the File
        let foundFile: File | null = null;
        
        if (obj.file instanceof File) {
          foundFile = obj.file;
          console.log("📄 Found File in map (direct):", obj.id, obj.file.name, "at path:", path);
        } else if (obj.file?.file instanceof File) {
          foundFile = obj.file.file;
          console.log("📄 Found File in map (nested file.file):", obj.id, obj.file.file.name, "at path:", path);
        } else if (obj.file?.file?.file instanceof File) {
          foundFile = obj.file.file.file;
          console.log("📄 Found File in map (nested file.file.file):", obj.id, obj.file.file.file.name, "at path:", path);
        } else if (obj.file?.file?.file?.file instanceof File) {
          foundFile = obj.file.file.file.file;
          console.log("📄 Found File in map (nested file.file.file.file):", obj.id, obj.file.file.file.file.name, "at path:", path);
        }
        
        if (foundFile) {
          map.set(obj.id, foundFile);
        } else if (path.includes('section3_') && path.includes('file')) {
          // Log when we find file objects in section3 paths but no File instance
          console.log("📄 Found file object at section3 path but no File:", {
            id: obj.id,
            path,
            hasFile: !!obj.file,
            fileType: typeof obj.file,
            fileIsFile: obj.file instanceof File,
            fileFileIsFile: obj.file?.file instanceof File,
            fileFileFileIsFile: obj.file?.file?.file instanceof File,
            fileKeys: obj.file ? Object.keys(obj.file) : [],
            fileValue: obj.file, // Log the entire file object to see its structure
            fileFileValue: obj.file?.file, // Log file.file to see what it is
            fileFileType: typeof obj.file?.file,
            fileFileKeys: obj.file?.file ? Object.keys(obj.file.file) : [],
            // Try to find File by recursively searching obj.file
            fileFileFileValue: obj.file?.file?.file,
            fileFileFileType: typeof obj.file?.file?.file,
          });
        }
      }
      
      // Recurse
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => extractFiles(item, `${path}[${idx}]`));
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          extractFiles(value, path ? `${path}.${key}` : key);
        });
      }
    };
    
    extractFiles(formData);
    
    console.log("📄 File lookup map created:", {
      mapSize: map.size,
      mapKeys: Array.from(map.keys()),
    });
    
    return map;
  }, [formData, isPreview]);

  // Process documents prop to ensure File objects are preserved in preview mode
  // Also try to find File objects from formData if they're not in the document
  const processedDocuments = React.useMemo(() => {
    if (!isPreview || !documents.length) return documents;
    
    console.log("📄 Processing documents prop:", {
      documentsCount: documents.length,
      sampleDoc: documents[0],
      sampleDocFile: (documents[0] as any)?.file,
      sampleDocFileType: typeof (documents[0] as any)?.file,
      sampleDocFileIsFile: (documents[0] as any)?.file instanceof File,
      sampleDocFileFile: (documents[0] as any)?.file?.file,
      sampleDocFileFileIsFile: (documents[0] as any)?.file?.file instanceof File,
      lookupMapSize: fileLookupMap.size,
    });
    
    // Helper function to recursively find File objects in formData
    // This searches for File instances regardless of ID matching
    const findAllFilesInFormData = (formDataObj: any, foundFiles: File[] = []): File[] => {
      if (!formDataObj || typeof formDataObj !== 'object') return foundFiles;
      
      // Check if this is a File instance
      if (formDataObj instanceof File) {
        foundFiles.push(formDataObj);
        return foundFiles;
      }
      
      // Check if obj.file is a File
      if (formDataObj.file instanceof File) {
        foundFiles.push(formDataObj.file);
      }
      
      // Check if obj.file.file is a File
      if (formDataObj.file?.file instanceof File) {
        foundFiles.push(formDataObj.file.file);
      }
      
      // Check if obj.file.file.file is a File
      if (formDataObj.file?.file?.file instanceof File) {
        foundFiles.push(formDataObj.file.file.file);
      }
      
      // Recurse into nested objects and arrays
      if (Array.isArray(formDataObj)) {
        formDataObj.forEach(item => findAllFilesInFormData(item, foundFiles));
      } else {
        Object.values(formDataObj).forEach(value => findAllFilesInFormData(value, foundFiles));
      }
      
      return foundFiles;
    };
    
    // Helper function to find File object in formData by document metadata (ID, originalName, fileSize)
    const findFileInFormData = (doc: any, formDataObj: any): File | null => {
      if (!formDataObj || typeof formDataObj !== 'object') return null;
      
      // First try to match by ID if doc has an ID
      if (doc.id) {
        // Check if this object has a file with matching ID
        if (formDataObj.id === doc.id) {
          if (formDataObj.file instanceof File) {
            return formDataObj.file;
          }
          if (formDataObj.file?.file instanceof File) {
            return formDataObj.file.file;
          }
        }
        
        // Check if this object has a 'file' property that contains the File
        if (formDataObj.file) {
          if (formDataObj.file instanceof File && formDataObj.id === doc.id) {
            return formDataObj.file;
          }
          if (formDataObj.file.file instanceof File && (formDataObj.file.id === doc.id || formDataObj.id === doc.id)) {
            return formDataObj.file.file;
          }
        }
      }
      
      // Fallback: try to match by originalName and fileSize
      if (doc.originalName && doc.fileSize) {
        const checkMatch = (obj: any): File | null => {
          if (!obj || typeof obj !== 'object') return null;
          
          // Check if this object matches by originalName and fileSize
          if (obj.originalName === doc.originalName && obj.fileSize === doc.fileSize) {
            if (obj.file instanceof File) {
              return obj.file;
            }
            if (obj.file?.file instanceof File) {
              return obj.file.file;
            }
          }
          
          // Check nested file objects
          if (obj.file && typeof obj.file === 'object') {
            if (obj.file.originalName === doc.originalName && obj.file.fileSize === doc.fileSize) {
              if (obj.file.file instanceof File) {
                return obj.file.file;
              }
            }
          }
          
          return null;
        };
        
        const matched = checkMatch(formDataObj);
        if (matched) return matched;
      }
      
      // Recurse into nested objects and arrays
      if (Array.isArray(formDataObj)) {
        for (const item of formDataObj) {
          const found = findFileInFormData(doc, item);
          if (found) return found;
        }
      } else {
        for (const value of Object.values(formDataObj)) {
          const found = findFileInFormData(doc, value);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    return documents.map((doc: any) => {
      // If document has a file property that's a File object, preserve it
      if (doc.file instanceof File && !doc._fileObject) {
        console.log("📄 Found File in doc.file:", doc.fileName || doc.file.name);
        return {
          ...doc,
          _fileObject: doc.file,
          filePath: undefined, // Clear filePath for local files
        };
      }
      // If document is a FileUpload-like object with nested file.file
      if (doc.file && typeof doc.file === 'object' && doc.file.file instanceof File) {
        console.log("📄 Found File in doc.file.file:", doc.file.fileName || doc.file.file.name);
        return {
          ...doc,
          _fileObject: doc.file.file,
          fileName: doc.fileName || doc.file.fileName || doc.file.file.name,
          originalName: doc.originalName || doc.file.originalName || doc.file.file.name,
          fileSize: doc.fileSize || doc.file.fileSize || doc.file.file.size,
          mimeType: doc.mimeType || doc.file.mimeType || doc.file.file.type,
          uploadedAt: doc.uploadedAt || doc.file.uploadedAt,
          filePath: undefined,
        };
      }
      // If document already has _fileObject, keep it
      if (doc._fileObject instanceof File) {
        return doc;
      }
      
      // Try to find File object in formData by document ID using lookup map
      if (doc.id) {
        const fileObj = fileLookupMap.get(doc.id);
        if (fileObj instanceof File) {
          console.log("📄 Found File in lookup map for doc:", doc.id, fileObj.name);
          return {
            ...doc,
            _fileObject: fileObj,
            filePath: undefined,
          };
        }
      }
      
      // Fallback: try recursive search by ID, originalName, and fileSize
      if (formData) {
        const fileObj2 = findFileInFormData(doc, formData);
        if (fileObj2 instanceof File) {
          console.log("📄 Found File in formData (recursive) for doc:", doc.id || doc.originalName, fileObj2.name);
          return {
            ...doc,
            _fileObject: fileObj2,
            filePath: undefined,
          };
        }
      }
      
      if (doc.id) {
        console.log("📄 No File object found for doc ID:", doc.id, "in lookup map or formData");
      }
      
      console.log("📄 No File object found in doc:", doc);
      return doc;
    });
  }, [documents, isPreview, formData, fileLookupMap]);

  const allDocuments: Document[] = (Array.isArray(processedDocuments) && (processedDocuments as Document[]).length > 0) 
    ? (processedDocuments as Document[])
    : (Array.isArray(docsFromForm) ? (docsFromForm as Document[]) : []);

  // Debug logging
  React.useEffect(() => {
    console.log("📄 DocumentsTab Debug:", {
      isPreview,
      documentsCount: documents.length,
      processedDocumentsCount: Array.isArray(processedDocuments) ? processedDocuments.length : 0,
      docsFromFormCount: Array.isArray(docsFromForm) ? docsFromForm.length : 0,
      allDocumentsCount: Array.isArray(allDocuments) ? allDocuments.length : 0,
      sampleDoc: allDocuments[0],
      sampleDocHasFileObject: !!allDocuments[0]?._fileObject,
      sampleDocHasFilePath: !!allDocuments[0]?.filePath,
      formDataKeys: formData ? Object.keys(formData) : [],
      formDataPppDev: formData?.pppDevelopment ? Object.keys(formData.pppDevelopment) : [],
    });
  }, [isPreview, documents, processedDocuments, docsFromForm, allDocuments, formData]);

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
    // Handle local File objects (preview mode - preferred)
    if (isPreview && doc._fileObject) {
      const file = doc._fileObject;
      const blobUrl = URL.createObjectURL(file);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    // Handle S3 files (review mode or preview mode fallback)
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
    // Handle local File objects (preview mode - preferred)
    if (isPreview && doc._fileObject) {
      const file = doc._fileObject;
      const blobUrl = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = pickLabel(doc);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      return;
    }

    // Handle S3 files (review mode or preview mode fallback)
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
        {(!Array.isArray(allDocuments) || allDocuments.length === 0) ? (
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
                    disabled={isLoading || (!doc.filePath && !doc._fileObject)}
                    title={(!doc.filePath && !doc._fileObject) ? "File not available" : "View file"}
                  >
                    <Eye className="w-4 h-4" />
                    {isLoading ? "Opening..." : "View"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onDownload(doc, docKey)}
                    disabled={isLoading || (!doc.filePath && !doc._fileObject)}
                    title={(!doc.filePath && !doc._fileObject) ? "File not available" : "Download file"}
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
