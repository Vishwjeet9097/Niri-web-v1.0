import { useEffect, useMemo, useState, useRef } from "react";
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
import { mergeAttachedFiles, extractFileMetadataFromFormData } from "@/utils/extractFileMetadata";
import { hasSectionData } from "@/utils/sectionDataValidator";
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
  console.log("[Transform] Raw indicators input:", indicators);
  console.log("[Transform] Indicator keys:", Object.keys(indicators));
  console.log("[Transform] Submissions array provided:", submissions ? `${submissions.length} submissions` : "NO SUBMISSIONS");
  if (submissions && Array.isArray(submissions) && submissions.length > 0) {
    console.log("[Transform] First submission structure:", {
      hasFormData: !!submissions[0].formData,
      hasForm_data: !!submissions[0].form_data,
      formDataKeys: submissions[0].formData ? Object.keys(submissions[0].formData) : [],
      form_dataKeys: submissions[0].form_data ? Object.keys(submissions[0].form_data) : []
    });
  }
  
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
    console.log(`[Transform] Processing category: ${categoryKey} with ${indicatorList?.length || 0} indicators`);
    
    const formDataKey = categoryMap[categoryKey];
    if (!formDataKey || !formData[formDataKey]) {
      console.warn(`[Transform] Unknown category: ${categoryKey}, skipping`);
      return;
    }

    // Process each indicator in the category
    indicatorList.forEach((indicator) => {
      const code = indicator.code?.trim();
      if (!code) {
        console.warn(`[Transform] Indicator without code:`, indicator);
        return;
      }

      console.log(`[Transform] Processing indicator ${code} in category ${categoryKey}`);
      console.log(`[Transform] Full indicator object:`, indicator);
      console.log(`[Transform] Indicator data:`, indicator.data);
      console.log(`[Transform] Indicator data type:`, typeof indicator.data);
      console.log(`[Transform] Indicator data keys:`, indicator.data && typeof indicator.data === 'object' ? Object.keys(indicator.data) : 'not an object');

      // Convert code to section key (e.g., "1.1" -> "section1_1")
      const sectionKey = `section${code.replace(".", "_")}`;

      // Extract data from indicator - data is directly in indicator.data, not nested
      let indicatorData = indicator.data;

      // Handle null/undefined data - if indicator exists but has no data, skip creating empty section
      // Only proceed if indicator has data OR if we can extract data from submissions array
      if (!indicatorData && (!submissions || submissions.length === 0)) {
        console.log(`[Transform] Skipping indicator ${code} - no data and no submissions to extract from`);
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
          console.log(`[Transform] Skipping array ${sectionKey} in ${formDataKey} - empty array or array with no valid data (length: ${indicatorData.length})`);
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
        console.log(`[Transform] Stored array ${sectionKey} in ${formDataKey}:`, formData[formDataKey][sectionKey], `(array length: ${indicatorData.length})`);
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
        
        // Log what we're keeping for debugging
        console.log(`[Transform] Indicator ${code} - keeping fields:`, Object.keys(formFields));
        console.log(`[Transform] Indicator ${code} - formFields values:`, formFields);

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
            console.log(`[Transform] Section 1.1 - Full indicator:`, JSON.stringify(indicator, null, 2));
            
            // Check if capitalAllocation/gsdpForFY exist with different field names
            // Common variations: capital_allocation, capitalAllocation, capital_allocation_fy, etc.
            const possibleCapAllocKeys = ['capitalAllocation', 'capital_allocation', 'capitalAllocationFY', 'capital_allocation_fy', 'a1', 'A1'];
            const possibleGsdpKeys = ['gsdpForFY', 'gsdp_for_fy', 'gsdpForFYValue', 'gsdp_for_fy_value', 'a2', 'A2', 'gsdp'];
            
            // Try to find capitalAllocation
            if (!formFields.capitalAllocation) {
              for (const key of possibleCapAllocKeys) {
                if (indicatorData[key] !== undefined) {
                  formFields.capitalAllocation = String(indicatorData[key]);
                  console.log(`[Transform] Found capitalAllocation as '${key}':`, indicatorData[key]);
                  break;
                }
              }
            }
            
            // Try to find gsdpForFY
            if (!formFields.gsdpForFY) {
              for (const key of possibleGsdpKeys) {
                if (indicatorData[key] !== undefined) {
                  formFields.gsdpForFY = String(indicatorData[key]);
                  console.log(`[Transform] Found gsdpForFY as '${key}':`, indicatorData[key]);
                  break;
                }
              }
            }
            
            // If still not found, check if they're in a nested structure
            if (!formFields.capitalAllocation && indicatorData.user_fill_value_a1 !== undefined) {
              formFields.capitalAllocation = String(indicatorData.user_fill_value_a1);
              console.log(`[Transform] Found capitalAllocation as user_fill_value_a1:`, indicatorData.user_fill_value_a1);
            }
            
            if (!formFields.gsdpForFY && indicatorData.user_fill_value_a2 !== undefined) {
              formFields.gsdpForFY = String(indicatorData.user_fill_value_a2);
              console.log(`[Transform] Found gsdpForFY as user_fill_value_a2:`, indicatorData.user_fill_value_a2);
            }
            
            // If still not found, check submissions array for formData (nodal officer submissions)
            if ((!formFields.capitalAllocation || !formFields.gsdpForFY) && submissions && Array.isArray(submissions)) {
              console.log(`[Transform] Checking ${submissions.length} submissions for section 1.1 data`);
              for (const submission of submissions) {
                const subFormData = submission.formData || submission.form_data || {};
                const infraFinancing = subFormData.infraFinancing || subFormData.Infrastructure_Financing || {};
                const section1_1 = infraFinancing.section1_1 || {};
                
                if (section1_1.capitalAllocation && !formFields.capitalAllocation) {
                  formFields.capitalAllocation = String(section1_1.capitalAllocation);
                  console.log(`[Transform] Found capitalAllocation in submission ${submission.id}:`, section1_1.capitalAllocation);
                }
                
                if (section1_1.gsdpForFY && !formFields.gsdpForFY) {
                  formFields.gsdpForFY = String(section1_1.gsdpForFY);
                  console.log(`[Transform] Found gsdpForFY in submission ${submission.id}:`, section1_1.gsdpForFY);
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
            
            // Log what we have for section 1.1
            console.log(`[Transform] Section 1.1 final fields:`, formFields);
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
        // IMPORTANT: Use hasSectionData to properly handle "no" responses with comments
        console.log(`[Transform] Checking hasSectionData for ${sectionKey} in ${formDataKey}`);
        console.log(`[Transform] formFields structure:`, JSON.stringify(formFields, null, 2));
        const hasMeaningfulData = hasSectionData(formFields, sectionKey, formDataKey);
        console.log(`[Transform] hasSectionData result for ${sectionKey}:`, hasMeaningfulData);
        
        // Check if indicator is assigned/submitted (not NOT_STARTED status)
        // NOT_STARTED means the indicator hasn't been assigned or filled yet
        // Note: status was deleted from formFields above, so get it from indicatorData or indicator
        const indicatorStatus = indicator?.status || indicatorData?.status;
        const isNotStarted = indicatorStatus === 'NOT_STARTED' || indicatorStatus === null || indicatorStatus === undefined;
        
        // Check if this indicator exists in any submission (meaning it's been worked on)
        // IMPORTANT: Always merge submission data first, then check for meaningful data
        // This ensures comments from submissions are included even if aggregated data doesn't have them
        let existsInSubmissions = false;
        
        if (submissions && Array.isArray(submissions)) {
          console.log(`[Transform] Checking ${submissions.length} submissions for section ${sectionKey} in category ${formDataKey}`);
          for (const submission of submissions) {
            const subFormData = submission.formData || submission.form_data || {};
            const categoryData = subFormData[formDataKey] || subFormData[categoryKey] || {};
            
            console.log(`[Transform] Submission ${submission.id || submission.submissionId || 'unknown'}: categoryData keys:`, Object.keys(categoryData));
            
            if (sectionKey in categoryData) {
              existsInSubmissions = true;
              const submissionSection = categoryData[sectionKey];
              if (submissionSection && typeof submissionSection === 'object') {
                console.log(`[Transform] ✅ Found section ${sectionKey} in submission:`, submissionSection);
                console.log(`[Transform] Section ${sectionKey} keys:`, Object.keys(submissionSection));
                console.log(`[Transform] Section ${sectionKey} has comment:`, !!submissionSection.comment, submissionSection.comment);
                // Always merge submission data into formFields, prioritizing submission data
                // This ensures comments and other fields from submissions are included
                Object.keys(submissionSection).forEach(key => {
                  // Always merge comment field if it exists in submission (even if formFields has it or is empty)
                  // Comments are critical and should always come from submissions if available
                  if (key === 'comment') {
                    if (submissionSection[key] && (submissionSection[key] !== null && submissionSection[key] !== undefined && String(submissionSection[key]).trim() !== '')) {
                      formFields[key] = submissionSection[key];
                      console.log(`[Transform] ✅ Merged comment from submission for ${sectionKey}:`, submissionSection[key]);
                    } else {
                      console.log(`[Transform] ⚠️ Submission has empty/null comment for ${sectionKey}`);
                    }
                  } else if (!formFields.hasOwnProperty(key) || !formFields[key]) {
                    // For other fields, merge if formFields doesn't have it or if it's empty
                    formFields[key] = submissionSection[key];
                  }
                });
                console.log(`[Transform] formFields after merging submission data for ${sectionKey}:`, JSON.stringify(formFields, null, 2));
              }
            }
          }
        }
        
        // Re-check hasMeaningfulData after merging submission data
        // This will now properly detect "no" + comment cases
        const finalHasMeaningfulData = hasSectionData(formFields, sectionKey, formDataKey);
        
        // Check if section has "no" selected (even without comment) - this is still user input
        const hasNoSelected = (() => {
          const noFields = ['hasIntermediary', 'hasInfraDevelopmentPlan', 'hasInvestmentReady', 
                           'available', 'allEligible', 'adopted', 'implemented', 'participated'];
          return noFields.some(field => formFields[field] === 'no' || formFields[field] === 'No');
        })();
        
        console.log(`[Transform] Final check for ${sectionKey}: hasMeaningfulData=${finalHasMeaningfulData}, hasNoSelected=${hasNoSelected}, isNotStarted=${isNotStarted}, existsInSubmissions=${existsInSubmissions}`);
        console.log(`[Transform] formFields for ${sectionKey}:`, formFields);
        
        // Only create section if:
        // 1. It has meaningful data (from indicator or submissions, including "no" + comment), OR
        // 2. It has "no" selected (user input, even without comment), OR
        // 3. It's not in NOT_STARTED status (has been assigned/submitted), OR
        // 4. It exists in submissions array (has been worked on)
        // This prevents unassigned/unfilled indicators from appearing empty
        // But includes sections where user selected "no" (with or without comment)
        const shouldInclude = finalHasMeaningfulData || hasNoSelected || !isNotStarted || existsInSubmissions;
        
        if (shouldInclude) {
          formData[formDataKey][sectionKey] = formFields;
          // Log comment field specifically for debugging
          if (formFields.comment) {
            console.log(`[Transform] ✅ Stored ${sectionKey} in ${formDataKey} WITH COMMENT:`, formFields.comment);
          } else {
            console.log(`[Transform] ⚠️ Stored ${sectionKey} in ${formDataKey} WITHOUT COMMENT`);
          }
          console.log(`[Transform] ✅ Stored ${sectionKey} in ${formDataKey}:`, formFields, `(hasData: ${finalHasMeaningfulData}, status: ${indicatorStatus}, existsInSubmissions: ${existsInSubmissions})`);
        } else {
          console.log(`[Transform] ❌ Skipping ${sectionKey} in ${formDataKey} - no meaningful data, NOT_STARTED status, and not in submissions`);
        }
      }
    });
  });

  // Clean up empty categories
  Object.keys(formData).forEach((categoryKey) => {
    if (Object.keys(formData[categoryKey]).length === 0) {
      delete formData[categoryKey];
      console.log(`[Transform] Removed empty category: ${categoryKey}`);
    }
  });

  console.log("[Transform] Final formData structure:", formData);
  console.log("[Transform] infraFinancing sections:", Object.keys(formData.infraFinancing || {}));
  console.log("[Transform] infraDevelopment sections:", Object.keys(formData.infraDevelopment || {}));
  console.log("[Transform] pppDevelopment sections:", Object.keys(formData.pppDevelopment || {}));
  console.log("[Transform] infraEnablers sections:", Object.keys(formData.infraEnablers || {}));

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
      console.log(`[Filter] Including ${indicatorCode} -> ${mapping.category}.${mapping.sectionKey}`);
    }
  });

  return filtered;
};

/**
 * Create a mock submission object from aggregated data for use with existing components
 */
const createMockSubmission = (
  payload: AggregatedPayload,
  formData: any
): any => {
  const latestSubmission = payload.submissions?.[0] || {};
  
  return {
    id: `aggregate-${payload.stateUt}`,
    submissionId: `AGG-${payload.stateUt}`,
    stateUt: payload.stateUt,
    status: payload.summary?.percentage === 100 ? "APPROVED" : "SUBMITTED_TO_STATE",
    formData: formData,
    attachedFiles: [], // Can be populated from submissions if needed
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
  const justSubmittedRef = useRef(false); // Track if we just submitted to prevent check from resetting flag

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
        console.log(`[StateAggregate] Filtered ${validStates.length} valid states from ${states.length} total`);
        setStateOptions(validStates);
      } catch (err: any) {
        console.error("❌ Error fetching states:", err);
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
        console.log("[StateAggregate] Waiting for indicator access to load (nodal officer)...");
        return;
      }
      
      if (!effectiveState) {
        console.log("[StateAggregate] No effective state, skipping load");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`[StateAggregate] Loading preview for state: ${effectiveState}, year: ${selectedYear || "current"}`);
        console.log(`[StateAggregate] User role - isNodalOfficer: ${isNodalOfficer}, isStateApprover: ${isStateApprover}`);
        console.log(`[StateAggregate] assignedIndicators:`, assignedIndicators);

        const payload = await getCumulativePreview(effectiveState, {
          year: selectedYear || undefined,
        });

        console.log("[StateAggregate] Cumulative preview payload:", payload);

        // The API returns the data directly or wrapped in a data property
        const data = (payload as any).data || payload;
        
        if (!data || !data.indicators) {
          console.warn("[StateAggregate] Empty payload received");
          setAggregateData(null);
          setFormData(null);
          setMockSubmission(null);
          return;
        }

        setAggregateData(data);

        // Log raw indicators structure
        console.log("[StateAggregate] Raw indicators from API:", data.indicators);
        console.log("[StateAggregate] Indicator categories:", Object.keys(data.indicators || {}));
        Object.entries(data.indicators || {}).forEach(([category, indicators]) => {
          console.log(`[StateAggregate] Category ${category}:`, indicators);
          if (Array.isArray(indicators) && indicators.length > 0) {
            // Find indicator 1.1 specifically
            const indicator1_1 = indicators.find((ind: any) => ind.code === '1.1');
            if (indicator1_1) {
              console.log(`[StateAggregate] 🔍 Indicator 1.1 FULL OBJECT:`, JSON.stringify(indicator1_1, null, 2));
              console.log(`[StateAggregate] 🔍 Indicator 1.1 data:`, indicator1_1.data);
              console.log(`[StateAggregate] 🔍 Indicator 1.1 data keys:`, indicator1_1.data ? Object.keys(indicator1_1.data) : 'no data');
            }
            // Find indicator 1.2 for comparison
            const indicator1_2 = indicators.find((ind: any) => ind.code === '1.2');
            if (indicator1_2) {
              console.log(`[StateAggregate] 🔍 Indicator 1.2 FULL OBJECT:`, JSON.stringify(indicator1_2, null, 2));
              console.log(`[StateAggregate] 🔍 Indicator 1.2 data:`, indicator1_2.data);
              console.log(`[StateAggregate] 🔍 Indicator 1.2 data keys:`, indicator1_2.data ? Object.keys(indicator1_2.data) : 'no data');
            }
            console.log(`[StateAggregate] Sample indicator from ${category}:`, indicators[0]);
            console.log(`[StateAggregate] Sample indicator data structure:`, indicators[0]?.data);
          }
        });

        // Fetch submissions from getStateIndicatorStatuses API to get comments
        // This API returns submissions with full formData including comments
        let submissionsToUse: any[] = [];
        try {
          const statusResp = await apiService.getStateIndicatorStatuses(selectedYear || undefined);
          const normalizedStatus = statusResp?.data ? statusResp : { data: statusResp };
          const statusData = normalizedStatus.data || {};
          const allSubmissions = statusData.submissions || [];
          
          // Filter to get only non-consolidated submissions (source submissions with comments)
          submissionsToUse = allSubmissions.filter((sub: any) => {
            const formData = sub.formData || sub.form_data || {};
            const metadata = formData._metadata;
            return !metadata?.isConsolidated;
          });
          
          console.log("[StateAggregate] Fetched submissions from getStateIndicatorStatuses:", submissionsToUse.length);
          if (submissionsToUse.length > 0) {
            console.log("[StateAggregate] Sample submission structure:", {
              id: submissionsToUse[0].id,
              submissionId: submissionsToUse[0].submissionId,
              hasFormData: !!submissionsToUse[0].formData,
              hasForm_data: !!submissionsToUse[0].form_data
            });
            // Log a sample section to verify comments exist
            const sampleSub = submissionsToUse[0];
            const sampleFormData = sampleSub.formData || sampleSub.form_data || {};
            const sampleSection = sampleFormData.infraFinancing?.section1_5 || 
                                 sampleFormData.infraDevelopment?.section2_4 ||
                                 sampleFormData.pppDevelopment?.section3_2 ||
                                 sampleFormData.infraEnablers?.section4_1;
            if (sampleSection) {
              console.log("[StateAggregate] Sample section with comment check:", {
                section: Object.keys(sampleFormData).find(cat => {
                  const catData = sampleFormData[cat];
                  return catData && typeof catData === 'object' && 
                    Object.values(catData).some((sec: any) => sec && typeof sec === 'object' && sec.comment);
                }),
                hasComment: !!sampleSection.comment,
                comment: sampleSection.comment
              });
            }
          }
        } catch (submissionError) {
          console.warn("[StateAggregate] Failed to fetch submissions for comments:", submissionError);
          // Continue without submissions - comments won't be merged but form will still work
        }
        
        // Transform indicators to formData structure
        // Pass submissions array to extract comments from source submissions
        console.log("[StateAggregate] Submissions to pass to transform:", submissionsToUse ? `${submissionsToUse.length} submissions` : "NO SUBMISSIONS");
        let transformedFormData = transformIndicatorsToFormData(
          data.indicators || {},
          submissionsToUse
        );
        console.log("[StateAggregate] Transformed formData:", transformedFormData);
        console.log("[StateAggregate] FormData keys:", Object.keys(transformedFormData));
        
        // Filter formData for nodal officers ONLY: remove unassigned indicators
        // State approvers should see ALL data regardless of assigned indicators
        if (isNodalOfficer && assignedIndicators && assignedIndicators.length > 0) {
          console.log("[StateAggregate] Filtering formData for nodal officer");
          console.log("[StateAggregate] Assigned indicators:", assignedIndicators);
          console.log("[StateAggregate] FormData before filtering:", transformedFormData);
          transformedFormData = filterFormDataByAssignedIndicators(transformedFormData, assignedIndicators);
          console.log("[StateAggregate] Filtered formData:", transformedFormData);
          console.log("[StateAggregate] Filtered formData keys:", Object.keys(transformedFormData));
          if (transformedFormData.infraFinancing) {
            console.log("[StateAggregate] Filtered infraFinancing sections:", Object.keys(transformedFormData.infraFinancing));
          }
        } else {
          // For state approvers or other roles, don't filter - show ALL data
          console.log("[StateAggregate] Not filtering - showing all data. isNodalOfficer:", isNodalOfficer, "assignedIndicators:", assignedIndicators);
          console.log("[StateAggregate] Full formData (no filtering):", transformedFormData);
        }
        
        setFormData(transformedFormData);

        // Create mock submission for existing components
        const submission = createMockSubmission(data, transformedFormData);
        setMockSubmission(submission);

        // Log aggregated formData for verification before submission
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📋 [StateAggregate] AGGREGATED FORMDATA FOR SUBMISSION");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📦 Complete aggregated formData structure:", JSON.stringify(transformedFormData, null, 2));
        console.log("📊 FormData categories:", Object.keys(transformedFormData));
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        Object.keys(transformedFormData).forEach((category) => {
          const categoryData = transformedFormData[category];
          if (categoryData && typeof categoryData === 'object') {
            const sections = Object.keys(categoryData);
            console.log(`📁 Category: ${category}`);
            console.log(`   Sections: ${sections.join(', ')}`);
            sections.forEach((section) => {
              console.log(`   ✅ Section ${section}:`, categoryData[section]);
            });
          }
        });
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      } catch (err: any) {
        console.error("❌ Failed to load aggregate preview:", err);
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
      console.log("[StateAggregate] Re-filtering formData due to assignedIndicators change (nodal officer)");
      console.log("[StateAggregate] Current formData:", formData);
      console.log("[StateAggregate] Assigned indicators:", assignedIndicators);
      const filteredFormData = filterFormDataByAssignedIndicators(formData, assignedIndicators);
      console.log("[StateAggregate] Re-filtered formData:", filteredFormData);
      if (filteredFormData.infraFinancing) {
        console.log("[StateAggregate] Re-filtered infraFinancing sections:", Object.keys(filteredFormData.infraFinancing));
      }
      setFormData(filteredFormData);
    } else if (!isNodalOfficer && formData) {
      // For state approvers: ensure we don't accidentally filter data
      // If formData exists and user is not a nodal officer, keep it as-is (all data visible)
      console.log("[StateAggregate] State approver viewing - keeping all data unfiltered");
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
        console.log("📊 [StateAggregate] Fetching /indicators/state-statuses...");

        const resp = await apiService.getStateIndicatorStatuses();
        console.log("✅ [StateAggregate] Raw API response:", resp);

        const normalized = resp?.data ? resp : { data: resp };
        const stats = calculateStateProgressFromApi(normalized);
        console.log("✅ [StateAggregate] calculateStateProgressFromApi(stats):", stats);

        setStateProgress(stats);
      } catch (e) {
        console.error("Failed to load state indicator statuses", e);
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

        // Get the current state being viewed (for multi-state scenarios)
        const currentState = effectiveState || selectedState || user?.stateUt || user?.state;
        const normalizedCurrentState = (currentState || "").toString().trim().toUpperCase();
        
        console.log("🔍 [Check] Checking for submitted submissions. Current state:", normalizedCurrentState);
        console.log("🔍 [Check] Total submissions found:", submissionsArray.length);
        
        const hasSubmitted = submissionsArray.some((submission) => {
          const isOwnSubmission = submission.user?.id === user?.id || 
            submission.submittedBy?.id === user?.id ||
            (submission.user?.email && submission.user.email === user?.email);
          // Check if submission is for the current state and has been submitted to MOSPI reviewer or approver
          // Use case-insensitive comparison for state matching
          const submissionState = (submission.stateUt || submission.user?.stateUt || "").toString().trim().toUpperCase();
          const isForCurrentState = !currentState || 
            submissionState === normalizedCurrentState;
          
          // Check for SUBMITTED_TO_MOSPI_REVIEWER, SUBMITTED_TO_MOSPI_APPROVER, or APPROVED
          const matches = (submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" || 
                          submission.status === "SUBMITTED_TO_MOSPI_APPROVER" ||
                          submission.status === "APPROVED") 
            && isOwnSubmission && isForCurrentState;
          
          if ((submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" || submission.status === "SUBMITTED_TO_MOSPI_APPROVER" || submission.status === "APPROVED") && isOwnSubmission) {
            console.log("🔍 [Check] Found submission:", {
              submissionId: submission.id,
              status: submission.status,
              submissionState,
              normalizedCurrentState,
              isForCurrentState,
              matches
            });
          }
          
          return matches;
        });

        console.log("🔍 [Check] hasSubmitted result:", hasSubmitted);
        // Only update if we found a submission, or if we haven't just submitted
        // This prevents overwriting true with false right after submission
        if (hasSubmitted || !justSubmittedRef.current) {
          setHasSubmittedToMospiReviewer(hasSubmitted);
        } else {
          console.log("🔒 [Check] Skipping update - we just submitted, keeping flag as true");
        }
      } catch (error) {
        console.error("Failed to check submission status:", error);
        // Don't reset to false if we just submitted
        if (!justSubmittedRef.current) {
          setHasSubmittedToMospiReviewer(false);
        } else {
          console.log("🔒 [Check] Error occurred but keeping flag as true (just submitted)");
        }
      }
    };

    checkSubmittedStatus();
  }, [user?.role, user?.id, user?.email, effectiveState, selectedState]);

  // Handle revert from MoSPI and submit
  const handleRevertAndSubmit = async () => {
    try {

      console.log("🔄 [StateAggregate] Handling revert and submit");
      // Get authentication token first
      const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
      const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
      const tokenFromNewKey = tokenData?.value?.accessToken;
      const tokenFromLegacyKey = localStorage.getItem("access_token") || undefined;
      const token = tokenFromNewKey || tokenFromLegacyKey || "";

      const userId = user?.id;
      if (!userId) {
        notificationService.error("User ID not found. Cannot proceed with submission.");
        console.error("❌ User ID is missing");
        setShowConfirmModal(false);
        setSubmittingFinal(false);
        return;
      }

      // Call revert API
      console.log("📡 API Endpoint: POST /submission/revert-from-mospi/{userId}");
      console.log("👤 User ID:", userId);
      
      const revertResponse = await axios.post(
        `${config.apiBaseUrl}/submission/revert-from-mospi/${userId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const revertData = revertResponse.data?.data || revertResponse.data;
      const updatedCount = revertData?.updatedCount || 0;

      console.log("✅ Revert API response received");
      console.log("📊 Updated Count:", updatedCount);

      // If updatedCount > 0, navigate back to review page
      if (updatedCount > 0) {
        console.log("ℹ️ Submissions were reverted. Navigating back to review page.");
        
        // Show success notification
        notificationService.success("Your form has been submitted to MoSPI Reviewer.");
        
        // Close modal
        setShowConfirmModal(false);
        setSubmittingFinal(false);
        
        // Navigate to review page
        navigate("/data-submission/review");
        return;
      }

      // If updatedCount == 0, proceed with final submit
      if (updatedCount == 0) {
        console.log("FINAL SUBMIT CALLED INSTEAD OF REVERT BECAUSE FRESH FORM IS THERE:")
        await handleFinalSubmit();
      }
      
    } catch (revertError: any) {
      console.warn("⚠️ Failed to call revert API:", revertError?.message);
      // Continue with submission even if revert check fails
      await handleFinalSubmit();
    }
  };

  // Handle final submit - Creates consolidated submission from aggregated formData
  const handleFinalSubmit = async () => {
    console.group("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.group("🚀 [StateAggregate] STARTING CONSOLIDATED SUBMISSION");
    console.group("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
      setSubmittingFinal(true);

      // Get authentication token first
      const tokenDataRaw = localStorage.getItem("niri_app:auth_tokens");
      const tokenData = tokenDataRaw ? JSON.parse(tokenDataRaw) : null;
      const tokenFromNewKey = tokenData?.value?.accessToken;
      const tokenFromLegacyKey = localStorage.getItem("access_token") || undefined;
      const token = tokenFromNewKey || tokenFromLegacyKey || "";

      // Gate: must have progress and must be 100% approved
      if (!stateProgress || stateProgress.percentage !== 100 || stateProgress.approved !== stateProgress.total) {
        notificationService.warning("All indicators must be approved before final submission.");
        console.warn("❌ Submission blocked: Not all indicators approved", stateProgress);
        setShowConfirmModal(false);
        setSubmittingFinal(false);
        return;
      }

      // Gate: must have aggregated formData
      if (!formData) {
        notificationService.error("No aggregated data available to submit.");
        console.error("❌ Submission blocked: No formData available");
        setShowConfirmModal(false);
        setSubmittingFinal(false);
        return;
      }

      console.log("✅ Pre-submission checks passed");
      console.log("📊 State Progress:", stateProgress);
      console.log("📋 Available formData:", formData);
      console.log("📊 FormData categories:", Object.keys(formData));

      // Use the aggregated formData from the page (consolidated data)
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📦 STEP 1: Using aggregated formData from State Aggregate Review");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 Raw aggregated formData:", JSON.stringify(formData, null, 2));
      
      // Show breakdown by category with section details
      Object.keys(formData).forEach((category) => {
        const categoryData = formData[category];
        if (categoryData && typeof categoryData === 'object') {
          const sections = Object.keys(categoryData);
          console.log(`\n📁 Category: ${category} (${sections.length} sections)`);
          sections.forEach((section) => {
            const sectionData = categoryData[section];
            console.log(`   ✅ ${section}:`, sectionData);
            
            // Extract and log IDs
            if (sectionData && typeof sectionData === 'object') {
              if (sectionData.id) {
                console.log(`      🔑 Section ID: ${sectionData.id}`);
              }
              // Check for arrays with items that have IDs
              Object.keys(sectionData).forEach((key) => {
                if (Array.isArray(sectionData[key])) {
                  const items = sectionData[key];
                  if (items.length > 0) {
                    const itemsWithIds = items.filter((item: any) => item && item.id);
                    if (itemsWithIds.length > 0) {
                      console.log(`      🔑 ${key} item IDs:`, itemsWithIds.map((item: any) => item.id).join(', '));
                    }
                    console.log(`      📊 ${key} items count: ${items.length}`);
                  }
                }
              });
            }
          });
        }
      });

      // Get source submission IDs from state progress data
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📋 STEP 2: Extracting source submission IDs");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Get source submission IDs and their full data from state indicator statuses
      let sourceSubmissionIds: string[] = [];
      let sourceSubmissions: any[] = [];
      try {
        const statusResp = await apiService.getStateIndicatorStatuses();
        const normalizedStatus = statusResp?.data ? statusResp : { data: statusResp };
        const statusData = normalizedStatus.data || {};
        const approvedSubmissions = statusData.submissions || [];
        
        // Filter and collect source submissions (exclude consolidated)
        const filteredSubmissions = approvedSubmissions.filter((sub: any) => {
          const formData = sub.formData || sub.form_data || {};
          const metadata = formData._metadata;
          return !metadata?.isConsolidated;
        });
        
        // Extract database UUIDs (id) and submissionId strings for tracking
        // We need UUIDs to fetch full submissions with attachedFiles
        const sourceSubmissionUuids = filteredSubmissions
          .map((sub: any) => sub.id) // Use database UUID (id), not submissionId string
          .filter((id: string) => id && typeof id === 'string' && id.includes('-')); // Must be UUID format
        
        // Also extract submissionId strings for metadata tracking
        sourceSubmissionIds = filteredSubmissions
          .map((sub: any) => sub.submissionId || sub.id)
          .filter((id: string) => id);
        
        console.log("📋 Source submission UUIDs (for fetching):", sourceSubmissionUuids);
        console.log("📋 Source submission IDs (for metadata):", sourceSubmissionIds);
        console.log("📋 Source submissions count:", sourceSubmissionUuids.length);
        
        // Fetch full submission data to get attachedFiles using database UUIDs
        if (sourceSubmissionUuids.length > 0) {
          console.log("📋 Fetching full submission data using UUIDs to get attachedFiles...");
          
          // Fetch each submission individually using its UUID to ensure we get complete data including attachedFiles
          const individualFetches = await Promise.allSettled(
            sourceSubmissionUuids.map(async (uuid) => {
              try {
                console.log(`📋 Fetching submission with UUID: ${uuid}`);
                const fullSub: any = await apiService.getSubmission(uuid);
                console.log(`✅ Fetched submission ${uuid}:`, {
                  hasAttachedFiles: !!fullSub.attachedFiles,
                  attachedFilesCount: fullSub.attachedFiles?.length || 0,
                  submissionId: fullSub.submissionId
                });
                return fullSub;
              } catch (e) {
                console.warn(`⚠️ Failed to fetch submission ${uuid}:`, e);
                return null;
              }
            })
          );
          
          // Collect successfully fetched submissions
          individualFetches.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              sourceSubmissions.push(result.value);
            } else {
              console.warn(`⚠️ Failed to fetch submission at index ${index} (UUID: ${sourceSubmissionUuids[index]})`);
            }
          });
          
          console.log(`✅ Fetched ${sourceSubmissions.length} full source submissions`);
          console.log("📋 Source submissions with attachedFiles:", 
            sourceSubmissions.filter((s: any) => s.attachedFiles && Array.isArray(s.attachedFiles) && s.attachedFiles.length > 0).length
          );
          console.log("📋 Total attachedFiles count from sources:", 
            sourceSubmissions.reduce((sum: number, s: any) => sum + (s.attachedFiles?.length || 0), 0)
          );
          
          // Log sample attachedFiles for debugging
          sourceSubmissions.forEach((sub, index) => {
            if (sub.attachedFiles && Array.isArray(sub.attachedFiles) && sub.attachedFiles.length > 0) {
              console.log(`📎 Submission ${index + 1} (${sub.submissionId}): ${sub.attachedFiles.length} files`);
              console.log(`   Sample files:`, sub.attachedFiles.slice(0, 2).map((f: any) => ({
                fileName: f.fileName,
                filePath: f.filePath
              })));
            }
          });
        } else {
          console.warn("⚠️ No source submission UUIDs found, using filtered submissions as fallback");
          // Use filtered submissions from status API as fallback
          sourceSubmissions = filteredSubmissions;
        }
      } catch (error) {
        console.warn("⚠️ Failed to get source submission IDs:", error);
        // Continue without source IDs - not critical for consolidation
      }

      // Set status to "ACCEPTED" for all indicators before transformation
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ STEP 2.5: Setting status to ACCEPTED for all indicators");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Create a deep copy of formData to avoid mutating the original
      const formDataWithAcceptedStatus = JSON.parse(JSON.stringify(formData));
      
      // All possible categories
      const categories = ['infraFinancing', 'infraDevelopment', 'pppDevelopment', 'infraEnablers'];
      
      // Iterate through all categories and sections to set status to "ACCEPTED"
      categories.forEach((category) => {
        const categoryData = formDataWithAcceptedStatus[category];
        if (categoryData && typeof categoryData === 'object') {
          Object.keys(categoryData).forEach((sectionKey) => {
            // Only process section keys (section1_1, section2_1, etc.)
            if (sectionKey.startsWith('section')) {
              const sectionData = categoryData[sectionKey];
              if (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData)) {
                // Set status to "ACCEPTED" for this indicator
                sectionData.status = "ACCEPTED";
                console.log(`   ✅ Set status to ACCEPTED for ${category}.${sectionKey}`);
              }
            }
          });
        }
      });
      
      console.log("✅ All indicators set to ACCEPTED status");

      // Transform formData for submission
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔄 STEP 3: Transforming formData for submission");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Determine submission status based on role
      const submissionStatus = isMospiReviewer 
        ? "SUBMITTED_TO_MOSPI_APPROVER" 
        : "SUBMITTED_TO_MOSPI_REVIEWER";
      
      // Get effective state for consolidation ID generation
      let effectiveState = selectedState || user?.stateUt || user?.stateName || user?.state || "";
      if (effectiveState) {
        effectiveState = effectiveState.toUpperCase();
      }
      
      // Extract attachedFiles BEFORE transformation (formData might be modified during transformation)
      // CRITICAL: Extract from the original formData structure before any transformations
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📎 STEP 2.6: Collecting attachedFiles from all sources");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // PRIMARY: Manual extraction from known file locations (MOST RELIABLE)
      // Extract directly from the formData structure we know has files
      console.log("📋 [PRIMARY] Manual extraction from known file locations...");
      const manualExtraction: any[] = [];
      const seenManualPaths = new Set<string>();
      
      // Extract from pppDevelopment.section3_3.VGFArray
      if (formData?.pppDevelopment?.section3_3?.VGFArray) {
        formData.pppDevelopment.section3_3.VGFArray.forEach((item: any) => {
          const filePath = item?.file?.file?.filePath;
          if (filePath && !seenManualPaths.has(filePath)) {
            seenManualPaths.add(filePath);
            manualExtraction.push({
              fileName: item.file.file.fileName || filePath.split('/').pop() || "",
              originalName: item.file.file.originalName || item.file.file.fileName || filePath.split('/').pop() || "",
              filePath: filePath,
              fileUrl: item.file.file.fileUrl || "",
              fileSize: item.file.file.fileSize || 0,
              mimeType: item.file.file.mimeType || "application/octet-stream",
              uploadedAt: item.file.file.uploadedAt || new Date().toISOString(),
            });
          }
        });
      }
      
        // Extract from infraDevelopment.section2_1.infraActArray
        // Structure: infraActArray[].files[].file.filePath
        if (formData?.infraDevelopment?.section2_1?.infraActArray) {
          formData.infraDevelopment.section2_1.infraActArray.forEach((item: any) => {
            if (item?.files && Array.isArray(item.files)) {
              item.files.forEach((fileItem: any) => {
                // Check both file.filePath and file.file.filePath (different nesting levels)
                const filePath = fileItem?.file?.filePath || fileItem?.file?.file?.filePath;
                if (filePath && typeof filePath === 'string' && filePath.trim() !== "" && !seenManualPaths.has(filePath)) {
                  seenManualPaths.add(filePath);
                  const fileObj = fileItem?.file?.file || fileItem?.file; // Get the actual file object
                  manualExtraction.push({
                    fileName: fileObj?.fileName || filePath.split('/').pop() || "",
                    originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
                    filePath: filePath,
                    fileUrl: fileObj?.fileUrl || "",
                    fileSize: fileObj?.fileSize || 0,
                    mimeType: fileObj?.mimeType || "application/octet-stream",
                    uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
                  });
                }
              });
            }
          });
        }
        
        // Extract from infraDevelopment.section2_2.specializedEntityArray
        // Structure: specializedEntityArray[].files[].file.filePath
        if (formData?.infraDevelopment?.section2_2?.specializedEntityArray) {
          formData.infraDevelopment.section2_2.specializedEntityArray.forEach((item: any) => {
            if (item?.files && Array.isArray(item.files)) {
              item.files.forEach((fileItem: any) => {
                // Check both file.filePath and file.file.filePath (different nesting levels)
                const filePath = fileItem?.file?.filePath || fileItem?.file?.file?.filePath;
                if (filePath && typeof filePath === 'string' && filePath.trim() !== "" && !seenManualPaths.has(filePath)) {
                  seenManualPaths.add(filePath);
                  const fileObj = fileItem?.file?.file || fileItem?.file; // Get the actual file object
                  manualExtraction.push({
                    fileName: fileObj?.fileName || filePath.split('/').pop() || "",
                    originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
                    filePath: filePath,
                    fileUrl: fileObj?.fileUrl || "",
                    fileSize: fileObj?.fileSize || 0,
                    mimeType: fileObj?.mimeType || "application/octet-stream",
                    uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
                  });
                }
              });
            }
          });
        }
      
      console.log(`✅ Manual extraction found ${manualExtraction.length} files from known locations`);
      
      // SECONDARY: Try recursive extraction (backup)
      console.log("📋 [SECONDARY] Trying recursive extraction from formData...");
      const extractedFromFormData = extractFileMetadataFromFormData(formData);
      console.log(`✅ Recursive extraction found ${extractedFromFormData.length} files`);
      
      // Also try extracting from formDataWithAcceptedStatus as backup
      if (extractedFromFormData.length === 0) {
        console.log("📋 [FALLBACK] Trying extraction from formDataWithAcceptedStatus...");
        const extractedFromAccepted = extractFileMetadataFromFormData(formDataWithAcceptedStatus);
        console.log(`✅ Extracted ${extractedFromAccepted.length} files from formDataWithAcceptedStatus`);
        if (extractedFromAccepted.length > 0) {
          extractedFromFormData.push(...extractedFromAccepted);
        }
      }
      
      // SECONDARY: Merge from source submissions (backup/verification)
      let mergedAttachedFiles: any[] = [];
      if (sourceSubmissions.length > 0) {
        console.log(`📋 [SECONDARY] Merging attachedFiles from ${sourceSubmissions.length} source submissions...`);
        
        // First, try to get attachedFiles directly from source submissions
        sourceSubmissions.forEach((sub: any, idx) => {
          if (sub.attachedFiles && Array.isArray(sub.attachedFiles) && sub.attachedFiles.length > 0) {
            console.log(`   📦 Source ${idx + 1} (${sub.submissionId}): ${sub.attachedFiles.length} files in attachedFiles`);
            mergedAttachedFiles.push(...sub.attachedFiles);
          }
        });
        
        // Also try mergeAttachedFiles utility (which also extracts from formData)
        const mergedFromUtility = mergeAttachedFiles(sourceSubmissions);
        if (mergedFromUtility.length > mergedAttachedFiles.length) {
          console.log(`   📦 Utility merge found ${mergedFromUtility.length} files (more than direct)`);
          mergedAttachedFiles = mergedFromUtility;
        }
        
        // Deduplicate by filePath
        const seen = new Set<string>();
        mergedAttachedFiles = mergedAttachedFiles.filter((f: any) => {
          const path = f.filePath || f.filepath;
          if (path && !seen.has(path)) {
            seen.add(path);
            return true;
          }
          return false;
        });
        
        console.log(`✅ Merged ${mergedAttachedFiles.length} unique files from source submissions`);
      }
      
      // Combine all sources, deduplicating by filePath
      // Priority: manual extraction (most reliable) > recursive extraction > source submissions
      const seenPaths = new Set<string>(seenManualPaths); // Start with manually found paths
      const allAttachedFiles: any[] = [...manualExtraction]; // Start with manually extracted files
      
      // Add recursively extracted files (skip duplicates)
      extractedFromFormData.forEach((file) => {
        if (file.filePath && file.filePath.trim() !== "" && !seenPaths.has(file.filePath)) {
          seenPaths.add(file.filePath);
          allAttachedFiles.push({
            fileName: file.fileName || file.filePath.split('/').pop() || "",
            originalName: file.originalName || file.fileName || file.filePath.split('/').pop() || "",
            filePath: file.filePath,
            fileUrl: file.fileUrl || "",
            fileSize: file.fileSize || 0,
            mimeType: file.mimeType || "application/octet-stream",
            uploadedAt: file.uploadedAt || new Date().toISOString(),
          });
        }
      });
      
      // Add merged files from source submissions (skip duplicates)
      mergedAttachedFiles.forEach((file) => {
        if (file.filePath && file.filePath.trim() !== "" && !seenPaths.has(file.filePath)) {
          seenPaths.add(file.filePath);
          allAttachedFiles.push({
            fileName: file.fileName || file.filePath.split('/').pop() || "",
            originalName: file.originalName || file.fileName || file.filePath.split('/').pop() || "",
            filePath: file.filePath,
            fileUrl: file.fileUrl || "",
            fileSize: file.fileSize || 0,
            mimeType: file.mimeType || "application/octet-stream",
            uploadedAt: file.uploadedAt || new Date().toISOString(),
          });
        }
      });
      
      if (allAttachedFiles.length === 0) {
        console.error("❌ CRITICAL ERROR: No files found after all extraction methods!");
        console.error("   FormData keys:", Object.keys(formData || {}));
        console.error("   Manual extraction found:", manualExtraction.length);
        console.error("   Recursive extraction found:", extractedFromFormData.length);
        console.error("   Source submissions found:", mergedAttachedFiles.length);
      } else {
        console.log(`✅ Total unique files collected: ${allAttachedFiles.length}`);
        console.log("   📎 Files:", allAttachedFiles.map(f => ({
          fileName: f.fileName,
          filePath: f.filePath?.substring(0, 60) + "..."
        })));
      }

      const transformedData = transformFormDataForSubmission(
        formDataWithAcceptedStatus, // Use formData with ACCEPTED status
        submissionStatus,
        {
          isConsolidated: true,
          sourceSubmissionIds: sourceSubmissionIds,
          consolidatedBy: user?.id || '',
          stateUt: effectiveState,
        }
      );

      // CRITICAL: Extract files from transformed formData as well (files might be structured differently after transformation)
      console.log("📋 [FINAL] Extracting files from transformed formData structure...");
      const transformedFormData = transformedData.formData as any;
      const finalExtraction: any[] = [];
      const seenFinal = new Set<string>(seenPaths);
      
      // Extract from transformed formData structure
      if (transformedFormData?.pppDevelopment?.section3_3?.VGFArray) {
        transformedFormData.pppDevelopment.section3_3.VGFArray.forEach((item: any) => {
          const filePath = item?.file?.file?.filePath || item?.file?.filePath;
          if (filePath && !seenFinal.has(filePath)) {
            seenFinal.add(filePath);
            const fileObj = item?.file?.file || item?.file;
            finalExtraction.push({
              fileName: fileObj?.fileName || filePath.split('/').pop() || "",
              originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
              filePath: filePath,
              fileUrl: fileObj?.fileUrl || "",
              fileSize: fileObj?.fileSize || 0,
              mimeType: fileObj?.mimeType || "application/octet-stream",
              uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
            });
          }
        });
      }
      
      if (transformedFormData?.infraDevelopment?.section2_1?.infraActArray) {
        transformedFormData.infraDevelopment.section2_1.infraActArray.forEach((item: any) => {
          if (item?.files && Array.isArray(item.files)) {
            item.files.forEach((fileItem: any) => {
              const filePath = fileItem?.file?.filePath || fileItem?.file?.file?.filePath;
              if (filePath && !seenFinal.has(filePath)) {
                seenFinal.add(filePath);
                const fileObj = fileItem?.file?.file || fileItem?.file;
                finalExtraction.push({
                  fileName: fileObj?.fileName || filePath.split('/').pop() || "",
                  originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
                  filePath: filePath,
                  fileUrl: fileObj?.fileUrl || "",
                  fileSize: fileObj?.fileSize || 0,
                  mimeType: fileObj?.mimeType || "application/octet-stream",
                  uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
                });
              }
            });
          }
        });
      }
      
      if (transformedFormData?.infraDevelopment?.section2_2?.specializedEntityArray) {
        transformedFormData.infraDevelopment.section2_2.specializedEntityArray.forEach((item: any) => {
          if (item?.files && Array.isArray(item.files)) {
            item.files.forEach((fileItem: any) => {
              const filePath = fileItem?.file?.filePath || fileItem?.file?.file?.filePath;
              if (filePath && !seenFinal.has(filePath)) {
                seenFinal.add(filePath);
                const fileObj = fileItem?.file?.file || fileItem?.file;
                finalExtraction.push({
                  fileName: fileObj?.fileName || filePath.split('/').pop() || "",
                  originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
                  filePath: filePath,
                  fileUrl: fileObj?.fileUrl || "",
                  fileSize: fileObj?.fileSize || 0,
                  mimeType: fileObj?.mimeType || "application/octet-stream",
                  uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
                });
              }
            });
          }
        });
      }
      
      if (finalExtraction.length > 0) {
        console.log(`✅ Final extraction from transformed formData found ${finalExtraction.length} additional files`);
        allAttachedFiles.push(...finalExtraction);
      }

      // CRITICAL: Add attachedFiles to transformedData BEFORE any other operations
      // This MUST be included in the JSON payload sent to backend
      console.log("🔍 Setting attachedFiles on transformedData...");
      console.log("   allAttachedFiles length:", allAttachedFiles.length);
      console.log("   allAttachedFiles sample:", allAttachedFiles.slice(0, 2).map(f => ({ fileName: f.fileName, filePath: f.filePath?.substring(0, 50) })));
      
      // ALWAYS set attachedFiles, even if empty (backend expects an array)
      transformedData.attachedFiles = allAttachedFiles.length > 0 ? allAttachedFiles : [];
      
      // IMMEDIATE VERIFICATION: Check that attachedFiles is set
      console.log("🔍 After assignment:");
      console.log("   transformedData.attachedFiles:", transformedData.attachedFiles);
      console.log("   transformedData.attachedFiles type:", typeof transformedData.attachedFiles);
      console.log("   transformedData.attachedFiles isArray:", Array.isArray(transformedData.attachedFiles));
      console.log("   transformedData.attachedFiles length:", transformedData.attachedFiles?.length || 0);
      console.log("   transformedData keys:", Object.keys(transformedData));
      
      if (!transformedData.attachedFiles || transformedData.attachedFiles.length === 0) {
        console.error("❌ CRITICAL: attachedFiles is empty after assignment!");
        console.error("   allAttachedFiles length:", allAttachedFiles.length);
        console.error("   This means extraction failed - files exist in formData but weren't extracted!");
      } else {
        console.log("✅ attachedFiles assigned to transformedData:", transformedData.attachedFiles.length, "files");
      }

      // If attachedFiles is still empty, try one more time from formDataWithAcceptedStatus
      // (the data that will actually be sent)
      if (transformedData.attachedFiles.length === 0) {
        console.error("❌ CRITICAL: attachedFiles is still empty! Trying extraction from formDataWithAcceptedStatus...");
        
        // Extract directly from the formData that will be sent
        const finalExtraction: any[] = [];
        const seenFinal = new Set<string>();
        
        // Extract from pppDevelopment.section3_3.VGFArray
        if (formDataWithAcceptedStatus?.pppDevelopment?.section3_3?.VGFArray) {
          formDataWithAcceptedStatus.pppDevelopment.section3_3.VGFArray.forEach((item: any) => {
            const filePath = item?.file?.file?.filePath;
            if (filePath && !seenFinal.has(filePath)) {
              seenFinal.add(filePath);
              finalExtraction.push({
                fileName: item.file.file.fileName || filePath.split('/').pop() || "",
                originalName: item.file.file.originalName || item.file.file.fileName || filePath.split('/').pop() || "",
                filePath: filePath,
                fileUrl: item.file.file.fileUrl || "",
                fileSize: item.file.file.fileSize || 0,
                mimeType: item.file.file.mimeType || "application/octet-stream",
                uploadedAt: item.file.file.uploadedAt || new Date().toISOString(),
              });
            }
          });
        }
        
        // Extract from infraDevelopment.section2_1.infraActArray
        // Structure: infraActArray[].files[].file.filePath
        if (formDataWithAcceptedStatus?.infraDevelopment?.section2_1?.infraActArray) {
          formDataWithAcceptedStatus.infraDevelopment.section2_1.infraActArray.forEach((item: any) => {
            if (item?.files && Array.isArray(item.files)) {
              item.files.forEach((fileItem: any) => {
                // Check both file.filePath and file.file.filePath (different nesting levels)
                const filePath = fileItem?.file?.filePath || fileItem?.file?.file?.filePath;
                if (filePath && typeof filePath === 'string' && filePath.trim() !== "" && !seenFinal.has(filePath)) {
                  seenFinal.add(filePath);
                  const fileObj = fileItem?.file?.file || fileItem?.file; // Get the actual file object
                  finalExtraction.push({
                    fileName: fileObj?.fileName || filePath.split('/').pop() || "",
                    originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
                    filePath: filePath,
                    fileUrl: fileObj?.fileUrl || "",
                    fileSize: fileObj?.fileSize || 0,
                    mimeType: fileObj?.mimeType || "application/octet-stream",
                    uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
                  });
                }
              });
            }
          });
        }
        
        // Extract from infraDevelopment.section2_2.specializedEntityArray
        // Structure: specializedEntityArray[].files[].file.filePath
        if (formDataWithAcceptedStatus?.infraDevelopment?.section2_2?.specializedEntityArray) {
          formDataWithAcceptedStatus.infraDevelopment.section2_2.specializedEntityArray.forEach((item: any) => {
            if (item?.files && Array.isArray(item.files)) {
              item.files.forEach((fileItem: any) => {
                // Check both file.filePath and file.file.filePath (different nesting levels)
                const filePath = fileItem?.file?.filePath || fileItem?.file?.file?.filePath;
                if (filePath && typeof filePath === 'string' && filePath.trim() !== "" && !seenFinal.has(filePath)) {
                  seenFinal.add(filePath);
                  const fileObj = fileItem?.file?.file || fileItem?.file; // Get the actual file object
                  finalExtraction.push({
                    fileName: fileObj?.fileName || filePath.split('/').pop() || "",
                    originalName: fileObj?.originalName || fileObj?.fileName || filePath.split('/').pop() || "",
                    filePath: filePath,
                    fileUrl: fileObj?.fileUrl || "",
                    fileSize: fileObj?.fileSize || 0,
                    mimeType: fileObj?.mimeType || "application/octet-stream",
                    uploadedAt: fileObj?.uploadedAt || new Date().toISOString(),
                  });
                }
              });
            }
          });
        }
        
        if (finalExtraction.length > 0) {
          console.log(`✅ Final extraction from formDataWithAcceptedStatus found ${finalExtraction.length} files!`);
          transformedData.attachedFiles = finalExtraction;
        } else {
          console.error("❌ Final extraction also found no files!");
          console.error("   formDataWithAcceptedStatus keys:", Object.keys(formDataWithAcceptedStatus || {}));
          console.error("   Checking pppDevelopment.section3_3:", !!formDataWithAcceptedStatus?.pppDevelopment?.section3_3);
          console.error("   Checking infraDevelopment.section2_1:", !!formDataWithAcceptedStatus?.infraDevelopment?.section2_1);
        }
      }

      // Final verification
      console.log("✅ Transformed data verification:");
      console.log("   📝 Submission ID:", transformedData.submissionId);
      console.log("   📊 Status:", transformedData.status);
      console.log("   📋 FormData structure:", Object.keys(transformedData.formData || {}));
      console.log("   📎 attachedFiles count:", transformedData.attachedFiles?.length || 0);
      
      if (transformedData.attachedFiles && transformedData.attachedFiles.length > 0) {
        console.log("   ✅ attachedFiles is populated with", transformedData.attachedFiles.length, "files");
        // Verify first file structure
        const firstFile = transformedData.attachedFiles[0];
        console.log("   📎 First file:", {
          hasFilePath: !!firstFile.filePath,
          hasFileName: !!firstFile.fileName,
          hasOriginalName: !!firstFile.originalName,
          filePath: firstFile.filePath?.substring(0, 50) + "..."
        });
      } else {
        console.error("   ❌ ERROR: attachedFiles is STILL empty after all extraction attempts!");
      }

      // Create multipart FormData for file attachments
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📎 STEP 4: Preparing multipart FormData with file attachments");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // FINAL VERIFICATION: Ensure attachedFiles is in transformedData before stringifying
      if (!transformedData.attachedFiles || transformedData.attachedFiles.length === 0) {
        console.error("❌ CRITICAL ERROR: attachedFiles is empty before creating FormData!");
        console.error("   This will result in empty attachedFiles in the database!");
        console.error("   transformedData keys:", Object.keys(transformedData));
        console.error("   transformedData.attachedFiles:", transformedData.attachedFiles);
      } else {
        console.log("✅ VERIFIED: attachedFiles has", transformedData.attachedFiles.length, "files before stringifying");
      }
      
      // CRITICAL: Ensure attachedFiles is ALWAYS present in transformedData before stringifying
      // Even if empty, it must be an array (not undefined/null)
      if (!transformedData.attachedFiles) {
        console.error("❌ CRITICAL: attachedFiles is undefined/null! Setting to empty array.");
        transformedData.attachedFiles = [];
      }
      if (!Array.isArray(transformedData.attachedFiles)) {
        console.error("❌ CRITICAL: attachedFiles is not an array! Converting to array.");
        transformedData.attachedFiles = Array.isArray(transformedData.attachedFiles) ? transformedData.attachedFiles : [];
      }
      
      // Final check: Log the exact structure before stringifying
      console.log("🔍 FINAL CHECK before stringifying:");
      console.log("   transformedData keys:", Object.keys(transformedData));
      console.log("   transformedData.attachedFiles type:", typeof transformedData.attachedFiles);
      console.log("   transformedData.attachedFiles isArray:", Array.isArray(transformedData.attachedFiles));
      console.log("   transformedData.attachedFiles length:", transformedData.attachedFiles?.length || 0);
      
      const multipartData = new FormData();
      let submissionJson = JSON.stringify(transformedData);
      
      // Verify attachedFiles is in the JSON string
      let jsonToUse = submissionJson;
      try {
        const parsed = JSON.parse(submissionJson);
        console.log("🔍 Parsed JSON keys:", Object.keys(parsed));
        console.log("🔍 parsed.attachedFiles:", parsed.attachedFiles);
        console.log("🔍 parsed.attachedFiles type:", typeof parsed.attachedFiles);
        console.log("🔍 parsed.attachedFiles isArray:", Array.isArray(parsed.attachedFiles));
        
        if (parsed.attachedFiles && Array.isArray(parsed.attachedFiles) && parsed.attachedFiles.length > 0) {
          console.log("✅ VERIFIED: attachedFiles is present in JSON string with", parsed.attachedFiles.length, "files");
        } else if (parsed.attachedFiles && Array.isArray(parsed.attachedFiles)) {
          console.warn("⚠️ WARNING: attachedFiles is present but EMPTY in JSON string!");
        } else {
          console.error("❌ CRITICAL ERROR: attachedFiles is missing or not an array in JSON string!");
          console.error("   parsed.attachedFiles:", parsed.attachedFiles);
          console.error("   JSON string preview (first 500 chars):", submissionJson.substring(0, 500));
          
          // LAST RESORT: Manually add attachedFiles to the JSON
          console.error("   🔧 Attempting to manually inject attachedFiles into JSON...");
          try {
            const parsedWithFiles = { ...parsed, attachedFiles: allAttachedFiles.length > 0 ? allAttachedFiles : [] };
            jsonToUse = JSON.stringify(parsedWithFiles);
            console.log("   ✅ Created corrected JSON with", parsedWithFiles.attachedFiles.length, "files");
            
            // Verify the corrected JSON
            const verifyParsed = JSON.parse(jsonToUse);
            if (verifyParsed.attachedFiles && Array.isArray(verifyParsed.attachedFiles)) {
              console.log("   ✅ Verified corrected JSON has attachedFiles:", verifyParsed.attachedFiles.length, "files");
            } else {
              console.error("   ❌ Corrected JSON still missing attachedFiles!");
            }
          } catch (e) {
            console.error("   ❌ Failed to create corrected JSON:", e);
            // Use original JSON as fallback
          }
        }
      } catch (e) {
        console.error("❌ Failed to verify JSON:", e);
      }
      
      multipartData.append("submission", jsonToUse);

      // Append file attachments recursively (for new files being uploaded)
      // Note: For consolidated submissions, files are already in S3, so this might be empty
      appendFilesRecursively(multipartData, formData);

      console.log("✅ Multipart FormData prepared");
      console.log("📋 FormData entries:");
      for (const [key, val] of multipartData.entries()) {
        if (val instanceof File) {
          console.log(`   📎 ${key}: File - ${val.name} (${val.size} bytes)`);
        } else if (key === "submission") {
          // For submission JSON, show summary
          const jsonStr = val as string;
          try {
            const parsed = JSON.parse(jsonStr);
            console.log(`   📄 ${key}: JSON with attachedFiles count: ${parsed.attachedFiles?.length || 0}`);
          } catch {
            console.log(`   📄 ${key}: JSON string (${jsonStr.length} chars)`);
          }
        } else {
          console.log(`   📄 ${key}:`, typeof val === 'string' && val.length > 200 ? val.substring(0, 200) + "..." : val);
        }
      }

      // Get authentication token for submission
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔐 STEP 5: Preparing API request");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      console.log("✅ Token already retrieved");

      // Submit consolidated submission
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📤 STEP 6: Creating consolidated submission");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📡 API Endpoint: POST /submission");
      console.log("📝 Submission ID:", transformedData.submissionId);
      console.log("📊 Status:", submissionStatus);
      console.log("📍 State/UT:", effectiveState || mockSubmission?.stateUt);
      
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

      console.log("✅ Submission successful!");
      console.log("📦 Response:", response.data);
      
      // Extract created submission details
      const createdSubmission = response.data?.data || response.data;
      const consolidatedSubmissionId = createdSubmission?.id || createdSubmission?.submissionId || transformedData.submissionId;
      
      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔗 STEP 7: Updating source submissions with consolidation metadata");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📝 Consolidated Submission ID:", consolidatedSubmissionId);
      console.log("📋 Source Submission IDs to update:", sourceSubmissionIds);
      
      // Update source submissions to mark them as consolidated
      // Use the already-fetched sourceSubmissions which have their UUIDs
      if (sourceSubmissions.length > 0 && consolidatedSubmissionId) {
        try {
          console.log(`📝 Updating ${sourceSubmissions.length} source submissions with consolidation metadata...`);
          
          // Update each source submission using its UUID
          const updatePromises = sourceSubmissions.map(async (sourceSubmission) => {
            const actualSubmissionId = sourceSubmission.id; // Use the database UUID
            const submissionIdString = sourceSubmission.submissionId; // For logging
            
            if (!actualSubmissionId) {
              console.warn(`⚠️ Source submission ${submissionIdString} has no UUID, skipping update`);
              return;
            }
            
            try {
              // Get current formData
              const currentSubmission = await apiService.getSubmission(actualSubmissionId);
              const currentFormData = currentSubmission?.formData || {};
              
              // Add consolidation metadata to formData
              const updatedFormData = {
                ...currentFormData,
                _consolidation: {
                  consolidatedInto: consolidatedSubmissionId,
                  consolidatedAt: new Date().toISOString(),
                  consolidatedBy: user?.id || '',
                },
              };
              
              // Update the submission with consolidation metadata
              await apiService.updateSubmission(actualSubmissionId, updatedFormData);
              console.log(`✅ Updated source submission ${submissionIdString} (UUID: ${actualSubmissionId})`);
            } catch (updateError: any) {
              console.warn(`⚠️ Failed to update source submission ${submissionIdString} (UUID: ${actualSubmissionId}):`, updateError?.message);
              // Don't fail the whole process if one update fails
            }
          });
          
          await Promise.allSettled(updatePromises);
          console.log("✅ Finished updating source submissions");
        } catch (updateError: any) {
          console.warn("⚠️ Error updating source submissions:", updateError?.message);
          // Don't fail the consolidation if metadata update fails
        }
      } else {
        console.log("ℹ️ No source submissions to update or missing consolidated submission ID");
      }
      
      // Immediately disable submit button to prevent multiple submissions
      console.log("🔒 [Submit] Immediately disabling Submit Now button to prevent multiple submissions");
      justSubmittedRef.current = true; // Mark that we just submitted
      setHasSubmittedToMospiReviewer(true);
      console.log("🔒 [Submit] hasSubmittedToMospiReviewer set to:", true);
      
      // Reset the ref after 10 seconds (enough time for submission to appear in database)
      setTimeout(() => {
        justSubmittedRef.current = false;
      }, 10000);
      
      const successMessage = isMospiReviewer
        ? "Consolidated submission sent to MoSPI Approver successfully."
        : "Consolidated submission sent to MoSPI Reviewer successfully.";
      
      notificationService.success(successMessage);

      // Close modal after successful submission
      setShowConfirmModal(false);

      // Refresh progress so UI reflects the new state
      try {
        console.log("\n🔄 Refreshing state progress...");
        const resp = await apiService.getStateIndicatorStatuses();
        const normalized = resp?.data ? resp : { data: resp };
        const stats = calculateStateProgressFromApi(normalized);
        setStateProgress(stats);
        console.log("✅ Progress refreshed:", stats);
      } catch (e) {
        console.error("⚠️ Failed to refresh progress", e);
      }

      // Refresh submissions list and update hasSubmittedToMospiReviewer flag
      // Note: We already set hasSubmittedToMospiReviewer to true above, so this refresh is just to confirm
      // We won't overwrite it to false if the check fails (submission might not appear immediately)
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

        // Get the current state being viewed (for multi-state scenarios)
        const currentState = effectiveState || selectedState || user?.stateUt || user?.state;
        
        const hasSubmitted = submissionsArray.some((submission) => {
          const isOwnSubmission = submission.user?.id === user?.id || 
            submission.submittedBy?.id === user?.id ||
            (submission.user?.email && submission.user.email === user?.email);
          // Check if submission is for the current state and has been submitted to MOSPI reviewer
          // Use case-insensitive comparison for state matching
          const submissionState = (submission.stateUt || submission.user?.stateUt || "").toString().trim().toUpperCase();
          const normalizedCurrentState = (currentState || "").toString().trim().toUpperCase();
          const isForCurrentState = !currentState || 
            submissionState === normalizedCurrentState;
          return submission.status === "SUBMITTED_TO_MOSPI_REVIEWER" && isOwnSubmission && isForCurrentState;
        });

        // Only update if we found a submission - don't overwrite true with false
        // (submission might not appear immediately after creation)
        if (hasSubmitted) {
          setHasSubmittedToMospiReviewer(true);
        }
        // If hasSubmitted is false, keep the current value (which should be true from line 1067)
      } catch (e) {
        console.error("⚠️ Failed to refresh submission status check", e);
        // Keep the flag as true since we just submitted successfully
        // Don't overwrite it
      }

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ CONSOLIDATED SUBMISSION COMPLETED SUCCESSFULLY");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      // Redirect to review page after successful submission
      console.log("\n🔄 Redirecting to review page...");
      setTimeout(() => {
        navigate("/data-submission/review");
      }, 1000); // Small delay to ensure success message is visible
      
    } catch (e: any) {
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ ERROR IN CONSOLIDATED SUBMISSION");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("Error details:", e);
      console.error("Error message:", e?.message);
      console.error("Error response:", e?.response?.data);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      notificationService.error(e?.message || "Error creating consolidated submission.");
      setShowConfirmModal(false);
    } finally {
      setSubmittingFinal(false);
      console.groupEnd();
      console.groupEnd();
      console.groupEnd();
    }
  };

  // Log submission data whenever formData changes (for verification before submit)
  useEffect(() => {
    if (!formData) return;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 [StateAggregate] SUBMISSION DATA PREVIEW (Auto-log on data change)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📋 Raw formData:", formData);
    console.log("📊 FormData categories:", Object.keys(formData || {}));
    
    // Show detailed breakdown by category
    Object.keys(formData || {}).forEach((category) => {
      const categoryData = formData[category];
      if (categoryData && typeof categoryData === 'object') {
        const sections = Object.keys(categoryData);
        console.log(`\n📁 Category: ${category}`);
        console.log(`   Sections count: ${sections.length}`);
        sections.forEach((section) => {
          const sectionData = categoryData[section];
          console.log(`   ✅ ${section}:`, sectionData);
          
          // Show IDs if they exist in the section data
          if (sectionData && typeof sectionData === 'object') {
            const sectionKeys = Object.keys(sectionData);
            if (sectionKeys.includes('id')) {
              console.log(`      🔑 ID: ${sectionData.id}`);
            }
            // Check for array items with IDs
            Object.keys(sectionData).forEach((key) => {
              if (Array.isArray(sectionData[key])) {
                const itemsWithIds = sectionData[key].filter((item: any) => item && item.id);
                if (itemsWithIds.length > 0) {
                  console.log(`      🔑 ${key} item IDs:`, itemsWithIds.map((item: any) => item.id).join(', '));
                }
              }
            });
          }
        });
      }
    });

    // Preview transformed data (what will be sent)
    try {
      // Determine submission status based on role
      const previewStatus = isMospiReviewer 
        ? "SUBMITTED_TO_MOSPI_APPROVER" 
        : "SUBMITTED_TO_MOSPI_REVIEWER";
      
      const previewTransformed = transformFormDataForSubmission(
        formData,
        previewStatus
      );
      console.log("\n🔄 Transformed data preview (what will be submitted):");
      console.log("   📝 Submission ID:", previewTransformed.submissionId);
      console.log("   📊 Status:", previewTransformed.status);
      console.log("   📋 FormData structure:", Object.keys(previewTransformed.formData || {}));
      console.log("   📦 Complete transformed object:", JSON.stringify(previewTransformed, null, 2));
    } catch (error) {
      console.warn("⚠️ Could not preview transformed data:", error);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💡 This data will be submitted when you click 'Submit Now'");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }, [formData]);

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
                    onClick={() => {
                      console.log("🔘 [Button] Submit Now clicked. hasSubmittedToMospiReviewer:", hasSubmittedToMospiReviewer);
                      setShowConfirmModal(true);
                    }}
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
                isPreview={false}
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
                await handleRevertAndSubmit();
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
