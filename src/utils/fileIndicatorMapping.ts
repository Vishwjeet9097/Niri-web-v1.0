/**
 * Utility functions for mapping files to indicators and filtering files by indicator access
 * This ensures document visibility follows indicator assignments strictly
 */

/**
 * Map section keys to indicator codes
 */
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
 * Map indicator codes to their category and section
 */
const INDICATOR_TO_SECTION_MAP: Record<string, { category: string; sectionKey: string }> = {
  "1.1": { category: "infraFinancing", sectionKey: "section1_1" },
  "1.2": { category: "infraFinancing", sectionKey: "section1_2" },
  "1.3": { category: "infraFinancing", sectionKey: "section1_3" },
  "1.4": { category: "infraFinancing", sectionKey: "section1_4" },
  "1.5": { category: "infraFinancing", sectionKey: "section1_5" },
  "2.1": { category: "infraDevelopment", sectionKey: "section2_1" },
  "2.2": { category: "infraDevelopment", sectionKey: "section2_2" },
  "2.3": { category: "infraDevelopment", sectionKey: "section2_3" },
  "2.4": { category: "infraDevelopment", sectionKey: "section2_4" },
  "2.5": { category: "infraDevelopment", sectionKey: "section2_5" },
  "3.1": { category: "pppDevelopment", sectionKey: "section3_1" },
  "3.2": { category: "pppDevelopment", sectionKey: "section3_2" },
  "3.3": { category: "pppDevelopment", sectionKey: "section3_3" },
  "3.4": { category: "pppDevelopment", sectionKey: "section3_4" },
  "4.1": { category: "infraEnablers", sectionKey: "section4_1" },
  "4.2": { category: "infraEnablers", sectionKey: "section4_2" },
  "4.3": { category: "infraEnablers", sectionKey: "section4_3" },
  "4.4": { category: "infraEnablers", sectionKey: "section4_4" },
  "4.5": { category: "infraEnablers", sectionKey: "section4_5" },
  "4.6": { category: "infraEnablers", sectionKey: "section4_6" },
};

/**
 * Extract indicator code from a file path
 * File paths typically follow pattern: submissions/{submissionId}/{category}/{sectionKey}/...
 */
export function extractIndicatorFromFilePath(filePath: string): string | null {
  if (!filePath || typeof filePath !== "string") return null;

  // Try to extract section key from path
  // Pattern: submissions/SUB-XXX/category/sectionKey/...
  const pathParts = filePath.split("/");
  
  // Look for section keys in the path
  for (const part of pathParts) {
    if (part.startsWith("section") && SECTION_TO_INDICATOR_MAP[part]) {
      return SECTION_TO_INDICATOR_MAP[part];
    }
  }

  return null;
}

/**
 * Extract indicator code from formData path
 * Given a nested path like "infraFinancing.section1_1.file", extract "1.1"
 */
export function extractIndicatorFromFormDataPath(path: string, formData: any): string | null {
  if (!path || !formData) return null;

  // Split path by dots
  const parts = path.split(".");
  
  // Look for category and section
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    
    // Check if this is a section key
    if (SECTION_TO_INDICATOR_MAP[part]) {
      return SECTION_TO_INDICATOR_MAP[part];
    }
    
    // Check if this is a category, and next part is a section
    if (i < parts.length - 1) {
      const nextPart = parts[i + 1];
      if (SECTION_TO_INDICATOR_MAP[nextPart]) {
        return SECTION_TO_INDICATOR_MAP[nextPart];
      }
    }
  }

  return null;
}

/**
 * Find which indicator a file belongs to by searching formData
 * This recursively searches formData to find where the file is located
 */
export function findIndicatorForFile(
  filePath: string | undefined,
  fileId: string | undefined,
  formData: any
): string | null {
  if (!formData || typeof formData !== "object") return null;

  // First, try to extract from filePath
  if (filePath) {
    const indicatorFromPath = extractIndicatorFromFilePath(filePath);
    if (indicatorFromPath) return indicatorFromPath;
  }

  // Then, search formData recursively
  const searchInObject = (obj: any, currentPath: string = ""): string | null => {
    if (!obj || typeof obj !== "object") return null;

    // Check if this object has filePath or id matching our file
    if (obj.filePath === filePath || obj.id === fileId) {
      // Extract indicator from current path
      return extractIndicatorFromFormDataPath(currentPath, formData);
    }

    // Check nested file structures
    if (obj.file) {
      if (obj.file.filePath === filePath || obj.file.id === fileId) {
        return extractIndicatorFromFormDataPath(currentPath, formData);
      }
      if (obj.file.file?.filePath === filePath || obj.file.file?.id === fileId) {
        return extractIndicatorFromFormDataPath(currentPath, formData);
      }
    }

    // Recurse into arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const result = searchInObject(obj[i], `${currentPath}[${i}]`);
        if (result) return result;
      }
      return null;
    }

    // Recurse into objects
    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata
      if (key.startsWith("_")) continue;
      
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      const result = searchInObject(value, newPath);
      if (result) return result;
    }

    return null;
  };

  return searchInObject(formData);
}

/**
 * Filter files by indicator access
 * Only returns files that belong to indicators the user has access to
 */
export function filterFilesByIndicatorAccess(
  files: Array<{
    id?: string;
    filePath?: string;
    [key: string]: any;
  }>,
  formData: any,
  assignedIndicators: string[],
  userRole: string
): Array<{
  id?: string;
  filePath?: string;
  [key: string]: any;
}> {
  // MOSPI roles see all files
  if (userRole === "MOSPI_REVIEWER" || userRole === "MOSPI_APPROVER") {
    return files;
  }

  // If no assigned indicators, return empty (user has no access)
  if (!assignedIndicators || assignedIndicators.length === 0) {
    // For STATE_APPROVER, if no assigned indicators, they might see all (check business logic)
    // For now, return empty to be safe
    if (userRole === "STATE_APPROVER") {
      // STATE_APPROVER might have access to all indicators in their state
      // This should be handled by the backend, but for frontend safety, return all
      return files;
    }
    return [];
  }

  // Filter files based on indicator access
  return files.filter((file) => {
    const indicator = findIndicatorForFile(file.filePath, file.id, formData);
    
    if (!indicator) {
      // If we can't determine the indicator, be conservative and hide it
      // unless user is STATE_APPROVER or MOSPI role
      return userRole === "STATE_APPROVER" || 
             userRole === "MOSPI_REVIEWER" || 
             userRole === "MOSPI_APPROVER";
    }

    // Check if user has access to this indicator
    return assignedIndicators.includes(indicator);
  });
}

/**
 * Get all indicators that have files in the submission
 */
export function getIndicatorsWithFiles(
  files: Array<{ filePath?: string; id?: string }>,
  formData: any
): string[] {
  const indicators = new Set<string>();

  files.forEach((file) => {
    const indicator = findIndicatorForFile(file.filePath, file.id, formData);
    if (indicator) {
      indicators.add(indicator);
    }
  });

  return Array.from(indicators);
}

/**
 * Map files to their indicators
 * Returns a map of indicator code -> files array
 */
export function mapFilesToIndicators(
  files: Array<{
    id?: string;
    filePath?: string;
    [key: string]: any;
  }>,
  formData: any
): Record<string, Array<{ id?: string; filePath?: string; [key: string]: any }>> {
  const map: Record<string, Array<{ id?: string; filePath?: string; [key: string]: any }>> = {};

  files.forEach((file) => {
    const indicator = findIndicatorForFile(file.filePath, file.id, formData);
    if (indicator) {
      if (!map[indicator]) {
        map[indicator] = [];
      }
      map[indicator].push(file);
    } else {
      // Files without clear indicator mapping go to "unknown"
      if (!map["unknown"]) {
        map["unknown"] = [];
      }
      map["unknown"].push(file);
    }
  });

  return map;
}

