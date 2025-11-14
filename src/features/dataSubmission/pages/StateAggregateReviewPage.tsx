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
  
  const formData: any = {
    infraFinancing: {
      section1_1: {},
      section1_2: {},
      section1_3: { ulbList: [] },
      section1_4: { bondList: [] },
      section1_5: { ffiArray: [] },
    },
    infraDevelopment: {
      section2_1: { infraActArray: [] },
      section2_2: { specializedEntityArray: [] },
      section2_3: { infraDevelopmentArray: [] },
      section2_4: { investmentReadyArray: [] },
      section2_5: { assetMonetizationArray: [] },
    },
    pppDevelopment: {
      section3_1: {},
      section3_2: {},
      section3_3: { VGFArray: [] },
      section3_4: { projects: [] },
    },
    infraEnablers: {
      section4_1: {},
      section4_2: {},
      section4_3: {},
      section4_4: {},
      section4_5: {},
      section4_6: { capacityArray: [] },
    },
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

      // Handle null/undefined data
      if (!indicatorData) {
        indicatorData = {};
      }

      // Handle array-based indicators (2.1, 2.2, 2.3, 2.4, 2.5)
      if (Array.isArray(indicatorData)) {
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
        console.log(`[Transform] Stored array ${sectionKey} in ${formDataKey}:`, formData[formDataKey][sectionKey]);
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

        // Always store sections for aggregate view - even if empty, so all indicators show
        // This ensures all indicators are visible in the aggregate review
        formData[formDataKey][sectionKey] = formFields;
        console.log(`[Transform] Stored ${sectionKey} in ${formDataKey}:`, formFields);
      }
    });
  });

  console.log("[Transform] Final formData structure:", formData);
  console.log("[Transform] infraFinancing sections:", Object.keys(formData.infraFinancing));
  console.log("[Transform] infraDevelopment sections:", Object.keys(formData.infraDevelopment));
  console.log("[Transform] pppDevelopment sections:", Object.keys(formData.pppDevelopment));
  console.log("[Transform] infraEnablers sections:", Object.keys(formData.infraEnablers));

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
  const { assignedIndicators, isNodalOfficer } = useIndicatorAccess();

  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [aggregateData, setAggregateData] = useState<AggregatedPayload | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [mockSubmission, setMockSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState(true);

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
      if (!effectiveState) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log(`[StateAggregate] Loading preview for state: ${effectiveState}, year: ${selectedYear || "current"}`);

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

        // Transform indicators to formData structure
        // Also pass submissions array if available to extract form data
        let transformedFormData = transformIndicatorsToFormData(
          data.indicators || {},
          data.submissions || (payload as any).submissions
        );
        console.log("[StateAggregate] Transformed formData:", transformedFormData);
        console.log("[StateAggregate] FormData keys:", Object.keys(transformedFormData));
        
        // Filter formData for nodal officers: remove unassigned indicators
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
          console.log("[StateAggregate] Not filtering - isNodalOfficer:", isNodalOfficer, "assignedIndicators:", assignedIndicators);
        }
        
        setFormData(transformedFormData);

        // Create mock submission for existing components
        const submission = createMockSubmission(data, transformedFormData);
        setMockSubmission(submission);

      } catch (err: any) {
        console.error("❌ Failed to load aggregate preview:", err);
        setError(err.message || "Failed to load aggregate preview");
        notificationService.error(err.message || "Failed to load aggregate preview");
      } finally {
        setLoading(false);
      }
    };

    loadAggregatePreview();
  }, [effectiveState, selectedYear, isNodalOfficer, assignedIndicators]);

  // Re-filter formData when assignedIndicators changes (for nodal officers)
  useEffect(() => {
    if (isNodalOfficer && assignedIndicators && assignedIndicators.length > 0 && formData) {
      console.log("[StateAggregate] Re-filtering formData due to assignedIndicators change");
      console.log("[StateAggregate] Current formData:", formData);
      console.log("[StateAggregate] Assigned indicators:", assignedIndicators);
      const filteredFormData = filterFormDataByAssignedIndicators(formData, assignedIndicators);
      console.log("[StateAggregate] Re-filtered formData:", filteredFormData);
      if (filteredFormData.infraFinancing) {
        console.log("[StateAggregate] Re-filtered infraFinancing sections:", Object.keys(filteredFormData.infraFinancing));
      }
      setFormData(filteredFormData);
    }
  }, [isNodalOfficer, assignedIndicators]);

  // Restrict state selection for STATE_APPROVER
  const isStateApprover = user?.role === "STATE_APPROVER";
  const canSelectState = !isStateApprover;

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/data-submission")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#212121]">State Aggregate Review</h1>
            <p className="text-sm text-[#727272] mt-1">
              View aggregated data for all submissions from a state
            </p>
          </div>
        </div>
      </div>

      {/* State and Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-[#212121] mb-2 block">
                State/UT
              </label>
              <Select
                value={selectedState}
                onValueChange={setSelectedState}
                disabled={!canSelectState}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select State/UT" />
                </SelectTrigger>
                <SelectContent>
                  {stateOptions
                    .filter((option) => option.code && option.code.trim() !== "")
                    .map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!canSelectState && (
                <p className="text-xs text-[#727272] mt-1">
                  You can only view data for your assigned state
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-[#212121] mb-2 block">
                Financial Year
              </label>
              <Select value={selectedYear || "current"} onValueChange={(value) => setSelectedYear(value === "current" ? "" : value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Year</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                  <SelectItem value="2022-23">2022-23</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <div className="space-y-6">
          {/* State Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-[#212121]">
                    {effectiveState}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {aggregateData?.summary && (
                      <>
                        {aggregateData.summary.acceptedCount || 0} of {aggregateData.summary.totalIndicators || 0} indicators completed
                        {aggregateData.summary.percentage !== undefined && (
                          <span className="ml-2">
                            ({aggregateData.summary.percentage.toFixed(1)}%)
                          </span>
                        )}
                      </>
                    )}
                  </CardDescription>
                </div>
                {aggregateData?.summary?.percentage !== undefined && (
                  <Badge variant="outline" className="text-sm">
                    {aggregateData.summary.percentage.toFixed(1)}% Complete
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="data-review">Data Review</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab submission={mockSubmission} />
            </TabsContent>

            <TabsContent value="data-review" className="mt-6">
              <DataReviewTab
                submissionId={mockSubmission.id}
                formData={formData}
                submission={mockSubmission}
                isPreview={true}
                assignedIndicators={isNodalOfficer ? assignedIndicators : undefined}
                isNodalOfficer={isNodalOfficer}
              />
            </TabsContent>

            <TabsContent value="submissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Submissions</CardTitle>
                  <CardDescription>
                    List of all submissions from this state
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aggregateData?.submissions && aggregateData.submissions.length > 0 ? (
                    <div className="space-y-4">
                      {aggregateData.submissions.map((submission: any) => (
                        <Card key={submission.id || submission.submissionId}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">
                                  {submission.submissionId || submission.id}
                                </h3>
                                <p className="text-sm text-[#727272]">
                                  Submitted by {submission.user?.firstName} {submission.user?.lastName} on{" "}
                                  {submission.createdAt
                                    ? new Date(submission.createdAt).toLocaleDateString()
                                    : "—"}
                                </p>
                              </div>
                              <Badge variant="outline">{submission.status}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#727272] text-center py-8">No submissions found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <DocumentsTab
                documents={mockSubmission.attachedFiles || []}
                submissionId={mockSubmission.id}
                formData={formData}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <AuditLog entries={generateAuditEntries(mockSubmission)} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};
