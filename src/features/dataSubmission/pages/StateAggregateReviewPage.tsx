import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { useAuth } from "@/features/auth/AuthProvider";
import { getCumulativePreview, apiService } from "@/services/api.service";
import { statesService } from "@/services/states.service";
import { notificationService } from "@/services/notification.service";
import { OverviewTab } from "../components/tabs/OverviewTab";
import { DataReviewTab } from "../components/tabs/DataReviewTab";
import { DocumentsTab } from "../components/tabs/DocumentsTab";
import { AuditLog } from "@/components/AuditLog";
import { generateAuditEntries } from "@/utils/auditUtils";
import { useIndicatorAccess } from "@/hooks/useIndicatorAccess";
import { calculateStateProgressFromApi, ProgressStats } from "@/utils/progressUtils";
import { authService } from "@/services/auth.service";
import { transformFormDataForSubmission } from "@/utils/formDataTransformer";
import { appendFilesRecursively } from "@/utils/appendFilesRecursively";
import axios from "axios";
import { config } from "@/config/environment";

type AggregatedIndicator = {
  id?: string;
  code: string;
  name: string;
  category?: string;
  maxScore?: number | string;
  status?: string;
  remarks?: string | null;
  score?: number | string | null;
  updatedAt?: string | null;
  year?: string | null;
  assignedTo?: string | null;
  sectionId?: string;
  data?: any;
  [key: string]: any;
};

type AggregatedPayload = {
  stateUt: string;
  users?: number;
  totalIndicators?: number;
  categories?: string[];
  summary?: {
    acceptedCount?: number;
    totalIndicators?: number;
    pendingCount?: number;
    rejectedCount?: number;
    inReviewCount?: number;
    percentage?: number;
    lastUpdatedAt?: string;
  };
  indicators?: Record<string, AggregatedIndicator[]>;
  submissions?: any[];
};

type StateOption = {
  id: string;
  name: string;
  code: string;
};

/**
 * Transform aggregated indicators from API into formData structure expected by review components
 * Also checks submissions array if available to extract form data from nodal officer submissions
 */
const transformIndicatorsToFormData = (
  indicators: Record<string, AggregatedIndicator[]>,
  submissions?: any[]
): any => {
  // Start with empty categories - only create sections for indicators that actually exist in the API response
  // Don't initialize all sections upfront - this prevents unassigned/unfilled indicators from appearing
  const formData: any = {
    infraFinancing: {},
    infraDevelopment: {},
    pppDevelopment: {},
    infraEnablers: {},
  };

  // Map category names to formData keys (matching actual API response)
  const categoryMap: Record<string, string> = {
    "Infrastructure Financing": "infraFinancing",
    "Infrastructure Development": "infraDevelopment",
    "PPP Development": "pppDevelopment",
    "Infrastructure Enablers": "infraEnablers",
    // Fallback mappings
    infra_financing: "infraFinancing",
    Infrastructure_Financing: "infraFinancing",
    infra_development: "infraDevelopment",
    Infrastructure_Development: "infraDevelopment",
    ppp_development: "pppDevelopment",
    PPP_Development: "pppDevelopment",
    infra_enablers: "infraEnablers",
    Infrastructure_Enablers: "infraEnablers",
  };

  // Process each category
  Object.entries(indicators).forEach(([categoryKey, indicatorList]) => {
    const formDataKey = categoryMap[categoryKey];
    if (!formDataKey || !formData[formDataKey]) {
      return;
    }

    // Process each indicator in the category
    indicatorList.forEach((indicator) => {
      const code = indicator.code?.trim();
      if (!code) {
        return;
      }

      // Convert code to section key (e.g., "1.1" -> "section1_1")
      const sectionKey = `section${code.replace(".", "_")}`;

      // Extract data from indicator - data is directly in indicator.data, not nested
      let indicatorData = indicator.data;

      // Handle null/undefined data - if indicator exists but has no data, skip creating empty section
      // Only proceed if indicator has data OR if we can extract data from submissions array
      if (!indicatorData && (!submissions || submissions.length === 0)) {
        return;
      }
      
      // If no indicatorData, try to get from empty object for now (will check later if meaningful)
      if (!indicatorData) {
        indicatorData = {};
      }

      // Handle array-based indicators (2.1, 2.2, 2.3, 2.4, 2.5)
      if (Array.isArray(indicatorData)) {
        // For array-based indicators, only include if the array has actual data
        // Empty arrays should not be shown even if they exist in submissions or have a status
        // Also check if array contains only empty/null/undefined values
        const hasValidData = indicatorData.length > 0 && indicatorData.some(item => {
          if (item === null || item === undefined) return false;
          if (typeof item === 'object' && Object.keys(item).length === 0) return false;
          return true;
        });
        
        if (!hasValidData) {
          return;
        }
        
        // Array has valid data, proceed to store it
          // Map to appropriate array field based on indicator code
          switch (code) {
            case '2.1':
              formData[formDataKey][sectionKey] = { infraActArray: indicatorData };
              break;
            case '2.2':
              formData[formDataKey][sectionKey] = { specializedEntityArray: indicatorData };
              break;
            case '2.3':
              formData[formDataKey][sectionKey] = { infraDevelopmentArray: indicatorData };
              break;
            case '2.4':
              formData[formDataKey][sectionKey] = { investmentReadyArray: indicatorData };
              break;
            case '2.5':
              formData[formDataKey][sectionKey] = { assetMonetizationArray: indicatorData };
              break;
            default:
              formData[formDataKey][sectionKey] = indicatorData;
          }
        return;
      }

      // Handle object-based indicators
      if (typeof indicatorData === 'object') {
        // Start with all fields from indicatorData, then filter
        const formFields: any = { ...indicatorData };
        
        // Remove backend/metadata fields that shouldn't be displayed
        delete formFields.status;
        delete formFields.percentage;
        delete formFields.marksObtained;

        // Add year if available (from indicator.year or data.year)
        if (indicator.year) {
          formFields.year = indicator.year;
        } else if (indicatorData.year) {
          formFields.year = indicatorData.year;
        }

        // Handle status field - infer form fields from status for some indicators
        if (indicatorData.status === 'ACCEPTED' || indicator.status === 'ACCEPTED') {
          switch (code) {
            case '3.1':
              // If status is ACCEPTED, it means PPP Act/Policy is available
              if (!formFields.available) {
                formFields.available = 'yes';
              }
              break;
            case '3.3':
              // VGF proposals accepted
              if (!formFields.VGFArray) {
                formFields.VGFArray = [];
              }
              break;
            case '3.4':
              // PPP projects accepted
              if (!formFields.projects) {
                formFields.projects = [];
              }
              break;
            case '4.1':
              // All eligible projects on NIP portal - status ACCEPTED means yes
              if (!formFields.allEligible) {
                formFields.allEligible = 'yes';
              }
              break;
          }
        }

        // Special handling for specific indicators
        switch (code) {
          case '1.1':
            // For section 1.1, check if data exists in the indicator object itself
            // The API might store data differently - check all possible locations
            // Check if capitalAllocation/gsdpForFY exist with different field names
            // Common variations: capital_allocation, capitalAllocation, capital_allocation_fy, etc.
            const possibleCapAllocKeys = ['capitalAllocation', 'capital_allocation', 'capitalAllocationFY', 'capital_allocation_fy', 'a1', 'A1'];
            const possibleGsdpKeys = ['gsdpForFY', 'gsdp_for_fy', 'gsdpForFYValue', 'gsdp_for_fy_value', 'a2', 'A2', 'gsdp'];
            
            // Try to find capitalAllocation
            if (!formFields.capitalAllocation) {
              for (const key of possibleCapAllocKeys) {
                if (indicatorData[key] !== undefined) {
                  formFields.capitalAllocation = String(indicatorData[key]);
                  break;
                }
              }
            }
            
            // Try to find gsdpForFY
            if (!formFields.gsdpForFY) {
              for (const key of possibleGsdpKeys) {
                if (indicatorData[key] !== undefined) {
                  formFields.gsdpForFY = String(indicatorData[key]);
                  break;
                }
              }
            }
            
            // If still not found, check if they're in a nested structure
            if (!formFields.capitalAllocation && indicatorData.user_fill_value_a1 !== undefined) {
              formFields.capitalAllocation = String(indicatorData.user_fill_value_a1);
            }
            
            if (!formFields.gsdpForFY && indicatorData.user_fill_value_a2 !== undefined) {
              formFields.gsdpForFY = String(indicatorData.user_fill_value_a2);
            }
            
            // If still not found, check submissions array for formData (nodal officer submissions)
            if ((!formFields.capitalAllocation || !formFields.gsdpForFY) && submissions && Array.isArray(submissions)) {
              for (const submission of submissions) {
                const subFormData = submission.formData || submission.form_data || {};
                const infraFinancing = subFormData.infraFinancing || subFormData.Infrastructure_Financing || {};
                const section1_1 = infraFinancing.section1_1 || {};
                
                if (section1_1.capitalAllocation && !formFields.capitalAllocation) {
                  formFields.capitalAllocation = String(section1_1.capitalAllocation);
                }
                
                if (section1_1.gsdpForFY && !formFields.gsdpForFY) {
                  formFields.gsdpForFY = String(section1_1.gsdpForFY);
                }
                
                // If we found both, break early
                if (formFields.capitalAllocation && formFields.gsdpForFY) {
                  break;
                }
              }
            }
            
            // Ensure required fields exist (even if empty) for section 1.1
            if (!formFields.capitalAllocation) {
              formFields.capitalAllocation = '';
            }
            if (!formFields.gsdpForFY) {
              formFields.gsdpForFY = '';
            }
            break;
          case '1.3':
            // Ensure ulbList exists (might be empty)
            if (!formFields.ulbList) {
              formFields.ulbList = [];
            }
            // If totalULBs exists but ulbList is empty, still show the section
            break;
          case '1.4':
            // Ensure bondList exists (might be empty)
            if (!formFields.bondList) {
              formFields.bondList = [];
            }
            // If totalULBs exists but bondList is empty, still show the section
            break;
          case '1.5':
            // Ensure ffiArray exists (might be empty)
            if (!formFields.ffiArray) {
              formFields.ffiArray = [];
            }
            break;
          case '3.3':
            // Ensure VGFArray exists
            if (!formFields.VGFArray) {
              formFields.VGFArray = [];
            }
            break;
          case '3.4':
            // Ensure projects exists
            if (!formFields.projects) {
              formFields.projects = [];
            }
            break;
          case '4.6':
            // Ensure capacityArray exists
            if (!formFields.capacityArray) {
              formFields.capacityArray = [];
            }
            break;
        }

        // Only store sections if they have actual data OR if they're assigned to someone
        // Don't create empty sections for unassigned/unfilled indicators
        // Check if section has meaningful data before storing
        const hasMeaningfulData = Object.keys(formFields).length > 0 && 
          Object.values(formFields).some(val => {
            if (val === null || val === undefined || val === '') return false;
            if (Array.isArray(val) && val.length === 0) return false;
            if (typeof val === 'object' && Object.keys(val).length === 0) return false;
            return true;
          });
        
        // Check if indicator is assigned/submitted (not NOT_STARTED status)
        // NOT_STARTED means the indicator hasn't been assigned or filled yet
        const indicatorStatus = indicator?.status || indicatorData?.status || formFields.status;
        const isNotStarted = indicatorStatus === 'NOT_STARTED' || indicatorStatus === null || indicatorStatus === undefined;
        
        // Check if this indicator exists in any submission (meaning it's been worked on)
        const existsInSubmissions = submissions && Array.isArray(submissions) && submissions.some(submission => {
          const subFormData = submission.formData || submission.form_data || {};
          const categoryData = subFormData[formDataKey] || subFormData[categoryKey] || {};
          return sectionKey in categoryData;
        });
        
        // Only create section if:
        // 1. It has meaningful data, OR
        // 2. It's not in NOT_STARTED status (has been assigned/submitted), OR
        // 3. It exists in submissions array (has been worked on)
        // This prevents unassigned/unfilled indicators from appearing empty
        const shouldInclude = hasMeaningfulData || !isNotStarted || existsInSubmissions;
        
        if (shouldInclude) {
          formData[formDataKey][sectionKey] = formFields;
        }
      }
    });
  });

  // Clean up empty categories
  Object.keys(formData).forEach((categoryKey) => {
    if (Object.keys(formData[categoryKey]).length === 0) {
      delete formData[categoryKey];
    }
  });

  return formData;
};

/**
 * Filter formData to only include sections for assigned indicators (for nodal officers)
 */
const filterFormDataByAssignedIndicators = (formData: any, assignedIndicators: string[]): any => {
  if (!formData || !assignedIndicators || assignedIndicators.length === 0) {
    return formData;
  }

  const filtered: any = {
    infraFinancing: {},
    infraDevelopment: {},
    pppDevelopment: {},
    infraEnablers: {},
  };

  // Map indicator codes to their section keys
  const indicatorToSectionMap: Record<string, { category: string; sectionKey: string }> = {
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

  // Only include sections for assigned indicators (even if empty)
  assignedIndicators.forEach((indicatorCode) => {
    const mapping = indicatorToSectionMap[indicatorCode];
    if (mapping && formData[mapping.category]) {
      if (!filtered[mapping.category]) {
        filtered[mapping.category] = {};
      }
      // Include the section even if it's empty (for assigned indicators)
      if (formData[mapping.category][mapping.sectionKey]) {
        filtered[mapping.category][mapping.sectionKey] = formData[mapping.category][mapping.sectionKey];
      } else {
        // Initialize empty section structure based on indicator type
        switch (indicatorCode) {
          case "1.3":
            filtered[mapping.category][mapping.sectionKey] = { ulbList: [] };
            break;
          case "1.4":
            filtered[mapping.category][mapping.sectionKey] = { bondList: [] };
            break;
          case "1.5":
            filtered[mapping.category][mapping.sectionKey] = { ffiArray: [] };
            break;
          case "2.1":
            filtered[mapping.category][mapping.sectionKey] = { infraActArray: [] };
            break;
          case "2.2":
            filtered[mapping.category][mapping.sectionKey] = { specializedEntityArray: [] };
            break;
          case "2.3":
            filtered[mapping.category][mapping.sectionKey] = { infraDevelopmentArray: [] };
            break;
          case "2.4":
            filtered[mapping.category][mapping.sectionKey] = { investmentReadyArray: [] };
            break;
          case "2.5":
            filtered[mapping.category][mapping.sectionKey] = { assetMonetizationArray: [] };
            break;
          case "3.3":
            filtered[mapping.category][mapping.sectionKey] = { VGFArray: [] };
            break;
          case "3.4":
            filtered[mapping.category][mapping.sectionKey] = { projects: [] };
            break;
          case "4.6":
            filtered[mapping.category][mapping.sectionKey] = { capacityArray: [] };
            break;
          default:
            filtered[mapping.category][mapping.sectionKey] = {};
        }
      }
    }
  });

  return filtered;
};

/**
 * Extract all attached files from submissions array and indicators data
 */
const extractAttachedFilesFromSubmissions = (submissions?: any[], indicators?: Record<string, AggregatedIndicator[]>): any[] => {
  if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
    return [];
  }

  const allFiles: any[] = [];
  
  submissions.forEach((submission, subIdx) => {
    // Check if submission has attachedFiles directly
    if (submission.attachedFiles && Array.isArray(submission.attachedFiles)) {
      allFiles.push(...submission.attachedFiles);
    }
    
    // Check for attached_files (snake_case variant)
    if (submission.attached_files && Array.isArray(submission.attached_files)) {
      allFiles.push(...submission.attached_files);
    }
    
    // Also check formData for embedded files
    const subFormData = submission.formData || submission.form_data || {};
    
    if (subFormData.attachedFiles && Array.isArray(subFormData.attachedFiles)) {
      allFiles.push(...subFormData.attachedFiles);
    }
    
    if (subFormData.attached_files && Array.isArray(subFormData.attached_files)) {
      allFiles.push(...subFormData.attached_files);
    }
    
    // Check nested category sections for files
    Object.entries(subFormData).forEach(([categoryKey, categoryData]: [string, any]) => {
      if (categoryData && typeof categoryData === 'object' && !Array.isArray(categoryData)) {
        Object.entries(categoryData).forEach(([sectionKey, sectionData]: [string, any]) => {
          if (sectionData && typeof sectionData === 'object') {
            
            // Look for direct file fields
            const fileKeys = ['documents', 'files', 'attachments', 'uploadedFiles', 'uploaded_files', 'document', 'file'];
            fileKeys.forEach(fileKey => {
              if (sectionData[fileKey]) {
                if (Array.isArray(sectionData[fileKey])) {
                  allFiles.push(...sectionData[fileKey]);
                } else if (typeof sectionData[fileKey] === 'object') {
                  // Single file object
                  allFiles.push(sectionData[fileKey]);
                }
              }
            });
            
            // CRITICAL: Check for array-based sections with nested files
            // Infrastructure Development sections (2.1-2.5) store files in arrays
            const arrayKeys = ['infraActArray', 'specializedEntityArray', 'infraDevelopmentArray', 'investmentReadyArray', 'assetMonetizationArray'];
            arrayKeys.forEach(arrayKey => {
              if (sectionData[arrayKey] && Array.isArray(sectionData[arrayKey])) {
                sectionData[arrayKey].forEach((item: any, idx: number) => {
                  if (item && typeof item === 'object') {
                    // Each item may have a 'files' array
                    if (item.files && Array.isArray(item.files)) {
                      allFiles.push(...item.files);
                    }
                    // Or single file fields
                    fileKeys.forEach(fileKey => {
                      if (item[fileKey] && !Array.isArray(item[fileKey]) && typeof item[fileKey] === 'object') {
                        allFiles.push(item[fileKey]);
                      }
                    });
                  }
                });
              }
            });
            
            // Check for other common array fields that might contain files
            const otherArrayKeys = ['ulbList', 'bondList', 'ffiArray', 'VGFArray', 'projects', 'capacityArray'];
            otherArrayKeys.forEach(arrayKey => {
              if (sectionData[arrayKey] && Array.isArray(sectionData[arrayKey])) {
                sectionData[arrayKey].forEach((item: any, idx: number) => {
                  if (item && typeof item === 'object') {
                    fileKeys.forEach(fileKey => {
                      if (item[fileKey]) {
                        if (Array.isArray(item[fileKey])) {
                          allFiles.push(...item[fileKey]);
                        } else if (typeof item[fileKey] === 'object') {
                          allFiles.push(item[fileKey]);
                        }
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  // Also check indicators data for files
  if (indicators) {
    Object.entries(indicators).forEach(([category, indicatorList]) => {
      indicatorList.forEach((indicator) => {
        if (indicator.data && typeof indicator.data === 'object') {
          const fileKeys = ['documents', 'files', 'attachments', 'uploadedFiles', 'uploaded_files', 'document', 'file'];
          fileKeys.forEach(fileKey => {
            if (indicator.data[fileKey]) {
              if (Array.isArray(indicator.data[fileKey])) {
                allFiles.push(...indicator.data[fileKey]);
              } else if (typeof indicator.data[fileKey] === 'object') {
                allFiles.push(indicator.data[fileKey]);
              }
            }
          });
        }
      });
    });
  }

  // Deduplicate files by filePath (in case same file appears multiple times)
  const uniqueFiles = allFiles.reduce((acc, file) => {
    // Skip null/undefined files
    if (!file) return acc;
    
    const key = file.filePath || file.file_path || file.fileName || file.file_name || file.id;
    if (key && !acc.some((f: any) => {
      const fKey = f.filePath || f.file_path || f.fileName || f.file_name || f.id;
      return fKey === key;
    })) {
      // Normalize file object to ensure consistent property names
      const normalizedFile = {
        id: file.id,
        fileName: file.fileName || file.file_name || file.originalName || file.original_name,
        originalName: file.originalName || file.original_name || file.fileName || file.file_name,
        filePath: file.filePath || file.file_path,
        fileSize: file.fileSize || file.file_size,
        mimeType: file.mimeType || file.mime_type || file.contentType || file.content_type,
        uploadedBy: file.uploadedBy || file.uploaded_by || file.submittedBy || file.submitted_by,
        uploadedAt: file.uploadedAt || file.uploaded_at || file.createdAt || file.created_at,
      };
      acc.push(normalizedFile);
    }
    return acc;
  }, [] as any[]);

  return uniqueFiles;
};

/**
 * Create a mock submission object from aggregated data for use with existing components
 */
const createMockSubmission = (
  payload: AggregatedPayload,
  formData: any
): any => {
  const latestSubmission = payload.submissions?.[0] || {};
  
  // Extract all attached files from submissions and indicators
  const attachedFiles = extractAttachedFilesFromSubmissions(
    payload.submissions,
    payload.indicators
  );
  
  // ALSO extract files from the transformed formData (as a fallback)
  // This ensures we catch files that are in the formData structure
  const filesFromFormData: any[] = [];
  if (formData) {
    Object.entries(formData).forEach(([categoryKey, categoryData]: [string, any]) => {
      if (categoryData && typeof categoryData === 'object') {
        Object.entries(categoryData).forEach(([sectionKey, sectionData]: [string, any]) => {
          if (sectionData && typeof sectionData === 'object') {
            // Check array-based sections
            const arrayKeys = ['infraActArray', 'specializedEntityArray', 'infraDevelopmentArray', 'investmentReadyArray', 'assetMonetizationArray', 'ulbList', 'bondList', 'ffiArray', 'VGFArray', 'projects', 'capacityArray'];
            arrayKeys.forEach(arrayKey => {
              if (sectionData[arrayKey] && Array.isArray(sectionData[arrayKey])) {
                sectionData[arrayKey].forEach((item: any, idx: number) => {
                  if (item && item.files && Array.isArray(item.files)) {
                    filesFromFormData.push(...item.files);
                  }
                });
              }
            });
            
            // Check direct file fields
            const fileKeys = ['documents', 'files', 'attachments', 'uploadedFiles', 'document', 'file'];
            fileKeys.forEach(fileKey => {
              if (sectionData[fileKey]) {
                if (Array.isArray(sectionData[fileKey])) {
                  filesFromFormData.push(...sectionData[fileKey]);
                } else if (typeof sectionData[fileKey] === 'object') {
                  filesFromFormData.push(sectionData[fileKey]);
                }
              }
            });
          }
        });
      }
    });
  }
  
  // Merge files from both sources
  const allAttachedFiles = [...attachedFiles, ...filesFromFormData];
  
  // Deduplicate merged files
  const uniqueAttachedFiles = allAttachedFiles.reduce((acc, file) => {
    if (!file) return acc;
    const key = file.filePath || file.file_path || file.fileName || file.file_name || file.id;
    if (key && !acc.some((f: any) => {
      const fKey = f.filePath || f.file_path || f.fileName || f.file_name || f.id;
      return fKey === key;
    })) {
      acc.push(file);
    }
    return acc;
  }, [] as any[]);
  
  return {
    id: `aggregate-${payload.stateUt}`,
    submissionId: `AGG-${payload.stateUt}`,
    stateUt: payload.stateUt,
    status: payload.summary?.percentage === 100 ? "APPROVED" : "SUBMITTED_TO_STATE",
    formData: formData,
    attachedFiles: uniqueAttachedFiles,
    reviewComments: [],
    currentOwnerRole: "STATE_APPROVER",
    createdAt: payload.summary?.lastUpdatedAt || new Date().toISOString(),
    updatedAt: payload.summary?.lastUpdatedAt || new Date().toISOString(),
    user: latestSubmission.user || {
      email: "aggregate@state.gov",
      firstName: "State",
      lastName: "Aggregate",
    },
    finalScore: null,
    sections: Object.entries(payload.indicators || {}).map(([category, indicators]) => ({
      id: category,
      name: category.replace(/_/g, " "),
      indicators: indicators.map((ind) => ({
        id: ind.id || ind.code,
        code: ind.code,
        name: ind.name,
        status: ind.status,
        score: ind.score,
        maxScore: ind.maxScore,
        updatedAt: ind.updatedAt,
        data: ind.data,
        category: ind.category,
        year: ind.year,
      })),
    })),
  };
};

export const StateAggregateReviewPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get assigned indicators for nodal officers (for filtering in preview mode)
  const { assignedIndicators, isNodalOfficer, isStateApprover, loading: indicatorLoading } = useIndicatorAccess();
  const isMospiReviewer = user?.role === "MOSPI_REVIEWER";

  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [aggregateData, setAggregateData] = useState<AggregatedPayload | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [mockSubmission, setMockSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState(true);
  const [stateProgress, setStateProgress] = useState<ProgressStats | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [submittingFinal, setSubmittingFinal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hasSubmittedToMospiReviewer, setHasSubmittedToMospiReviewer] = useState(false);

  // Get state and year from URL params
  useEffect(() => {
    const stateParam = searchParams.get("state");
    const yearParam = searchParams.get("year");

    if (stateParam) {
      setSelectedState(stateParam);
    } else if (user?.stateUt || user?.stateName || user?.state) {
      const userState = (user.stateUt || user.stateName || user.state || "").trim().toUpperCase();
      setSelectedState(userState);
    }

    if (yearParam) {
      setSelectedYear(yearParam);
    }
  }, [searchParams, user]);

  // Load states
  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoadingStates(true);
        const states = await statesService.getStates();
        // Filter out invalid states (empty codes, metadata entries, etc.)
        const validStates = states.filter((state) => {
          // Must have a valid code that's not empty and not a metadata field
          const hasValidCode = state.code && 
                               state.code.trim() !== "" && 
                               state.code.toLowerCase() !== "status" &&
                               state.code.toLowerCase() !== "id";
          // Must have a name
          const hasValidName = state.name && state.name.trim() !== "";
          return hasValidCode && hasValidName;
        });
        setStateOptions(validStates);
      } catch (err: any) {
        notificationService.error(err.message || "Failed to load states");
      } finally {
        setLoadingStates(false);
      }
    };

    loadStates();
  }, []);

  // Determine effective state for API calls
  const effectiveState = useMemo(() => {
    if (selectedState) return selectedState;
    if (user?.stateUt) return user.stateUt.toUpperCase();
    if (user?.stateName) return user.stateName.toUpperCase();
    if (user?.state) return user.state.toUpperCase();
    return "";
  }, [selectedState, user]);

  // Load aggregate preview data
  useEffect(() => {
    const loadAggregatePreview = async () => {
      // Only wait for indicator loading if user is a nodal officer (they need assigned indicators for filtering)
      // State approvers don't need to wait - they see all data regardless
      if (indicatorLoading && isNodalOfficer) {
        return;
      }
      
      if (!effectiveState) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const payload = await getCumulativePreview(effectiveState, {
          year: selectedYear || undefined,
        });

        // The API returns the data directly or wrapped in a data property
        const data = (payload as any).data || payload;
        
        if (!data || !data.indicators) {
          setAggregateData(null);
          setFormData(null);
          setMockSubmission(null);
          return;
        }

        setAggregateData(data);

        // Transform indicators to formData structure
        // Also pass submissions array if available to extract form data
        let transformedFormData = transformIndicatorsToFormData(
          data.indicators || {},
          data.submissions || (payload as any).submissions
        );
        
        // Filter formData for nodal officers ONLY: remove unassigned indicators
        // State approvers should see ALL data regardless of assigned indicators
        if (isNodalOfficer && assignedIndicators && assignedIndicators.length > 0) {
          transformedFormData = filterFormDataByAssignedIndicators(transformedFormData, assignedIndicators);
        }
        
        setFormData(transformedFormData);

        // Create mock submission for existing components
        const submission = createMockSubmission(data, transformedFormData);
        setMockSubmission(submission);

      } catch (err: any) {
        setError(err.message || "Failed to load aggregate preview");
        notificationService.error(err.message || "Failed to load aggregate preview");
      } finally {
        setLoading(false);
      }
    };

    loadAggregatePreview();
  }, [effectiveState, selectedYear, isNodalOfficer, assignedIndicators, indicatorLoading]);

  // Re-filter formData when assignedIndicators changes (for nodal officers ONLY)
  // State approvers should NOT have their data filtered - they need to see all submissions
  useEffect(() => {
    // Only re-filter if user is a nodal officer AND has assigned indicators
    // State approvers should see all data regardless
    if (isNodalOfficer && assignedIndicators && assignedIndicators.length > 0 && formData) {
      const filteredFormData = filterFormDataByAssignedIndicators(formData, assignedIndicators);
      setFormData(filteredFormData);
    }
  }, [isNodalOfficer, assignedIndicators, formData]);

  // Restrict state selection for STATE_APPROVER (use isStateApprover from useIndicatorAccess)
  const canSelectState = !isStateApprover;

  // Fetch state progress for submit button
  useEffect(() => {
    if (user?.role !== "STATE_APPROVER" && user?.role !== "MOSPI_REVIEWER") return;

    let intervalId: number | undefined;

    const loadProgressOnce = async () => {
      if (document?.hidden) return;

      try {
        setProgressLoading(true);

        const resp = await apiService.getStateIndicatorStatuses();

        const normalized = resp?.data ? resp : { data: resp };
        const stats = calculateStateProgressFromApi(normalized);

        setStateProgress(stats);
      } catch (e) {
        setStateProgress(null);
      } finally {
        setProgressLoading(false);
      }
    };

    // run immediately on mount
    loadProgressOnce();

    // auto-refresh every 60 seconds
    intervalId = window.setInterval(loadProgressOnce, 60_000);

    // clean up on unmount
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.role]);

  // Check if there's already a consolidated submission with status SUBMITTED_TO_MOSPI_REVIEWER
  useEffect(() => {
    if (user?.role !== "STATE_APPROVER") {
      setHasSubmittedToMospiReviewer(false);
      return;
    }

    const checkSubmittedStatus = async () => {
      try {
        const submissionsData = await apiService.getSubmissions(1, 100);
        
        // Handle different response structures
        let submissionsArray: any[] = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }

        const hasSubmitted = submissionsArray.some((submission) => {
          const isOwnSubmission = submission.user?.id === user?.id || 
            submission.submittedBy?.id === user?.id ||
            (submission.user?.email && submission.user.email === user?.email);
          return submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" && isOwnSubmission;
        });

        setHasSubmittedToMospiReviewer(hasSubmitted);
      } catch (error) {
        setHasSubmittedToMospiReviewer(false);
      }
    };

    checkSubmittedStatus();
  }, [user?.role, user?.id, user?.email]);

  // Handle final submit - Creates consolidated submission from aggregated formData
  const handleFinalSubmit = async () => {
    try {
      // Gate: must have progress and must be 100% approved
      if (!stateProgress || stateProgress.percentage !== 100 || stateProgress.approved !== stateProgress.total) {
        notificationService.warning("All indicators must be approved before final submission.");
        setShowConfirmModal(false);
        return;
      }

      // Gate: must have aggregated formData
      if (!formData) {
        notificationService.error("No aggregated data available to submit.");
        setShowConfirmModal(false);
        return;
      }

      setSubmittingFinal(true);

      // Determine submission status based on role
      const submissionStatus = isMospiReviewer 
        ? "SUBMITTED_TO_MOSPI_APPROVER" 
        : "SUBMITTED_TO_MOSPI_REVIEWER";
      
      const transformedData = transformFormDataForSubmission(
        formData,
        submissionStatus
      );

      // Create multipart FormData for file attachments
      const multipartData = new FormData();
      multipartData.append("submission", JSON.stringify(transformedData));

      // Append file attachments recursively
      appendFilesRecursively(multipartData, formData);

      // Get authentication token
      const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
      const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
      const tokenFromNewKey = tokenData?.value?.accessToken;
      const tokenFromLegacyKey = localStorage.getItem("access_token") || undefined;
      const token = tokenFromNewKey || tokenFromLegacyKey || "";

      // Submit consolidated submission
      const response = await axios.post(
        `${config.apiBaseUrl}/submission`,
        multipartData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      
      const successMessage = isMospiReviewer
        ? "Consolidated submission sent to MoSPI Approver successfully."
        : "Consolidated submission sent to MoSPI Reviewer successfully.";
      
      notificationService.success(successMessage);

      // Close modal after successful submission
      setShowConfirmModal(false);

      // Refresh progress so UI reflects the new state
      try {
        const resp = await apiService.getStateIndicatorStatuses();
        const normalized = resp?.data ? resp : { data: resp };
        const stats = calculateStateProgressFromApi(normalized);
        setStateProgress(stats);
      } catch (e) {
        // Silent fail
      }

      // Refresh submissions list and update hasSubmittedToMospiReviewer flag
      try {
        const submissionsData = await apiService.getSubmissions(1, 100);
        
        // Handle different response structures
        let submissionsArray: any[] = [];
        if (Array.isArray(submissionsData)) {
          submissionsArray = submissionsData;
        } else if (submissionsData?.submissions && Array.isArray(submissionsData.submissions)) {
          submissionsArray = submissionsData.submissions;
        } else if ((submissionsData as any)?.data && Array.isArray((submissionsData as any).data)) {
          submissionsArray = (submissionsData as any).data;
        }

        const hasSubmitted = submissionsArray.some((submission) => {
          const isOwnSubmission = submission.user?.id === user?.id || 
            submission.submittedBy?.id === user?.id ||
            (submission.user?.email && submission.user.email === user?.email);
          return submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" && isOwnSubmission;
        });

        setHasSubmittedToMospiReviewer(hasSubmitted);
      } catch (e) {
        // Still set to true since we just submitted successfully
        setHasSubmittedToMospiReviewer(true);
      }
      
      // Redirect to review page after successful submission
      setTimeout(() => {
        navigate("/data-submission/review");
      }, 1000); // Small delay to ensure success message is visible
      
    } catch (e: any) {
      notificationService.error(e?.message || "Error creating consolidated submission.");
      setShowConfirmModal(false);
    } finally {
      setSubmittingFinal(false);
    }
  };

  if (loadingStates) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !aggregateData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Data</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "SUBMITTED_TO_STATE":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "APPROVED":
        return "bg-green-100 text-green-700 border-green-300";
      case "RETURNED_FROM_STATE":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "REJECTED":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6 border border-[#ddd] bg-[#fff] rounded-lg p-6">
            <div>
              <Button
                variant="outline"
                onClick={() => navigate("/data-submission/review")}
                className="gap-2 flex items-center border-none bg-[none] px-0 text-primary hover:bg-[none] mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
                   <div>
                     <h1 className="text-lg font-semibold text-[#212121]">
                       {isMospiReviewer ? "MoSPI Review Submission" : "State Review Submission"}
                     </h1>
                {mockSubmission && (
                  <p className="text-[#727272]">
                    {mockSubmission.submissionId} • {mockSubmission.stateUt}
                  </p>
                )}
              </div>
            </div>
            {mockSubmission && (
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={getStatusBadgeColor(mockSubmission.status)}
                >
                  {mockSubmission.status.replace(/_/g, " ")}
                </Badge>
                {/* Submit Button */}
                {user?.role === "STATE_APPROVER" && stateProgress && (
                  <Button
                    className={`text-white px-6 ${
                      stateProgress.percentage === 100 && !submittingFinal && !progressLoading && stateProgress.approved === stateProgress.total && !hasSubmittedToMospiReviewer
                        ? "bg-[#1e3a8a] hover:bg-[#1e3299]" // Darker blue when enabled at 100%
                        : "bg-[#7888E3] hover:bg-[#6574CC]"  // Default lighter blue
                    }`}
                    onClick={() => setShowConfirmModal(true)}
                    disabled={
                      submittingFinal ||
                      progressLoading ||
                      !stateProgress ||
                      stateProgress.approved !== stateProgress.total ||
                      hasSubmittedToMospiReviewer
                    }
                  >
                    {submittingFinal ? "Submitting…" : "Submit Now"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Submission Info */}
          {mockSubmission && (
            <div className="bg-white rounded-lg border border-[#ddd] p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#212121]">State/UT</p>
                  <p className="text-[#727272] text-sm">
                    {effectiveState || mockSubmission.stateUt || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#212121]">Submission Date</p>
                  <p className="text-[#727272] text-sm">
                    {mockSubmission.createdAt
                      ? new Date(mockSubmission.createdAt).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#212121]">Current Owner</p>
                  <p className="text-[#727272] text-sm">
                    {mockSubmission.currentOwnerRole?.replace(/_/g, " ") || "STATE APPROVER"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : !mockSubmission ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-[#727272]">No data available for the selected state and year.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="data-review">Data Review</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

            <TabsContent value="overview">
              <OverviewTab submission={mockSubmission} />
            </TabsContent>

            <TabsContent value="data-review">
              <DataReviewTab
                submissionId={mockSubmission.id}
                formData={formData}
                submission={mockSubmission}
                isPreview={true}
                assignedIndicators={isNodalOfficer ? assignedIndicators : undefined}
                isNodalOfficer={isNodalOfficer}
              />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentsTab
                documents={mockSubmission.attachedFiles || []}
                submissionId={mockSubmission.id}
                formData={formData}
              />
            </TabsContent>

            <TabsContent value="history">
              <AuditLog entries={generateAuditEntries(mockSubmission)} />
            </TabsContent>
          </Tabs>
          </>
        )}
      </div>

      {/* Confirmation Modal for Final Submit */}
      <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Now?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this submission to MoSPI Reviewer?
              <br />
              Once submitted, you cannot make changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingFinal}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleFinalSubmit();
              }}
              disabled={submittingFinal}
              className="bg-[#1e3a8a] hover:bg-[#1e3299]"
            >
              {submittingFinal ? "Submitting…" : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
