/**
 * Utility to extract file metadata from formData structure
 * Used for consolidating attachedFiles from source submissions
 */

interface FileMetadata {
  fileName?: string;
  originalName?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt?: string | Date;
  id?: string;
}

/**
 * Recursively extract file metadata from formData
 * Returns array of file metadata objects
 */
export function extractFileMetadataFromFormData(
  formData: any,
  seenPaths: Set<string> = new Set()
): FileMetadata[] {
  const files: FileMetadata[] = [];

  if (!formData || typeof formData !== "object") {
    return files;
  }

  const extractFromObject = (obj: any): void => {
    if (!obj || typeof obj !== "object") return;

    // Helper to extract file metadata from an object
    const extractFileFromObj = (fileObj: any, fallbackId?: string): void => {
      if (!fileObj || typeof fileObj !== "object") return;
      
      const filePath = fileObj.filePath || fileObj.filepath;
      if (!filePath || typeof filePath !== "string" || filePath.trim() === "") return;
      
      if (seenPaths.has(filePath)) return; // Skip duplicates
      
      seenPaths.add(filePath);
      
      // Extract all possible file metadata fields
      files.push({
        fileName: fileObj.fileName || fileObj.filename || filePath.split('/').pop() || "",
        originalName: fileObj.originalName || fileObj.originalname || fileObj.fileName || fileObj.filename || "",
        filePath: filePath,
        fileUrl: fileObj.fileUrl || fileObj.fileurl || "", // Can be empty for S3 files
        fileSize: typeof fileObj.fileSize === "number" 
          ? fileObj.fileSize 
          : (fileObj.fileSize ? Number(fileObj.fileSize) : undefined),
        mimeType: fileObj.mimeType || fileObj.mimetype || "application/octet-stream",
        uploadedAt: fileObj.uploadedAt || fileObj.uploaded_at || fileObj.uploadedAtString || new Date().toISOString(),
        id: fileObj.id || fallbackId,
      });
    };

    // Check if this object has filePath (file metadata) - direct
    extractFileFromObj(obj);

    // Check nested structures: obj.file.filePath
    if (obj.file && typeof obj.file === "object") {
      extractFileFromObj(obj.file, obj.id);
      
      // Check deeper nested: obj.file.file.filePath
      if (obj.file.file && typeof obj.file.file === "object") {
        extractFileFromObj(obj.file.file, obj.file.id || obj.id);
      }
    }

    // Check for arrays of files: obj.files[0].file.filePath
    if (Array.isArray(obj.files)) {
      obj.files.forEach((fileItem: any) => {
        if (fileItem && typeof fileItem === "object") {
          extractFileFromObj(fileItem, obj.id);
          
          if (fileItem.file && typeof fileItem.file === "object") {
            extractFileFromObj(fileItem.file, fileItem.id || obj.id);
            
            if (fileItem.file.file && typeof fileItem.file.file === "object") {
              extractFileFromObj(fileItem.file.file, fileItem.file.id || fileItem.id || obj.id);
            }
          }
        }
      });
    }

    // Recurse into arrays
    if (Array.isArray(obj)) {
      obj.forEach((item) => extractFromObject(item));
      return;
    }

    // Recurse into objects - be aggressive, only skip _metadata at root level
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        // Only skip _metadata at the very top level (formData._metadata)
        // Don't skip anything else - nested objects might have files
        if (key === "_metadata" && !Array.isArray(value)) {
          // Check if this is likely the root _metadata (has isConsolidated, sourceSubmissionIds, etc.)
          const metadataKeys = Object.keys(value);
          if (metadataKeys.includes("isConsolidated") || metadataKeys.includes("sourceSubmissionIds")) {
            // This is the root _metadata, skip it
            return;
          }
        }
        // Recurse into all other objects
        extractFromObject(value);
      }
    });
  };

  // Start extraction from formData root
  extractFromObject(formData);
  
  // Log extraction results for debugging
  if (files.length > 0) {
    console.log(`📎 [extractFileMetadata] Extracted ${files.length} files from formData`);
    console.log(`📎 [extractFileMetadata] Sample files:`, files.slice(0, 3).map(f => ({
      fileName: f.fileName,
      filePath: f.filePath,
      fileSize: f.fileSize
    })));
  } else {
    console.warn(`⚠️ [extractFileMetadata] No files extracted from formData`);
    console.warn(`⚠️ [extractFileMetadata] FormData structure:`, formData ? Object.keys(formData) : "null/undefined");
    
    // Try to find why no files were found
    if (formData && typeof formData === "object") {
      const categories = ['infraFinancing', 'infraDevelopment', 'pppDevelopment', 'infraEnablers'];
      categories.forEach(cat => {
        if (formData[cat]) {
          console.warn(`   Category ${cat} exists:`, Object.keys(formData[cat] || {}));
        }
      });
    }
  }
  
  return files;
}

/**
 * Merge attachedFiles from multiple source submissions
 * Deduplicates by filePath
 */
export function mergeAttachedFiles(
  sourceSubmissions: Array<{ attachedFiles?: any[]; formData?: any }>
): FileMetadata[] {
  const mergedFiles: FileMetadata[] = [];
  const seenPaths = new Set<string>();
  const seenFileKeys = new Set<string>(); // originalName + fileSize

  sourceSubmissions.forEach((submission) => {
    // First, add files from attachedFiles array
    if (submission.attachedFiles && Array.isArray(submission.attachedFiles)) {
      submission.attachedFiles.forEach((file: any) => {
        const filePath = file?.filePath || file?.filepath;
        const fileKey = file?.originalName && file?.fileSize
          ? `${file.originalName}_${file.fileSize}`
          : null;

        if (filePath && !seenPaths.has(filePath)) {
          seenPaths.add(filePath);
          mergedFiles.push({
            fileName: file.fileName || file.filename,
            originalName: file.originalName || file.originalname,
            filePath: filePath,
            fileUrl: file.fileUrl || file.fileurl || "",
            fileSize: typeof file.fileSize === "number" ? file.fileSize : Number(file.fileSize) || undefined,
            mimeType: file.mimeType || file.mimetype,
            uploadedAt: file.uploadedAt || file.uploaded_at,
            id: file.id,
          });
        } else if (fileKey && !seenFileKeys.has(fileKey)) {
          // Fallback: deduplicate by originalName + fileSize if filePath is missing
          seenFileKeys.add(fileKey);
          mergedFiles.push({
            fileName: file.fileName || file.filename,
            originalName: file.originalName || file.originalname,
            filePath: filePath || "",
            fileUrl: file.fileUrl || file.fileurl || "",
            fileSize: typeof file.fileSize === "number" ? file.fileSize : Number(file.fileSize) || undefined,
            mimeType: file.mimeType || file.mimetype,
            uploadedAt: file.uploadedAt || file.uploaded_at,
            id: file.id,
          });
        }
      });
    }

    // Then, extract files from formData (in case attachedFiles is empty)
    if (submission.formData) {
      const extractedFiles = extractFileMetadataFromFormData(submission.formData, seenPaths);
      extractedFiles.forEach((file) => {
        if (file.filePath && !seenPaths.has(file.filePath)) {
          seenPaths.add(file.filePath);
          mergedFiles.push(file);
        }
      });
    }
  });

  return mergedFiles;
}

