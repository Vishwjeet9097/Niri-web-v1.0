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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionCard } from "@/features/submission/components/SectionCard";
import { filterFilesByIndicatorAccess, groupFilesByCategoryAndIndicator, getCategoryDisplayName, findIndicatorForFile, findEntryContextForFile } from "@/utils/fileIndicatorMapping";
import { getIndicatorDisplayName } from "@/utils/indicatorUtils";
import { useAuth } from "@/features/auth/AuthProvider";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";

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
  _indicator?: string; // Indicator code determined from formData path (preview mode)
  _formDataPath?: string; // Path in formData where file was found (preview mode, for debugging)
}

interface DocumentsTabProps {
  documents?: Document[]; // if provided directly
  formData?: any; // fallback to extracting files from formData
  authToken?: string; // optional token override
  submissionId?: string; // optional submission ID
  isPreview?: boolean; // true for preview mode (local files), false for review mode (S3 files)
  assignedIndicators?: string[]; // Optional: explicitly pass assigned indicators (for preview mode)
  userRole?: string; // Optional: explicitly pass user role
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
    console.log("📄 Signed URL:", json);
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
 * Extract indicator code from formData path
 * e.g., "pppDevelopment.section3_1.file" -> "3.1"
 */
function extractIndicatorFromFormDataPath(path: string): string | null {
  if (!path) return null;
  
  const SECTION_TO_INDICATOR_MAP: Record<string, string> = {
    section1_1: "1.1", section1_2: "1.2", section1_3: "1.3", section1_4: "1.4", section1_5: "1.5",
    section2_1: "2.1", section2_2: "2.2", section2_3: "2.3", section2_4: "2.4", section2_5: "2.5",
    section3_1: "3.1", section3_2: "3.2", section3_3: "3.3", section3_4: "3.4",
    section4_1: "4.1", section4_2: "4.2", section4_3: "4.3", section4_4: "4.4", section4_5: "4.5", section4_6: "4.6",
  };
  
  const parts = path.split(".");
  for (const part of parts) {
    if (SECTION_TO_INDICATOR_MAP[part]) {
      return SECTION_TO_INDICATOR_MAP[part];
    }
  }
  // Handle array indices: section4_5[0] -> section4_5
  for (const part of parts) {
    const match = part.match(/^(\w+)\[\d+\]$/);
    if (match && SECTION_TO_INDICATOR_MAP[match[1]]) {
      return SECTION_TO_INDICATOR_MAP[match[1]];
    }
  }
  return null;
}

/**
 * Recursively extract file metadata from nested formData structure FOR PREVIEW MODE
 * Tracks the path in formData to determine which indicator the file belongs to
 */
function extractFilesFromFormDataPreview(
  obj: any,
  collectedFiles: Document[] = [],
  seenIds: Set<string> = new Set(),
  currentPath: string = ""
): Document[] {
  if (!obj || typeof obj !== "object") return collectedFiles;

  // Helper function to recursively find File in nested structure
  const findFileInNested = (obj: any, maxDepth = 5, currentDepth = 0): File | null => {
    if (currentDepth >= maxDepth) return null;
    if (obj instanceof File) return obj;
    if (!obj || typeof obj !== 'object') return null;
    
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
      const indicator = extractIndicatorFromFormDataPath(currentPath);
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
        _indicator: indicator || undefined, // Set indicator from path
        _formDataPath: currentPath, // Store path for debugging
      });
    }
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const newPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      extractFilesFromFormDataPreview(item, collectedFiles, seenIds, newPath);
    });
    return collectedFiles;
  }

  // Handle objects - recurse into all properties
  Object.entries(obj).forEach(([key, value]) => {
    if (key.startsWith("_")) return; // Skip internal properties
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    extractFilesFromFormDataPreview(value, collectedFiles, seenIds, newPath);
  });

  return collectedFiles;
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

  // Helper to normalize filePath for comparison
  const normalizePath = (path: string): string => {
    return path.trim().toLowerCase().replace(/[\/\\]+/g, '/');
  };

  // Helper to check if filePath is duplicate
  const isPathDuplicate = (filePath: string): boolean => {
    const normalized = normalizePath(filePath);
    // Check both original and normalized
    if (seenPaths.has(filePath) || seenPaths.has(normalized)) {
      return true;
    }
    seenPaths.add(filePath);
    seenPaths.add(normalized);
    return false;
  };

  // In review mode: Check for filePath in various nested structures
  if (!isPreview) {
    // Check if this object itself has a filePath
    if (obj.filePath && typeof obj.filePath === "string" && obj.filePath.trim() !== "") {
      if (!isPathDuplicate(obj.filePath)) {
        // Also check ID to avoid duplicates
        const fileId = obj.id ?? obj.filePath;
        if (!seenIds.has(fileId)) {
          seenIds.add(fileId);
          collectedFiles.push({
            id: fileId,
            fileName: obj.fileName,
            originalName: obj.originalName,
            filePath: obj.filePath,
            fileSize: typeof obj.fileSize === "number" ? obj.fileSize : Number(obj.fileSize) || undefined,
            mimeType: obj.mimeType,
            uploadedBy: obj.uploadedBy ?? "Unknown",
            uploadedAt: obj.uploadedAt ?? obj.uploadedAtString ?? undefined,
          });
        }
      }
    }
    
    // Check nested structures: obj.file.filePath (common structure like section3_1.file.filePath)
    if (obj.file?.filePath && typeof obj.file.filePath === "string" && obj.file.filePath.trim() !== "") {
      if (!isPathDuplicate(obj.file.filePath)) {
        const fileId = obj.file.id ?? obj.id ?? obj.file.filePath;
        if (!seenIds.has(fileId)) {
          seenIds.add(fileId);
          collectedFiles.push({
            id: fileId,
            fileName: obj.file.fileName,
            originalName: obj.file.originalName,
            filePath: obj.file.filePath,
            fileSize: typeof obj.file.fileSize === "number" ? obj.file.fileSize : Number(obj.file.fileSize) || undefined,
            mimeType: obj.file.mimeType,
            uploadedBy: obj.file.uploadedBy ?? "Unknown",
            uploadedAt: obj.file.uploadedAt ?? obj.file.uploadedAtString ?? undefined,
          });
        }
      }
    }
    
    // Check deeper nested structures: obj.file.file.filePath
    if (obj.file?.file?.filePath && typeof obj.file.file.filePath === "string" && obj.file.file.filePath.trim() !== "") {
      if (!isPathDuplicate(obj.file.file.filePath)) {
        const fileId = obj.file.file.id ?? obj.file.id ?? obj.id ?? obj.file.file.filePath;
        if (!seenIds.has(fileId)) {
          seenIds.add(fileId);
          collectedFiles.push({
            id: fileId,
            fileName: obj.file.file.fileName,
            originalName: obj.file.file.originalName,
            filePath: obj.file.file.filePath,
            fileSize: typeof obj.file.file.fileSize === "number" ? obj.file.file.fileSize : Number(obj.file.file.fileSize) || undefined,
            mimeType: obj.file.file.mimeType,
            uploadedBy: obj.file.file.uploadedBy ?? "Unknown",
            uploadedAt: obj.file.file.uploadedAt ?? obj.file.file.uploadedAtString ?? undefined,
          });
        }
      }
    }
    
    // Note: We don't return early here - allow recursion to continue to find more nested files
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
  assignedIndicators: propAssignedIndicators,
  userRole: propUserRole,
}: DocumentsTabProps) => {
  // Get user info and indicator access
  const { user } = useAuth();
  const { assignedIndicators: hookAssignedIndicators, availableIndicators } = useIndicatorAccess();
  
  // Determine user role
  const userRole = propUserRole || user?.role || "";
  const isNodalOfficer = userRole === "NODAL_OFFICER";
  const isStateApprover = userRole === "STATE_APPROVER";
  const isMospiRole = userRole === "MOSPI_REVIEWER" || userRole === "MOSPI_APPROVER";
  
  // Determine assigned indicators
  // Priority: prop > hook > availableIndicators (for state approver)
  const assignedIndicators = React.useMemo(() => {
    if (propAssignedIndicators && propAssignedIndicators.length > 0) {
      return propAssignedIndicators;
    }
    if (isNodalOfficer && hookAssignedIndicators && hookAssignedIndicators.length > 0) {
      return hookAssignedIndicators;
    }
    if (isStateApprover && availableIndicators && availableIndicators.length > 0) {
      return availableIndicators;
    }
    // For MOSPI roles, return empty array (they see all)
    if (isMospiRole) {
      return [];
    }
    return [];
  }, [propAssignedIndicators, hookAssignedIndicators, availableIndicators, isNodalOfficer, isStateApprover, isMospiRole]);

  // Extract files from formData
  const docsFromForm = React.useMemo(() => {
    if (!formData) return [];

    const collectedFiles: Document[] = [];
    const seenPaths = new Set<string>();
    const seenIds = new Set<string>();
    // Also track by normalized filePath for better deduplication
    const seenNormalizedPaths = new Set<string>();

    // Helper to normalize filePath for comparison
    const normalizePath = (path: string): string => {
      return path.trim().toLowerCase().replace(/[\/\\]+/g, '/');
    };

    // Helper to check if file is duplicate
    const isDuplicate = (file: any): boolean => {
      if (file.filePath) {
        const normalized = normalizePath(file.filePath);
        if (seenNormalizedPaths.has(normalized)) {
          return true;
        }
        seenNormalizedPaths.add(normalized);
        seenPaths.add(file.filePath);
      }
      if (file.id) {
        if (seenIds.has(file.id)) {
          return true;
        }
        seenIds.add(file.id);
      }
      return false;
    };

    // In preview mode: Skip attachedFiles - files should be extracted from nested structure with indicators
    // In review mode: Include attachedFiles (they have filePath with indicator info)
    if (!isPreview && Array.isArray(formData.attachedFiles) && formData.attachedFiles.length) {
      formData.attachedFiles.forEach((f: any, idx: number) => {
        // In review mode, check for filePath
        if (f.filePath && typeof f.filePath === "string" && f.filePath.trim() !== "") {
          if (!isDuplicate(f)) {
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
      });
    }

    // Then, recursively extract files from nested formData fields
    // But skip attachedFiles to avoid duplicates
    const { attachedFiles, ...restOfFormData } = formData;
    
    // Debug: Check specifically for section3_1 and section4_2
    console.log("📄 DocumentsTab - Before extraction:", {
      isPreview,
      formDataKeys: Object.keys(restOfFormData),
      pppDevKeys: restOfFormData.pppDevelopment ? Object.keys(restOfFormData.pppDevelopment) : [],
      infraEnablersKeys: restOfFormData.infraEnablers ? Object.keys(restOfFormData.infraEnablers) : [],
      section3_1: restOfFormData.pppDevelopment?.section3_1,
      section3_1File: restOfFormData.pppDevelopment?.section3_1?.file,
      section3_1FileType: typeof restOfFormData.pppDevelopment?.section3_1?.file,
      section3_1FileKeys: restOfFormData.pppDevelopment?.section3_1?.file ? Object.keys(restOfFormData.pppDevelopment.section3_1.file) : [],
      section3_1FilePath: restOfFormData.pppDevelopment?.section3_1?.file?.filePath,
      section3_1FileFile: restOfFormData.pppDevelopment?.section3_1?.file?.file,
      section3_1FileFileType: typeof restOfFormData.pppDevelopment?.section3_1?.file?.file,
      section3_1FileFileIsFile: restOfFormData.pppDevelopment?.section3_1?.file?.file instanceof File,
      section3_1FileId: restOfFormData.pppDevelopment?.section3_1?.file?.id,
      section4_2: restOfFormData.infraEnablers?.section4_2,
      section4_2File: restOfFormData.infraEnablers?.section4_2?.file,
      section4_2FileType: typeof restOfFormData.infraEnablers?.section4_2?.file,
      section4_2FileKeys: restOfFormData.infraEnablers?.section4_2?.file ? Object.keys(restOfFormData.infraEnablers.section4_2.file) : [],
      section4_2FilePath: restOfFormData.infraEnablers?.section4_2?.file?.filePath,
      section4_2FileFile: restOfFormData.infraEnablers?.section4_2?.file?.file,
      section4_2FileFileType: typeof restOfFormData.infraEnablers?.section4_2?.file?.file,
      section4_2FileFileIsFile: restOfFormData.infraEnablers?.section4_2?.file?.file instanceof File,
      section4_2FileId: restOfFormData.infraEnablers?.section4_2?.file?.id,
    });
    
    // In preview mode, use the preview-specific extraction function that tracks paths and sets _indicator
    // In review mode, use the standard extraction function
    if (isPreview) {
      extractFilesFromFormDataPreview(restOfFormData, collectedFiles, seenIds);
    } else {
      extractFilesFromFormData(restOfFormData, collectedFiles, seenPaths, seenIds, isPreview);
    }

    // Try to find indicators for extracted files
    const filesWithIndicators = collectedFiles.map(f => {
      const indicator = findIndicatorForFile(f.filePath, f.id, formData);
      return {
        id: f.id,
        fileName: f.fileName,
        originalName: f.originalName,
        filePath: f.filePath,
        indicator: indicator || 'unknown',
        hasFileObject: !!f._fileObject,
        hasFilePath: !!f.filePath,
      };
    });
    
    console.log("📄 DocumentsTab - Extracted files:", {
      isPreview,
      totalFiles: collectedFiles.length,
      files: filesWithIndicators,
      // Check if files from 3.1 and 4.2 are present
      filesFrom3_1: filesWithIndicators.filter(f => f.indicator === '3.1' || f.filePath?.includes('section3_1') || f.id?.includes('section3_1')),
      filesFrom4_2: filesWithIndicators.filter(f => f.indicator === '4.2' || f.filePath?.includes('section4_2') || f.id?.includes('section4_2')),
      allIndicators: [...new Set(filesWithIndicators.map(f => f.indicator))],
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

  // Process documents prop for PREVIEW MODE ONLY
  // Finds File objects from formData for local file handling
  const processedPreviewDocuments = React.useMemo(() => {
    // Only process in preview mode
    if (!isPreview || !documents.length) return [];
    
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
      
      // If file doesn't have _indicator set, try to find it in formData
      if (!doc._indicator && formData) {
        // Helper function to find indicator for a file by searching formData
        const findIndicatorForFileInFormData = (docObj: any, formDataObj: any, currentPath: string = ""): string | null => {
          if (!formDataObj || typeof formDataObj !== 'object') return null;
          
          // Check if this object matches the document
          const matchesDoc = (obj: any): boolean => {
            if (docObj.id && obj.id === docObj.id) return true;
            if (docObj.originalName && docObj.fileSize && obj.originalName === docObj.originalName && obj.fileSize === docObj.fileSize) return true;
            if (obj.file && matchesDoc(obj.file)) return true;
            return false;
          };
          
          if (matchesDoc(formDataObj)) {
            // Extract indicator from current path
            return extractIndicatorFromFormDataPath(currentPath);
          }
          
          // Recurse into nested objects and arrays
          if (Array.isArray(formDataObj)) {
            for (let i = 0; i < formDataObj.length; i++) {
              const newPath = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
              const found = findIndicatorForFileInFormData(docObj, formDataObj[i], newPath);
              if (found) return found;
            }
          } else {
            for (const [key, value] of Object.entries(formDataObj)) {
              if (key.startsWith("_")) continue;
              const newPath = currentPath ? `${currentPath}.${key}` : key;
              const found = findIndicatorForFileInFormData(docObj, value, newPath);
              if (found) return found;
            }
          }
          
          return null;
        };
        
        const indicator = findIndicatorForFileInFormData(doc, formData);
        if (indicator) {
          doc = {
            ...doc,
            _indicator: indicator,
          };
        }
      }
      
      if (doc.id && !doc._fileObject) {
        console.log("📄 No File object found for doc ID:", doc.id, "in lookup map or formData");
      }
      
      if (!doc._fileObject) {
        console.log("📄 No File object found in doc:", doc);
      }
      
      return doc;
    });
  }, [documents, isPreview, formData, fileLookupMap]);

  // Process documents prop for REVIEW MODE ONLY
  // In review mode, documents already have filePath (S3 paths) - no need to find File objects
  const processedReviewDocuments = React.useMemo(() => {
    // Only process in review mode
    if (isPreview || !documents.length) return [];
    
    console.log("📄 Processing review documents prop:", {
      documentsCount: documents.length,
      sampleDoc: documents[0],
      sampleDocFilePath: documents[0]?.filePath,
    });
    
    // In review mode, documents already have filePath (S3 paths)
    // Just return them as-is - no need to find File objects
    return documents.map((doc: any) => {
      // Ensure document has required properties
      return {
        ...doc,
        id: doc.id || doc.filePath || `${doc.originalName || doc.fileName || 'file'}_${doc.fileSize || '0'}`,
        // Keep filePath for review mode
        filePath: doc.filePath,
      };
    });
  }, [documents, isPreview]);

  // Combine documents from all sources
  // IMPORTANT: DO NOT deduplicate globally by filename
  // We will deduplicate PER INDICATOR later (same file can appear in different indicators)
  const allDocuments: Document[] = React.useMemo(() => {
    const combined: Document[] = [];
    
    // Add documents extracted from nested formData (these have indicator context)
    if (Array.isArray(docsFromForm) && docsFromForm.length > 0) {
      docsFromForm.forEach((doc) => {
        const docWithId: Document = {
          ...doc,
          id: doc.id || doc.filePath || `${doc.originalName || doc.fileName || 'file'}_${doc.fileSize || '0'}`,
        };
        combined.push(docWithId);
      });
    }
    
    // Add processed documents based on mode
    if (isPreview) {
      // In preview mode, use processedPreviewDocuments (finds File objects)
      if (Array.isArray(processedPreviewDocuments) && processedPreviewDocuments.length > 0) {
        processedPreviewDocuments.forEach((doc) => {
          const docWithId: Document = {
            ...doc,
            id: doc.id || doc.filePath || `${doc.originalName || doc.fileName || 'file'}_${doc.fileSize || '0'}`,
          };
          combined.push(docWithId);
        });
      }
    } else {
      // In review mode, use processedReviewDocuments (keeps filePath)
      if (Array.isArray(processedReviewDocuments) && processedReviewDocuments.length > 0) {
        processedReviewDocuments.forEach((doc) => {
          const docWithId: Document = {
            ...doc,
            id: doc.id || doc.filePath || `${doc.originalName || doc.fileName || 'file'}_${doc.fileSize || '0'}`,
          };
          combined.push(docWithId);
        });
      }
    }
    
    console.log("📄 DocumentsTab - Combined Documents (No Global Deduplication):", {
      isPreview,
      nestedFiles: Array.isArray(docsFromForm) ? docsFromForm.length : 0,
      attachedFiles: isPreview 
        ? (Array.isArray(processedPreviewDocuments) ? processedPreviewDocuments.length : 0)
        : (Array.isArray(processedReviewDocuments) ? processedReviewDocuments.length : 0),
      totalCombined: combined.length,
    });
    
    return combined;
  }, [processedPreviewDocuments, processedReviewDocuments, docsFromForm, isPreview]);

  // Separate filtering function for PREVIEW MODE
  // Uses _indicator property set during extraction, filters out files without indicators
  const filterFilesForPreview = React.useCallback((
    files: Document[],
    assignedIndicators: string[],
    userRole: string
  ): Document[] => {
    // MOSPI roles see all files
    if (userRole === "MOSPI_REVIEWER" || userRole === "MOSPI_APPROVER") {
      return files;
    }

    // For STATE_APPROVER in preview mode: filter by assigned indicators
    // For NODAL_OFFICER: filter by assigned indicators
    if (!assignedIndicators || assignedIndicators.length === 0) {
      // If no assigned indicators, return empty (user has no access)
      if (userRole === "STATE_APPROVER") {
        // STATE_APPROVER might have access to all indicators in their state
        return files;
      }
      return [];
    }

    // Filter files based on _indicator property (set during preview extraction)
    const fileIndicators = files.map(f => {
      const indicator = (f as any)._indicator;
      const hasAccess = indicator ? assignedIndicators.includes(indicator) : false;
      return {
        fileName: f.fileName || f.originalName,
        indicator,
        hasIndicator: !!indicator,
        hasAccess,
      };
    });
    
    console.log("📄 filterFilesForPreview:", {
      totalFiles: files.length,
      assignedIndicators,
      userRole,
      fileIndicators: fileIndicators.slice(0, 10),
      filesWithoutIndicators: fileIndicators.filter(f => !f.indicator).length,
      filesWithMatchingIndicators: fileIndicators.filter(f => f.hasAccess).length,
      filesWithNonMatchingIndicators: fileIndicators.filter(f => f.indicator && !f.hasAccess).map(f => ({ indicator: f.indicator, fileName: f.fileName })),
    });
    
    // Filter: only show files that have _indicator set AND match assigned indicators
    // IMPORTANT: Filter out files without indicators (don't show "unknown" files in preview)
    return files.filter((file) => {
      const indicator = (file as any)._indicator;
      
      // If no indicator, filter it out (don't show "unknown" files in preview)
      if (!indicator) {
        return false;
      }

      // Check if user has access to this indicator
      return assignedIndicators.includes(indicator);
    });
  }, []);

  // Filter documents by indicator access
  const filteredDocuments = React.useMemo(() => {
    // In preview mode, formData might not have all sections filtered yet
    // So we filter based on assigned indicators
    if (!formData || allDocuments.length === 0) {
      return allDocuments;
    }

    // For STATE_APPROVER in review mode: show all files (don't filter by assigned indicators)
    // Assigned indicators are only for preview mode (when creating their own submission)
    // In review mode, STATE_APPROVERs should see all files from any submission they're reviewing
    // (whether it's from NODAL_OFFICER or another STATE_APPROVER)
    if (isStateApprover && !isPreview) {
      console.log("📄 DocumentsTab - STATE_APPROVER in review mode: showing all files (no filtering)");
      return allDocuments;
    }

    // Use separate filtering function for preview mode
    if (isPreview) {
      const filtered = filterFilesForPreview(allDocuments, assignedIndicators, userRole);
      console.log("📄 DocumentsTab - File Filtering (Preview):", {
        userRole,
        isNodalOfficer,
        isStateApprover,
        isMospiRole,
        isPreview,
        assignedIndicatorsCount: assignedIndicators.length,
        assignedIndicators,
        totalFilesBeforeFilter: allDocuments.length,
        totalFilesAfterFilter: filtered.length,
      });
      return filtered;
    }

    // For review mode, use the standard filtering function
    const filtered = filterFilesByIndicatorAccess(
      allDocuments,
      formData,
      assignedIndicators,
      userRole
    );

    console.log("📄 DocumentsTab - File Filtering (Review):", {
      userRole,
      isNodalOfficer,
      isStateApprover,
      isMospiRole,
      isPreview,
      assignedIndicatorsCount: assignedIndicators.length,
      assignedIndicators,
      totalFilesBeforeFilter: allDocuments.length,
      totalFilesAfterFilter: filtered.length,
      filteredFilePaths: filtered.map(f => f.filePath).slice(0, 5), // Show first 5
    });

    return filtered;
  }, [allDocuments, formData, assignedIndicators, userRole, isNodalOfficer, isStateApprover, isMospiRole, isPreview, filterFilesForPreview]);

  // Group filtered documents by category and indicator, then flatten for table
  // IMPORTANT: Don't deduplicate globally - allow same file to appear in different indicators
  // Only deduplicate WITHIN each indicator to prevent same file appearing multiple times in same indicator
  const tableRows = React.useMemo(() => {
    if (!formData || filteredDocuments.length === 0) {
      return [];
    }
    
    // Define which indicators are array-based (have multiple entries)
    // This ensures we only use entry context for indicators that actually support arrays
    const ARRAY_BASED_INDICATORS = new Set([
      "2.1", // infraActArray
      "2.2", // specializedEntityArray
      "2.3", // infraDevelopmentArray
      "2.4", // investmentReadyArray
      "2.5", // assetMonetizationArray
      "3.3", // VGFArray
      "3.4", // projects array
      "4.3", // projects array
      "4.5", // practices array
      "4.6", // capacityArray
    ]);
    
    // First, group files by indicator (this will show which files belong to which indicators)
    // In preview mode, ensure all files have _indicator set (filter out any without it)
    const filesToGroup = isPreview 
      ? filteredDocuments.filter(f => (f as any)._indicator) // Only files with _indicator in preview
      : filteredDocuments;
    
    const groupedFiles = groupFilesByCategoryAndIndicator(filesToGroup, formData);
    
    // In preview mode, remove "unknown" category if it exists
    if (isPreview && groupedFiles["unknown"]) {
      delete groupedFiles["unknown"];
    }
    
    // Log what we have before deduplication
    console.log("📄 DocumentsTab - Before Per-Indicator Deduplication:", {
      totalFiles: filteredDocuments.length,
      groupedFiles: Object.keys(groupedFiles).map(cat => ({
        category: cat,
        indicators: Object.keys(groupedFiles[cat] || {}).map(ind => ({
          indicator: ind,
          fileCount: groupedFiles[cat][ind].length,
        })),
      })),
    });
    
    // Now deduplicate WITHIN each indicator (same file shouldn't appear twice in same indicator)
    // But allow same file to appear in different entries or different indicators
    // Use entry context (entryId/entryIndex) to distinguish files in different array entries
    Object.keys(groupedFiles).forEach((category) => {
      Object.keys(groupedFiles[category]).forEach((indicator) => {
        const files = groupedFiles[category][indicator];
        const seenInIndicator = new Set<string>();
        const deduplicated: Document[] = [];
        
        files.forEach((file) => {
          // Ensure file has an id
          const fileWithId: Document = {
            ...file,
            id: file.id ?? file.filePath ?? `${file.originalName || file.fileName || 'file'}_${file.fileSize || '0'}`,
          };
          
          // Find entry context for this file (entryId/entryIndex if in array)
          // In preview mode, use _formDataPath if available (more reliable)
          let entryContext: { indicator: string | null; entryId: string | null; entryIndex: number | null };
          
          if (isPreview && (fileWithId as any)._formDataPath) {
            // Extract entry context from _formDataPath in preview mode
            const formDataPath = (fileWithId as any)._formDataPath;
            const indicator = (fileWithId as any)._indicator || null;
            
            // Extract entry index from path like "pppDevelopment.section4_5[0].file"
            let entryId: string | null = null;
            let entryIndex: number | null = null;
            
            // Match array indices in path: section4_5[0] -> index 0
            const arrayMatch = formDataPath.match(/\[(\d+)\]/);
            if (arrayMatch) {
              entryIndex = parseInt(arrayMatch[1], 10);
              // Try to find entry ID by searching formData at this path
              const pathParts = formDataPath.split(/[\[\]\.]/).filter(p => p);
              let currentObj = formData;
              for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (currentObj && typeof currentObj === 'object') {
                  if (Array.isArray(currentObj)) {
                    const idx = parseInt(part, 10);
                    if (!isNaN(idx) && currentObj[idx]) {
                      currentObj = currentObj[idx];
                      if (currentObj?.id) {
                        entryId = currentObj.id;
                      }
                    }
                  } else if (currentObj[part]) {
                    currentObj = currentObj[part];
                  }
                }
              }
              // If we're at an array index, try to get the entry's ID
              if (entryIndex !== null && Array.isArray(currentObj) && currentObj[entryIndex]?.id) {
                entryId = currentObj[entryIndex].id;
              }
            }
            
            entryContext = { indicator, entryId, entryIndex };
          } else {
            // In review mode or if _formDataPath not available, use standard method
            // Pass _fileObject for preview mode matching
            entryContext = findEntryContextForFile(
              fileWithId.filePath,
              fileWithId.id,
              formData,
              (fileWithId as any)._fileObject // Pass File object for preview mode
            );
          }
          
          // Create unique key: indicator + entryId/entryIndex + file identifier
          // IMPORTANT: Only use entry context for array-based indicators
          // For non-array indicators (3.1, 3.2, 4.2, 4.4), always use just indicator + filePath
          let fileKey: string;
          
          if ((entryContext.entryId || entryContext.entryIndex !== null) && ARRAY_BASED_INDICATORS.has(indicator)) {
            // File is in an array entry AND this indicator supports arrays - use entry context
            const entryIdentifier = entryContext.entryId || `entry_${entryContext.entryIndex}`;
            
            if (fileWithId.filePath) {
              // PRIMARY: indicator + entryId + filePath (most unique)
              fileKey = `${indicator}_${entryIdentifier}_${fileWithId.filePath.trim().toLowerCase().replace(/[\/\\]+/g, '/')}`;
            } else if (fileWithId.originalName && fileWithId.fileSize) {
              // SECONDARY: indicator + entryId + filename + size
              fileKey = `${indicator}_${entryIdentifier}_${fileWithId.originalName.trim().toLowerCase()}_${fileWithId.fileSize}`;
            } else {
              // TERTIARY: indicator + entryId + id
              fileKey = `${indicator}_${entryIdentifier}_${fileWithId.id.trim().toLowerCase()}`;
            }
          } else {
            // File is NOT in an array entry OR this indicator doesn't support arrays
            // Use indicator + file identifier (no entry context needed)
            // IMPORTANT: For non-array indicators, use originalName + fileSize as PRIMARY key
            // This is more reliable than filePath because same file might have different filePaths
            // (e.g., different UUIDs or nested structures like file.filePath vs file.file.filePath)
            if (fileWithId.originalName && fileWithId.fileSize) {
              // PRIMARY: Use originalName + fileSize (most reliable for identifying same logical file)
              fileKey = `${indicator}_${fileWithId.originalName.trim().toLowerCase()}_${fileWithId.fileSize}`;
            } else if (fileWithId.filePath) {
              // SECONDARY: Use normalized filePath if originalName/fileSize not available
              const normalizedPath = fileWithId.filePath.trim().toLowerCase().replace(/[\/\\]+/g, '/');
              fileKey = `${indicator}_${normalizedPath}`;
            } else {
              // TERTIARY: Use id as fallback
              fileKey = `${indicator}_${fileWithId.id.trim().toLowerCase()}`;
            }
          }
          
          if (!seenInIndicator.has(fileKey)) {
            seenInIndicator.add(fileKey);
            deduplicated.push(fileWithId);
          } else {
            console.log("📄 Skipping duplicate file (same indicator + same entry):", {
              filePath: fileWithId.filePath,
              originalName: fileWithId.originalName,
              indicator,
              entryId: entryContext.entryId,
              entryIndex: entryContext.entryIndex,
              fileKey,
            });
          }
        });
        
        // Replace with deduplicated array
        groupedFiles[category][indicator] = deduplicated;
      });
    });
    
    console.log("📄 DocumentsTab - Grouped Files (After Per-Indicator Deduplication):", {
      categories: Object.keys(groupedFiles),
      infraDevelopment: groupedFiles.infraDevelopment ? Object.keys(groupedFiles.infraDevelopment) : [],
      pppDevelopment: groupedFiles.pppDevelopment ? Object.keys(groupedFiles.pppDevelopment) : [],
      infraEnablers: groupedFiles.infraEnablers ? Object.keys(groupedFiles.infraEnablers) : [],
      indicator2_1: groupedFiles.infraDevelopment?.["2.1"]?.length || 0,
      indicator3_1: groupedFiles.pppDevelopment?.["3.1"]?.length || 0,
      indicator4_2: groupedFiles.infraEnablers?.["4.2"]?.length || 0,
      indicator2_1Files: groupedFiles.infraDevelopment?.["2.1"]?.map(f => ({ fileName: f.fileName, filePath: f.filePath, originalName: f.originalName })) || [],
      indicator3_1Files: groupedFiles.pppDevelopment?.["3.1"]?.map(f => ({ fileName: f.fileName, filePath: f.filePath, originalName: f.originalName })) || [],
      indicator4_2Files: groupedFiles.infraEnablers?.["4.2"]?.map(f => ({ fileName: f.fileName, filePath: f.filePath, originalName: f.originalName })) || [],
    });
    const rows: Array<{
      category: string;
      categoryDisplayName: string;
      indicator: string;
      document: Document;
    }> = [];
    
    // Track files per indicator to prevent duplicates WITHIN the same indicator
    // But allow the same file to appear in different indicators
    const seenPerIndicator = new Map<string, Set<string>>();

    // Define category order for consistent display
    const categoryOrder = ["infraFinancing", "infraDevelopment", "pppDevelopment", "infraEnablers", "unknown"];

    categoryOrder.forEach((category) => {
      const indicators = groupedFiles[category];
      if (!indicators || Object.keys(indicators).length === 0) {
        return;
      }

      const categoryDisplayName = getCategoryDisplayName(category);

      // Sort indicators numerically
      const sortedIndicators = Object.keys(indicators).sort((a, b) => {
        if (a === "unknown" && b === "unknown") return 0;
        if (a === "unknown") return 1;
        if (b === "unknown") return -1;
        const aParts = a.split(".").map(Number);
        const bParts = b.split(".").map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) return aVal - bVal;
        }
        return 0;
      });

      sortedIndicators.forEach((indicator) => {
        const files = indicators[indicator];
        
        // Initialize seen set for this indicator if not exists
        if (!seenPerIndicator.has(indicator)) {
          seenPerIndicator.set(indicator, new Set<string>());
        }
        const seenInThisIndicator = seenPerIndicator.get(indicator)!;
        
        files.forEach((file) => {
          // Ensure file has an id first
          const fileWithId: Document = {
            ...file,
            id: file.id ?? file.filePath ?? `${category}-${indicator}-${rows.length}`,
          };
          
          // Find entry context for this file (entryId/entryIndex if in array)
          // In preview mode, use _formDataPath if available (more reliable)
          let entryContext: { indicator: string | null; entryId: string | null; entryIndex: number | null };
          
          if (isPreview && (fileWithId as any)._formDataPath) {
            // Extract entry context from _formDataPath in preview mode
            const formDataPath = (fileWithId as any)._formDataPath;
            const indicator = (fileWithId as any)._indicator || null;
            
            // Extract entry index from path like "pppDevelopment.section4_5[0].file"
            let entryId: string | null = null;
            let entryIndex: number | null = null;
            
            // Match array indices in path: section4_5[0] -> index 0
            const arrayMatch = formDataPath.match(/\[(\d+)\]/);
            if (arrayMatch) {
              entryIndex = parseInt(arrayMatch[1], 10);
              // Try to find entry ID by searching formData at this path
              const pathParts = formDataPath.split(/[\[\]\.]/).filter(p => p);
              let currentObj = formData;
              for (let i = 0; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                if (currentObj && typeof currentObj === 'object') {
                  if (Array.isArray(currentObj)) {
                    const idx = parseInt(part, 10);
                    if (!isNaN(idx) && currentObj[idx]) {
                      currentObj = currentObj[idx];
                      if (currentObj?.id) {
                        entryId = currentObj.id;
                      }
                    }
                  } else if (currentObj[part]) {
                    currentObj = currentObj[part];
                  }
                }
              }
              // If we're at an array index, try to get the entry's ID
              if (entryIndex !== null && Array.isArray(currentObj) && currentObj[entryIndex]?.id) {
                entryId = currentObj[entryIndex].id;
              }
            }
            
            entryContext = { indicator, entryId, entryIndex };
          } else {
            // In review mode or if _formDataPath not available, use standard method
            // Pass _fileObject for preview mode matching
            entryContext = findEntryContextForFile(
              fileWithId.filePath,
              fileWithId.id,
              formData,
              (fileWithId as any)._fileObject // Pass File object for preview mode
            );
          }
          
          // Create unique key with entry context
          // IMPORTANT: Only use entry context for array-based indicators
          // For non-array indicators (3.1, 3.2, 4.2, 4.4), always use just indicator + filePath
          let fileKey: string;
          
          if ((entryContext.entryId || entryContext.entryIndex !== null) && ARRAY_BASED_INDICATORS.has(indicator)) {
            // File is in an array entry AND this indicator supports arrays - use entry context
            const entryIdentifier = entryContext.entryId || `entry_${entryContext.entryIndex}`;
            
            if (fileWithId.filePath) {
              // PRIMARY: indicator + entryId + filePath (most unique)
              fileKey = `${indicator}_${entryIdentifier}_${fileWithId.filePath.trim().toLowerCase().replace(/[\/\\]+/g, '/')}`;
            } else if (fileWithId.originalName && fileWithId.fileSize) {
              // SECONDARY: indicator + entryId + filename + size
              fileKey = `${indicator}_${entryIdentifier}_${fileWithId.originalName.trim().toLowerCase()}_${fileWithId.fileSize}`;
            } else {
              // TERTIARY: indicator + entryId + id
              fileKey = `${indicator}_${entryIdentifier}_${fileWithId.id.trim().toLowerCase()}`;
            }
          } else {
            // File is NOT in an array entry OR this indicator doesn't support arrays
            // Use indicator + file identifier (no entry context needed)
            // IMPORTANT: For non-array indicators, use originalName + fileSize as PRIMARY key
            // This is more reliable than filePath because same file might have different filePaths
            // (e.g., different UUIDs or nested structures like file.filePath vs file.file.filePath)
            if (fileWithId.originalName && fileWithId.fileSize) {
              // PRIMARY: Use originalName + fileSize (most reliable for identifying same logical file)
              fileKey = `${indicator}_${fileWithId.originalName.trim().toLowerCase()}_${fileWithId.fileSize}`;
            } else if (fileWithId.filePath) {
              // SECONDARY: Use normalized filePath if originalName/fileSize not available
              const normalizedPath = fileWithId.filePath.trim().toLowerCase().replace(/[\/\\]+/g, '/');
              fileKey = `${indicator}_${normalizedPath}`;
            } else {
              // TERTIARY: Use id as fallback
              fileKey = `${indicator}_${fileWithId.id.trim().toLowerCase()}`;
            }
          }
          
          // Only add if we haven't seen this file in THIS indicator with THIS entry context yet
          // This allows:
          // - Same file in different indicators → both shown
          // - Same file in different entries of same indicator → both shown
          // - Same file in same entry → deduplicated
          if (!seenInThisIndicator.has(fileKey)) {
            seenInThisIndicator.add(fileKey);
            
            rows.push({
              category,
              categoryDisplayName,
              indicator,
              document: fileWithId,
            });
          } else {
            console.log("📄 Skipping duplicate file (same indicator + same entry):", {
              filePath: fileWithId.filePath,
              originalName: fileWithId.originalName,
              fileSize: fileWithId.fileSize,
              id: fileWithId.id,
              indicator,
              category,
              entryId: entryContext.entryId,
              entryIndex: entryContext.entryIndex,
              fileKey,
            });
          }
        });
      });
    });

    console.log("📄 DocumentsTab - Table Rows Created:", {
      totalRows: rows.length,
      rowsByCategory: rows.reduce((acc, row) => {
        if (!acc[row.category]) acc[row.category] = {};
        if (!acc[row.category][row.indicator]) acc[row.category][row.indicator] = 0;
        acc[row.category][row.indicator]++;
        return acc;
      }, {} as Record<string, Record<string, number>>),
      rowsFor2_1: rows.filter(r => r.indicator === '2.1').length,
      rowsFor3_1: rows.filter(r => r.indicator === '3.1').length,
      rowsFor4_2: rows.filter(r => r.indicator === '4.2').length,
      rowsFor2_1Details: rows.filter(r => r.indicator === '2.1').map(r => ({
        fileName: r.document.fileName || r.document.originalName,
        originalName: r.document.originalName,
        filePath: r.document.filePath,
      })),
      sampleRows: rows.slice(0, 10).map(r => ({
        category: r.category,
        indicator: r.indicator,
        fileName: r.document.fileName || r.document.originalName,
        originalName: r.document.originalName,
      })),
    });

    return rows;
  }, [filteredDocuments, formData]);

  // Debug logging
  React.useEffect(() => {
    console.log("📄 DocumentsTab Debug:", {
      isPreview,
      userRole,
      assignedIndicatorsCount: assignedIndicators.length,
      documentsCount: documents.length,
      processedDocumentsCount: isPreview 
        ? (Array.isArray(processedPreviewDocuments) ? processedPreviewDocuments.length : 0)
        : (Array.isArray(processedReviewDocuments) ? processedReviewDocuments.length : 0),
      docsFromFormCount: Array.isArray(docsFromForm) ? docsFromForm.length : 0,
      allDocumentsCount: Array.isArray(allDocuments) ? allDocuments.length : 0,
      filteredDocumentsCount: Array.isArray(filteredDocuments) ? filteredDocuments.length : 0,
      sampleDoc: filteredDocuments[0],
      sampleDocHasFileObject: !!filteredDocuments[0]?._fileObject,
      sampleDocHasFilePath: !!filteredDocuments[0]?.filePath,
      formDataKeys: formData ? Object.keys(formData) : [],
      formDataPppDev: formData?.pppDevelopment ? Object.keys(formData.pppDevelopment) : [],
    });
  }, [isPreview, documents, processedPreviewDocuments, processedReviewDocuments, docsFromForm, allDocuments, filteredDocuments, formData, userRole, assignedIndicators]);

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

  // Debug: Log table rows before rendering
  React.useEffect(() => {
    console.log("📄 DocumentsTab - Rendering Table:", {
      tableRowsCount: tableRows.length,
      tableRows: tableRows.map(r => ({
        category: r.category,
        indicator: r.indicator,
        fileName: r.document.fileName || r.document.originalName,
        filePath: r.document.filePath,
      })),
    });
  }, [tableRows]);

  return (
    <SectionCard
      title="Document Review"
      subtitle="Data related to infrastructure financing and budget allocation"
      className="mb-6"
    >
      <CardContent>
        {tableRows.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No documents found in this submission</p>
            {isNodalOfficer && assignedIndicators.length === 0 && (
              <p className="text-sm mt-2 text-muted-foreground">
                No indicators assigned. Please contact administrator.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Category</TableHead>
                  <TableHead className="min-w-[300px]">Indicator</TableHead>
                  <TableHead className="min-w-[250px]">File Name</TableHead>
                  <TableHead className="min-w-[100px]">File Size</TableHead>
                  <TableHead className="min-w-[180px]">Uploaded At</TableHead>
                  <TableHead className="min-w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((row, idx) => {
                  const doc = row.document;
                  const docKey = doc.id;
                  const label = pickLabel(doc);
                  const isLoading = !!loading[docKey];

                  return (
                    <TableRow key={docKey}>
                      <TableCell className="font-medium">
                        {row.categoryDisplayName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary w-fit">
                            {row.indicator}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {getIndicatorDisplayName(row.indicator)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="font-medium truncate max-w-md">{label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatSize(doc.fileSize)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(doc.uploadedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
};
